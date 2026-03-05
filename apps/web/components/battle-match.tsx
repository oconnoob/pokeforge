"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import {
  calculateTypeEffectiveness,
  createBattle,
  resolveTurn,
  type PokemonType,
  type BattlePokemonTemplate,
  type BattleState
} from "@pokeforge/battle-engine";
import { SpriteImage } from "@/components/sprite-image";
import {
  extractNewLogMessages,
  effectivenessHint,
  hpBarZone,
  statusBadgeLabel,
  typeToEffectClass,
  winnerBannerText
} from "@/lib/battle/presentation";
import { type GridDirection, nextGridIndex } from "@/lib/battle/navigation";
import { parseImpactCue, parseUsedMoveCue } from "@/lib/battle/impact";
import {
  isTypewriterComplete,
  nextTypedLength,
  TYPEWRITER_INTERVAL_MS,
  TYPEWRITER_STEP
} from "@/lib/battle/typewriter";
import { DEFAULT_TURN_TIMELINE } from "@/lib/battle/timeline";
import { predictFirstActor } from "@/lib/battle/turn-order";
import { buildBattleTimeline, summarizeBattleLog, timelineActorLabel } from "@/lib/battle/stats";

export interface BattleMatchEntry {
  id: string;
  name: string;
  frontSprite?: string;
  backSprite?: string;
  template: BattlePokemonTemplate;
}

interface BattleMatchProps {
  roster: BattleMatchEntry[];
  playerId: string;
  opponentId: string;
}

type UiPhase = "intro" | "command" | "message" | "battle_over";
type Combatant = "player" | "opponent";
type SpriteAnimationState = "idle" | "attacking" | "hit" | "fainted";
type ImpactTarget = "player" | "opponent";

interface ImpactFlash {
  target: ImpactTarget;
  damage: number;
  effectiveness: "super" | "resist" | "neutral";
}

interface TurnActionEvent {
  message: string;
  attacker: Combatant;
  target: ImpactTarget;
  remainingHp: number;
  effectiveness: "super" | "resist" | "neutral";
  moveType: PokemonType;
}

const toHpPercent = (current: number, total: number) => Math.max(0, Math.round((current / total) * 100));

export function BattleMatch({ roster, playerId, opponentId }: BattleMatchProps) {
  const router = useRouter();
  const player = useMemo(() => roster.find((pokemon) => pokemon.id === playerId) ?? null, [playerId, roster]);
  const opponent = useMemo(() => roster.find((pokemon) => pokemon.id === opponentId) ?? null, [opponentId, roster]);
  const spriteById = useMemo(
    () =>
      new Map(
        roster.map((entry) => [
          entry.id,
          {
            front: entry.frontSprite,
            back: entry.backSprite
          }
        ])
      ),
    [roster]
  );

  const [state, setState] = useState<BattleState | null>(() =>
    player && opponent ? createBattle(player.template, opponent.template) : null
  );
  const [displayState, setDisplayState] = useState<BattleState | null>(() =>
    player && opponent ? createBattle(player.template, opponent.template) : null
  );
  const [phase, setPhase] = useState<UiPhase>("command");
  const [messages, setMessages] = useState<string[]>([]);
  const [messageIndex, setMessageIndex] = useState(0);
  const [typedChars, setTypedChars] = useState(0);
  const [effectClass, setEffectClass] = useState("battle-fx-neutral");
  const [turnResolving, setTurnResolving] = useState(false);
  const [selectedFightIndex, setSelectedFightIndex] = useState(0);
  const [playerAnim, setPlayerAnim] = useState<SpriteAnimationState>("idle");
  const [opponentAnim, setOpponentAnim] = useState<SpriteAnimationState>("idle");
  const [impactFlash, setImpactFlash] = useState<ImpactFlash | null>(null);
  const [arenaPulseClass, setArenaPulseClass] = useState<string>("battle-impact-neutral");
  const [arenaPulseActive, setArenaPulseActive] = useState(false);
  const [showWinnerBanner, setShowWinnerBanner] = useState(false);
  const [showIntroBanner, setShowIntroBanner] = useState(true);
  const [showTimelineOverlay, setShowTimelineOverlay] = useState(false);
  const animationTimeoutsRef = useRef<number[]>([]);
  const screenRef = useRef<HTMLElement | null>(null);

  const currentMessage = messages[messageIndex] ?? "";

  const clearAnimationTimeouts = () => {
    animationTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    animationTimeoutsRef.current = [];
  };

  const scheduleAnimation = (callback: () => void, delayMs: number) => {
    const timeoutId = window.setTimeout(() => {
      callback();
      animationTimeoutsRef.current = animationTimeoutsRef.current.filter((value) => value !== timeoutId);
    }, delayMs);
    animationTimeoutsRef.current.push(timeoutId);
  };

  const setCombatAnimation = (actor: Combatant) => {
    if (actor === "player") {
      setPlayerAnim("attacking");
      setOpponentAnim("idle");
      scheduleAnimation(() => {
        setPlayerAnim("idle");
        setOpponentAnim("hit");
      }, 180);
      scheduleAnimation(() => {
        setOpponentAnim("idle");
      }, 420);
      return;
    }

    setOpponentAnim("attacking");
    setPlayerAnim("idle");
    scheduleAnimation(() => {
      setOpponentAnim("idle");
      setPlayerAnim("hit");
    }, 180);
    scheduleAnimation(() => {
      setPlayerAnim("idle");
    }, 420);
  };

  const inferFirstActor = (firstMessage: string): Combatant => {
    const normalized = firstMessage.toLowerCase();
    const opponentName = state?.opponent.name.toLowerCase() ?? "";
    const playerName = state?.player.name.toLowerCase() ?? "";
    if (opponentName.length > 0 && normalized.includes(`${opponentName} used`)) {
      return "opponent";
    }
    if (playerName.length > 0 && normalized.includes(`${playerName} used`)) {
      return "player";
    }
    return "player";
  };

  const inferImpactFlash = (turnMessages: string[]): ImpactFlash | null => {
    for (const message of turnMessages) {
      const cue = parseImpactCue(message);
      if (!cue) {
        continue;
      }

      const normalizedTarget = cue.target.toLowerCase();
      if (normalizedTarget === state?.player.name.toLowerCase()) {
        return {
          target: "player",
          damage: cue.damage,
          effectiveness: cue.effectiveness
        };
      }

      return {
        target: "opponent",
        damage: cue.damage,
        effectiveness: cue.effectiveness
      };
    }

    return null;
  };

  const inferImpactEffectType = (turnMessages: string[]): string => {
    for (const message of turnMessages) {
      const usedMove = parseUsedMoveCue(message);
      if (!usedMove || !state) {
        continue;
      }

      const attackerName = usedMove.attacker.toLowerCase();
      const attacker = state.player.name.toLowerCase() === attackerName ? state.player : state.opponent;
      const move = attacker.moves.find((entry) => entry.name.toLowerCase() === usedMove.moveName.toLowerCase());
      if (move) {
        return move.type;
      }
    }

    return "normal";
  };

  useEffect(() => {
    screenRef.current?.focus();
    return () => {
      clearAnimationTimeouts();
    };
  }, []);

  useEffect(() => {
    if (!showIntroBanner) {
      return;
    }

    setPhase("intro");
    const timeoutId = window.setTimeout(() => {
      setShowIntroBanner(false);
      setPhase("command");
    }, 850);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [showIntroBanner]);

  useEffect(() => {
    if (phase !== "message") {
      setTypedChars(0);
      return;
    }

    setTypedChars(0);
    if (!currentMessage) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setTypedChars((current) => nextTypedLength(current, currentMessage.length, TYPEWRITER_STEP));
    }, TYPEWRITER_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [phase, currentMessage]);

  useEffect(() => {
    if (state) {
      const maxFightIndex = Math.max(0, state.player.moves.length - 1);
      setSelectedFightIndex((current) => Math.min(current, maxFightIndex));
    }
  }, [state]);

  useEffect(() => {
    if (state && !turnResolving) {
      setDisplayState(state);
    }
  }, [state, turnResolving]);

  useEffect(() => {
    if (phase !== "battle_over" || !state?.winner) {
      setShowWinnerBanner(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowWinnerBanner(true);
    }, 180);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [phase, state?.winner]);

  const restart = () => {
    if (!player || !opponent) {
      return;
    }
    const freshState = createBattle(player.template, opponent.template);
    setState(freshState);
    setDisplayState(freshState);
    setPhase("intro");
    setMessages([]);
    setMessageIndex(0);
    setTypedChars(0);
    setEffectClass("battle-fx-neutral");
    setPlayerAnim("idle");
    setOpponentAnim("idle");
    setSelectedFightIndex(0);
    setTurnResolving(false);
    setImpactFlash(null);
    setArenaPulseActive(false);
    setArenaPulseClass("battle-impact-neutral");
    setShowIntroBanner(true);
    setShowWinnerBanner(false);
    setShowTimelineOverlay(false);
    clearAnimationTimeouts();
  };

  const queueMessages = (nextMessages: string[], nextPhaseAfterMessages: UiPhase) => {
    setMessages(nextMessages.length > 0 ? nextMessages : ["Turn resolved."]);
    setMessageIndex(0);
    setPhase("message");
    if (nextPhaseAfterMessages === "battle_over") {
      // battle_over is set when message queue drains
      return;
    }
  };

  const performMove = (moveId: string) => {
    if (!state || phase !== "command" || state.winner || turnResolving || showIntroBanner) {
      return;
    }

    clearAnimationTimeouts();
    const next = resolveTurn(state, { moveId });
    const nextMessages = extractNewLogMessages(state, next);
    const actionEvents = nextMessages
      .map((message) => {
        const usedMove = parseUsedMoveCue(message);
        const impact = parseImpactCue(message);
        if (!usedMove || !impact) {
          return null;
        }

        const attacker: Combatant = usedMove.attacker.toLowerCase() === state.player.name.toLowerCase() ? "player" : "opponent";
        const attackerTemplate = attacker === "player" ? state.player : state.opponent;
        const moveType =
          attackerTemplate.moves.find((move) => move.name.toLowerCase() === usedMove.moveName.toLowerCase())?.type ?? "normal";
        const target: ImpactTarget = impact.target.toLowerCase() === state.player.name.toLowerCase() ? "player" : "opponent";

        return {
          message,
          attacker,
          target,
          remainingHp: impact.remainingHp,
          effectiveness: impact.effectiveness,
          moveType
        };
      })
      .filter((entry): entry is TurnActionEvent => entry !== null);

    const actionMessages = new Set(actionEvents.map((entry) => entry.message));
    const trailingMessages = nextMessages.filter((message) => !actionMessages.has(message));

    setEffectClass("battle-fx-neutral");
    setTurnResolving(true);
    setPhase("message");
    setMessages(["Resolving turn..."]);
    setMessageIndex(0);
    setTypedChars(0);

    let offset = 0;
    const actionStepMs = 1100;

    actionEvents.forEach((event) => {
      scheduleAnimation(() => {
        setCombatAnimation(event.attacker);
      }, offset + 120);

      scheduleAnimation(() => {
        const nextEffectClass = typeToEffectClass(event.moveType);
        setEffectClass(nextEffectClass);
        setArenaPulseClass(nextEffectClass.replace("battle-fx", "battle-impact"));
        setArenaPulseActive(true);
        setImpactFlash({
          target: event.target,
          damage: parseImpactCue(event.message)?.damage ?? 0,
          effectiveness: event.effectiveness
        });
        setDisplayState((current) => {
          if (!current) {
            return current;
          }
          if (event.target === "player") {
            return { ...current, player: { ...current.player, currentHp: event.remainingHp } };
          }
          return { ...current, opponent: { ...current.opponent, currentHp: event.remainingHp } };
        });
        setMessages([event.message]);
        setMessageIndex(0);
        setTypedChars(0);
      }, offset + DEFAULT_TURN_TIMELINE.impactMs);

      scheduleAnimation(() => {
        setArenaPulseActive(false);
      }, offset + DEFAULT_TURN_TIMELINE.impactMs + 260);

      scheduleAnimation(() => {
        setImpactFlash(null);
      }, offset + 860);

      offset += actionStepMs;
    });

    scheduleAnimation(() => {
      if (next.player.currentHp <= 0) {
        setPlayerAnim("fainted");
      }
      if (next.opponent.currentHp <= 0) {
        setOpponentAnim("fainted");
      }
      setState(next);
      setDisplayState(next);
      if (next.winner) {
        setMessages([]);
        setMessageIndex(0);
        setPhase("battle_over");
      } else if (trailingMessages.length > 0) {
        queueMessages(trailingMessages, "command");
      } else {
        setMessages([]);
        setMessageIndex(0);
        setPhase("command");
      }
      setTurnResolving(false);
      setEffectClass("battle-fx-neutral");
    }, offset + 160);
  };

  const activateFightCommand = (index: number) => {
    if (!state) {
      return;
    }

    const move = state.player.moves[index];
    if (move) {
      if ((move.currentPp ?? 0) <= 0) {
        return;
      }
      performMove(move.id);
    }
  };

  const advanceMessage = () => {
    if (!state || phase !== "message") {
      return;
    }

    const hasMore = messageIndex < messages.length - 1;
    if (hasMore) {
      setMessageIndex((current) => current + 1);
      return;
    }

    if (state.winner) {
      setPhase("battle_over");
      return;
    }

    setMessages([]);
    setMessageIndex(0);
    setPhase("command");
    setEffectClass("battle-fx-neutral");
  };

  const handleMessageAction = () => {
    if (turnResolving) {
      return;
    }

    const isTyping = phase === "message" && !isTypewriterComplete(typedChars, currentMessage.length);
    if (isTyping) {
      setTypedChars(currentMessage.length);
      return;
    }
    advanceMessage();
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (!state) {
      return;
    }

    const isArrow = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key);
    const isConfirm = event.key === "Enter" || event.key === " ";

    if (phase === "message") {
      if (isConfirm && !turnResolving) {
        event.preventDefault();
        handleMessageAction();
      }
      return;
    }

    if (phase === "battle_over") {
      if (isConfirm) {
        event.preventDefault();
        restart();
      }
      return;
    }

    if (phase !== "command") {
      return;
    }

    const fightCount = state.player.moves.length;
    if (isArrow) {
      event.preventDefault();
      setSelectedFightIndex((current) => nextGridIndex(current, event.key as GridDirection, 2, fightCount));
    } else if (isConfirm) {
      event.preventDefault();
      activateFightCommand(selectedFightIndex);
    }
  };

  if (!player || !opponent || player.id === opponent.id || !state) {
    return <div className="card">Invalid battle participants. Return to battle prep and choose two different pokemon.</div>;
  }
  const renderState = displayState ?? state;

  const opponentHpPercent = toHpPercent(renderState.opponent.currentHp, renderState.opponent.stats.hp);
  const playerHpPercent = toHpPercent(renderState.player.currentHp, renderState.player.stats.hp);
  const opponentHpZone = hpBarZone(renderState.opponent.currentHp, renderState.opponent.stats.hp);
  const playerHpZone = hpBarZone(renderState.player.currentHp, renderState.player.stats.hp);
  const shownMessage = currentMessage.slice(0, typedChars);
  const isTypingMessage = phase === "message" && !isTypewriterComplete(typedChars, currentMessage.length);
  const selectedMove = state.player.moves[selectedFightIndex] ?? null;
  const selectedMoveEffectiveness = selectedMove
    ? calculateTypeEffectiveness(selectedMove.type, state.opponent.types)
    : null;
  const predictedTurnOrder = selectedMove ? predictFirstActor(state.player, state.opponent, selectedMove) : null;
  const summary = useMemo(
    () => summarizeBattleLog(state.log, state.player.name, state.opponent.name, state.turn),
    [state.log, state.opponent.name, state.player.name, state.turn]
  );
  const timeline = useMemo(
    () => buildBattleTimeline(state.log, state.player.name, state.opponent.name, Math.max(10, state.log.length)),
    [state.log, state.opponent.name, state.player.name]
  );

  return (
    <section
      ref={screenRef}
      tabIndex={0}
      className={`battle-game-screen ${effectClass}`}
      onKeyDown={handleKeyDown}
      aria-label="Battle match"
    >
      <div className={`battle-stage-arena ${arenaPulseClass} ${arenaPulseActive ? "is-impact-active" : ""}`}>
        <button
          type="button"
          className="battle-log-button"
          onClick={() => setShowTimelineOverlay(true)}
          aria-label="Open battle history"
        >
          Log
        </button>

        <div className="battle-ground battle-ground-opponent" aria-hidden="true" />
        <div className="battle-ground battle-ground-player" aria-hidden="true" />

        <div className="battle-status-opponent">
          <div className="battle-status-header">
            <strong>{renderState.opponent.name.toUpperCase()}</strong>
            <div className="battle-status-header-right">
              {renderState.opponent.status ? (
                <span className={`battle-status-chip status-${renderState.opponent.status.kind}`}>
                  {statusBadgeLabel(renderState.opponent.status.kind)}
                </span>
              ) : null}
              <span>Lv{Math.max(1, Math.round((renderState.opponent.stats.attack + renderState.opponent.stats.speed) / 32))}</span>
            </div>
          </div>
          <div className={`battle-hp-bar zone-${opponentHpZone}`}>
            <div className="battle-hp-fill" style={{ width: `${opponentHpPercent}%` }} />
          </div>
          <p className="battle-last-move">Last: {summary.opponentLastMove ?? "—"}</p>
        </div>

        <div className={`battle-sprite-opponent state-${opponentAnim}`}>
          <SpriteImage
            src={spriteById.get(renderState.opponent.id)?.front}
            alt={`${renderState.opponent.name} sprite`}
            width={160}
            height={160}
          />
          {impactFlash?.target === "opponent" ? (
            <div className={`battle-impact-float effect-${impactFlash.effectiveness}`}>
              <strong>-{impactFlash.damage}</strong>
              {impactFlash.effectiveness === "super" ? <span>SUPER!</span> : null}
              {impactFlash.effectiveness === "resist" ? <span>RESIST</span> : null}
            </div>
          ) : null}
        </div>

        <div className={`battle-sprite-player state-${playerAnim}`}>
          <SpriteImage
            src={spriteById.get(renderState.player.id)?.back ?? spriteById.get(renderState.player.id)?.front}
            alt={`${renderState.player.name} sprite`}
            width={196}
            height={196}
          />
          {impactFlash?.target === "player" ? (
            <div className={`battle-impact-float effect-${impactFlash.effectiveness}`}>
              <strong>-{impactFlash.damage}</strong>
              {impactFlash.effectiveness === "super" ? <span>SUPER!</span> : null}
              {impactFlash.effectiveness === "resist" ? <span>RESIST</span> : null}
            </div>
          ) : null}
        </div>

        <div className="battle-status-player">
          <div className="battle-status-header">
            <strong>{renderState.player.name.toUpperCase()}</strong>
            <div className="battle-status-header-right">
              {renderState.player.status ? (
                <span className={`battle-status-chip status-${renderState.player.status.kind}`}>
                  {statusBadgeLabel(renderState.player.status.kind)}
                </span>
              ) : null}
              <span>Lv{Math.max(1, Math.round((renderState.player.stats.attack + renderState.player.stats.speed) / 32))}</span>
            </div>
          </div>
          <div className={`battle-hp-bar zone-${playerHpZone}`}>
            <div className="battle-hp-fill" style={{ width: `${playerHpPercent}%` }} />
          </div>
          <p>
            HP {renderState.player.currentHp}/{renderState.player.stats.hp}
          </p>
          <p className="battle-last-move">Last: {summary.playerLastMove ?? "—"}</p>
        </div>

        {phase === "battle_over" && state.winner ? (
          <div className={`battle-result-panel ${showWinnerBanner ? "is-visible" : ""}`}>
            <div className="battle-result-title">{winnerBannerText(state.winner)}</div>
            <div className="battle-result-row">
              <button type="button" onClick={restart}>
                Rematch
              </button>
              <button type="button" onClick={() => router.push("/battle")}>
                Back to Prep
              </button>
            </div>
          </div>
        ) : null}

        {showIntroBanner ? <div className="battle-intro-banner is-visible">Battle Start!</div> : null}

        {showTimelineOverlay ? (
          <div className="battle-log-overlay" role="dialog" aria-modal="true" aria-label="Battle history">
            <div className="battle-log-overlay-header">
              <h3>Battle History</h3>
              <button type="button" onClick={() => setShowTimelineOverlay(false)} aria-label="Close battle history">
                Close
              </button>
            </div>
            <ul className="battle-timeline-list battle-log-overlay-list">
              {timeline.map((entry) => (
                <li key={entry.key} className={`battle-timeline-item actor-${entry.actor} event-${entry.eventType}`}>
                  <span className="battle-timeline-turn">{entry.turnLabel}</span>
                  <span className={`battle-timeline-actor actor-${entry.actor}`}>{timelineActorLabel(entry.actor)}</span>
                  <span className="battle-timeline-message">{entry.message}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="battle-command-row">
        <div className="battle-message-box">
          {phase === "intro" ? <p>{state.player.name} enters the arena...</p> : null}
          {phase === "command" ? <p>Choose a move.</p> : null}
          {phase === "message" ? (
            <>
              <p>{shownMessage}</p>
              <button type="button" disabled={turnResolving} onClick={handleMessageAction}>
                {turnResolving ? "..." : isTypingMessage ? "Skip" : "Continue"}
              </button>
            </>
          ) : null}
        </div>

        <div className="battle-command-box">
          {phase === "command" ? (
            <div className="battle-fight-panel">
              <div className="battle-move-grid">
                {state.player.moves.map((move, index) => (
                  <button
                    key={move.id}
                    type="button"
                    className={selectedFightIndex === index ? "is-selected" : undefined}
                    disabled={(move.currentPp ?? 0) <= 0}
                    onMouseEnter={() => setSelectedFightIndex(index)}
                    onFocus={() => setSelectedFightIndex(index)}
                    onClick={() => performMove(move.id)}
                  >
                    {move.name}
                    <small>
                      {move.type.toUpperCase()} {move.power} | PP {move.currentPp ?? 0}/{move.maxPp ?? 0}
                    </small>
                  </button>
                ))}
              </div>
              {selectedMove ? (
                <div className="battle-move-meta">
                  <strong>{selectedMove.name}</strong>
                  <span>{selectedMove.type.toUpperCase()} | Power {selectedMove.power}</span>
                  <span>
                    PP {selectedMove.currentPp ?? 0}/{selectedMove.maxPp ?? 0}
                  </span>
                  <em>{effectivenessHint(selectedMoveEffectiveness ?? 1)}</em>
                  {predictedTurnOrder ? <small>{predictedTurnOrder.reason}</small> : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {phase !== "command" ? <div className="battle-command-disabled" /> : null}
        </div>
      </div>

      {phase === "battle_over" ? (
        <div className="battle-summary-card">
          <h3>Battle Summary</h3>
          <div className="battle-summary-grid">
            <p>
              <span>Turns</span>
              <strong>{summary.turnsCompleted}</strong>
            </p>
            <p>
              <span>Damage Dealt</span>
              <strong>{summary.playerDamageDealt}</strong>
            </p>
            <p>
              <span>Damage Taken</span>
              <strong>{summary.playerDamageTaken}</strong>
            </p>
            <p>
              <span>Result</span>
              <strong>{state.winner === "player" ? "Win" : "Loss"}</strong>
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SpriteImage } from "@/components/sprite-image";

export interface BattlePrepEntry {
  id: string;
  name: string;
  frontSprite: string;
  primaryType: string;
  secondaryType?: string;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
}

interface BattlePrepProps {
  roster: BattlePrepEntry[];
}

type PickerTarget = "player" | "opponent";

const randomOpponent = (roster: BattlePrepEntry[], playerId: string): string | null => {
  const candidates = roster.filter((pokemon) => pokemon.id !== playerId);
  if (candidates.length === 0) {
    return null;
  }
  return candidates[Math.floor(Math.random() * candidates.length)]?.id ?? null;
};

const toPercent = (value: number) => Math.max(0, Math.min(100, Math.round((value / 180) * 100)));

export function BattlePrep({ roster }: BattlePrepProps) {
  const router = useRouter();
  const [playerId, setPlayerId] = useState(roster[0]?.id ?? "");
  const [opponentId, setOpponentId] = useState(() => randomOpponent(roster, roster[0]?.id ?? "") ?? "");
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const [isLaunching, setIsLaunching] = useState(false);

  const player = useMemo(() => roster.find((entry) => entry.id === playerId) ?? null, [playerId, roster]);
  const opponent = useMemo(() => roster.find((entry) => entry.id === opponentId) ?? null, [opponentId, roster]);

  const canStart = Boolean(player && opponent && player.id !== opponent.id);
  const filteredRoster = useMemo(() => {
    const normalized = pickerSearch.trim().toLowerCase();
    if (!normalized) {
      return roster;
    }
    return roster.filter((entry) => entry.name.toLowerCase().includes(normalized));
  }, [pickerSearch, roster]);

  const launchBattle = (nextPlayerId: string, nextOpponentId: string) => {
    setIsLaunching(true);
    window.setTimeout(() => {
      router.push(
        `/battle/match?player=${encodeURIComponent(nextPlayerId)}&opponent=${encodeURIComponent(nextOpponentId)}&entry=1`
      );
    }, 420);
  };

  const assignPokemon = (target: PickerTarget, nextId: string) => {
    if (target === "player") {
      setPlayerId(nextId);
      if (nextId === opponentId) {
        setOpponentId(randomOpponent(roster, nextId) ?? "");
      }
      return;
    }

    setOpponentId(nextId);
    if (nextId === playerId) {
      setPlayerId(randomOpponent(roster, nextId) ?? "");
    }
  };

  if (roster.length < 2) {
    return <div className="card">Need at least two battle-ready Pokemon to start a match.</div>;
  }

  return (
    <section className="battle-prep-panel">
      <div className="battle-vs-layout">
        <button type="button" className="battle-slot-card battle-slot-player" onClick={() => setPickerTarget("player")}>
          <span className="battle-slot-label">You</span>
          {player ? (
            <>
              <SpriteImage src={player.frontSprite} alt={`${player.name} sprite`} width={180} height={180} />
              <h3>{player.name}</h3>
            </>
          ) : (
            <p>Select Pokemon</p>
          )}
        </button>

        <div className="battle-vs-badge">VS</div>

        <button type="button" className="battle-slot-card battle-slot-opponent" onClick={() => setPickerTarget("opponent")}>
          <span className="battle-slot-label">Opponent</span>
          {opponent ? (
            <>
              <SpriteImage src={opponent.frontSprite} alt={`${opponent.name} sprite`} width={180} height={180} />
              <h3>{opponent.name}</h3>
            </>
          ) : (
            <p>Select Pokemon</p>
          )}
        </button>
      </div>

      {!canStart ? <p className="battle-prep-hint">Choose two different Pokemon to start a battle.</p> : null}

      <div className="battle-prep-actions">
        <button
          type="button"
          className="home-menu-button battle-prep-button"
          onClick={() => {
            if (!canStart || isLaunching) {
              return;
            }
            launchBattle(playerId, opponentId);
          }}
          disabled={!canStart || isLaunching}
        >
          {isLaunching ? "Entering Arena..." : "Start Battle"}
        </button>
      </div>

      {pickerTarget ? (
        <div className="battle-picker-overlay" onClick={() => setPickerTarget(null)}>
          <div className="battle-picker-modal" onClick={(event) => event.stopPropagation()}>
            <div className="battle-picker-header">
              <h3>{pickerTarget === "player" ? "Choose Your Pokemon" : "Choose Opponent"}</h3>
              <button type="button" onClick={() => setPickerTarget(null)}>
                Close
              </button>
            </div>

            <label className="battle-picker-search">
              Search
              <input
                value={pickerSearch}
                onChange={(event) => setPickerSearch(event.target.value)}
                placeholder="Name..."
                autoFocus
              />
            </label>

            <div className="battle-picker-grid">
              {filteredRoster.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className="battle-picker-card"
                  onClick={() => {
                    assignPokemon(pickerTarget, entry.id);
                    setPickerTarget(null);
                    setPickerSearch("");
                  }}
                >
                  <div className="battle-picker-card-top">
                    <SpriteImage src={entry.frontSprite} alt={`${entry.name} sprite`} width={84} height={84} />
                    <div>
                      <h4>{entry.name}</h4>
                      <div className="type-badges">
                        <span className={`type-chip type-${entry.primaryType}`}>{entry.primaryType}</span>
                        {entry.secondaryType ? <span className={`type-chip type-${entry.secondaryType}`}>{entry.secondaryType}</span> : null}
                      </div>
                    </div>
                  </div>
                  <div className="pokemon-stats-row">
                    <div className="stat-item stat-hp">
                      <span className="stat-label">HP {entry.hp}</span>
                      <div className="stat-track">
                        <div className="stat-fill" style={{ width: `${toPercent(entry.hp)}%` }} />
                      </div>
                    </div>
                    <div className="stat-item stat-atk">
                      <span className="stat-label">ATK {entry.attack}</span>
                      <div className="stat-track">
                        <div className="stat-fill" style={{ width: `${toPercent(entry.attack)}%` }} />
                      </div>
                    </div>
                    <div className="stat-item stat-def">
                      <span className="stat-label">DEF {entry.defense}</span>
                      <div className="stat-track">
                        <div className="stat-fill" style={{ width: `${toPercent(entry.defense)}%` }} />
                      </div>
                    </div>
                    <div className="stat-item stat-spd">
                      <span className="stat-label">SPD {entry.speed}</span>
                      <div className="stat-track">
                        <div className="stat-fill" style={{ width: `${toPercent(entry.speed)}%` }} />
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {isLaunching ? (
        <div className="battle-launch-overlay" role="status" aria-live="polite">
          <div className="battle-launch-card">
            <strong>Entering Arena...</strong>
            <span>Preparing battle sequence</span>
          </div>
        </div>
      ) : null}
    </section>
  );
}

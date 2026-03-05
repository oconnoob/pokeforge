"use client";

import { useMemo, useState } from "react";
import {
  createBattle,
  resolveTurn,
  type BattlePokemonTemplate,
  type BattleState
} from "@pokeforge/battle-engine";

export interface BattleRosterEntry {
  id: string;
  name: string;
  frontSprite: string;
  template: BattlePokemonTemplate;
}

interface BattleArenaProps {
  roster: BattleRosterEntry[];
}

const randomOpponent = (roster: BattleRosterEntry[], playerId: string): BattleRosterEntry | null => {
  const candidates = roster.filter((pokemon) => pokemon.id !== playerId);
  if (candidates.length === 0) {
    return null;
  }

  return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
};

const hpPercent = (current: number, total: number) => `${Math.max(0, (current / total) * 100).toFixed(0)}%`;

export function BattleArena({ roster }: BattleArenaProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState(roster[0]?.id ?? "");
  const [state, setState] = useState<BattleState | null>(null);

  const selectedPlayer = useMemo(() => roster.find((pokemon) => pokemon.id === selectedPlayerId), [roster, selectedPlayerId]);
  const spriteById = useMemo(() => new Map(roster.map((entry) => [entry.id, entry.frontSprite])), [roster]);

  const startBattle = () => {
    if (!selectedPlayer) {
      return;
    }

    const opponent = randomOpponent(roster, selectedPlayer.id);
    if (!opponent) {
      return;
    }

    setState(createBattle(selectedPlayer.template, opponent.template));
  };

  const performMove = (moveId: string) => {
    if (!state || state.winner) {
      return;
    }

    const next = resolveTurn(state, { moveId });
    setState(next);
  };

  if (roster.length < 2) {
    return (
      <section className="card">
        <p>Need at least two battle-ready Pokemon to start a match.</p>
      </section>
    );
  }

  return (
    <section className="card" style={{ display: "grid", gap: "1rem" }}>
      <div style={{ display: "grid", gap: "0.5rem" }}>
        <h2>Start New Match</h2>
        <label htmlFor="player-pokemon">Choose your Pokemon</label>
        <select
          id="player-pokemon"
          value={selectedPlayerId}
          onChange={(event) => setSelectedPlayerId(event.target.value)}
          disabled={Boolean(state && !state.winner)}
        >
          {roster.map((pokemon) => (
            <option key={pokemon.id} value={pokemon.id}>
              {pokemon.name}
            </option>
          ))}
        </select>
        <div>
          <button type="button" onClick={startBattle}>
            {state ? "Restart Battle" : "Start Battle"}
          </button>
        </div>
      </div>

      {state ? (
        <>
          <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "1fr 1fr" }}>
            <div className="card">
              <h3>{state.player.name} (You)</h3>
              <img src={spriteById.get(state.player.id)} alt={`${state.player.name} sprite`} width={64} height={64} />
              <p>
                HP: {state.player.currentHp}/{state.player.stats.hp} ({hpPercent(state.player.currentHp, state.player.stats.hp)})
              </p>
              <p>Status: {state.player.status?.kind ?? "none"}</p>
            </div>
            <div className="card">
              <h3>{state.opponent.name} (Opponent)</h3>
              <img src={spriteById.get(state.opponent.id)} alt={`${state.opponent.name} sprite`} width={64} height={64} />
              <p>
                HP: {state.opponent.currentHp}/{state.opponent.stats.hp} ({hpPercent(state.opponent.currentHp, state.opponent.stats.hp)})
              </p>
              <p>Status: {state.opponent.status?.kind ?? "none"}</p>
            </div>
          </div>

          {state.winner ? (
            <p>{state.winner === "player" ? "You won the battle." : "You lost the battle."}</p>
          ) : (
            <div style={{ display: "grid", gap: "0.5rem" }}>
              <h3>Choose Move</h3>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {state.player.moves.map((move) => (
                  <button key={move.id} type="button" onClick={() => performMove(move.id)}>
                    {move.name} ({move.type})
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="card">
            <h3>Battle Log</h3>
            <ul>
              {state.log.slice(-12).map((event, index) => (
                <li key={`${event.turn}-${index}`}>T{event.turn}: {event.message}</li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <p>Start a match to begin the battle loop.</p>
      )}
    </section>
  );
}

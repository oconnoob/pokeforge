"use client";

import { useMemo, useState } from "react";
import {
  createBattle,
  resolveTurn,
  type BattleState,
  type BattlePokemonTemplate
} from "@pokeforge/battle-engine";
import { BATTLE_ROSTER, findRosterPokemon } from "@/lib/pokemon/battle-roster";

const randomOpponent = (playerId: string): BattlePokemonTemplate => {
  const candidates = BATTLE_ROSTER.filter((pokemon) => pokemon.id !== playerId);
  return candidates[Math.floor(Math.random() * candidates.length)] ?? BATTLE_ROSTER[0];
};

const hpPercent = (current: number, total: number) => `${Math.max(0, (current / total) * 100).toFixed(0)}%`;

export function BattleArena() {
  const [selectedPlayerId, setSelectedPlayerId] = useState(BATTLE_ROSTER[0]?.id ?? "");
  const [state, setState] = useState<BattleState | null>(null);

  const selectedPlayer = useMemo(() => findRosterPokemon(selectedPlayerId), [selectedPlayerId]);

  const startBattle = () => {
    if (!selectedPlayer) {
      return;
    }

    const opponent = randomOpponent(selectedPlayer.id);
    setState(createBattle(selectedPlayer, opponent));
  };

  const performMove = (moveId: string) => {
    if (!state || state.winner) {
      return;
    }

    const next = resolveTurn(state, { moveId });
    setState(next);
  };

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
          {BATTLE_ROSTER.map((pokemon) => (
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
              <p>
                HP: {state.player.currentHp}/{state.player.stats.hp} ({hpPercent(state.player.currentHp, state.player.stats.hp)})
              </p>
              <p>Status: {state.player.status?.kind ?? "none"}</p>
            </div>
            <div className="card">
              <h3>{state.opponent.name} (Opponent)</h3>
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

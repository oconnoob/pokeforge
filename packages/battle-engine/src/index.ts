export interface PokemonStats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
}

export interface BattlePokemon {
  id: string;
  name: string;
  stats: PokemonStats;
}

export const calculateBaseDamage = (attacker: BattlePokemon, defender: BattlePokemon): number => {
  const raw = attacker.stats.attack - Math.floor(defender.stats.defense / 2);
  return Math.max(1, raw);
};

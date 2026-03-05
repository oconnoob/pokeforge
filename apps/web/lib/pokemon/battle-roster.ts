import { type BattlePokemonTemplate } from "@pokeforge/battle-engine";

const makeMove = (
  id: string,
  name: string,
  type: BattlePokemonTemplate["types"][number],
  power: number,
  accuracy: number,
  inflictStatus?: { kind: "burn" | "poison"; chance: number; turns: number }
) => ({
  id,
  name,
  type,
  power,
  accuracy,
  inflictStatus
});

export const BATTLE_ROSTER: BattlePokemonTemplate[] = [
  {
    id: "charizard",
    name: "Charizard",
    types: ["fire"],
    stats: { hp: 110, attack: 92, defense: 78, speed: 100 },
    moves: [
      makeMove("flamethrower", "Flamethrower", "fire", 78, 0.95, { kind: "burn", chance: 0.25, turns: 2 }),
      makeMove("slash", "Slash", "normal", 65, 1),
      makeMove("rock-smash", "Rock Smash", "fighting", 50, 1),
      makeMove("heat-wave", "Heat Wave", "fire", 90, 0.85)
    ]
  },
  {
    id: "blastoise",
    name: "Blastoise",
    types: ["water"],
    stats: { hp: 118, attack: 84, defense: 100, speed: 80 },
    moves: [
      makeMove("surf", "Surf", "water", 75, 1),
      makeMove("ice-beam", "Ice Beam", "ice", 70, 0.95),
      makeMove("headbutt", "Headbutt", "normal", 60, 1),
      makeMove("mud-shot", "Mud Shot", "ground", 55, 0.95)
    ]
  },
  {
    id: "venusaur",
    name: "Venusaur",
    types: ["grass"],
    stats: { hp: 116, attack: 86, defense: 88, speed: 82 },
    moves: [
      makeMove("razor-leaf", "Razor Leaf", "grass", 72, 0.95),
      makeMove("venom-vine", "Venom Vine", "grass", 48, 1, { kind: "poison", chance: 0.35, turns: 2 }),
      makeMove("tackle", "Tackle", "normal", 50, 1),
      makeMove("earth-knock", "Earth Knock", "ground", 62, 0.95)
    ]
  },
  {
    id: "pikachu",
    name: "Pikachu",
    types: ["electric"],
    stats: { hp: 92, attack: 78, defense: 58, speed: 112 },
    moves: [
      makeMove("thunderbolt", "Thunderbolt", "electric", 78, 0.92),
      makeMove("quick-attack", "Quick Attack", "normal", 45, 1, undefined),
      makeMove("volt-tackle", "Volt Tackle", "electric", 96, 0.78),
      makeMove("iron-tail", "Iron Tail", "normal", 70, 0.85)
    ]
  },
  {
    id: "gengar",
    name: "Gengar",
    types: ["psychic"],
    stats: { hp: 98, attack: 84, defense: 70, speed: 106 },
    moves: [
      makeMove("mind-burst", "Mind Burst", "psychic", 80, 0.9),
      makeMove("haunt", "Haunt", "psychic", 55, 1, { kind: "poison", chance: 0.3, turns: 2 }),
      makeMove("shadow-jab", "Shadow Jab", "normal", 58, 1),
      makeMove("ice-pulse", "Ice Pulse", "ice", 65, 0.95)
    ]
  },
  {
    id: "dragonite",
    name: "Dragonite",
    types: ["normal"],
    stats: { hp: 128, attack: 102, defense: 92, speed: 86 },
    moves: [
      makeMove("dragon-crush", "Dragon Crush", "normal", 88, 0.9),
      makeMove("fire-punch", "Fire Punch", "fire", 70, 0.95, { kind: "burn", chance: 0.2, turns: 2 }),
      makeMove("aqua-tail", "Aqua Tail", "water", 76, 0.9),
      makeMove("wing-strike", "Wing Strike", "normal", 64, 1)
    ]
  }
];

export const findRosterPokemon = (pokemonId: string): BattlePokemonTemplate | undefined =>
  BATTLE_ROSTER.find((pokemon) => pokemon.id === pokemonId);

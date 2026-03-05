import { type BattleMove, type BattlePokemonTemplate, type PokemonType } from "@pokeforge/battle-engine";

export type PokemonSourceType = "builtin" | "generated";

export interface PokemonCatalogEntry {
  id: string;
  name: string;
  sourceType: PokemonSourceType;
  primaryType: PokemonType;
  secondaryType?: PokemonType;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  frontSprite: string;
  backSprite: string;
  moves: BattleMove[];
}

export const createDefaultMovesForType = (pokemonName: string, type: PokemonType): BattleMove[] => {
  const slug = pokemonName.toLowerCase();

  const makeMove = (
    key: string,
    name: string,
    moveType: PokemonType,
    power: number,
    accuracy: number,
    inflictStatus?: { kind: "burn" | "poison"; chance: number; turns: number }
  ): BattleMove => ({
    id: `${slug}-${key}`,
    name,
    type: moveType,
    power,
    accuracy,
    inflictStatus
  });

  switch (type) {
    case "fire":
      return [
        makeMove("flame-burst", "Flame Burst", "fire", 78, 0.92, { kind: "burn", chance: 0.25, turns: 2 }),
        makeMove("heat-wave", "Heat Wave", "fire", 90, 0.84),
        makeMove("tackle", "Tackle", "normal", 52, 1),
        makeMove("rock-smash", "Rock Smash", "fighting", 50, 1)
      ];
    case "water":
      return [
        makeMove("surf", "Surf", "water", 76, 0.96),
        makeMove("ice-pulse", "Ice Pulse", "ice", 72, 0.92),
        makeMove("headbutt", "Headbutt", "normal", 58, 1),
        makeMove("mud-shot", "Mud Shot", "ground", 60, 0.95)
      ];
    case "grass":
      return [
        makeMove("razor-leaf", "Razor Leaf", "grass", 74, 0.94),
        makeMove("venom-vine", "Venom Vine", "grass", 48, 1, { kind: "poison", chance: 0.35, turns: 2 }),
        makeMove("slam", "Slam", "normal", 55, 0.98),
        makeMove("earth-knock", "Earth Knock", "ground", 60, 0.94)
      ];
    case "electric":
      return [
        makeMove("thunderbolt", "Thunderbolt", "electric", 80, 0.9),
        makeMove("volt-tackle", "Volt Tackle", "electric", 94, 0.78),
        makeMove("quick-attack", "Quick Attack", "normal", 48, 1),
        makeMove("iron-tail", "Iron Tail", "normal", 70, 0.86)
      ];
    case "fighting":
      return [
        makeMove("focus-strike", "Focus Strike", "fighting", 82, 0.9),
        makeMove("hammer-arm", "Hammer Arm", "fighting", 92, 0.8),
        makeMove("body-blow", "Body Blow", "normal", 58, 1),
        makeMove("rock-throw", "Rock Throw", "rock", 66, 0.9)
      ];
    case "psychic":
      return [
        makeMove("mind-burst", "Mind Burst", "psychic", 82, 0.9),
        makeMove("haunt", "Haunt", "psychic", 54, 1, { kind: "poison", chance: 0.25, turns: 2 }),
        makeMove("psy-wave", "Psy Wave", "psychic", 70, 0.95),
        makeMove("blink-strike", "Blink Strike", "normal", 50, 1)
      ];
    case "rock":
      return [
        makeMove("stone-edge", "Stone Edge", "rock", 88, 0.83),
        makeMove("rock-slide", "Rock Slide", "rock", 74, 0.92),
        makeMove("earth-crack", "Earth Crack", "ground", 66, 0.9),
        makeMove("body-slam", "Body Slam", "normal", 60, 1)
      ];
    case "ground":
      return [
        makeMove("earthquake", "Earthquake", "ground", 86, 0.9),
        makeMove("mud-shot", "Mud Shot", "ground", 60, 0.95),
        makeMove("rock-throw", "Rock Throw", "rock", 65, 0.9),
        makeMove("slam", "Slam", "normal", 56, 0.98)
      ];
    case "ice":
      return [
        makeMove("ice-beam", "Ice Beam", "ice", 80, 0.9),
        makeMove("frost-bite", "Frost Bite", "ice", 68, 0.96),
        makeMove("tackle", "Tackle", "normal", 52, 1),
        makeMove("aqua-jab", "Aqua Jab", "water", 58, 0.95)
      ];
    default:
      return [
        makeMove("slam", "Slam", "normal", 60, 1),
        makeMove("rush", "Rush", "normal", 72, 0.92),
        makeMove("body-blow", "Body Blow", "normal", 56, 1),
        makeMove("quick-hit", "Quick Hit", "normal", 44, 1)
      ];
  }
};

const createBuiltin = (
  id: string,
  name: string,
  primaryType: PokemonType,
  stats: { hp: number; attack: number; defense: number; speed: number },
  secondaryType?: PokemonType
): PokemonCatalogEntry => ({
  id,
  name,
  sourceType: "builtin",
  primaryType,
  secondaryType,
  hp: stats.hp,
  attack: stats.attack,
  defense: stats.defense,
  speed: stats.speed,
  frontSprite: `/sprites/${name.toLowerCase()}_front.png`,
  backSprite: `/sprites/${name.toLowerCase()}_back.png`,
  moves: createDefaultMovesForType(name, primaryType)
});

export const BUILTIN_POKEMON_CATALOG: PokemonCatalogEntry[] = [
  createBuiltin("pikachu", "Pikachu", "electric", { hp: 92, attack: 78, defense: 58, speed: 112 }),
  createBuiltin("charizard", "Charizard", "fire", { hp: 110, attack: 92, defense: 78, speed: 100 }),
  createBuiltin("blastoise", "Blastoise", "water", { hp: 118, attack: 84, defense: 100, speed: 80 }),
  createBuiltin("venusaur", "Venusaur", "grass", { hp: 116, attack: 86, defense: 88, speed: 82 }),
  createBuiltin("gengar", "Gengar", "psychic", { hp: 98, attack: 84, defense: 70, speed: 106 }),
  createBuiltin("alakazam", "Alakazam", "psychic", { hp: 94, attack: 74, defense: 60, speed: 114 }),
  createBuiltin("dragonite", "Dragonite", "normal", { hp: 128, attack: 102, defense: 92, speed: 86 }),
  createBuiltin("snorlax", "Snorlax", "normal", { hp: 140, attack: 96, defense: 86, speed: 38 }),
  createBuiltin("lapras", "Lapras", "water", { hp: 130, attack: 82, defense: 86, speed: 62 }),
  createBuiltin("arcanine", "Arcanine", "fire", { hp: 116, attack: 98, defense: 80, speed: 96 }),
  createBuiltin("gyarados", "Gyarados", "water", { hp: 122, attack: 100, defense: 82, speed: 90 }),
  createBuiltin("machamp", "Machamp", "fighting", { hp: 124, attack: 102, defense: 86, speed: 62 }),
  createBuiltin("jolteon", "Jolteon", "electric", { hp: 94, attack: 74, defense: 62, speed: 120 }),
  createBuiltin("vaporeon", "Vaporeon", "water", { hp: 132, attack: 74, defense: 72, speed: 70 }),
  createBuiltin("flareon", "Flareon", "fire", { hp: 108, attack: 108, defense: 72, speed: 72 }),
  createBuiltin("gardevoir", "Gardevoir", "psychic", { hp: 108, attack: 76, defense: 76, speed: 86 }),
  createBuiltin("scizor", "Scizor", "rock", { hp: 104, attack: 100, defense: 94, speed: 74 }),
  createBuiltin("tyranitar", "Tyranitar", "rock", { hp: 128, attack: 106, defense: 96, speed: 72 }),
  createBuiltin("salamence", "Salamence", "normal", { hp: 124, attack: 104, defense: 84, speed: 100 }),
  createBuiltin("metagross", "Metagross", "psychic", { hp: 124, attack: 100, defense: 98, speed: 78 }),
  createBuiltin("mewtwo", "Mewtwo", "psychic", { hp: 124, attack: 98, defense: 82, speed: 118 }),
  createBuiltin("eevee", "Eevee", "normal", { hp: 88, attack: 60, defense: 58, speed: 68 }),
  createBuiltin("deoxys", "Deoxys", "psychic", { hp: 104, attack: 100, defense: 70, speed: 120 })
];

export const toBattleTemplate = (entry: PokemonCatalogEntry): BattlePokemonTemplate => ({
  id: entry.id,
  name: entry.name,
  types: [entry.primaryType, entry.secondaryType].filter(Boolean) as PokemonType[],
  stats: {
    hp: entry.hp,
    attack: entry.attack,
    defense: entry.defense,
    speed: entry.speed
  },
  moves: entry.moves
});

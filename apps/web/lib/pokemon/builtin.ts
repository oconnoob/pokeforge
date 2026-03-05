export const BUILTIN_POKEMON_NAMES = [
  "Pikachu",
  "Charizard",
  "Blastoise",
  "Venusaur",
  "Gengar",
  "Alakazam",
  "Dragonite",
  "Snorlax",
  "Lapras",
  "Arcanine",
  "Gyarados",
  "Machamp",
  "Jolteon",
  "Vaporeon",
  "Flareon",
  "Lucario",
  "Gardevoir",
  "Scizor",
  "Tyranitar",
  "Salamence",
  "Metagross",
  "Mewtwo",
  "Eevee",
  "Deoxys"
] as const;

export const toSpriteFileName = (pokemonName: string, side: "front" | "back") =>
  `${pokemonName.toLowerCase()}_${side}.png`;

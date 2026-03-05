import { BUILTIN_POKEMON_NAMES, toSpriteFileName } from "@/lib/pokemon/builtin";

export default function LibraryPage() {
  return (
    <main>
      <h1>Pokemon Library</h1>
      <p>Initial placeholder view. This page will query Supabase for built-in and generated Pokemon.</p>
      <div className="card">
        <h2>Built-ins (v1 seed)</h2>
        <ul>
          {BUILTIN_POKEMON_NAMES.map((name) => (
            <li key={name}>
              {name} ({toSpriteFileName(name, "front")}, {toSpriteFileName(name, "back")})
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

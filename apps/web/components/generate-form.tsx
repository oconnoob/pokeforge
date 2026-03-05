"use client";

import { useState } from "react";

interface GeneratedPokemon {
  id: string;
  name: string;
  sourceType: "generated" | "builtin";
  primaryType: string;
  secondaryType?: string;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  frontSprite: string;
  backSprite: string;
}

export function GenerateForm() {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedPokemon, setGeneratedPokemon] = useState<GeneratedPokemon | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsGenerating(true);
    setError(null);
    setGeneratedPokemon(null);

    try {
      const response = await fetch("/api/pokemon/generate", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ prompt })
      });

      const json = await response.json();

      if (!response.ok) {
        setError(json.error ?? "Generation failed.");
        return;
      }

      setGeneratedPokemon(json.pokemon as GeneratedPokemon);
      setPrompt("");
    } catch {
      setError("Network error while generating pokemon.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <section className="card" style={{ display: "grid", gap: "1rem" }}>
      <form onSubmit={submit} style={{ display: "grid", gap: "0.75rem" }}>
        <label htmlFor="prompt">Pokemon idea prompt</label>
        <textarea
          id="prompt"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          minLength={10}
          maxLength={400}
          rows={5}
          placeholder="Describe your custom pokemon, its vibe, type, and battle identity..."
          required
        />
        <button type="submit" disabled={isGenerating}>
          {isGenerating ? "Generating..." : "Generate Pokemon"}
        </button>
      </form>

      {error ? <p>{error}</p> : null}

      {generatedPokemon ? (
        <div className="card">
          <h2>{generatedPokemon.name}</h2>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <img src={generatedPokemon.frontSprite} alt={`${generatedPokemon.name} front`} width={64} height={64} />
            <img src={generatedPokemon.backSprite} alt={`${generatedPokemon.name} back`} width={64} height={64} />
          </div>
          <p>
            Type: {generatedPokemon.primaryType}
            {generatedPokemon.secondaryType ? `/${generatedPokemon.secondaryType}` : ""}
          </p>
          <p>
            Stats: HP {generatedPokemon.hp} | ATK {generatedPokemon.attack} | DEF {generatedPokemon.defense} | SPD {generatedPokemon.speed}
          </p>
          <p>Added to your library. Refresh `/library` to confirm.</p>
        </div>
      ) : null}
    </section>
  );
}

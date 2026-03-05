"use client";

import { useEffect, useState } from "react";
import { fetchJsonOrThrow, HttpError } from "@/lib/http/client";
import { CREATE_API_PATH } from "@/lib/routes";
import { CreatePokemonPreviewCard } from "@/components/create-pokemon-preview-card";

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

const CREATE_PROGRESS_STEPS = [
  "Analyzing your concept...",
  "Creating new look...",
  "Building a moveset...",
  "Balancing stats...",
  "Finishing battle profile..."
] as const;

export function GenerateForm() {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedPokemon, setGeneratedPokemon] = useState<GeneratedPokemon | null>(null);
  const [progressIndex, setProgressIndex] = useState(0);

  useEffect(() => {
    if (!isGenerating) {
      setProgressIndex(0);
      return;
    }

    setProgressIndex(0);
    const intervalId = window.setInterval(() => {
      setProgressIndex((current) => Math.min(current + 1, CREATE_PROGRESS_STEPS.length - 1));
    }, 2200);

    return () => window.clearInterval(intervalId);
  }, [isGenerating]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsGenerating(true);
    setError(null);
    setGeneratedPokemon(null);

    try {
      const json = await fetchJsonOrThrow<{ pokemon: GeneratedPokemon }>(CREATE_API_PATH, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ prompt })
      });
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("pokeforge:refresh-library-once", "1");
      }
      setGeneratedPokemon(json.pokemon);
      setPrompt("");
    } catch (requestError) {
      if (requestError instanceof HttpError && requestError.status === 401) {
        return;
      }
      if (requestError instanceof HttpError) {
        setError(requestError.message);
        return;
      }
      setError("Network error while creating pokemon.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <section className="create-form-panel">
      <form onSubmit={submit} className="create-form">
        <label htmlFor="prompt" className="create-form-label">
          Pokemon idea prompt
        </label>
        <textarea
          id="prompt"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          minLength={10}
          maxLength={400}
          rows={6}
          placeholder="Describe your custom pokemon, its vibe, type, and battle identity..."
          required
          className="create-form-textarea"
        />
        <button type="submit" disabled={isGenerating} className="home-menu-button create-submit-button">
          {isGenerating ? "Creating..." : "Create Pokemon"}
        </button>
      </form>

      {isGenerating ? (
        <div className="create-progress" role="status" aria-live="polite">
          <ol className="create-progress-steps">
            {CREATE_PROGRESS_STEPS.map((step, index) => (
              <li
                key={step}
                className={index < progressIndex ? "is-complete" : index === progressIndex ? "is-active" : undefined}
              >
                <span className="create-progress-icon" aria-hidden="true">
                  {index < progressIndex ? "✓" : index === progressIndex ? <span className="create-spinner" /> : null}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {error ? <p className="create-error">{error}</p> : null}

      {generatedPokemon ? (
        <CreatePokemonPreviewCard
          name={generatedPokemon.name}
          primaryType={generatedPokemon.primaryType}
          secondaryType={generatedPokemon.secondaryType}
          hp={generatedPokemon.hp}
          attack={generatedPokemon.attack}
          defense={generatedPokemon.defense}
          speed={generatedPokemon.speed}
          frontSprite={generatedPokemon.frontSprite}
        />
      ) : null}
    </section>
  );
}

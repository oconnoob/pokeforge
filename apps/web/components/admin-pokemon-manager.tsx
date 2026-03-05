"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { fetchJsonOrThrow, HttpError } from "@/lib/http/client";

interface AdminPokemonRecord {
  id: string;
  name: string;
  source_type: "builtin" | "generated";
  owner_user_id: string | null;
  primary_type: string;
  secondary_type: string | null;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
}

interface AdminPokemonManagerProps {
  pokemon: AdminPokemonRecord[];
}

export function AdminPokemonManager({ pokemon }: AdminPokemonManagerProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string>(pokemon[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

  const selectedPokemon = useMemo(
    () => pokemon.find((entry) => entry.id === selectedId) ?? null,
    [pokemon, selectedId]
  );

  const [form, setForm] = useState({
    name: "",
    primary_type: "normal",
    secondary_type: "",
    hp: 80,
    attack: 80,
    defense: 80,
    speed: 80
  });

  useEffect(() => {
    if (!selectedPokemon) {
      return;
    }

    setForm({
      name: selectedPokemon.name,
      primary_type: selectedPokemon.primary_type,
      secondary_type: selectedPokemon.secondary_type ?? "",
      hp: selectedPokemon.hp,
      attack: selectedPokemon.attack,
      defense: selectedPokemon.defense,
      speed: selectedPokemon.speed
    });
    setStatus(null);
  }, [selectedPokemon]);

  const updateField = (key: keyof typeof form, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSave = () => {
    if (!selectedPokemon) {
      return;
    }

    setStatus(null);

    startTransition(async () => {
      try {
        await fetchJsonOrThrow(`/api/admin/pokemon/${selectedPokemon.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            primary_type: form.primary_type,
            secondary_type: form.secondary_type || null,
            hp: Number(form.hp),
            attack: Number(form.attack),
            defense: Number(form.defense),
            speed: Number(form.speed)
          })
        });

        setStatus("Saved.");
        router.refresh();
      } catch (error) {
        if (error instanceof HttpError && error.status === 401) {
          return;
        }
        setStatus(error instanceof HttpError ? error.message : "Update failed");
      }
    });
  };

  const onDelete = () => {
    if (!selectedPokemon) {
      return;
    }

    if (selectedPokemon.source_type !== "generated") {
      setStatus("Built-in pokemon cannot be deleted.");
      return;
    }

    if (!window.confirm(`Delete ${selectedPokemon.name}? This removes associated sprites and generated moves.`)) {
      return;
    }

    setStatus(null);

    startTransition(async () => {
      try {
        await fetchJsonOrThrow(`/api/pokemon/${selectedPokemon.id}`, { method: "DELETE" });
        setStatus("Deleted.");
        router.refresh();
      } catch (error) {
        if (error instanceof HttpError && error.status === 401) {
          return;
        }
        setStatus(error instanceof HttpError ? error.message : "Delete failed");
      }
    });
  };

  if (pokemon.length === 0) {
    return <div className="card">No pokemon records found.</div>;
  }

  return (
    <section className="card" style={{ display: "grid", gap: "1rem" }}>
      <h2>Pokemon Management</h2>
      <label htmlFor="admin-pokemon-select">Select Pokemon</label>
      <select id="admin-pokemon-select" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
        {pokemon.map((entry) => (
          <option key={entry.id} value={entry.id}>
            {entry.name} [{entry.source_type}] {entry.owner_user_id ? `(owner: ${entry.owner_user_id.slice(0, 8)}...)` : ""}
          </option>
        ))}
      </select>

      {selectedPokemon ? (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          <p>
            Baseline: HP {selectedPokemon.hp} / ATK {selectedPokemon.attack} / DEF {selectedPokemon.defense} / SPD {selectedPokemon.speed}
          </p>

          <label>
            Name
            <input value={form.name} onChange={(event) => updateField("name", event.target.value)} />
          </label>

          <label>
            Primary Type
            <input value={form.primary_type} onChange={(event) => updateField("primary_type", event.target.value)} />
          </label>

          <label>
            Secondary Type (optional)
            <input value={form.secondary_type} onChange={(event) => updateField("secondary_type", event.target.value)} />
          </label>

          <label>
            HP
            <input type="number" value={form.hp} onChange={(event) => updateField("hp", Number(event.target.value))} />
          </label>

          <label>
            Attack
            <input
              type="number"
              value={form.attack}
              onChange={(event) => updateField("attack", Number(event.target.value))}
            />
          </label>

          <label>
            Defense
            <input
              type="number"
              value={form.defense}
              onChange={(event) => updateField("defense", Number(event.target.value))}
            />
          </label>

          <label>
            Speed
            <input type="number" value={form.speed} onChange={(event) => updateField("speed", Number(event.target.value))} />
          </label>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="button" onClick={onSave} disabled={isPending}>
              {isPending ? "Saving..." : "Save Updates"}
            </button>
            <button type="button" onClick={onDelete} disabled={isPending}>
              {isPending ? "Working..." : "Delete Pokemon"}
            </button>
          </div>

          {status ? <p>{status}</p> : null}
        </div>
      ) : null}
    </section>
  );
}

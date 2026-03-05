"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

interface DeletePokemonButtonProps {
  pokemonId: string;
  pokemonName: string;
}

export function DeletePokemonButton({ pokemonId, pokemonName }: DeletePokemonButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const onDelete = () => {
    if (!window.confirm(`Delete ${pokemonName}? This removes sprites and related battle data.`)) {
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/pokemon/${pokemonId}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: "Delete failed" }));
        window.alert(payload.error ?? "Delete failed");
        return;
      }
      router.refresh();
    });
  };

  return (
    <button type="button" onClick={onDelete} disabled={isPending}>
      {isPending ? "Deleting..." : "Delete"}
    </button>
  );
}

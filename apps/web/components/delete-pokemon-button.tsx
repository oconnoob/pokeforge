"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { fetchJsonOrThrow, HttpError } from "@/lib/http/client";

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
      try {
        await fetchJsonOrThrow(`/api/pokemon/${pokemonId}`, { method: "DELETE" });
        router.refresh();
      } catch (error) {
        if (error instanceof HttpError && error.status === 401) {
          return;
        }
        window.alert(error instanceof HttpError ? error.message : "Delete failed");
        return;
      }
    });
  };

  return (
    <button type="button" onClick={onDelete} disabled={isPending}>
      {isPending ? "Deleting..." : "Delete"}
    </button>
  );
}

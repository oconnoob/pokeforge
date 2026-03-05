"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthMode = "login" | "signup";

interface AuthFormProps {
  mode: AuthMode;
}

export function AuthForm({ mode }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    const supabase = createSupabaseBrowserClient();

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      setMessage(error ? error.message : "Account created. Please verify your email.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setMessage(error ? error.message : "Logged in. Open /battle to continue.");
  };

  return (
    <form onSubmit={submit} className="card" style={{ display: "grid", gap: "0.75rem" }}>
      <label>
        Email
        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      </label>
      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          required
        />
      </label>
      <button type="submit">{mode === "signup" ? "Create Account" : "Login"}</button>
      {message ? <p>{message}</p> : null}
    </form>
  );
}

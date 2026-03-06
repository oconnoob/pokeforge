"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthMode = "login" | "signup";

interface AuthFormProps {
  mode: AuthMode;
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"neutral" | "error" | "success">("neutral");

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setMessageTone("neutral");
    const supabase = createSupabaseBrowserClient();

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setMessage(error.message);
        setMessageTone("error");
      } else {
        setMessage("Account created. Please verify your email.");
        setMessageTone("success");
      }
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(error.message);
      setMessageTone("error");
      return;
    }

    setMessage("Login successful. Redirecting...");
    setMessageTone("success");
    const nextPath = searchParams.get("next");
    router.replace(nextPath && nextPath.startsWith("/") ? nextPath : "/");
  };

  return (
    <form onSubmit={submit} className="auth-form">
      <label className="auth-field">
        <span className="auth-field-label">Email</span>
        <input
          className="auth-input"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>
      <label className="auth-field">
        <span className="auth-field-label">Password</span>
        <input
          className="auth-input"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          required
        />
      </label>
      <button type="submit" className="home-menu-button auth-submit-button">
        {mode === "signup" ? "Create Account" : "Login"}
      </button>
      {message ? (
        <p className={`auth-message${messageTone !== "neutral" ? ` is-${messageTone}` : ""}`}>{message}</p>
      ) : null}
    </form>
  );
}

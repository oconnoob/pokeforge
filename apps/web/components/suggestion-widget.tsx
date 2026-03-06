"use client";

import { FormEvent, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { HttpError, fetchJsonOrThrow } from "@/lib/http/client";

interface SuggestionSubmitResponse {
  suggestion: {
    id: string;
    status: "queued" | "running" | "pr_opened" | "failed";
  };
  automationStarted: boolean;
  error?: string;
}

const MIN_MESSAGE_LENGTH = 10;

export function SuggestionWidget() {
  const pathname = usePathname();
  const shouldRender = useMemo(() => {
    if (!pathname) {
      return false;
    }
    return !pathname.startsWith("/auth/");
  }, [pathname]);

  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<"neutral" | "error" | "success">("neutral");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!shouldRender) {
    return null;
  }

  const closePanel = () => {
    setIsOpen(false);
    setIsSubmitting(false);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = message.trim();
    if (trimmed.length < MIN_MESSAGE_LENGTH) {
      setStatusMessage("Please share at least 10 characters so Codex has enough context.");
      setStatusTone("error");
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);
    setStatusTone("neutral");

    try {
      const response = await fetchJsonOrThrow<SuggestionSubmitResponse>("/api/suggestions", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          message: trimmed
        })
      });

      if (response.automationStarted) {
        setStatusMessage("Suggestion submitted. Codex automation has started.");
        setStatusTone("success");
      } else {
        setStatusMessage(response.error ?? "Suggestion saved. Automation is currently disabled.");
        setStatusTone("neutral");
      }

      setMessage("");
    } catch (error) {
      if (error instanceof HttpError && typeof error.payload === "object" && error.payload !== null) {
        const maybeMessage = "error" in error.payload ? String(error.payload.error) : "Unable to submit suggestion.";
        setStatusMessage(maybeMessage);
      } else {
        setStatusMessage("Unable to submit suggestion.");
      }
      setStatusTone("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="suggestion-fab"
        aria-label="Open suggestion box"
        onClick={() => setIsOpen((current) => !current)}
      >
        💡
      </button>
      {isOpen ? (
        <section className="suggestion-panel" role="dialog" aria-label="Submit product suggestion">
          <header className="suggestion-panel-header">
            <h2>Suggestion</h2>
            <button type="button" className="suggestion-close" onClick={closePanel} aria-label="Close suggestion panel">
              ✕
            </button>
          </header>
          <form onSubmit={submit} className="suggestion-form">
            <label className="suggestion-label" htmlFor="suggestion-message">
              Tell us what should change
            </label>
            <textarea
              id="suggestion-message"
              className="suggestion-textarea"
              placeholder="Example: Fire pokemon feel overtuned in early turns. Rebalance move damage."
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={1200}
              rows={5}
            />
            <div className="suggestion-actions">
              <button type="button" className="suggestion-secondary" onClick={closePanel}>
                Cancel
              </button>
              <button type="submit" className="home-menu-button suggestion-submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Send"}
              </button>
            </div>
            {statusMessage ? <p className={`suggestion-feedback is-${statusTone}`}>{statusMessage}</p> : null}
          </form>
        </section>
      ) : null}
    </>
  );
}

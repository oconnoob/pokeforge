"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
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

interface SuggestionRecord {
  id: string;
  message: string;
  status: "queued" | "running" | "pr_opened" | "failed";
  github_pr_url: string | null;
  github_branch: string | null;
  github_run_url: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

interface SuggestionListResponse {
  suggestions: SuggestionRecord[];
}

const MIN_MESSAGE_LENGTH = 10;
const HISTORY_POLL_MS = 15_000;

const STATUS_LABEL: Record<SuggestionRecord["status"], string> = {
  queued: "Queued",
  running: "Running",
  pr_opened: "PR Opened",
  failed: "Failed"
};

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
  const [recentSuggestions, setRecentSuggestions] = useState<SuggestionRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  if (!shouldRender) {
    return null;
  }

  const closePanel = () => {
    setIsOpen(false);
    setIsSubmitting(false);
  };

  const fetchHistory = useCallback(
    async (isInitialLoad = false) => {
      if (isInitialLoad) {
        setIsLoadingHistory(true);
      }
      try {
        const response = await fetchJsonOrThrow<SuggestionListResponse>("/api/suggestions", {
          method: "GET",
          cache: "no-store"
        });
        setRecentSuggestions(response.suggestions ?? []);
        setHistoryError(null);
      } catch (error) {
        if (!(error instanceof HttpError && error.status === 401)) {
          setHistoryError("Unable to refresh suggestion status right now.");
        }
      } finally {
        if (isInitialLoad) {
          setIsLoadingHistory(false);
        }
      }
    },
    [setRecentSuggestions]
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    void fetchHistory(true);
    const timer = window.setInterval(() => {
      void fetchHistory(false);
    }, HISTORY_POLL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [isOpen, fetchHistory]);

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
      void fetchHistory(false);
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
          <section className="suggestion-history" aria-live="polite">
            <header className="suggestion-history-header">
              <h3>Recent Submissions</h3>
              {isLoadingHistory ? <span className="suggestion-history-state">Refreshing...</span> : null}
            </header>
            {historyError ? <p className="suggestion-feedback is-error">{historyError}</p> : null}
            {recentSuggestions.length === 0 ? (
              <p className="suggestion-history-empty">No suggestions submitted yet.</p>
            ) : (
              <ul className="suggestion-history-list">
                {recentSuggestions.map((suggestion) => (
                  <li key={suggestion.id} className={`suggestion-history-item is-${suggestion.status}`}>
                    <div className="suggestion-history-row">
                      <span className="suggestion-history-status">{STATUS_LABEL[suggestion.status]}</span>
                      <time dateTime={suggestion.created_at}>{new Date(suggestion.created_at).toLocaleString()}</time>
                    </div>
                    <p className="suggestion-history-message">{suggestion.message}</p>
                    <div className="suggestion-history-links">
                      {suggestion.github_pr_url ? (
                        <a href={suggestion.github_pr_url} target="_blank" rel="noreferrer">
                          View PR
                        </a>
                      ) : null}
                      {suggestion.github_run_url ? (
                        <a href={suggestion.github_run_url} target="_blank" rel="noreferrer">
                          Workflow Run
                        </a>
                      ) : null}
                      {suggestion.status === "failed" && suggestion.error_message ? (
                        <span className="suggestion-history-error">{suggestion.error_message}</span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </section>
      ) : null}
    </>
  );
}

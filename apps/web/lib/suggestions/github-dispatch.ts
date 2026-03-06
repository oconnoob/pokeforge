import { getEnv } from "@/lib/config/env";

export interface SuggestionDispatchInput {
  suggestionId: string;
  message: string;
  userId: string;
  userEmail?: string | null;
}

const MAX_MESSAGE_LENGTH = 1200;

export const isSuggestionAutomationEnabled = () => getEnv().ENABLE_SUGGESTION_AUTOMATION === "true";

const requireGithubDispatchConfig = () => {
  const env = getEnv();
  if (!env.GITHUB_AUTOMATION_TOKEN || !env.GITHUB_REPO_OWNER || !env.GITHUB_REPO_NAME) {
    throw new Error("Suggestion automation is enabled, but GitHub dispatch configuration is incomplete.");
  }

  return {
    token: env.GITHUB_AUTOMATION_TOKEN,
    owner: env.GITHUB_REPO_OWNER,
    repo: env.GITHUB_REPO_NAME,
    baseBranch: env.GITHUB_REPO_DEFAULT_BRANCH ?? "main"
  };
};

export const dispatchSuggestionWorkflow = async (input: SuggestionDispatchInput) => {
  const config = requireGithubDispatchConfig();
  const response = await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}/dispatches`, {
    method: "POST",
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${config.token}`,
      "content-type": "application/json",
      "x-github-api-version": "2022-11-28"
    },
    body: JSON.stringify({
      event_type: "codex_suggestion",
      client_payload: {
        suggestion_id: input.suggestionId,
        suggestion_message: input.message.slice(0, MAX_MESSAGE_LENGTH),
        user_id: input.userId,
        user_email: input.userEmail ?? null,
        base_branch: config.baseBranch,
        submitted_at: new Date().toISOString()
      }
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub dispatch failed (${response.status}): ${body}`);
  }
};

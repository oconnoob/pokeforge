import { writeFile } from "node:fs/promises";
import { Codex } from "@openai/codex-sdk";

const required = (name) => {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`${name} is required.`);
  }
  return value;
};

const suggestionId = required("SUGGESTION_ID");
const suggestionMessage = required("SUGGESTION_MESSAGE");
const apiKey = required("CODEX_API_KEY");
const model = process.env.CODEX_MODEL || "gpt-5-codex";

const codex = new Codex({
  apiKey
});

const thread = codex.startThread({
  model,
  workingDirectory: process.cwd(),
  sandboxMode: "workspace-write",
  approvalPolicy: "never",
  webSearchMode: "disabled"
});

const prompt = `
You are implementing a user-reported suggestion/bug in this repository.

Suggestion ID: ${suggestionId}
User feedback:
${suggestionMessage}

Requirements:
- Make minimal, production-safe changes directly in the repository.
- Follow existing code style and architecture.
- Add or update tests when behavior changes.
- Do not use destructive git commands.
- If the suggestion is ambiguous, choose a pragmatic interpretation and document assumptions.
- After edits, provide a concise summary of what changed and why.
`;

const turn = await thread.run(prompt);
const summary = turn.finalResponse || "No summary returned by Codex.";

await writeFile(".codex-suggestion-summary.md", `${summary}\n`, "utf8");
console.log(summary);

const blockedPatterns: RegExp[] = [
  /\bself-harm\b/i,
  /\bsuicide\b/i,
  /\bterroris(m|t)\b/i,
  /\bchild sexual\b/i,
  /\bracist slur\b/i,
  /\bhate crime\b/i
];

export interface PromptSafetyResult {
  safe: boolean;
  reason?: string;
}

export const evaluatePromptSafety = (prompt: string): PromptSafetyResult => {
  for (const pattern of blockedPatterns) {
    if (pattern.test(prompt)) {
      return {
        safe: false,
        reason: "Prompt violates content policy constraints for this demo."
      };
    }
  }

  return { safe: true };
};

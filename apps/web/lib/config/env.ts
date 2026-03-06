import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  ADMIN_EMAILS: z.string().optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  CODEX_API_KEY: z.string().min(1).optional(),
  CODEX_MODEL: z.string().min(1).optional(),
  ENABLE_BEHAVIOR_V2: z.enum(["true", "false"]).optional(),
  ENABLE_STRICT_BALANCE_GATE: z.enum(["true", "false"]).optional(),
  ENABLE_SUGGESTION_AUTOMATION: z.enum(["true", "false"]).optional(),
  GITHUB_AUTOMATION_TOKEN: z.string().min(1).optional(),
  GITHUB_REPO_OWNER: z.string().min(1).optional(),
  GITHUB_REPO_NAME: z.string().min(1).optional(),
  GITHUB_REPO_DEFAULT_BRANCH: z.string().min(1).optional()
});

export const getEnv = () =>
  envSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ADMIN_EMAILS: process.env.ADMIN_EMAILS,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    CODEX_API_KEY: process.env.CODEX_API_KEY,
    CODEX_MODEL: process.env.CODEX_MODEL,
    ENABLE_BEHAVIOR_V2: process.env.ENABLE_BEHAVIOR_V2,
    ENABLE_STRICT_BALANCE_GATE: process.env.ENABLE_STRICT_BALANCE_GATE,
    ENABLE_SUGGESTION_AUTOMATION: process.env.ENABLE_SUGGESTION_AUTOMATION,
    GITHUB_AUTOMATION_TOKEN: process.env.GITHUB_AUTOMATION_TOKEN,
    GITHUB_REPO_OWNER: process.env.GITHUB_REPO_OWNER,
    GITHUB_REPO_NAME: process.env.GITHUB_REPO_NAME,
    GITHUB_REPO_DEFAULT_BRANCH: process.env.GITHUB_REPO_DEFAULT_BRANCH
  });

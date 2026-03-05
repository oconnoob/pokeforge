interface AdminCandidate {
  email?: string | null;
  app_metadata?: Record<string, unknown>;
}

const toLower = (value: string) => value.trim().toLowerCase();

export const parseAdminEmails = (raw: string | undefined): string[] => {
  if (!raw) {
    return [];
  }

  return raw
    .split(",")
    .map((entry) => toLower(entry))
    .filter((entry) => entry.length > 0);
};

export const isAdminUser = (user: AdminCandidate, adminEmails: string[]): boolean => {
  if (!user) {
    return false;
  }

  const email = user.email ? toLower(user.email) : "";
  const role = typeof user.app_metadata?.role === "string" ? toLower(user.app_metadata.role) : "";
  const isEmailAdmin = email.length > 0 && adminEmails.includes(email);

  return isEmailAdmin || role === "admin";
};

const decodeBase64Url = (value: string): string => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return atob(normalized + padding);
};

export const parseJwtExpiration = (token: string): number | null => {
  const parts = token.split(".");
  if (parts.length !== 3 || !parts[1]) {
    return null;
  }

  try {
    const payload: unknown = JSON.parse(decodeBase64Url(parts[1]));
    if (
      typeof payload !== "object" ||
      payload === null ||
      !("exp" in payload) ||
      !Number.isSafeInteger(payload.exp) ||
      Number(payload.exp) <= 0
    ) {
      return null;
    }
    return Number(payload.exp);
  } catch {
    return null;
  }
};

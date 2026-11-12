/**
 * Returns the value when it is a path inside this app, otherwise null.
 * Used for ?redirect= after login so a crafted link cannot send the user to
 * another site (for example //evil.example or /\evil.example, which browsers
 * and React Router treat as external).
 */
export function safeRedirectPath(value: string | null): string | null {
  if (!value || !value.startsWith("/")) return null;
  if (value.startsWith("//") || value.includes("\\")) return null;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(value)) return null;
  return value;
}

export function jwtExpMs(token: string | null | undefined): number | null {
  if (!token) return null;
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const data = JSON.parse(atob(padded)) as { exp?: unknown };
    return typeof data.exp === "number" ? data.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function accessTokenFresh(token: string | null | undefined, skewMs = 60_000): token is string {
  const exp = jwtExpMs(token);
  return Boolean(token && exp && exp - skewMs > Date.now());
}

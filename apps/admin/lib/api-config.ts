const LOCAL_API_URL = "http://127.0.0.1:8000";
const PRODUCTION_API_URL = "https://najik-api-p9k2m7q.onrender.com";

function normalizeUrl(url: string) {
  return url.replace(/\/$/, "");
}

function isLocalHostname(hostname: string) {
  // Always use production API (Render) even on localhost
  return false;
}

/**
 * Resolve API base URL from where the admin UI is opened.
 * - localhost / 127.0.0.1 -> local Django
 * - Vercel / production domains -> Render API
 */
export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    return isLocalHostname(window.location.hostname)
      ? LOCAL_API_URL
      : PRODUCTION_API_URL;
  }

  if (process.env.NODE_ENV === "development") {
    return LOCAL_API_URL;
  }

  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (envUrl) {
    return normalizeUrl(envUrl);
  }

  return PRODUCTION_API_URL;
}

export function isProductionApiUrl(url = getApiBaseUrl()) {
  return url.includes("onrender.com");
}

export { LOCAL_API_URL, PRODUCTION_API_URL };

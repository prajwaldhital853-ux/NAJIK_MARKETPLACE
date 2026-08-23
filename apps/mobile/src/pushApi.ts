import { withAppAuth } from "./authApi";
import { api } from "./api";

export async function registerPushToken(payload: {
  token: string;
  platform: "android" | "ios";
  device_name?: string;
}) {
  return withAppAuth((token) =>
    api<{ ok: boolean; id: string }>("/api/notices/push-token/", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  );
}

export async function unregisterPushToken(pushToken?: string) {
  return withAppAuth((token) =>
    api<{ ok: boolean }>("/api/notices/push-token/unregister/", {
      method: "POST",
      token,
      body: JSON.stringify(pushToken ? { token: pushToken } : {}),
    }),
  );
}

import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { useEffect, useRef } from "react";
import { AppState, Platform, type AppStateStatus } from "react-native";
import type { AppUser } from "../types";
import { registerPushToken, unregisterPushToken } from "../pushApi";
import { navigationRef } from "../navigation/navigationRef";
import { openInboxNoticeTarget } from "../navigation/browse";

let appState: AppStateStatus = AppState.currentState;

Notifications.setNotificationHandler({
  handleNotification: async () => {
    const foreground = appState === "active";
    return {
      shouldShowAlert: !foreground,
      shouldPlaySound: !foreground,
      shouldSetBadge: false,
      shouldShowBanner: !foreground,
      shouldShowList: !foreground,
    };
  },
});

async function ensureAndroidChannels() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "General",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 200, 120, 200],
  });
  await Notifications.setNotificationChannelAsync("messages", {
    name: "Messages",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 200, 120, 200],
  });
  await Notifications.setNotificationChannelAsync("bookings", {
    name: "Bookings",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 200, 120, 200],
  });
  await Notifications.setNotificationChannelAsync("listings", {
    name: "Listings",
    importance: Notifications.AndroidImportance.HIGH,
  });
}

async function ensureNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

function resolveProjectId(): string | null {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    Constants.expoConfig?.extra?.easProjectId ??
    null
  );
}

/** Run once on app start — channels + permission before any auth/modals. */
export async function bootstrapPushNotifications() {
  if (!Device.isDevice) return;
  await ensureAndroidChannels();
  await ensureNotificationPermission();
}

async function resolveExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;

  await ensureAndroidChannels();

  const granted = await ensureNotificationPermission();
  if (!granted) return null;

  const projectId = resolveProjectId();
  if (!projectId) {
    console.warn("[push] Missing EAS projectId in app config.");
    return null;
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data;
  } catch (err) {
    console.warn("[push] getExpoPushTokenAsync failed:", err);
    return null;
  }
}

function readNoticePayload(data: Record<string, unknown> | undefined) {
  if (!data) return null;
  const kind = typeof data.kind === "string" ? data.kind : "";
  const target = typeof data.target === "string" ? data.target : "";
  const target_id = typeof data.target_id === "string" ? data.target_id : "";
  if (!kind && !target && !target_id) return null;
  return { kind, target, target_id };
}

function handleNoticeOpen(user: AppUser | null, payload: { kind: string; target: string; target_id: string }) {
  if (!navigationRef.isReady()) return;
  openInboxNoticeTarget(navigationRef, payload, user);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function usePushNotifications(user: AppUser | null) {
  const tokenRef = useRef<string | null>(null);
  const userRef = useRef(user);
  userRef.current = user;

  useEffect(() => {
    void bootstrapPushNotifications();
    const sub = AppState.addEventListener("change", (state) => {
      appState = state;
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const payload = readNoticePayload(response.notification.request.content.data as Record<string, unknown>);
      if (payload) handleNoticeOpen(userRef.current, payload);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void Notifications.getLastNotificationResponseAsync().then((response) => {
        if (!response) return;
        const payload = readNoticePayload(response.notification.request.content.data as Record<string, unknown>);
        if (payload) handleNoticeOpen(userRef.current, payload);
      });
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function syncToken(attempt = 0) {
      if (!userRef.current) {
        const old = tokenRef.current;
        tokenRef.current = null;
        if (old) {
          try {
            await unregisterPushToken(old);
          } catch {
            /* ignore */
          }
        }
        return;
      }

      const pushToken = await resolveExpoPushToken();
      if (!pushToken || cancelled) {
        if (!cancelled && userRef.current && attempt < 4) {
          await sleep(1500 * (attempt + 1));
          if (!cancelled && userRef.current) void syncToken(attempt + 1);
          return;
        }
        if (!cancelled && userRef.current) {
          console.warn("[push] No Expo push token — allow notifications in Android settings, then reopen the app.");
        }
        return;
      }

      if (tokenRef.current === pushToken) return;

      tokenRef.current = pushToken;
      try {
        await registerPushToken({
          token: pushToken,
          platform: Platform.OS === "ios" ? "ios" : "android",
          device_name: Device.modelName || undefined,
        });
        console.info("[push] Registered with API:", pushToken.slice(0, 28) + "...");
      } catch (err) {
        console.warn("[push] Failed to register token with API:", err);
        tokenRef.current = null;
        if (!cancelled && attempt < 4) {
          await sleep(2000 * (attempt + 1));
          if (!cancelled && userRef.current) void syncToken(attempt + 1);
        }
      }
    }

    void syncToken();

    const appSub = AppState.addEventListener("change", (state) => {
      if (state === "active" && userRef.current) void syncToken();
    });

    return () => {
      cancelled = true;
      appSub.remove();
    };
  }, [user?.id]);
}

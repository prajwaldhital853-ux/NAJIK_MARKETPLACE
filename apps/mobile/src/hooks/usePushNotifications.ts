import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import type { AppUser } from "../types";
import { registerPushToken, unregisterPushToken } from "../pushApi";
import { navigationRef } from "../navigation/navigationRef";
import { openInboxNoticeTarget } from "../navigation/browse";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: false,
  }),
});

async function ensureAndroidChannels() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "General",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 120, 200],
  });
  await Notifications.setNotificationChannelAsync("messages", {
    name: "Messages",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 120, 200],
  });
  await Notifications.setNotificationChannelAsync("bookings", {
    name: "Bookings",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 120, 200],
  });
  await Notifications.setNotificationChannelAsync("listings", {
    name: "Listings",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

async function resolveExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;

  await ensureAndroidChannels();

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    Constants.expoConfig?.extra?.easProjectId;

  if (!projectId) return null;

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
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

export function usePushNotifications(user: AppUser | null) {
  const tokenRef = useRef<string | null>(null);
  const userRef = useRef(user);
  userRef.current = user;

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

    async function syncToken() {
      if (!user) {
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
      if (!pushToken || cancelled) return;

      tokenRef.current = pushToken;
      try {
        await registerPushToken({
          token: pushToken,
          platform: Platform.OS === "ios" ? "ios" : "android",
          device_name: Device.modelName || undefined,
        });
      } catch {
        /* retry on next login / foreground */
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

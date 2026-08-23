import { useAuth } from "../context/AuthContext";
import { usePushNotifications } from "../hooks/usePushNotifications";

/** Registers Expo push token and handles notification taps. */
export function PushNotificationsBridge() {
  const { user } = useAuth();
  usePushNotifications(user);
  return null;
}

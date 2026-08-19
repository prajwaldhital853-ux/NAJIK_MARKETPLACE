import { Alert } from "react-native";
import { setLoginHint } from "./loginHint";

type KickFn = (message: string) => Promise<void> | void;

let sessionActive = false;
let kicking = false;
let kickFn: KickFn | null = null;

export const BLOCKED_SESSION_MESSAGE =
  "This account is blocked. A NAJIK admin paused it, so you cannot use the app until they reactivate it.";
export const DEACTIVATED_SESSION_MESSAGE =
  "This account is deactivated. A NAJIK admin turned it off, so you cannot use the app until they activate it again.";

export function setAuthSessionActive(active: boolean) {
  sessionActive = active;
  if (active) kicking = false;
}

export function setSessionKickHandler(fn: KickFn | null) {
  kickFn = fn;
}

export function isForcedOfflineMessage(message: string) {
  const text = message.toLowerCase();
  return /blocked|deactivat|paused|inactive/.test(text) && !/invalid credentials/.test(text);
}

export function sessionMessageFor(raw: string) {
  const text = raw.toLowerCase();
  if (text.includes("deactivat")) return DEACTIVATED_SESSION_MESSAGE;
  if (text.includes("block") || text.includes("paused") || text.includes("inactive")) return BLOCKED_SESSION_MESSAGE;
  return raw;
}

export function noteForcedOffline(message: string, status: number) {
  if (!sessionActive || kicking || status !== 401) return;
  if (!isForcedOfflineMessage(message)) return;
  kicking = true;
  const next = sessionMessageFor(message);
  setLoginHint(next);
  const run = kickFn;
  Alert.alert("Signed out", next);
  if (run) void run(next);
}

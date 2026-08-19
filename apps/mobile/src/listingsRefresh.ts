import { DeviceEventEmitter } from "react-native";

export const LISTINGS_CHANGED = "najik.listings.changed";
export const APP_REFRESH = "najik.app.refresh";

export function emitListingsChanged() {
  DeviceEventEmitter.emit(LISTINGS_CHANGED);
}

export function subscribeListingsChanged(onChange: () => void) {
  const sub = DeviceEventEmitter.addListener(LISTINGS_CHANGED, onChange);
  return () => sub.remove();
}

export function emitAppRefresh() {
  DeviceEventEmitter.emit(APP_REFRESH);
  emitListingsChanged();
}

export function subscribeAppRefresh(onChange: () => void) {
  const sub = DeviceEventEmitter.addListener(APP_REFRESH, onChange);
  return () => sub.remove();
}

export async function pullAppRefresh() {
  emitAppRefresh();
}

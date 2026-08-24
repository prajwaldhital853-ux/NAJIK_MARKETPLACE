import { DeviceEventEmitter } from "react-native";

export const WALLET_CHANGED = "najik.wallet.changed";

export function emitWalletChanged() {
  DeviceEventEmitter.emit(WALLET_CHANGED);
}

export function subscribeWalletChanged(onChange: () => void) {
  const sub = DeviceEventEmitter.addListener(WALLET_CHANGED, onChange);
  return () => sub.remove();
}

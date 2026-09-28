import { Platform } from "react-native";

/**
 * Bottom inset for layouts that must sit above the Android gesture navigation bar.
 * On many devices insets.bottom is 0 even though a ~24–48px system bar is visible.
 */
export function bottomSafeInset(insetsBottom: number, extra = 8): number {
  if (Platform.OS === "android") {
    if (insetsBottom < 16) {
      return 32 + extra;
    }
    return insetsBottom + extra;
  }
  return Math.max(insetsBottom, 10) + extra;
}

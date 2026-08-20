import { Appearance } from "react-native";
import * as SystemUI from "expo-system-ui";

/**
 * Keep NAJIK on light appearance even if the phone is in dark mode.
 * Native builds also disable Android force-dark via the Expo config plugin.
 */
export function forceLightMode() {
  Appearance.setColorScheme("light");
  void SystemUI.setBackgroundColorAsync("#FFFFFF");
}

export function subscribeForceLightMode() {
  forceLightMode();
  const sub = Appearance.addChangeListener(() => {
    forceLightMode();
  });
  return () => sub.remove();
}

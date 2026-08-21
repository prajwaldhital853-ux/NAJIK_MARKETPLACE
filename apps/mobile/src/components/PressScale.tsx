import type { ReactNode } from "react";
import { Pressable, type StyleProp, type ViewStyle } from "react-native";

type Props = {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  hitSlop?: number | { top?: number; bottom?: number; left?: number; right?: number };
};

export function PressScale({ children, onPress, onLongPress, style, disabled, hitSlop }: Props) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      onLongPress={onLongPress}
      hitSlop={hitSlop}
      style={({ pressed }) => [style, pressed ? { opacity: 0.7 } : null]}
    >
      {children}
    </Pressable>
  );
}

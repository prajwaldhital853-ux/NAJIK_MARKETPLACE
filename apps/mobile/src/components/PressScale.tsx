import type { ReactNode } from "react";
import { Pressable, type StyleProp, type ViewStyle } from "react-native";

type Props = {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
};

export function PressScale({ children, onPress, style, disabled }: Props) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [style, pressed ? { opacity: 0.7 } : null]}
    >
      {children}
    </Pressable>
  );
}

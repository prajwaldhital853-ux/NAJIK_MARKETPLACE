import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type KeyboardScroll = {
  onInputFocus: () => void;
};

const KeyboardScrollContext = createContext<KeyboardScroll>({
  onInputFocus: () => {},
});

export function useKeyboardScroll() {
  return useContext(KeyboardScrollContext);
}

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  adjustKeyboardInsets?: boolean;
};

export function KeyboardScreen({ children, style, contentStyle, adjustKeyboardInsets = true }: Props) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hide = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () => {
      setKeyboardHeight(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  function onInputFocus() {
    requestAnimationFrame(() => {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    });
  }

  return (
    <KeyboardAvoidingView
      style={[{ flex: 1 }, style]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
    >
      <KeyboardScrollContext.Provider value={{ onInputFocus }}>
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets={adjustKeyboardInsets}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            {
              flexGrow: 1,
              paddingBottom: Math.max(insets.bottom, 16) + (Platform.OS === "android" ? keyboardHeight : 0) + 12,
            },
            contentStyle,
          ]}
        >
          {children}
        </ScrollView>
      </KeyboardScrollContext.Provider>
    </KeyboardAvoidingView>
  );
}

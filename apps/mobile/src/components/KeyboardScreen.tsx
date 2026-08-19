import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import {
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  type NativeSyntheticEvent,
  type StyleProp,
  type TextInputFocusEventData,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { pullAppRefresh } from "../listingsRefresh";

type KeyboardScroll = {
  onInputFocus: (event?: NativeSyntheticEvent<TextInputFocusEventData>) => void;
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
  fill?: boolean;
  enableRefresh?: boolean;
  onRefresh?: () => Promise<void> | void;
  refreshing?: boolean;
};

export function useAppRefreshControl(onRefresh?: () => Promise<void> | void) {
  const [refreshing, setRefreshing] = useState(false);
  async function handleRefresh() {
    setRefreshing(true);
    try {
      await (onRefresh ? onRefresh() : pullAppRefresh());
    } finally {
      setRefreshing(false);
    }
  }
  return (
    <RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} tintColor="#1B7D2C" colors={["#1B7D2C"]} />
  );
}

const BUTTON_GAP = 112;

export function KeyboardScreen({
  children,
  style,
  contentStyle,
  adjustKeyboardInsets = true,
  fill = true,
  enableRefresh = true,
  onRefresh,
  refreshing: refreshingProp,
}: Props) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const keyboardHeightRef = useRef(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  function scrollFocusedIntoView() {
    const kb = keyboardHeightRef.current;
    if (kb <= 0) return;
    const input = TextInput.State.currentlyFocusedInput?.();
    if (!input) {
      scrollRef.current?.scrollToEnd({ animated: true });
      return;
    }
    requestAnimationFrame(() => {
      input.measureInWindow((_x, y, _w, h) => {
        const keyboardTop = Dimensions.get("window").height - kb;
        const overflow = y + h + BUTTON_GAP - keyboardTop;
        if (overflow > 8) {
          scrollRef.current?.scrollTo({
            y: Math.max(0, scrollYRef.current + overflow),
            animated: true,
          });
        }
      });
    });
  }

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvent, (event) => {
      const next = event.endCoordinates.height;
      keyboardHeightRef.current = next;
      setKeyboardHeight(next);
      setTimeout(scrollFocusedIntoView, Platform.OS === "ios" ? 40 : 60);
    });
    const hide = Keyboard.addListener(hideEvent, () => {
      keyboardHeightRef.current = 0;
      setKeyboardHeight(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  function onInputFocus(_event?: NativeSyntheticEvent<TextInputFocusEventData>) {
    setTimeout(scrollFocusedIntoView, Platform.OS === "ios" ? 50 : 180);
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await (onRefresh ? onRefresh() : pullAppRefresh());
    } finally {
      setRefreshing(false);
    }
  }

  const flat = StyleSheet.flatten(contentStyle) ?? {};
  const userBottom =
    typeof flat.paddingBottom === "number"
      ? flat.paddingBottom
      : typeof flat.padding === "number"
        ? flat.padding
        : Math.max(insets.bottom, 16);

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
          nestedScrollEnabled
          scrollEventThrottle={16}
          refreshControl={
            enableRefresh ? (
              <RefreshControl refreshing={refreshingProp ?? refreshing} onRefresh={() => void handleRefresh()} tintColor="#1B7D2C" colors={["#1B7D2C"]} />
            ) : undefined
          }
          onScroll={(event) => {
            scrollYRef.current = event.nativeEvent.contentOffset.y;
          }}
          contentContainerStyle={[
            fill ? { flexGrow: 1 } : null,
            flat,
            {
              paddingBottom:
                userBottom +
                (Platform.OS === "android" ? keyboardHeight : 0) +
                (keyboardHeight > 0 ? BUTTON_GAP : 12),
            },
          ]}
        >
          {children}
        </ScrollView>
      </KeyboardScrollContext.Provider>
    </KeyboardAvoidingView>
  );
}

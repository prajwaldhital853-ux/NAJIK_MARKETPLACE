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
  View,
  type NativeSyntheticEvent,
  type StyleProp,
  type TextInputFocusEventData,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { pullAppRefresh } from "../listingsRefresh";

type KeyboardScroll = {
  onInputFocus: (event?: NativeSyntheticEvent<TextInputFocusEventData>) => void;
  scrollAnchorIntoView: (target: View | null) => void;
  /** True while the user is dragging/flinging the form scroll view. */
  isScrollDragging: () => boolean;
};

const KeyboardScrollContext = createContext<KeyboardScroll>({
  onInputFocus: () => {},
  scrollAnchorIntoView: () => {},
  isScrollDragging: () => false,
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
  /** Keep keyboard open while scrolling; default dismisses on drag. */
  keyboardDismissMode?: "none" | "on-drag" | "interactive";
  /** Sticky footer / chrome height below the scroll area (keeps focused fields above it). */
  bottomChrome?: number;
  /** Optional sticky footer rendered under the scroll view (inside keyboard avoiding). */
  footer?: ReactNode;
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
  keyboardDismissMode = "on-drag",
  bottomChrome = 0,
  footer,
}: Props) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const keyboardHeightRef = useRef(0);
  const keyboardTopRef = useRef(0);
  const bottomChromeRef = useRef(bottomChrome);
  const draggingRef = useRef(false);
  const dragClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    bottomChromeRef.current = bottomChrome;
  }, [bottomChrome]);

  useEffect(() => {
    return () => {
      if (dragClearTimer.current) clearTimeout(dragClearTimer.current);
    };
  }, []);

  function markDragging(active: boolean) {
    if (dragClearTimer.current) {
      clearTimeout(dragClearTimer.current);
      dragClearTimer.current = null;
    }
    if (active) {
      draggingRef.current = true;
      return;
    }
    // Keep the flag briefly so momentum / late focus events don't open inputs.
    dragClearTimer.current = setTimeout(() => {
      draggingRef.current = false;
      dragClearTimer.current = null;
    }, 140);
  }

  /** Keep focused fields above sticky footer and/or the keyboard. */
  function visibleBottomY() {
    const chrome = bottomChromeRef.current;
    const windowH = Dimensions.get("window").height;
    const kbTop = keyboardTopRef.current;
    if (kbTop > 0) {
      // Sit just above the keyboard. Reserving full sticky chrome pushes fields too high.
      return kbTop - 12;
    }
    return windowH - (chrome > 0 ? chrome + 8 : BUTTON_GAP);
  }

  function scrollFocusedIntoView() {
    const input = TextInput.State.currentlyFocusedInput?.();
    if (!input) return;
    requestAnimationFrame(() => {
      input.measureInWindow((_x, y, _w, h) => {
        const overflow = y + h - visibleBottomY();
        if (overflow > 4) {
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
      keyboardTopRef.current = event.endCoordinates.screenY;
      setKeyboardHeight(next);
      setTimeout(scrollFocusedIntoView, Platform.OS === "ios" ? 40 : 80);
      if (Platform.OS === "android") {
        setTimeout(scrollFocusedIntoView, 220);
      }
    });
    const hide = Keyboard.addListener(hideEvent, () => {
      keyboardHeightRef.current = 0;
      keyboardTopRef.current = 0;
      setKeyboardHeight(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  function onInputFocus(_event?: NativeSyntheticEvent<TextInputFocusEventData>) {
    if (draggingRef.current) {
      TextInput.State.currentlyFocusedInput?.()?.blur();
      return;
    }
    setTimeout(scrollFocusedIntoView, Platform.OS === "ios" ? 50 : 120);
    if (Platform.OS === "android") {
      setTimeout(scrollFocusedIntoView, 280);
    }
  }

  function isScrollDragging() {
    return draggingRef.current;
  }

  function scrollAnchorIntoView(target: View | null) {
    if (!target) return;
    requestAnimationFrame(() => {
      target.measureInWindow((_x, y, _w, h) => {
        const idealTop = 72;
        const idealBottom = visibleBottomY() - 8;
        const fieldH = h || 56;
        let delta = 0;
        if (y < idealTop) delta = y - idealTop;
        else if (y + fieldH > idealBottom) delta = y + fieldH - idealBottom;
        if (Math.abs(delta) > 4) {
          scrollRef.current?.scrollTo({
            y: Math.max(0, scrollYRef.current + delta),
            animated: true,
          });
        }
      });
    });
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

  // Extra room so focused fields near the end can scroll above keyboard + sticky footer.
  const extraPad =
    bottomChrome > 0
      ? 24 + (keyboardHeight > 0 ? 64 : 0)
      : (Platform.OS === "android" ? keyboardHeight : 0) + (keyboardHeight > 0 ? BUTTON_GAP : 12);

  return (
    <KeyboardAvoidingView
      style={[{ flex: 1 }, style]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
    >
      <KeyboardScrollContext.Provider value={{ onInputFocus, scrollAnchorIntoView, isScrollDragging }}>
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          keyboardShouldPersistTaps={keyboardDismissMode === "none" ? "always" : "handled"}
          keyboardDismissMode={keyboardDismissMode}
          automaticallyAdjustKeyboardInsets={adjustKeyboardInsets && bottomChrome <= 0}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          scrollEventThrottle={16}
          refreshControl={
            enableRefresh ? (
              <RefreshControl refreshing={refreshingProp ?? refreshing} onRefresh={() => void handleRefresh()} tintColor="#1B7D2C" colors={["#1B7D2C"]} />
            ) : undefined
          }
          onScrollBeginDrag={() => markDragging(true)}
          onScrollEndDrag={() => markDragging(false)}
          onMomentumScrollBegin={() => markDragging(true)}
          onMomentumScrollEnd={() => markDragging(false)}
          onScroll={(event) => {
            scrollYRef.current = event.nativeEvent.contentOffset.y;
          }}
          contentContainerStyle={[
            fill ? { flexGrow: 1 } : null,
            flat,
            {
              paddingBottom: userBottom + extraPad,
            },
          ]}
        >
          {children}
        </ScrollView>
        {footer}
      </KeyboardScrollContext.Provider>
    </KeyboardAvoidingView>
  );
}

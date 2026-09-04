import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { TabActions } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { Pressable, Text, useWindowDimensions, View, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import { useAuth } from "../context/AuthContext";
import { isProvider } from "../demo";

type Ion = keyof typeof Ionicons.glyphMap;

type SideTab = {
  key: string;
  label: string;
  icon: Ion;
  activeIcon: Ion;
};

type CurvedTabConfig = {
  leftTabs: SideTab[];
  rightTabs: SideTab[];
  centerKey: string;
  centerLabel: string;
  centerIcon: Ion;
  centerActiveIcon?: Ion;
  activeColor: string;
  inactiveColor: string;
};

const buyerConfig: CurvedTabConfig = {
  leftTabs: [
    { key: "Home", label: "Home", icon: "home-outline", activeIcon: "home" },
    { key: "Explore", label: "Explore", icon: "search-outline", activeIcon: "search" },
  ],
  rightTabs: [
    { key: "Saved", label: "Saved", icon: "heart-outline", activeIcon: "heart" },
    { key: "Profile", label: "Profile", icon: "person-outline", activeIcon: "person" },
  ],
  centerKey: "Messages",
  centerLabel: "MESSAGES",
  centerIcon: "chatbubbles-outline",
  centerActiveIcon: "chatbubbles",
  activeColor: "#1F2D3D",
  inactiveColor: "#9AA0A6",
};

const sellerConfig: CurvedTabConfig = {
  leftTabs: [
    { key: "Home", label: "Home", icon: "home-outline", activeIcon: "home" },
    { key: "Listings", label: "Listings", icon: "document-text-outline", activeIcon: "document-text" },
  ],
  rightTabs: [
    { key: "Inquiries", label: "Inquiries", icon: "chatbubble-ellipses-outline", activeIcon: "chatbubble-ellipses" },
    { key: "Profile", label: "Profile", icon: "person-outline", activeIcon: "person" },
  ],
  centerKey: "Post",
  centerLabel: "ADD LISTING",
  centerIcon: "add",
  activeColor: "#1B7D2C",
  inactiveColor: "#9AA0A6",
};

const CENTER_FAB = 50;
const CORNER_R = 22;
const NOTCH_R = 34;
const SIDE_TOP = 26;
const BAR_BODY = 54;

function tabBarPath(width: number, height: number) {
  const cx = width / 2;
  const y = SIDE_TOP;
  const n = NOTCH_R;
  const c = CORNER_R;

  return `
    M 0 ${height}
    L 0 ${y + c}
    Q 0 ${y} ${c} ${y}
    L ${cx - n * 2.05} ${y}
    C ${cx - n * 1.15} ${y} ${cx - n} ${y + n * 0.92} ${cx} ${y + n}
    C ${cx + n} ${y + n * 0.92} ${cx + n * 1.15} ${y} ${cx + n * 2.05} ${y}
    L ${width - c} ${y}
    Q ${width} ${y} ${width} ${y + c}
    L ${width} ${height}
    Z
  `;
}

function ColorRing({ size }: { size: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 3;
  const circumference = 2 * Math.PI * r;
  const segment = circumference / 3;

  return (
    <Svg width={size} height={size} style={{ position: "absolute" }}>
      <Circle
        cx={cx}
        cy={cy}
        r={r}
        stroke="#5B8DEF"
        strokeWidth={3.5}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${segment} ${circumference}`}
        rotation={-90}
        origin={`${cx}, ${cy}`}
      />
      <Circle
        cx={cx}
        cy={cy}
        r={r}
        stroke="#2EC4C4"
        strokeWidth={3.5}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${segment} ${circumference}`}
        strokeDashoffset={-segment}
        rotation={-90}
        origin={`${cx}, ${cy}`}
      />
      <Circle
        cx={cx}
        cy={cy}
        r={r}
        stroke="#F5A623"
        strokeWidth={3.5}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${segment} ${circumference}`}
        strokeDashoffset={-segment * 2}
        rotation={-90}
        origin={`${cx}, ${cy}`}
      />
    </Svg>
  );
}

function CurvedTabBar({ state, navigation, config }: BottomTabBarProps & { config: CurvedTabConfig }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const routeName = state.routes[state.index]?.name;
  const [active, setActive] = useState(routeName);
  const bottomPad = Math.max(insets.bottom, Platform.OS === "android" ? 12 : 10);
  const androidNavGuard = Platform.OS === "android" && insets.bottom < 12 ? 10 : 0;
  const barContentHeight = BAR_BODY + bottomPad + androidNavGuard;
  const totalHeight = SIDE_TOP + barContentHeight;
  const centerWidth = 108;
  const centerBottom = bottomPad + androidNavGuard + 10;

  useEffect(() => {
    setActive(routeName);
  }, [routeName]);

  function go(name: string) {
    if (active === name) return;
    if (!state.routes.some((route) => route.name === name)) return;
    setActive(name);
    navigation.dispatch(TabActions.jumpTo(name));
  }

  function renderSideTab(tab: SideTab) {
    const focused = active === tab.key;
    return (
      <Pressable
        key={tab.key}
        onPress={() => go(tab.key)}
        style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", paddingBottom: bottomPad + androidNavGuard + 2 }}
      >
        <Ionicons name={focused ? tab.activeIcon : tab.icon} size={23} color={focused ? config.activeColor : config.inactiveColor} />
        <Text
          style={{
            marginTop: 4,
            fontSize: 10,
            letterSpacing: 0.4,
            color: focused ? config.activeColor : config.inactiveColor,
            fontWeight: focused ? "800" : "600",
          }}
        >
          {tab.label.toUpperCase()}
        </Text>
      </Pressable>
    );
  }

  const centerFocused = active === config.centerKey;
  const centerIconName = centerFocused && config.centerActiveIcon ? config.centerActiveIcon : config.centerIcon;
  const centerIconSize = config.centerIcon === "add" ? 26 : 22;

  return (
    <View
      style={{
        backgroundColor: "transparent",
        overflow: "visible",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 12,
      }}
    >
      <View style={{ height: totalHeight, width, overflow: "visible" }}>
        <Svg width={width} height={totalHeight} style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
          <Path d={tabBarPath(width, totalHeight)} fill="#fff" />
        </Svg>

        <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: barContentHeight, flexDirection: "row" }}>
          <View style={{ flex: 1, flexDirection: "row" }}>{config.leftTabs.map(renderSideTab)}</View>
          <View style={{ width: centerWidth }} />
          <View style={{ flex: 1, flexDirection: "row" }}>{config.rightTabs.map(renderSideTab)}</View>
        </View>

        <View
          style={{
            position: "absolute",
            left: width / 2 - centerWidth / 2,
            bottom: centerBottom,
            width: centerWidth,
            alignItems: "center",
          }}
        >
          <Pressable
            onPress={() => go(config.centerKey)}
            style={{
              width: CENTER_FAB + 12,
              height: CENTER_FAB + 12,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ColorRing size={CENTER_FAB + 12} />
            <Ionicons
              name={centerIconName}
              size={centerIconSize}
              color={centerFocused ? config.activeColor : "#5F6368"}
            />
          </Pressable>
          <Text
            style={{
              marginTop: 5,
              fontSize: 9.5,
              letterSpacing: 0.5,
              fontWeight: "800",
              color: centerFocused ? config.activeColor : config.inactiveColor,
              textAlign: "center",
            }}
          >
            {config.centerLabel}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function TabBar(props: BottomTabBarProps) {
  const { user } = useAuth();
  const seller = isProvider(user);
  return <CurvedTabBar {...props} config={seller ? sellerConfig : buyerConfig} />;
}

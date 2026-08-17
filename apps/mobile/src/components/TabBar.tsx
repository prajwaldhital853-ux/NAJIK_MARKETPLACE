import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { LinearGradient } from "expo-linear-gradient";
import { TabActions } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { isProvider } from "../demo";
import { colors, shadow } from "../theme";

const buyerTabs = [
  { key: "Home", label: "Home", icon: "home-outline", activeIcon: "home" },
  { key: "Explore", label: "Explore", icon: "search-outline", activeIcon: "search" },
  { key: "Post", label: "Post", icon: "add" },
  { key: "Saved", label: "Saved", icon: "heart-outline", activeIcon: "heart" },
  { key: "Profile", label: "Profile", icon: "person-outline", activeIcon: "person" },
] as const;

const sellerTabs = [
  { key: "Home", label: "Home", icon: "home-outline", activeIcon: "home" },
  { key: "Listings", label: "Listings", icon: "document-text-outline", activeIcon: "document-text" },
  { key: "Post", label: "Post", icon: "add" },
  { key: "Inquiries", label: "Inquiries", icon: "chatbubble-ellipses-outline", activeIcon: "chatbubble-ellipses", badge: 12 },
  { key: "Profile", label: "Profile", icon: "person-outline", activeIcon: "person" },
] as const;

const INACTIVE = "#5F6368";
const ACTIVE = "#1B7D2C";
const FAB = 54;

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const seller = isProvider(user);
  const tabs = seller ? sellerTabs : buyerTabs;
  const routeName = state.routes[state.index]?.name;
  const [active, setActive] = useState(routeName);

  useEffect(() => {
    setActive(routeName);
  }, [routeName]);

  function go(name: string) {
    if (active === name) return;
    setActive(name);
    navigation.dispatch(TabActions.jumpTo(name));
  }

  return (
    <View
      style={{
        backgroundColor: "#F7F8FA",
        paddingHorizontal: 16,
        paddingTop: 22,
        paddingBottom: Math.max(insets.bottom, 12),
      }}
    >
      <View
        style={{
          backgroundColor: colors.white,
          borderRadius: 999,
          flexDirection: "row",
          alignItems: "flex-end",
          paddingHorizontal: 8,
          paddingTop: 10,
          paddingBottom: 8,
          ...shadow.card,
          shadowOpacity: 0.14,
          shadowRadius: 16,
          elevation: 10,
        }}
      >
        {tabs.map((tab) => {
          const focused = active === tab.key;
          if (tab.key === "Post") {
            return (
              <View key={tab.key} style={{ flex: 1, alignItems: "center" }}>
                <Pressable
                  onPressIn={() => go("Post")}
                  onPress={() => go("Post")}
                  android_ripple={{ color: "rgba(255,255,255,0.25)", borderless: false }}
                  style={{
                    width: FAB,
                    height: FAB,
                    borderRadius: FAB / 2,
                    marginTop: -28,
                    overflow: "hidden",
                    ...shadow.fab,
                  }}
                >
                  <LinearGradient
                    colors={["#3CC45F", "#1B7D2C"]}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
                  >
                    <Ionicons name="add" size={30} color="#fff" />
                  </LinearGradient>
                </Pressable>
                <Text style={{ fontSize: 11, marginTop: 4, color: focused ? ACTIVE : INACTIVE, fontWeight: focused ? "700" : "600" }}>
                  Post
                </Text>
                <View
                  style={{
                    marginTop: 3,
                    width: 16,
                    height: 3,
                    borderRadius: 2,
                    backgroundColor: focused ? ACTIVE : "transparent",
                  }}
                />
              </View>
            );
          }
          return (
            <Pressable
              key={tab.key}
              onPressIn={() => go(tab.key)}
              onPress={() => go(tab.key)}
              android_ripple={{ color: "#E7F6EC", borderless: true }}
              style={{ flex: 1, alignItems: "center", paddingVertical: 2 }}
            >
              <View style={{ height: 26, alignItems: "center", justifyContent: "center" }}>
                <Ionicons
                  name={(focused ? tab.activeIcon : tab.icon) as keyof typeof Ionicons.glyphMap}
                  size={22}
                  color={focused ? ACTIVE : INACTIVE}
                />
                {"badge" in tab && tab.badge ? (
                  <View
                    style={{
                      position: "absolute",
                      top: -3,
                      right: -12,
                      backgroundColor: colors.red,
                      minWidth: 16,
                      height: 16,
                      borderRadius: 8,
                      alignItems: "center",
                      justifyContent: "center",
                      paddingHorizontal: 3,
                    }}
                  >
                    <Text style={{ color: "#fff", fontSize: 9, fontWeight: "800" }}>{tab.badge}</Text>
                  </View>
                ) : null}
              </View>
              <Text
                style={{
                  fontSize: 11,
                  marginTop: 2,
                  color: focused ? ACTIVE : INACTIVE,
                  fontWeight: focused ? "700" : "500",
                }}
              >
                {tab.label}
              </Text>
              <View
                style={{
                  marginTop: 3,
                  width: 16,
                  height: 3,
                  borderRadius: 2,
                  backgroundColor: focused ? ACTIVE : "transparent",
                }}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

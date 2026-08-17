import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import {
  createNavigatorFactory,
  TabRouter,
  useNavigationBuilder,
} from "@react-navigation/native";
import type { ReactNode } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  initialRouteName?: string;
  children: ReactNode;
  screenOptions?: object;
  tabBar: (props: BottomTabBarProps) => ReactNode;
  id?: string;
  backBehavior?: "firstRoute" | "initialRoute" | "history" | "none" | "order";
};

function InstantTabNavigator({ initialRouteName, children, screenOptions, tabBar, id, backBehavior = "history" }: Props) {
  const insets = useSafeAreaInsets();
  const { state, navigation, descriptors, NavigationContent } = useNavigationBuilder(TabRouter, {
    id,
    initialRouteName,
    children,
    screenOptions,
    backBehavior,
  });

  return (
    <NavigationContent>
      <View style={{ flex: 1, backgroundColor: "#F7F8FA" }}>
        <View style={{ flex: 1, overflow: "hidden" }}>
          {state.routes.map((route, index) => {
            const focused = state.index === index;
            return (
              <View
                key={route.key}
                collapsable={false}
                pointerEvents={focused ? "auto" : "none"}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  opacity: focused ? 1 : 0,
                  zIndex: focused ? 1 : 0,
                }}
              >
                {descriptors[route.key].render()}
              </View>
            );
          })}
        </View>
        {tabBar({ state, descriptors, navigation, insets } as unknown as BottomTabBarProps)}
      </View>
    </NavigationContent>
  );
}

export const createInstantTabNavigator = createNavigatorFactory(InstantTabNavigator);

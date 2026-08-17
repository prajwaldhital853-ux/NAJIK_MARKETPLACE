import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, Dimensions, View } from "react-native";
import { DrawerContent } from "../components/DrawerContent";
import { TabBar } from "../components/TabBar";
import { useAuth } from "../context/AuthContext";
import { isProvider } from "../demo";
import { ExploreScreen } from "../screens/ExploreScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { InquiriesScreen } from "../screens/InquiriesScreen";
import { ListingsScreen } from "../screens/ListingsScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { PostScreen } from "../screens/PostScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { RegisterScreen } from "../screens/RegisterScreen";
import { RoleWelcomeScreen } from "../screens/RoleWelcomeScreen";
import { CategoryBrowseScreen } from "../screens/CategoryBrowseScreen";
import { ListingDetailScreen } from "../screens/ListingDetailScreen";
import { SavedScreen } from "../screens/SavedScreen";
import { SellerApplyScreen } from "../screens/SellerApplyScreen";
import { SellerHubScreen } from "../screens/SellerHubScreen";
import { colors } from "../theme";
import { createInstantTabNavigator } from "./InstantTabs";

const Stack = createNativeStackNavigator();
const Tabs = createInstantTabNavigator();
const Drawer = createDrawerNavigator();

function MainTabs() {
  const { user } = useAuth();
  const seller = isProvider(user);

  return (
    <Tabs.Navigator tabBar={(props: BottomTabBarProps) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="Home" component={HomeScreen} />
      {seller ? <Tabs.Screen name="Listings" component={ListingsScreen} /> : <Tabs.Screen name="Explore" component={ExploreScreen} />}
      <Tabs.Screen name="Post" component={PostScreen} />
      {seller ? <Tabs.Screen name="Inquiries" component={InquiriesScreen} /> : <Tabs.Screen name="Saved" component={SavedScreen} />}
      <Tabs.Screen name="Profile" component={ProfileScreen} />
    </Tabs.Navigator>
  );
}

function MainDrawer() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: "front",
        overlayColor: "rgba(0,0,0,0.35)",
        swipeEnabled: true,
        drawerStyle: {
          width: Math.min(Dimensions.get("window").width * 0.85, 340),
          backgroundColor: colors.white,
          borderTopRightRadius: 24,
          borderBottomRightRadius: 24,
          overflow: "hidden",
        },
      }}
    >
      <Drawer.Screen name="Tabs" component={MainTabs} />
      <Drawer.Screen name="CategoryBrowse" component={CategoryBrowseScreen} />
      <Drawer.Screen name="ListingDetail" component={ListingDetailScreen} />
      <Drawer.Screen name="SellerHub" component={SellerHubScreen} />
    </Drawer.Navigator>
  );
}

export function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.white }}>
        <ActivityIndicator color={colors.green} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: "none" }}>
        {user ? (
          <Stack.Screen name="Main" component={MainDrawer} />
        ) : (
          <>
            <Stack.Screen name="Welcome" component={RoleWelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="SellerApply" component={SellerApplyScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

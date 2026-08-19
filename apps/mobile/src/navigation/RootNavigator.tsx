import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, Dimensions, View } from "react-native";
import { DrawerContent } from "../components/DrawerContent";
import { TabBar } from "../components/TabBar";
import { useAuth } from "../context/AuthContext";
import { isProvider, needsContactVerify, needsSellerApplication } from "../demo";
import { ExploreScreen } from "../screens/ExploreScreen";
import { MapSearchScreen } from "../screens/MapSearchScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { InquiriesScreen } from "../screens/InquiriesScreen";
import { ListingsScreen } from "../screens/ListingsScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { OtpScreen } from "../screens/OtpScreen";
import { PasswordResetScreen } from "../screens/PasswordResetScreen";
import { PostScreen } from "../screens/PostScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { RegisterScreen } from "../screens/RegisterScreen";
import { RoleWelcomeScreen } from "../screens/RoleWelcomeScreen";
import { CategoryBrowseScreen } from "../screens/CategoryBrowseScreen";
import { ListingDetailScreen } from "../screens/ListingDetailScreen";
import { ChatInboxScreen } from "../screens/ChatInboxScreen";
import { ChatThreadScreen } from "../screens/ChatThreadScreen";
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
      <Drawer.Screen name="MapSearch" component={MapSearchScreen} />
      <Drawer.Screen name="ListingDetail" component={ListingDetailScreen} />
      <Drawer.Screen name="EditListing" component={PostScreen} />
      <Drawer.Screen name="SellerHub" component={SellerHubScreen} />
      <Drawer.Screen name="ChatInbox" component={ChatInboxScreen} />
      <Drawer.Screen name="ChatThread" component={ChatThreadScreen} />
    </Drawer.Navigator>
  );
}

export function RootNavigator() {
  const { user, loading, awaitingSignupOtp } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.white }}>
        <ActivityIndicator color={colors.green} />
      </View>
    );
  }

  const gate = !user
    ? "guest"
    : awaitingSignupOtp || needsContactVerify(user)
      ? "otp"
      : needsSellerApplication(user)
        ? "apply"
        : "main";

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: "none" }}>
        {gate === "main" ? <Stack.Screen name="Main" component={MainDrawer} /> : null}
        {gate === "otp" ? <Stack.Screen name="Otp" component={OtpScreen} /> : null}
        {gate === "apply" ? <Stack.Screen name="SellerApply" component={SellerApplyScreen} /> : null}
        {gate === "guest" ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Welcome" component={RoleWelcomeScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="PasswordReset" component={PasswordResetScreen} />
          </>
        ) : null}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

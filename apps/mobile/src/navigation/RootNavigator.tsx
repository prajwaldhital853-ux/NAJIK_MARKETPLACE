import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect } from "react";
import { ActivityIndicator, Dimensions, Platform, StatusBar, View } from "react-native";
import { DrawerContent } from "../components/DrawerContent";
import { BuyerPhoneVerifyModal } from "../components/BuyerPhoneVerifyModal";
import { TabBar } from "../components/TabBar";
import { useAuth } from "../context/AuthContext";
import { isProvider, needsBuyerPhoneVerify, needsBuyerProfile, needsContactVerify, needsSellerApplication } from "../demo";
import { ExploreScreen } from "../screens/ExploreScreen";
import { MapSearchScreen } from "../screens/MapSearchScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { InquiriesScreen } from "../screens/InquiriesScreen";
import { ListingsScreen } from "../screens/ListingsScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { MessagesScreen } from "../screens/MessagesScreen";
import { BuyerProfileSetupScreen } from "../screens/BuyerProfileSetupScreen";
import { SellerLoginScreen } from "../screens/SellerLoginScreen";
import { OtpScreen } from "../screens/OtpScreen";
import { ProviderOtpScreen } from "../screens/ProviderOtpScreen";
import { PasswordResetScreen } from "../screens/PasswordResetScreen";
import { PostScreen } from "../screens/PostScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { RegisterScreen } from "../screens/RegisterScreen";
import { RoleWelcomeScreen } from "../screens/RoleWelcomeScreen";
import { CategoryBrowseScreen } from "../screens/CategoryBrowseScreen";
import { ListingDetailScreen } from "../screens/ListingDetailScreen";
import { ChatInboxScreen } from "../screens/ChatInboxScreen";
import { ChatThreadScreen } from "../screens/ChatThreadScreen";
import { SellerProfileScreen } from "../screens/SellerProfileScreen";
import { HomeSectionScreen } from "../screens/HomeSectionScreen";
import { BuyerInviteEarnScreen } from "../screens/BuyerInviteEarnScreen";
import { BuyerRecentViewsScreen, BuyerReviewsGivenScreen } from "../screens/BuyerActivityScreens";
import { SavedScreen } from "../screens/SavedScreen";
import { SellerApplyScreen } from "../screens/SellerApplyScreen";
import { ProviderRegisterScreen } from "../screens/ProviderRegisterScreen";
import { ProviderIdCardScreen } from "../screens/ProviderIdCardScreen";
import { BookingsScreen } from "../screens/BookingsScreen";
import { SellerHubScreen } from "../screens/SellerHubScreen";
import { UrgentSellListScreen } from "../screens/UrgentSellListScreen";
import { colors } from "../theme";
import { createInstantTabNavigator } from "./InstantTabs";
import { navigationRef } from "./navigationRef";

const Stack = createNativeStackNavigator();
const Tabs = createInstantTabNavigator();
const Drawer = createDrawerNavigator();

const LightTheme = {
  ...DefaultTheme,
  dark: false,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.greenDeep,
    background: colors.white,
    card: colors.white,
    text: colors.text,
    border: colors.border,
    notification: colors.red,
  },
};

function MainTabs() {
  const { user } = useAuth();
  const seller = isProvider(user);

  return (
    <Tabs.Navigator
      key={seller ? "seller-tabs" : "buyer-tabs"}
      tabBar={(props: BottomTabBarProps) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="Home" component={HomeScreen} />
      {seller ? <Tabs.Screen name="Listings" component={ListingsScreen} /> : <Tabs.Screen name="Explore" component={ExploreScreen} />}
      {seller ? <Tabs.Screen name="Post" component={PostScreen} /> : <Tabs.Screen name="Messages" component={MessagesScreen} />}
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
          width: Math.min(Dimensions.get("window").width * 0.78, 300),
          backgroundColor: colors.white,
          borderTopRightRadius: 20,
          borderBottomRightRadius: 20,
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
      <Drawer.Screen name="UrgentSellList" component={UrgentSellListScreen} />
      <Drawer.Screen name="Bookings" component={BookingsScreen} />
      <Drawer.Screen name="ChatInbox" component={ChatInboxScreen} />
      <Drawer.Screen name="ChatThread" component={ChatThreadScreen} options={{ swipeEnabled: false }} />
      <Drawer.Screen name="HomeSection" component={HomeSectionScreen} />
      <Drawer.Screen name="BuyerReviewsGiven" component={BuyerReviewsGivenScreen} />
      <Drawer.Screen name="BuyerRecentViews" component={BuyerRecentViewsScreen} />
      <Drawer.Screen name="BuyerInviteEarn" component={BuyerInviteEarnScreen} />
      <Drawer.Screen name="SellerProfile" component={SellerProfileScreen} />
      <Drawer.Screen name="ProviderIdCard" component={ProviderIdCardScreen} />
    </Drawer.Navigator>
  );
}

export function RootNavigator() {
  const { user, loading } = useAuth();

  const gate = !user
    ? "guest"
    : needsBuyerProfile(user)
      ? "buyer-profile"
      : needsContactVerify(user)
        ? "otp"
        : needsSellerApplication(user)
          ? "apply"
          : "main";

  const showBuyerPhoneVerify = Boolean(user && needsBuyerPhoneVerify(user) && !needsBuyerProfile(user));

  useEffect(() => {
    if (gate === "guest" || gate === "otp") {
      StatusBar.setHidden(true, "fade");
      if (Platform.OS === "android") {
        StatusBar.setTranslucent(true);
        StatusBar.setBackgroundColor("transparent");
      }
      return;
    }
    StatusBar.setHidden(false, "fade");
    if (Platform.OS === "android") {
      StatusBar.setTranslucent(false);
      StatusBar.setBackgroundColor("#ffffff");
    }
  }, [gate]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.white }}>
        <ActivityIndicator color={colors.green} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} theme={LightTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: "none" }}>
        {gate === "main" ? <Stack.Screen name="Main" component={MainDrawer} /> : null}
        {gate === "otp" ? <Stack.Screen name="Otp" component={OtpScreen} /> : null}
        {gate === "buyer-profile" ? <Stack.Screen name="BuyerProfile" component={BuyerProfileSetupScreen} /> : null}
        {gate === "apply" ? <Stack.Screen name="SellerApply" component={SellerApplyScreen} /> : null}
        {gate === "guest" ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="SellerLogin" component={SellerLoginScreen} />
            <Stack.Screen name="Welcome" component={RoleWelcomeScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ProviderRegister" component={ProviderRegisterScreen} />
            <Stack.Screen name="ProviderOtp" component={ProviderOtpScreen} />
            <Stack.Screen name="PasswordReset" component={PasswordResetScreen} />
          </>
        ) : null}
      </Stack.Navigator>
      {showBuyerPhoneVerify ? <BuyerPhoneVerifyModal /> : null}
    </NavigationContainer>
  );
}

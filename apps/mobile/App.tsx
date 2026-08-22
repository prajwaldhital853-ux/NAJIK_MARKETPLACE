import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/context/AuthContext";
import { BuyerLocationProvider } from "./src/context/BuyerLocationContext";
import { SavedListingsProvider } from "./src/context/SavedListings";
import { InboxProvider } from "./src/context/InboxContext";
import { forceLightMode, subscribeForceLightMode } from "./src/forceLightMode";
import { StaffWarningBanner } from "./src/components/StaffWarningBanner";
import { RootNavigator } from "./src/navigation/RootNavigator";

forceLightMode();

export default function App() {
  useEffect(() => subscribeForceLightMode(), []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <SafeAreaProvider>
        <AuthProvider>
          <BuyerLocationProvider>
          <SavedListingsProvider>
            <InboxProvider>
            <StatusBar style="dark" />
            <RootNavigator />
            <StaffWarningBanner />
            </InboxProvider>
          </SavedListingsProvider>
          </BuyerLocationProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

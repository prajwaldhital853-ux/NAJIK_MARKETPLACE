import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/context/AuthContext";
import { BuyerLocationProvider } from "./src/context/BuyerLocationContext";
import { SavedListingsProvider } from "./src/context/SavedListings";
import { AppNoticeHost } from "./src/components/AppNoticeHost";
import { forceLightMode, subscribeForceLightMode } from "./src/forceLightMode";
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
            <StatusBar style="dark" />
            <RootNavigator />
            <AppNoticeHost />
          </SavedListingsProvider>
          </BuyerLocationProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

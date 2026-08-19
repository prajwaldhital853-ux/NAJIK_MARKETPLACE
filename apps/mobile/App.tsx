import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/context/AuthContext";
import { BuyerLocationProvider } from "./src/context/BuyerLocationContext";
import { SavedListingsProvider } from "./src/context/SavedListings";
import { RootNavigator } from "./src/navigation/RootNavigator";

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <BuyerLocationProvider>
          <SavedListingsProvider>
            <StatusBar style="dark" />
            <RootNavigator />
          </SavedListingsProvider>
          </BuyerLocationProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

import "react-native-gesture-handler";
import { registerRootComponent } from "expo";
import { forceLightMode } from "./src/forceLightMode";
import App from "./App";

forceLightMode();

registerRootComponent(App);

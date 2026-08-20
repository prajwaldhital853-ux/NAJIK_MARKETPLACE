import { useNavigation } from "@react-navigation/native";
import { View } from "react-native";
import { AppHeader } from "../components/AppHeader";
import { KeyboardScreen } from "../components/KeyboardScreen";
import { openChatThread } from "../navigation/browse";
import { ChatInboxList } from "./ChatInboxScreen";

/** Buyer tab: messages inbox without a back button. */
export function MessagesScreen() {
  const navigation = useNavigation<any>();
  return (
    <View style={{ flex: 1, backgroundColor: "#F7F8FA" }}>
      <AppHeader right="bell" showLocation showPro={false} />
      <KeyboardScreen adjustKeyboardInsets={false} fill={false} contentStyle={{ paddingBottom: 24 }}>
        <ChatInboxList onOpen={(id) => openChatThread(navigation, id)} />
      </KeyboardScreen>
    </View>
  );
}

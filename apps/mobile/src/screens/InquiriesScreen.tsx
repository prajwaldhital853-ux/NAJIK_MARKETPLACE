import { View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { AppHeader } from "../components/AppHeader";
import { KeyboardScreen } from "../components/KeyboardScreen";
import { ChatInboxList } from "./ChatInboxScreen";
import { openChatThread } from "../navigation/browse";

export function InquiriesScreen() {
  const navigation = useNavigation<any>();
  return (
    <View style={{ flex: 1, backgroundColor: "#F7F8FA" }}>
      <AppHeader right="bell-chat" />
      <KeyboardScreen adjustKeyboardInsets={false} fill={false} contentStyle={{ paddingBottom: 24 }}>
        <ChatInboxList onOpen={(id) => openChatThread(navigation, id)} />
      </KeyboardScreen>
    </View>
  );
}

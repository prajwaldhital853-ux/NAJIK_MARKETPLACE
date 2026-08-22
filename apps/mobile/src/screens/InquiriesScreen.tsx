import { View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { AppHeader } from "../components/AppHeader";
import { KeyboardScreen } from "../components/KeyboardScreen";
import { useInbox } from "../context/InboxContext";
import { ChatInboxList } from "./ChatInboxScreen";
import { openChatThread } from "../navigation/browse";

export function InquiriesScreen() {
  const navigation = useNavigation<any>();
  const { dismissTarget, refresh } = useInbox();
  return (
    <View style={{ flex: 1, backgroundColor: "#F7F8FA" }}>
      <AppHeader right="bell-chat" />
      <KeyboardScreen adjustKeyboardInsets={false} fill={false} contentStyle={{ paddingBottom: 24 }}>
        <ChatInboxList
          onOpen={(id) => {
            void dismissTarget({ target: "chat", target_id: id, kind: "message" }).then(() => refresh());
            openChatThread(navigation, id);
          }}
        />
      </KeyboardScreen>
    </View>
  );
}

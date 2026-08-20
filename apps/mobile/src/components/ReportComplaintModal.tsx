import { useState } from "react";
import { Alert, Modal, Pressable, Text, TextInput, View } from "react-native";
import { PressScale } from "./PressScale";
import { useAuth } from "../context/AuthContext";
import { createComplaint, type ComplaintKind, type ComplaintSeverity } from "../reportsApi";
import { colors } from "../theme";

const GREEN = colors.greenDeep;

type Props = {
  visible: boolean;
  onClose: () => void;
  kind: ComplaintKind;
  title?: string;
  accusedId?: string;
  listingId?: string;
  threadId?: string;
};

export function ReportComplaintModal({
  visible,
  onClose,
  kind,
  title,
  accusedId,
  listingId,
  threadId,
}: Props) {
  const { user } = useAuth();
  const [reason, setReason] = useState("");
  const [severity, setSeverity] = useState<ComplaintSeverity>("normal");
  const [busy, setBusy] = useState(false);

  const headline =
    kind === "listing" ? "Report this listing" : kind === "chat" ? "Report this chat" : "Report this user";

  function reset() {
    setReason("");
    setSeverity("normal");
    setBusy(false);
  }

  function close() {
    if (busy) return;
    reset();
    onClose();
  }

  async function submit() {
    const text = reason.trim();
    if (text.length < 8) {
      Alert.alert("Report", "Please explain the issue (at least 8 characters).");
      return;
    }
    if (kind === "user" && user?.id && accusedId && String(accusedId) === String(user.id)) {
      Alert.alert("Report", "You cannot report yourself.");
      return;
    }
    setBusy(true);
    try {
      await createComplaint({
        kind,
        severity,
        reason: text,
        ...(accusedId ? { accused_id: accusedId } : {}),
        ...(listingId ? { listing_id: listingId } : {}),
        ...(threadId ? { thread_id: threadId } : {}),
      });
      reset();
      onClose();
      Alert.alert("Reported", "NAJIK admin will review this report.");
    } catch (err) {
      Alert.alert("Report", err instanceof Error ? err.message : "Could not send report.");
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={close}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", padding: 20 }} onPress={close}>
        <Pressable style={{ backgroundColor: "#fff", borderRadius: 16, padding: 16 }} onPress={() => undefined}>
          <Text style={{ fontWeight: "800", fontSize: 16 }}>{headline}</Text>
          {title ? <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>{title}</Text> : null}
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 6 }}>
            Choose severity and describe what happened. Admin can warn, block, or deactivate accounts.
          </Text>

          <Text style={{ fontWeight: "700", fontSize: 12, marginTop: 14, color: "#374151" }}>Severity</Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            <SeverityChip
              label="Normal complaint"
              active={severity === "normal"}
              onPress={() => setSeverity("normal")}
            />
            <SeverityChip
              label="High severity"
              active={severity === "high"}
              danger
              onPress={() => setSeverity("high")}
            />
          </View>

          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="What went wrong?"
            multiline
            style={{
              marginTop: 12,
              minHeight: 90,
              borderWidth: 1,
              borderColor: "#E6E8EC",
              borderRadius: 12,
              padding: 10,
              textAlignVertical: "top",
            }}
          />

          <PressScale
            onPress={() => void submit()}
            disabled={busy}
            style={{
              marginTop: 12,
              backgroundColor: severity === "high" ? "#E53935" : GREEN,
              borderRadius: 12,
              padding: 12,
              alignItems: "center",
              opacity: busy ? 0.7 : 1,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "800" }}>{busy ? "Sending…" : "Send report"}</Text>
          </PressScale>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function SeverityChip({
  label,
  active,
  danger,
  onPress,
}: {
  label: string;
  active: boolean;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 8,
        alignItems: "center",
        borderWidth: 1.5,
        borderColor: active ? (danger ? "#E53935" : GREEN) : "#E6E8EC",
        backgroundColor: active ? (danger ? "#FDECEC" : "#E7F6EC") : "#fff",
      }}
    >
      <Text style={{ fontWeight: "800", fontSize: 12, color: active ? (danger ? "#C62828" : GREEN) : "#6B7280" }}>
        {label}
      </Text>
    </Pressable>
  );
}

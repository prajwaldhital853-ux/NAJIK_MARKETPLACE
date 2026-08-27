import { useEffect, useState } from "react";
import { Alert, Share, Text, TextInput, View } from "react-native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { PressScale } from "./PressScale";
import { deleteMyAccount, exportMyAccountData } from "../authApi";
import { useAuth } from "../context/AuthContext";
import { fetchPrivacyRetentionPublic, type PrivacyRetentionPublic } from "../legalApi";
import { colors, shadow } from "../theme";

const GREEN = "#1B7D2C";

export function DataPrivacyActions() {
  const { logout } = useAuth();
  const [policy, setPolicy] = useState<PrivacyRetentionPublic | null>(null);
  const [busy, setBusy] = useState<"export" | "delete" | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    void fetchPrivacyRetentionPublic().then(setPolicy);
  }, []);

  async function onExport() {
    if (policy && !policy.allow_self_service_export) {
      Alert.alert("Export disabled", "Self-service export is currently disabled. Contact support@najik.com.");
      return;
    }
    setBusy("export");
    try {
      const data = await exportMyAccountData();
      const json = JSON.stringify(data, null, 2);
      try {
        await Share.share({ message: json, title: "NAJIK account data export" });
      } catch {
        const path = `${FileSystem.cacheDirectory}najik-data-export.json`;
        await FileSystem.writeAsStringAsync(path, json);
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(path, { mimeType: "application/json", dialogTitle: "Export NAJIK data" });
        } else {
          Alert.alert("Export ready", "Your data export was prepared but sharing is unavailable on this device.");
        }
      }
    } catch (err) {
      Alert.alert("Export failed", err instanceof Error ? err.message : "Could not export your data.");
    } finally {
      setBusy(null);
    }
  }

  async function performDelete() {
    if ((confirmText || "").trim().toUpperCase() !== "DELETE") {
      Alert.alert("Not confirmed", 'Type DELETE in the confirmation box.');
      return;
    }
    setBusy("delete");
    try {
      await deleteMyAccount({ confirm: confirmText.trim(), password: password || undefined });
      setDeleteOpen(false);
      setConfirmText("");
      setPassword("");
      await logout();
      Alert.alert("Account deleted", "Your NAJIK account has been permanently deleted.");
    } catch (err) {
      Alert.alert("Delete failed", err instanceof Error ? err.message : "Could not delete your account.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={{ marginHorizontal: 16, marginTop: 16 }}>
      <Text style={{ fontWeight: "800", marginBottom: 8 }}>Data & privacy</Text>
      <View style={{ backgroundColor: "#fff", borderRadius: 18, padding: 14, ...shadow.card }}>
        {policy?.summary ? (
          <Text style={{ color: "#6B7280", fontSize: 12, lineHeight: 18, marginBottom: 12 }}>{policy.summary}</Text>
        ) : null}
        <PressScale
          onPress={() => void onExport()}
          style={{ backgroundColor: "#E7F6EC", borderRadius: 12, padding: 12, marginBottom: 10, opacity: busy ? 0.6 : 1 }}
        >
          <Text style={{ color: GREEN, fontWeight: "800" }}>{busy === "export" ? "Preparing export…" : "Export my data (JSON)"}</Text>
        </PressScale>
        {!deleteOpen ? (
          <PressScale
            onPress={() => {
              if (policy && !policy.allow_self_service_delete) {
                Alert.alert("Delete disabled", "Self-service account deletion is currently disabled. Contact support@najik.com.");
                return;
              }
              setDeleteOpen(true);
            }}
            style={{ backgroundColor: "#FEF2F2", borderRadius: 12, padding: 12, opacity: busy ? 0.6 : 1 }}
          >
            <Text style={{ color: "#B91C1C", fontWeight: "800" }}>Delete my account</Text>
          </PressScale>
        ) : (
          <View style={{ marginTop: 4, gap: 8 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              This permanently deletes your account. Type DELETE and enter your password.
            </Text>
            <TextInput
              value={confirmText}
              onChangeText={setConfirmText}
              placeholder='Type DELETE'
              autoCapitalize="characters"
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, backgroundColor: "#fff" }}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, backgroundColor: "#fff" }}
            />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <PressScale onPress={() => setDeleteOpen(false)} style={{ flex: 1, padding: 10, alignItems: "center" }}>
                <Text style={{ fontWeight: "700", color: colors.muted }}>Cancel</Text>
              </PressScale>
              <PressScale
                onPress={() => void performDelete()}
                style={{ flex: 1, backgroundColor: "#B91C1C", borderRadius: 10, padding: 10, alignItems: "center", opacity: busy ? 0.6 : 1 }}
              >
                <Text style={{ fontWeight: "800", color: "#fff" }}>{busy === "delete" ? "Deleting…" : "Delete forever"}</Text>
              </PressScale>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

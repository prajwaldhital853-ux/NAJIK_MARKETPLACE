import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Linking, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PressScale } from "../components/PressScale";
import { getLegalDocument } from "../legal/legalDocuments";
import type { LegalDocId, LegalRole } from "../legal/types";
import { colors, shadow } from "../theme";

const GREEN = "#1B7D2C";

function parseRole(raw: unknown): LegalRole {
  return raw === "seller" ? "seller" : "buyer";
}

function parseDoc(raw: unknown): LegalDocId {
  const value = typeof raw === "string" ? raw : "terms";
  const allowed: LegalDocId[] = ["terms", "privacy", "safety-tips", "posting-rules", "faq", "contact", "report-bugs"];
  return allowed.includes(value as LegalDocId) ? (value as LegalDocId) : "terms";
}

export function LegalDocumentScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const role = parseRole(route.params?.role);
  const docId = parseDoc(route.params?.doc);
  const doc = getLegalDocument(docId, role);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 12,
          backgroundColor: colors.white,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}
      >
        <PressScale onPress={() => navigation.goBack()} hitSlop={10} style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </PressScale>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>{doc.title}</Text>
          <Text style={{ marginTop: 2, fontSize: 11, color: colors.muted }}>Last updated {doc.lastUpdated}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ backgroundColor: colors.white, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: colors.border, ...shadow.card }}>
          <Text style={{ fontSize: 13, lineHeight: 21, color: colors.textSecondary }}>{doc.intro}</Text>

          {doc.sections.map((section) => (
            <View key={section.title} style={{ marginTop: 20 }}>
              <Text style={{ fontSize: 15, fontWeight: "800", color: colors.text }}>{section.title}</Text>
              {section.paragraphs.map((paragraph) => (
                <Text key={paragraph.slice(0, 40)} style={{ marginTop: 8, fontSize: 13, lineHeight: 21, color: colors.textSecondary }}>
                  {paragraph}
                </Text>
              ))}
              {section.bullets?.map((bullet) => (
                <View key={bullet.slice(0, 40)} style={{ flexDirection: "row", gap: 8, marginTop: 6, paddingLeft: 4 }}>
                  <Text style={{ color: GREEN, fontWeight: "900" }}>•</Text>
                  <Text style={{ flex: 1, fontSize: 13, lineHeight: 20, color: colors.textSecondary }}>{bullet}</Text>
                </View>
              ))}
            </View>
          ))}

          <View style={{ marginTop: 22, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 14 }}>
            <Text style={{ fontSize: 12, lineHeight: 19, color: colors.muted, fontStyle: "italic" }}>{doc.footer}</Text>
            {docId === "contact" || docId === "report-bugs" ? (
              <PressScale
                onPress={() => void Linking.openURL("mailto:support@najik.com")}
                style={{ marginTop: 14, backgroundColor: GREEN, borderRadius: 14, height: 46, alignItems: "center", justifyContent: "center" }}
              >
                <Text style={{ color: "#fff", fontWeight: "800" }}>Email support@najik.com</Text>
              </PressScale>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

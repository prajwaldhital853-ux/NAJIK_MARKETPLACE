import { File, Paths } from "expo-file-system";
import * as FileSystemLegacy from "expo-file-system/legacy";
import { Platform, Share } from "react-native";
import { api, ApiError, friendlyError } from "./api";
import { withAppAuth } from "./authApi";
import { API_URL } from "./config";

export type ProviderIdCard = {
  id: string;
  card_code: string;
  access_status: "blocked" | "requested" | "approved";
  can_download: boolean;
  requested_at?: string | null;
  approved_at?: string | null;
  staff_note?: string;
  full_name: string;
  role_label: string;
  category: string;
  phone: string;
  email: string;
  joined_on?: string | null;
  kyc_status: string;
  is_verified: boolean;
  photo_uri?: string | null;
  verify_url: string;
  qr_uri?: string | null;
  public_qr_uri?: string | null;
  signature_uri?: string | null;
  emergency_phone?: string;
  emergency_email?: string;
  website?: string;
  branding_updated_at?: string | null;
  membership_fee_label?: string;
  created_at: string;
};

export async function fetchMyIdCard() {
  return withAppAuth((token) => api<ProviderIdCard>("/api/cards/me/", { token }));
}

export async function requestIdCardDownload() {
  return withAppAuth((token) =>
    api<ProviderIdCard>("/api/cards/me/", {
      token,
      method: "POST",
      body: JSON.stringify({ action: "request_download" }),
    }),
  );
}

async function downloadPdfWithAuth(token: string, cardCode: string) {
  const safeCode = (cardCode || "card").replace(/[^\w.-]+/g, "-");
  const fileName = `najik-id-${safeCode}.pdf`;
  const url = `${API_URL}/api/cards/me/print/`;

  // Prefer new File API; fall back to legacy downloadAsync if needed.
  try {
    const destination = new File(Paths.cache, fileName);
    const downloaded = await File.downloadFileAsync(url, destination, {
      headers: { Authorization: `Bearer ${token}` },
      idempotent: true,
    });
    return downloaded.uri;
  } catch (primary) {
    const target = `${FileSystemLegacy.cacheDirectory ?? FileSystemLegacy.documentDirectory}${fileName}`;
    const result = await FileSystemLegacy.downloadAsync(url, target, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (result.status < 200 || result.status >= 300) {
      const message = primary instanceof Error ? primary.message : "Could not download ID card PDF.";
      const statusMatch = message.match(/\b([45]\d{2})\b/);
      throw new ApiError(friendlyError(primary, message), statusMatch ? Number(statusMatch[1]) : result.status);
    }
    return result.uri;
  }
}

/** Opens the system share sheet for a local PDF file URI. */
export async function shareIdCardPdf(uri: string) {
  try {
    // Dynamic import so a missing native module does not crash app startup.
    const Sharing = await import("expo-sharing");
    const available = typeof Sharing.isAvailableAsync === "function" ? await Sharing.isAvailableAsync() : false;
    if (available && typeof Sharing.shareAsync === "function") {
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: "Download / print NAJIK ID card",
        UTI: "com.adobe.pdf",
      });
      return;
    }
  } catch {
    /* fall through to RN Share */
  }

  if (Platform.OS === "ios") {
    await Share.share({ url: uri, title: "NAJIK ID Card" });
    return;
  }

  // Android: expose a content:// URI when possible, then share.
  try {
    const contentUri = await FileSystemLegacy.getContentUriAsync(uri);
    await Share.share({ message: contentUri, title: "NAJIK ID Card", url: contentUri });
  } catch {
    await Share.share({
      message: "NAJIK ID card PDF downloaded. Open Files to print it.",
      title: "NAJIK ID Card",
    });
  }
}

/** Downloads the front+back ID card PDF. Does not open the verify website. */
export async function downloadMyIdCardPdf(cardCode: string) {
  return withAppAuth(async (token) => {
    try {
      return await downloadPdfWithAuth(token, cardCode);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      const message = err instanceof Error ? err.message : String(err);
      const statusMatch = message.match(/\b([45]\d{2})\b/);
      throw new ApiError(friendlyError(err, "Could not download ID card PDF."), statusMatch ? Number(statusMatch[1]) : 0);
    }
  });
}

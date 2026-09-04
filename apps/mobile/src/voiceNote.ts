import * as FileSystemLegacy from "expo-file-system/legacy";

export function guessAudioMime(uri: string) {
  const lower = uri.toLowerCase();
  if (lower.endsWith(".caf")) return "audio/x-caf";
  if (lower.endsWith(".3gp") || lower.endsWith(".3gpp")) return "audio/3gpp";
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".wav")) return "audio/wav";
  if (lower.endsWith(".webm")) return "audio/webm";
  if (lower.endsWith(".mp4")) return "audio/mp4";
  return "audio/m4a";
}

function normalizeFileUri(uri: string) {
  if (uri.startsWith("file://")) return uri;
  if (uri.startsWith("/")) return `file://${uri}`;
  return uri;
}

export async function voiceUriToDataUri(uri: string, fallbackType = "audio/m4a") {
  const path = normalizeFileUri(uri);
  const mime = guessAudioMime(path) || fallbackType;

  await new Promise((resolve) => setTimeout(resolve, 150));

  try {
    const info = await FileSystemLegacy.getInfoAsync(path);
    if (!info.exists) throw new Error("Voice note file was not saved.");
    if ("size" in info && typeof info.size === "number" && info.size < 48) {
      throw new Error("Voice note is empty. Try recording again.");
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("Voice note")) throw err;
    /* continue — some platforms omit size */
  }

  const base64 = await FileSystemLegacy.readAsStringAsync(path, {
    encoding: FileSystemLegacy.EncodingType.Base64,
  });
  const cleaned = base64.replace(/\s+/g, "");
  if (!cleaned || cleaned.length < 48) {
    throw new Error("Could not read the voice note. Try recording again.");
  }
  return `data:${mime};base64,${cleaned}`;
}

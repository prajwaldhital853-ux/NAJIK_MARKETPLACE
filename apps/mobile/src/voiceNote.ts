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

export function normalizeVoiceFileUri(uri: string) {
  if (uri.startsWith("file://")) return uri;
  if (uri.startsWith("/")) return `file://${uri}`;
  return uri;
}

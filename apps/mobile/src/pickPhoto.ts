import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";

export async function pickPhotoDataUri(fromCamera?: boolean): Promise<string | null> {
  if (fromCamera) {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow camera to take a photo.");
      return null;
    }
  } else {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photos so you can choose a picture.");
      return null;
    }
  }
  const result = fromCamera
    ? await ImagePicker.launchCameraAsync({ quality: 0.4, base64: true })
    : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.4, base64: true });
  const asset = result.assets?.[0];
  if (result.canceled || !asset?.base64) {
    if (!result.canceled) Alert.alert("Upload failed", "Could not read that image. Try another photo.");
    return null;
  }
  const mime = asset.mimeType?.includes("png") ? "image/png" : "image/jpeg";
  return `data:${mime};base64,${asset.base64}`;
}

export function choosePhoto(onPicked: (uri: string) => void, title = "Add photo") {
  Alert.alert(title, "Choose a source", [
    { text: "Camera", onPress: () => void pickPhotoDataUri(true).then((uri) => uri && onPicked(uri)) },
    { text: "Gallery", onPress: () => void pickPhotoDataUri(false).then((uri) => uri && onPicked(uri)) },
    { text: "Cancel", style: "cancel" },
  ]);
}

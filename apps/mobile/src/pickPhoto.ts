import { Alert } from "react-native";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

const MAX_EDGE = 1280;
const JPEG_QUALITY = 0.72;

export async function compressPhotoAsset(asset: ImagePicker.ImagePickerAsset) {
  const actions: ImageManipulator.Action[] = [];
  const width = asset.width || 0;
  const height = asset.height || 0;
  if (width > MAX_EDGE || height > MAX_EDGE) {
    if (width >= height) actions.push({ resize: { width: MAX_EDGE } });
    else actions.push({ resize: { height: MAX_EDGE } });
  }
  const sourceUri = asset.uri;
  if (!sourceUri) return null;
  const out = await ImageManipulator.manipulateAsync(sourceUri, actions, {
    compress: JPEG_QUALITY,
    format: ImageManipulator.SaveFormat.JPEG,
    base64: true,
  });
  if (!out.base64) return null;
  return `data:image/jpeg;base64,${out.base64}`;
}

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
    ? await ImagePicker.launchCameraAsync({ quality: 1, base64: false })
    : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1, base64: false });
  const asset = result.assets?.[0];
  if (result.canceled || !asset) {
    if (!result.canceled) Alert.alert("Upload failed", "Could not read that image. Try another photo.");
    return null;
  }
  return compressPhotoAsset(asset);
}

export function choosePhoto(onPicked: (uri: string) => void, title = "Add photo") {
  Alert.alert(title, "Choose a source", [
    { text: "Camera", onPress: () => void pickPhotoDataUri(true).then((uri) => uri && onPicked(uri)) },
    { text: "Gallery", onPress: () => void pickPhotoDataUri(false).then((uri) => uri && onPicked(uri)) },
    { text: "Cancel", style: "cancel" },
  ]);
}

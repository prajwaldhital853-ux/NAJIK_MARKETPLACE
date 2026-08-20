import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DatePickerModal } from "../components/DatePickerModal";
import { KeyboardScreen, useKeyboardScroll } from "../components/KeyboardScreen";
import { NajikWordmark } from "../components/NajikWordmark";
import { PressScale } from "../components/PressScale";
import { friendlyError } from "../api";
import { requestGuestOtp } from "../authApi";
import { ageFromAd, formatBsOnly, formatDateLabel, parseStoredAd, toStoredAd, type Ymd } from "../nepaliDate";
import { setProviderRegisterDraft } from "../providerRegisterDraft";
import { colors } from "../theme";
import type { ProviderServiceType } from "../types";

const GREEN = "#1B7D2C";
const PAGE_W = Dimensions.get("window").width;
const buyerCornerArt = require("../../assets/buyer-corner.png");
const buyerCornerBottomArt = require("../../assets/buyer-corner-bottom.png");
const buyerTaglineCurve = require("../../assets/buyer-tagline-curve.png");

const STEPS = [
  "Personal Information",
  "Basic Information",
  "Business Location",
  "Documentation",
  "Security",
] as const;

const SERVICE_TYPES: ProviderServiceType[] = [
  "Property",
  "Job",
  "Electronics",
  "Vehicles",
  "Local Services",
  "Used Items",
  "Other",
];

type DateFieldKey = "dob" | "citizenship" | "businessStart";
type FieldKey =
  | "fullName"
  | "dob"
  | "fatherName"
  | "motherName"
  | "phone"
  | "email"
  | "citizenshipNo"
  | "issueDistrict"
  | "citizenshipIssueDate"
  | "nationCardNo"
  | "businessName"
  | "category"
  | "serviceDescription"
  | "businessStartDate"
  | "businessType"
  | "serviceAreaType"
  | "yearsExperience"
  | "employeeCount"
  | "businessLocation"
  | "city"
  | "province"
  | "district"
  | "area"
  | "wardNo"
  | "postalCode"
  | "country"
  | "nagrita"
  | "nagritaBack"
  | "photo"
  | "nationCard"
  | "otherDocument"
  | "password"
  | "confirmPassword";

type FieldError = { field: FieldKey; message: string };
type DocKind = "nagrita" | "nagrita_back" | "photo" | "nation_card" | "other";

export function ProviderRegisterScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [stepBusy, setStepBusy] = useState(false);
  const [pickerBusy, setPickerBusy] = useState<"camera" | "gallery" | null>(null);
  const [sourceSheet, setSourceSheet] = useState<DocKind | null>(null);
  const [error, setError] = useState("");
  const [errorField, setErrorField] = useState<FieldKey | null>(null);
  const [errorTick, setErrorTick] = useState(0);
  const [toast, setToast] = useState("");
  const fieldRefs = useRef<Partial<Record<FieldKey, View | null>>>({});
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [age, setAge] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [motherName, setMotherName] = useState("");
  const [grandFatherName, setGrandFatherName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [citizenshipNo, setCitizenshipNo] = useState("");
  const [issueDistrict, setIssueDistrict] = useState("");
  const [citizenshipIssueDate, setCitizenshipIssueDate] = useState("");
  const [nationCardNo, setNationCardNo] = useState("");

  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState<ProviderServiceType>("Local Services");
  const [serviceDescription, setServiceDescription] = useState("");
  const [businessStartDate, setBusinessStartDate] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [serviceAreaType, setServiceAreaType] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [employeeCount, setEmployeeCount] = useState("");

  const [businessLocation, setBusinessLocation] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [area, setArea] = useState("");
  const [wardNo, setWardNo] = useState("");
  const [landmark, setLandmark] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("Nepal");

  const [nagrita, setNagrita] = useState("");
  const [nagritaBack, setNagritaBack] = useState("");
  const [photo, setPhoto] = useState("");
  const [nationCard, setNationCard] = useState("");
  const [otherDocument, setOtherDocument] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [dateField, setDateField] = useState<DateFieldKey | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvent, () => setKeyboardOpen(true));
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      const hideBar = () => {
        StatusBar.setHidden(true, "fade");
        if (Platform.OS === "android") {
          StatusBar.setTranslucent(true);
          StatusBar.setBackgroundColor("transparent");
        }
      };
      hideBar();
      // Re-apply after Login (or other screens) blur cleanup can briefly show the bar.
      const t = setTimeout(hideBar, 80);
      return () => {
        clearTimeout(t);
      };
    }, []),
  );

  function showToast(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 5000);
  }

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  function clearFieldError(field?: FieldKey) {
    if (!field || errorField === field) {
      setErrorField(null);
      setError("");
    }
  }

  function validateStep(): FieldError | null {
    if (step === 0) {
      if (!fullName.trim()) return { field: "fullName", message: "Enter your full name." };
      if (!dob) return { field: "dob", message: "Select date of birth." };
      if (!fatherName.trim()) return { field: "fatherName", message: "Enter father's name." };
      if (!motherName.trim()) return { field: "motherName", message: "Enter mother's name." };
      if (!phone.replace(/\s/g, "")) return { field: "phone", message: "Enter contact number." };
      if (!email.trim()) return { field: "email", message: "Enter email address." };
      if (!citizenshipNo.trim()) return { field: "citizenshipNo", message: "Enter citizenship number." };
      if (!issueDistrict.trim()) return { field: "issueDistrict", message: "Enter issue district." };
      if (!citizenshipIssueDate) return { field: "citizenshipIssueDate", message: "Select citizenship issue date." };
      if (!nationCardNo.trim()) return { field: "nationCardNo", message: "Enter nation card number." };
    }
    if (step === 1) {
      if (!businessName.trim()) return { field: "businessName", message: "Enter business name." };
      if (!category) return { field: "category", message: "Select a service category." };
      if (!serviceDescription.trim()) return { field: "serviceDescription", message: "Enter a brief service description." };
      if (!businessStartDate) return { field: "businessStartDate", message: "Select business start date." };
    }
    if (step === 2) {
      if (!businessLocation.trim()) return { field: "businessLocation", message: "Enter business location." };
      if (!city.trim()) return { field: "city", message: "Enter city." };
      if (!province.trim()) return { field: "province", message: "Enter province." };
      if (!district.trim()) return { field: "district", message: "Enter district." };
      if (!area.trim()) return { field: "area", message: "Enter area / location." };
      if (!wardNo.trim()) return { field: "wardNo", message: "Enter ward number." };
      if (!postalCode.trim()) return { field: "postalCode", message: "Enter postal code." };
      if (!country.trim()) return { field: "country", message: "Enter country." };
    }
    if (step === 3) {
      if (!photo) return { field: "photo", message: "Take a clear live photo." };
      if (!nagrita) return { field: "nagrita", message: "Upload citizenship front side." };
      if (!nagritaBack) return { field: "nagritaBack", message: "Upload citizenship back side." };
      if (!nationCard) return { field: "nationCard", message: "Upload nation card." };
    }
    if (step === 4) {
      if (password.length < 8) return { field: "password", message: "Password must be at least 8 characters." };
      if (!/[A-Z]/.test(password)) return { field: "password", message: "Include at least one uppercase letter." };
      if (!/\d/.test(password)) return { field: "password", message: "Include at least one number." };
      if (!/[^A-Za-z0-9]/.test(password)) return { field: "password", message: "Include at least one special character." };
      if (password !== confirmPassword) return { field: "confirmPassword", message: "Passwords do not match." };
    }
    return null;
  }

  function reportError(result: FieldError) {
    setError(result.message);
    setErrorField(result.field);
    setErrorTick((value) => value + 1);
    showToast(result.message);
  }

  function bindFieldRef(key: FieldKey, ref: View | null) {
    fieldRefs.current[key] = ref;
  }

  function setField(key: FieldKey, setter: (value: string) => void) {
    return (value: string) => {
      setter(value);
      clearFieldError(key);
    };
  }

  function openDate(field: DateFieldKey) {
    Keyboard.dismiss();
    setDateField(field);
  }

  function applyDate(ad: Ymd) {
    const stored = toStoredAd(ad);
    if (dateField === "dob") {
      setDob(stored);
      setAge(String(ageFromAd(ad)));
      clearFieldError("dob");
    } else if (dateField === "citizenship") {
      setCitizenshipIssueDate(stored);
      clearFieldError("citizenshipIssueDate");
    } else if (dateField === "businessStart") {
      setBusinessStartDate(stored);
      clearFieldError("businessStartDate");
    }
  }

  function dateLabel(stored: string, bsOnly = false) {
    const ad = parseStoredAd(stored);
    if (!ad) return "";
    return bsOnly ? formatBsOnly(ad) : formatDateLabel(ad);
  }

  function next() {
    const result = validateStep();
    if (result) {
      reportError(result);
      return;
    }
    setStepBusy(true);
    setError("");
    setErrorField(null);
    setTimeout(() => {
      setStep((value) => Math.min(value + 1, STEPS.length - 1));
      setStepBusy(false);
    }, 220);
  }

  function back() {
    setError("");
    setErrorField(null);
    if (step === 0) {
      navigation.navigate("Login", { page: "provider" });
      return;
    }
    setStep((value) => value - 1);
  }

  function pick(kind: DocKind) {
    if (kind === "photo") {
      void pickImage("photo", true);
      return;
    }
    setSourceSheet(kind);
  }

  async function pickFromSheet(fromCamera: boolean) {
    const kind = sourceSheet;
    if (!kind) return;
    setSourceSheet(null);
    await pickImage(kind, fromCamera);
  }

  async function pickImage(kind: DocKind, fromCamera: boolean) {
    setPickerBusy(fromCamera ? "camera" : "gallery");
    // Paint the loading overlay before the native picker blocks the JS thread.
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => setTimeout(resolve, 60));
    });
    try {
      const permission = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setPickerBusy(null);
        Alert.alert("Permission needed", "Allow access to continue.");
        return;
      }
      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({ quality: 0.4, base64: true })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.4, base64: true });
      const asset = result.assets?.[0];
      if (result.canceled || !asset?.base64) return;
      const mime = asset.mimeType?.includes("png") ? "image/png" : "image/jpeg";
      const uri = `data:${mime};base64,${asset.base64}`;
      if (kind === "nagrita") {
        setNagrita(uri);
        clearFieldError("nagrita");
      } else if (kind === "nagrita_back") {
        setNagritaBack(uri);
        clearFieldError("nagritaBack");
      } else if (kind === "photo") {
        setPhoto(uri);
        clearFieldError("photo");
      } else if (kind === "nation_card") {
        setNationCard(uri);
        clearFieldError("nationCard");
      } else {
        setOtherDocument(uri);
        clearFieldError("otherDocument");
      }
    } finally {
      setPickerBusy(null);
    }
  }

  async function finish() {
    const result = validateStep();
    if (result) {
      reportError(result);
      return;
    }
    setBusy(true);
    setError("");
    setErrorField(null);
    const cleanPhone = phone.replace(/\s/g, "");
    const address = [businessLocation, area, wardNo ? `Ward ${wardNo}` : "", city, district, province, country]
      .filter(Boolean)
      .join(", ");
    const profile_data: Record<string, string> = {
      date_of_birth: dob,
      age,
      father_name: fatherName.trim(),
      mother_name: motherName.trim(),
      grandfather_name: grandFatherName.trim(),
      citizenship_number: citizenshipNo.trim(),
      citizenship_issue_district: issueDistrict.trim(),
      citizenship_issue_date: citizenshipIssueDate,
      nation_card_number: nationCardNo.trim(),
      business_name: businessName.trim(),
      service_description: serviceDescription.trim(),
      business_start_date: businessStartDate,
      business_type: businessType.trim(),
      service_area_type: serviceAreaType.trim(),
      years_experience: yearsExperience.trim(),
      employee_count: employeeCount.trim(),
      business_location: businessLocation.trim(),
      city: city.trim(),
      province: province.trim(),
      district: district.trim(),
      area: area.trim(),
      ward_no: wardNo.trim(),
      landmark: landmark.trim(),
      postal_code: postalCode.trim(),
      country: country.trim(),
    };
    try {
      setProviderRegisterDraft({
        full_name: fullName.trim(),
        address,
        contact: cleanPhone,
        phone: cleanPhone,
        email: email.trim(),
        password,
        service_type: category,
        nagrita_uri: nagrita,
        nagrita_back_uri: nagritaBack,
        photo_uri: photo,
        nation_card_uri: nationCard,
        other_document_uri: otherDocument || undefined,
        profile_data,
      });
      await requestGuestOtp(cleanPhone);
      navigation.navigate("ProviderOtp");
    } catch (err) {
      const message = friendlyError(err, "Could not send verification code.");
      setError(message);
      showToast(message);
    } finally {
      setBusy(false);
    }
  }

  const footerH = (step > 0 ? 60 : 0) + 52 + 60 + 28 + Math.max(insets.bottom, 12) + 20;

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <ExpoStatusBar hidden />
      <RegisterCornerTop />
      <KeyboardScreen
        enableRefresh={false}
        keyboardDismissMode="none"
        adjustKeyboardInsets={false}
        bottomChrome={keyboardOpen ? 0 : footerH}
        style={{ backgroundColor: "transparent", zIndex: 1 }}
        contentStyle={{ paddingTop: 52, paddingHorizontal: 20, paddingBottom: 20 }}
        footer={
          keyboardOpen ? null : (
          <View
            style={{
              zIndex: 5,
              paddingHorizontal: 20,
              paddingTop: 10,
              paddingBottom: Math.max(insets.bottom, 12),
              backgroundColor: colors.white,
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}
          >
            {step > 0 ? (
              <PressScale
                onPress={back}
                style={{
                  height: 50,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: "#111827",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <Ionicons name="arrow-back" size={16} color="#111827" />
                <Text style={{ color: "#111827", fontWeight: "800" }}>Previous</Text>
              </PressScale>
            ) : null}

            <PressScale
              onPress={() => {
                if (busy || stepBusy) return;
                if (step < STEPS.length - 1) next();
                else void finish();
              }}
              style={{ borderRadius: 12, overflow: "hidden", opacity: busy || stepBusy ? 0.85 : 1 }}
            >
              <LinearGradient
                colors={[GREEN, "#2FA24A"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ height: 52, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                {busy || stepBusy ? <ActivityIndicator color="#fff" /> : null}
                {step === STEPS.length - 1 ? (
                  <>
                    {busy ? null : <Ionicons name="person-add-outline" size={18} color="#fff" />}
                    <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>{busy ? "Creating…" : "Create Account"}</Text>
                  </>
                ) : (
                  <>
                    <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>{stepBusy ? "Checking…" : "Next"}</Text>
                    {stepBusy ? null : <Ionicons name="arrow-forward" size={16} color="#fff" />}
                  </>
                )}
              </LinearGradient>
            </PressScale>

            <PressScale
              onPress={() => navigation.navigate("Login", { page: "provider" })}
              style={{
                marginTop: 10,
                height: 50,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: "#111827",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 8,
              }}
            >
              <Ionicons name="arrow-back" size={16} color="#111827" />
              <Text style={{ color: "#111827", fontWeight: "800" }}>Back to Login</Text>
            </PressScale>

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 10 }}>
              <Ionicons name="shield-checkmark" size={14} color={GREEN} />
              <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "600" }}>Safe. Secure. Always with you.</Text>
            </View>
          </View>
          )
        }
      >
        <View style={{ alignItems: "center" }}>
          <NajikWordmark scale={0.92} showTagline={false} />
          <View style={{ marginTop: 4, alignItems: "center" }}>
            <Text style={{ color: "#101828", fontSize: 15, fontWeight: "800" }}>
              Everything Near You, <Text style={{ color: GREEN }}>One App.</Text>
            </Text>
            <Image source={buyerTaglineCurve} style={{ marginTop: 2, width: 156, height: 14 }} resizeMode="contain" />
          </View>
        </View>

        <Text style={{ marginTop: 10, fontSize: 26, fontWeight: "900", color: colors.text, textAlign: "center" }}>
          Register as
        </Text>
        <Text style={{ fontSize: 30, fontWeight: "900", color: GREEN, textAlign: "center", lineHeight: 34 }}>
          Service Provider
        </Text>
        <Text style={{ marginTop: 4, color: colors.textSecondary, textAlign: "center", fontSize: 13, lineHeight: 18 }}>
          Join NAJIK and grow your business by connecting with more customers.
        </Text>

        <ErrorScrollHelper errorField={errorField} errorTick={errorTick} fieldRefs={fieldRefs} />

        <Stepper active={step} />

        {step === 0 ? (
          <>
            <SectionTitle icon="person" title="Personal Information" />
            <RegField
              fieldKey="fullName"
              invalid={errorField === "fullName"}
              onBindRef={bindFieldRef}
              icon="person-outline"
              placeholder="Full Name *"
              value={fullName}
              onChangeText={setField("fullName", setFullName)}
            />
            <PressScale onPress={() => openDate("dob")}>
              <RegField
                fieldKey="dob"
                invalid={errorField === "dob"}
                onBindRef={bindFieldRef}
                icon="calendar-outline"
                placeholder="Date of Birth * (AD / BS)"
                value={dateLabel(dob)}
                onChangeText={() => {}}
                suffix="calendar-outline"
                readOnly
              />
            </PressScale>
            <RegField icon="hourglass-outline" placeholder="Age (auto)" value={age} onChangeText={() => {}} readOnly />
            <RegField
              fieldKey="fatherName"
              invalid={errorField === "fatherName"}
              onBindRef={bindFieldRef}
              icon="man-outline"
              placeholder="Father's Name *"
              value={fatherName}
              onChangeText={setField("fatherName", setFatherName)}
            />
            <RegField
              fieldKey="motherName"
              invalid={errorField === "motherName"}
              onBindRef={bindFieldRef}
              icon="woman-outline"
              placeholder="Mother's Name *"
              value={motherName}
              onChangeText={setField("motherName", setMotherName)}
            />
            <RegField
              icon="people-outline"
              placeholder="Grand Father's Name (optional)"
              value={grandFatherName}
              onChangeText={setGrandFatherName}
            />
            <RegField
              fieldKey="phone"
              invalid={errorField === "phone"}
              onBindRef={bindFieldRef}
              icon="call-outline"
              placeholder="Contact Number *"
              value={phone}
              onChangeText={setField("phone", setPhone)}
              keyboardType="phone-pad"
              prefix="+977"
            />
            <RegField
              fieldKey="email"
              invalid={errorField === "email"}
              onBindRef={bindFieldRef}
              icon="mail-outline"
              placeholder="Email Address *"
              value={email}
              onChangeText={setField("email", setEmail)}
              keyboardType="email-address"
            />

            <SectionTitle icon="card" title="Citizenship Information" />
            <RegField
              fieldKey="citizenshipNo"
              invalid={errorField === "citizenshipNo"}
              onBindRef={bindFieldRef}
              icon="id-card-outline"
              placeholder="Citizenship Number *"
              value={citizenshipNo}
              onChangeText={setField("citizenshipNo", setCitizenshipNo)}
            />
            <RegField
              fieldKey="issueDistrict"
              invalid={errorField === "issueDistrict"}
              onBindRef={bindFieldRef}
              icon="location-outline"
              placeholder="Issue District *"
              value={issueDistrict}
              onChangeText={setField("issueDistrict", setIssueDistrict)}
            />
            <PressScale onPress={() => openDate("citizenship")}>
              <RegField
                fieldKey="citizenshipIssueDate"
                invalid={errorField === "citizenshipIssueDate"}
                onBindRef={bindFieldRef}
                icon="calendar-outline"
                placeholder="Citizenship Issue Date * (BS)"
                value={dateLabel(citizenshipIssueDate, true)}
                onChangeText={() => {}}
                suffix="calendar-outline"
                readOnly
              />
            </PressScale>
            <RegField
              fieldKey="nationCardNo"
              invalid={errorField === "nationCardNo"}
              onBindRef={bindFieldRef}
              icon="card-outline"
              placeholder="Nation Card Number *"
              value={nationCardNo}
              onChangeText={setField("nationCardNo", setNationCardNo)}
            />
          </>
        ) : null}

        {step === 1 ? (
          <>
            <SectionTitle icon="briefcase" title="Basic Information" />
            <RegField
              fieldKey="businessName"
              invalid={errorField === "businessName"}
              onBindRef={bindFieldRef}
              icon="storefront-outline"
              placeholder="Business Name *"
              value={businessName}
              onChangeText={setField("businessName", setBusinessName)}
            />
            <PressScale
              onPress={() => {
                Keyboard.dismiss();
                setCategoryOpen(true);
              }}
            >
              <RegField
                fieldKey="category"
                invalid={errorField === "category"}
                onBindRef={bindFieldRef}
                icon="grid-outline"
                placeholder="Select Categories *"
                value={category}
                onChangeText={() => {}}
                suffix="chevron-down"
                readOnly
              />
            </PressScale>
            <RegField
              fieldKey="serviceDescription"
              invalid={errorField === "serviceDescription"}
              onBindRef={bindFieldRef}
              icon="document-text-outline"
              placeholder="Brief Description of Your Service *"
              value={serviceDescription}
              onChangeText={setField("serviceDescription", setServiceDescription)}
              multiline
            />
            <PressScale onPress={() => openDate("businessStart")}>
              <RegField
                fieldKey="businessStartDate"
                invalid={errorField === "businessStartDate"}
                onBindRef={bindFieldRef}
                icon="calendar-outline"
                placeholder="Business Start Date * (AD / BS)"
                value={dateLabel(businessStartDate)}
                onChangeText={() => {}}
                suffix="calendar-outline"
                readOnly
              />
            </PressScale>

            <SectionTitle icon="information-circle" title="Additional Information" />
            <RegField
              fieldKey="businessType"
              invalid={errorField === "businessType"}
              onBindRef={bindFieldRef}
              icon="business-outline"
              placeholder="Business Type (optional)"
              value={businessType}
              onChangeText={setField("businessType", setBusinessType)}
            />
            <RegField
              fieldKey="serviceAreaType"
              invalid={errorField === "serviceAreaType"}
              onBindRef={bindFieldRef}
              icon="map-outline"
              placeholder="Service Area Type (optional)"
              value={serviceAreaType}
              onChangeText={setField("serviceAreaType", setServiceAreaType)}
            />
            <RegField
              fieldKey="yearsExperience"
              invalid={errorField === "yearsExperience"}
              onBindRef={bindFieldRef}
              icon="ribbon-outline"
              placeholder="Years of Experience (optional)"
              value={yearsExperience}
              onChangeText={setField("yearsExperience", setYearsExperience)}
              keyboardType="number-pad"
            />
            <RegField
              fieldKey="employeeCount"
              invalid={errorField === "employeeCount"}
              onBindRef={bindFieldRef}
              icon="people-outline"
              placeholder="No. of Employees (optional)"
              value={employeeCount}
              onChangeText={setField("employeeCount", setEmployeeCount)}
              keyboardType="number-pad"
            />
            <View style={{ height: 24 }} />
          </>
        ) : null}

        {step === 2 ? (
          <>
            <SectionTitle icon="location" title="Business Location" />
            <RegField
              fieldKey="businessLocation"
              invalid={errorField === "businessLocation"}
              onBindRef={bindFieldRef}
              icon="location-outline"
              placeholder="Business Location *"
              value={businessLocation}
              onChangeText={setField("businessLocation", setBusinessLocation)}
            />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <RegField
                  fieldKey="city"
                  invalid={errorField === "city"}
                  onBindRef={bindFieldRef}
                  icon="business-outline"
                  placeholder="City *"
                  value={city}
                  onChangeText={setField("city", setCity)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <RegField
                  fieldKey="province"
                  invalid={errorField === "province"}
                  onBindRef={bindFieldRef}
                  icon="map-outline"
                  placeholder="Province *"
                  value={province}
                  onChangeText={setField("province", setProvince)}
                />
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <RegField
                  fieldKey="district"
                  invalid={errorField === "district"}
                  onBindRef={bindFieldRef}
                  icon="navigate-outline"
                  placeholder="District *"
                  value={district}
                  onChangeText={setField("district", setDistrict)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <RegField
                  fieldKey="area"
                  invalid={errorField === "area"}
                  onBindRef={bindFieldRef}
                  icon="pin-outline"
                  placeholder="Area / Location *"
                  value={area}
                  onChangeText={setField("area", setArea)}
                />
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <RegField
                  fieldKey="wardNo"
                  invalid={errorField === "wardNo"}
                  onBindRef={bindFieldRef}
                  icon="grid-outline"
                  placeholder="Ward No. *"
                  value={wardNo}
                  onChangeText={setField("wardNo", setWardNo)}
                  keyboardType="number-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <RegField icon="flag-outline" placeholder="Landmark (Optional)" value={landmark} onChangeText={setLandmark} />
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <RegField
                  fieldKey="postalCode"
                  invalid={errorField === "postalCode"}
                  onBindRef={bindFieldRef}
                  icon="mail-open-outline"
                  placeholder="Postal Code *"
                  value={postalCode}
                  onChangeText={setField("postalCode", setPostalCode)}
                  keyboardType="number-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <RegField
                  fieldKey="country"
                  invalid={errorField === "country"}
                  onBindRef={bindFieldRef}
                  icon="earth-outline"
                  placeholder="Country *"
                  value={country}
                  onChangeText={setField("country", setCountry)}
                />
              </View>
            </View>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <SectionTitle icon="document-attach" title="Documentation" />
            <UploadField
              fieldKey="photo"
              invalid={errorField === "photo"}
              onBindRef={bindFieldRef}
              title="Live Photo"
              subtitle="Capture a clear live photo with camera"
              uri={photo}
              onPress={() => void pick("photo")}
              cameraOnly
            />
            <UploadField
              fieldKey="nagrita"
              invalid={errorField === "nagrita"}
              onBindRef={bindFieldRef}
              title="Citizenship Front"
              subtitle="Upload citizenship front side"
              uri={nagrita}
              onPress={() => void pick("nagrita")}
            />
            <UploadField
              fieldKey="nagritaBack"
              invalid={errorField === "nagritaBack"}
              onBindRef={bindFieldRef}
              title="Citizenship Back"
              subtitle="Upload citizenship back side"
              uri={nagritaBack}
              onPress={() => void pick("nagrita_back")}
            />
            <UploadField
              fieldKey="nationCard"
              invalid={errorField === "nationCard"}
              onBindRef={bindFieldRef}
              title="Nation Card"
              subtitle="Upload nation card"
              uri={nationCard}
              onPress={() => void pick("nation_card")}
            />
            <UploadField
              fieldKey="otherDocument"
              invalid={errorField === "otherDocument"}
              onBindRef={bindFieldRef}
              title="Other Document (Optional)"
              subtitle="Upload any other document"
              uri={otherDocument}
              onPress={() => void pick("other")}
            />
          </>
        ) : null}

        {step === 4 ? (
          <>
            <SectionTitle icon="shield" title="Create Password" />
            <RegField
              fieldKey="password"
              invalid={errorField === "password"}
              onBindRef={bindFieldRef}
              icon="lock-closed-outline"
              placeholder="Create Password"
              value={password}
              onChangeText={setField("password", setPassword)}
              secure={!showPassword}
              suffix={showPassword ? "eye-off-outline" : "eye-outline"}
              onSuffixPress={() => setShowPassword((value) => !value)}
            />
            <RegField
              fieldKey="confirmPassword"
              invalid={errorField === "confirmPassword"}
              onBindRef={bindFieldRef}
              icon="lock-closed-outline"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChangeText={setField("confirmPassword", setConfirmPassword)}
              secure={!showConfirmPassword}
              suffix={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
              onSuffixPress={() => setShowConfirmPassword((value) => !value)}
            />
            <PasswordRules password={password} />
          </>
        ) : null}
      </KeyboardScreen>
      <RegisterCornerBottom />

      <Modal visible={pickerBusy !== null} transparent animationType="fade" statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.45)", alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <View
            style={{
              width: "100%",
              maxWidth: 280,
              backgroundColor: "#fff",
              borderRadius: 16,
              paddingVertical: 28,
              paddingHorizontal: 22,
              alignItems: "center",
              gap: 14,
            }}
          >
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "#EAF7EE", alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator size="large" color={GREEN} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: "800", color: colors.text, textAlign: "center" }}>
              {pickerBusy === "camera" ? "Opening camera…" : "Opening gallery…"}
            </Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: "center", lineHeight: 18 }}>
              Please wait a moment
            </Text>
          </View>
        </View>
      </Modal>

      <Modal visible={sourceSheet !== null} transparent animationType="slide" onRequestClose={() => setSourceSheet(null)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" }} onPress={() => setSourceSheet(null)}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#fff",
              borderTopLeftRadius: 22,
              borderTopRightRadius: 22,
              paddingHorizontal: 20,
              paddingTop: 14,
              paddingBottom: Math.max(insets.bottom, 18),
            }}
          >
            <View style={{ alignSelf: "center", width: 42, height: 4, borderRadius: 2, backgroundColor: "#E5E7EB", marginBottom: 14 }} />
            <Text style={{ fontSize: 18, fontWeight: "900", color: colors.text }}>Choose photo source</Text>
            <Text style={{ marginTop: 4, marginBottom: 16, color: colors.textSecondary, fontSize: 13 }}>
              Pick how you want to add this document
            </Text>

            <PressScale
              onPress={() => void pickFromSheet(true)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                borderWidth: 1.4,
                borderColor: "#C8EBD2",
                backgroundColor: "#F4FBF6",
                borderRadius: 14,
                padding: 14,
                marginBottom: 10,
              }}
            >
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: GREEN, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="camera" size={22} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "800", color: colors.text, fontSize: 15 }}>Camera</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>Take a new photo now</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={GREEN} />
            </PressScale>

            <PressScale
              onPress={() => void pickFromSheet(false)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                borderWidth: 1.4,
                borderColor: "#E5E7EB",
                backgroundColor: "#F9FAFB",
                borderRadius: 14,
                padding: 14,
                marginBottom: 10,
              }}
            >
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "#111827", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="images" size={22} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "800", color: colors.text, fontSize: 15 }}>Gallery</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>Choose from your photos</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#6B7280" />
            </PressScale>

            <PressScale
              onPress={() => setSourceSheet(null)}
              style={{
                marginTop: 4,
                height: 48,
                borderRadius: 12,
                borderWidth: 1.4,
                borderColor: "#111827",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontWeight: "800", color: "#111827" }}>Cancel</Text>
            </PressScale>
          </Pressable>
        </Pressable>
      </Modal>

      {toast ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 20,
            right: 20,
            top: Math.max(insets.top, 12) + 8,
            zIndex: 40,
          }}
        >
          <View
            style={{
              backgroundColor: "#B91C1C",
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              shadowColor: "#000",
              shadowOpacity: 0.15,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
              elevation: 6,
            }}
          >
            <Ionicons name="alert-circle" size={18} color="#fff" />
            <Text style={{ flex: 1, color: "#fff", fontWeight: "700", fontSize: 13 }}>{toast}</Text>
          </View>
        </View>
      ) : null}

      <DatePickerModal
        visible={dateField !== null}
        title={
          dateField === "dob"
            ? "Date of Birth"
            : dateField === "citizenship"
              ? "Citizenship Issue Date"
              : "Business Start Date"
        }
        valueAd={
          dateField === "dob"
            ? parseStoredAd(dob)
            : dateField === "citizenship"
              ? parseStoredAd(citizenshipIssueDate)
              : parseStoredAd(businessStartDate)
        }
        modes={dateField === "citizenship" ? ["BS"] : ["AD", "BS"]}
        onClose={() => setDateField(null)}
        onPick={applyDate}
      />

      <Modal visible={categoryOpen} transparent animationType="fade" onRequestClose={() => setCategoryOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }} onPress={() => setCategoryOpen(false)}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{ backgroundColor: "#fff", borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16, paddingBottom: Math.max(insets.bottom, 16) }}
          >
            <Text style={{ fontSize: 16, fontWeight: "800", marginBottom: 10 }}>Select service</Text>
            {SERVICE_TYPES.map((item) => {
              const on = item === category;
              return (
                <PressScale
                  key={item}
                  onPress={() => {
                    setCategory(item);
                    clearFieldError("category");
                    setCategoryOpen(false);
                  }}
                  style={{
                    height: 48,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    marginBottom: 6,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    backgroundColor: on ? "#E8F7EC" : "#F9FAFB",
                    borderWidth: 1,
                    borderColor: on ? GREEN : "#E5E7EB",
                  }}
                >
                  <Text style={{ fontWeight: "700", color: on ? GREEN : colors.text }}>{item}</Text>
                  {on ? <Ionicons name="checkmark-circle" size={18} color={GREEN} /> : null}
                </PressScale>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function ErrorScrollHelper({
  errorField,
  errorTick,
  fieldRefs,
}: {
  errorField: FieldKey | null;
  errorTick: number;
  fieldRefs: MutableRefObject<Partial<Record<FieldKey, View | null>>>;
}) {
  const { scrollAnchorIntoView } = useKeyboardScroll();
  useEffect(() => {
    if (!errorField) return;
    const timer = setTimeout(() => {
      scrollAnchorIntoView(fieldRefs.current[errorField] || null);
    }, 80);
    return () => clearTimeout(timer);
  }, [errorField, errorTick, fieldRefs, scrollAnchorIntoView]);
  return null;
}

function Stepper({ active }: { active: number }) {
  return (
    <View style={{ marginTop: 12, marginBottom: 6 }}>
      <View style={{ position: "absolute", left: 24, right: 24, top: 14, height: 2, backgroundColor: "#E5E7EB" }} />
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        {STEPS.map((label, index) => {
          const on = index === active;
          const done = index < active;
          return (
            <View key={label} style={{ width: (PAGE_W - 40) / 5, alignItems: "center" }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: on || done ? GREEN : "#F3F4F6",
                  borderWidth: 1,
                  borderColor: on || done ? GREEN : "#E5E7EB",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: on || done ? "#fff" : "#9CA3AF", fontWeight: "800", fontSize: 12 }}>{index + 1}</Text>
              </View>
              <Text style={{ marginTop: 4, fontSize: 8.5, textAlign: "center", color: on ? GREEN : "#6B7280", fontWeight: on ? "800" : "600" }} numberOfLines={2}>
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function SectionTitle({ icon, title }: { icon: keyof typeof Ionicons.glyphMap; title: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14, marginBottom: 8 }}>
      <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: GREEN, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={15} color="#fff" />
      </View>
      <Text style={{ fontSize: 16, fontWeight: "800", color: colors.text }}>{title}</Text>
    </View>
  );
}

function RegField({
  icon,
  placeholder,
  value,
  onChangeText,
  keyboardType,
  prefix,
  suffix,
  onSuffixPress,
  secure,
  multiline,
  readOnly,
  invalid,
  fieldKey,
  onBindRef,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: "default" | "email-address" | "phone-pad" | "number-pad";
  prefix?: string;
  suffix?: keyof typeof Ionicons.glyphMap;
  onSuffixPress?: () => void;
  secure?: boolean;
  multiline?: boolean;
  readOnly?: boolean;
  invalid?: boolean;
  fieldKey?: FieldKey;
  onBindRef?: (key: FieldKey, ref: View | null) => void;
}) {
  const { onInputFocus, isScrollDragging } = useKeyboardScroll();
  const inputRef = useRef<TextInput>(null);
  const rowH = multiline ? 72 : 46;
  const leftPad = prefix ? 78 : 36;
  const rightPad = suffix ? 40 : 12;

  return (
    <View
      ref={(node) => {
        if (fieldKey && onBindRef) onBindRef(fieldKey, node);
      }}
      style={{
        borderWidth: invalid ? 1.6 : 1.2,
        borderColor: invalid ? colors.red : "#D1D5DB",
        borderRadius: 10,
        minHeight: rowH,
        marginBottom: 10,
        backgroundColor: invalid ? "#FFF5F5" : "#fff",
        justifyContent: multiline ? "flex-start" : "center",
      }}
    >
      <View pointerEvents="none" style={{ position: "absolute", left: 10, top: multiline ? 12 : 0, bottom: multiline ? undefined : 0, justifyContent: "center", zIndex: 1 }}>
        <Ionicons name={icon} size={17} color={invalid ? colors.red : GREEN} />
      </View>
      {prefix ? (
        <View pointerEvents="none" style={{ position: "absolute", left: 34, top: 0, bottom: 0, justifyContent: "center", zIndex: 1 }}>
          <Text style={{ fontWeight: "800", color: colors.text }}>{prefix}</Text>
        </View>
      ) : null}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => {
          if (isScrollDragging()) {
            inputRef.current?.blur();
            return;
          }
          onInputFocus();
        }}
        placeholder={placeholder}
        placeholderTextColor={invalid ? "#F87171" : "#9CA3AF"}
        keyboardType={keyboardType}
        secureTextEntry={secure}
        multiline={multiline}
        editable={!readOnly}
        showSoftInputOnFocus={!readOnly}
        pointerEvents={readOnly ? "none" : "auto"}
        autoCapitalize={keyboardType === "email-address" ? "none" : "sentences"}
        textAlignVertical={multiline ? "top" : "center"}
        style={{
          width: "100%",
          minHeight: rowH,
          color: colors.text,
          paddingLeft: leftPad,
          paddingRight: rightPad,
          paddingTop: multiline ? 12 : Platform.OS === "ios" ? 12 : 10,
          paddingBottom: multiline ? 12 : Platform.OS === "ios" ? 12 : 10,
          ...(Platform.OS === "android" ? { includeFontPadding: false } : null),
        }}
      />
      {suffix ? (
        onSuffixPress ? (
          <Pressable
            onPress={onSuffixPress}
            hitSlop={10}
            style={{ position: "absolute", right: 10, top: 0, bottom: 0, justifyContent: "center", zIndex: 2 }}
          >
            <Ionicons name={suffix} size={18} color={invalid ? colors.red : "#6B7280"} />
          </Pressable>
        ) : (
          <View pointerEvents="none" style={{ position: "absolute", right: 10, top: 0, bottom: 0, justifyContent: "center", zIndex: 1 }}>
            <Ionicons name={suffix} size={16} color={invalid ? colors.red : "#9CA3AF"} />
          </View>
        )
      ) : null}
    </View>
  );
}

function PasswordRules({ password }: { password: string }) {
  const rules = [
    { ok: password.length >= 8, label: "Minimum 8 characters" },
    { ok: /[A-Z]/.test(password), label: "At least one uppercase letter" },
    { ok: /\d/.test(password), label: "At least one number" },
    { ok: /[^A-Za-z0-9]/.test(password), label: "At least one special character" },
  ];
  return (
    <View
      style={{
        marginTop: 4,
        marginBottom: 8,
        borderRadius: 12,
        backgroundColor: "#EAF7EE",
        borderWidth: 1,
        borderColor: "#C8EBD2",
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 8,
      }}
    >
      {rules.map((rule) => (
        <View key={rule.label} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="checkmark-circle" size={16} color={rule.ok ? GREEN : "#9CA3AF"} />
          <Text style={{ color: rule.ok ? GREEN : "#6B7280", fontWeight: "600", fontSize: 13 }}>{rule.label}</Text>
        </View>
      ))}
    </View>
  );
}

function UploadField({
  title,
  subtitle,
  uri,
  onPress,
  invalid,
  fieldKey,
  onBindRef,
  cameraOnly,
}: {
  title: string;
  subtitle: string;
  uri: string;
  onPress: () => void;
  invalid?: boolean;
  fieldKey?: FieldKey;
  onBindRef?: (key: FieldKey, ref: View | null) => void;
  cameraOnly?: boolean;
}) {
  return (
    <View
      ref={(node) => {
        if (fieldKey && onBindRef) onBindRef(fieldKey, node);
      }}
    >
      <PressScale
        onPress={onPress}
        style={{
          borderWidth: invalid ? 1.6 : 1.2,
          borderColor: invalid ? colors.red : uri ? GREEN : "#D1D5DB",
          borderStyle: uri ? "solid" : "dashed",
          borderRadius: 12,
          padding: 14,
          marginBottom: 10,
          backgroundColor: invalid ? "#FFF5F5" : uri ? "#F4FBF6" : "#fff",
        }}
      >
        {uri ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Image source={{ uri }} style={{ width: 52, height: 52, borderRadius: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "800", color: GREEN }}>{title}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                {cameraOnly ? "Captured · tap to retake" : "Uploaded · tap to replace"}
              </Text>
            </View>
            <Ionicons name="camera-outline" size={20} color={GREEN} />
          </View>
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: invalid ? "#FEE2E2" : "#EAF7EE", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={cameraOnly ? "camera-outline" : "cloud-upload-outline"} size={18} color={invalid ? colors.red : GREEN} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: invalid ? colors.red : colors.text, fontWeight: "800" }}>{title}</Text>
              <Text style={{ color: invalid ? "#F87171" : "#6B7280", fontSize: 12, marginTop: 2 }}>{subtitle}</Text>
            </View>
            <Ionicons name="camera-outline" size={20} color={invalid ? colors.red : GREEN} />
          </View>
        )}
      </PressScale>
    </View>
  );
}

function RegisterCornerTop() {
  const size = 148;
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, width: size, height: size, zIndex: 0 }}>
      <Image source={buyerCornerArt} style={{ width: size, height: size }} resizeMode="cover" />
    </View>
  );
}

function RegisterCornerBottom() {
  const size = 110;
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        right: 0,
        bottom: 0,
        width: size,
        height: size,
        zIndex: 20,
        elevation: 20,
      }}
    >
      <Image source={buyerCornerBottomArt} style={{ width: size, height: size }} resizeMode="cover" />
    </View>
  );
}

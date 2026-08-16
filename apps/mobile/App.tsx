import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { api } from "./src/api";
import { API_URL } from "./src/config";
import {
  clearAppTokens,
  getAppAccessToken,
  getAppRefreshToken,
  saveAppTokens,
} from "./src/auth";

type AppUser = {
  email: string | null;
  phone: string | null;
  full_name: string;
};

type AuthResponse = {
  access: string;
  refresh: string;
  user: AppUser;
};

type Screen = "loading" | "login" | "register" | "home";

export default function App() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [user, setUser] = useState<AppUser | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const token = await getAppAccessToken();
      if (!token) {
        setScreen("login");
        return;
      }
      try {
        const me = await api<AppUser>("/api/auth/me/", { token });
        setUser(me);
        setScreen("home");
      } catch {
        await clearAppTokens();
        setScreen("login");
      }
    })();
  }, []);

  async function login() {
    setError("");
    setBusy(true);
    try {
      const data = await api<AuthResponse>("/api/auth/login/", {
        method: "POST",
        body: JSON.stringify({ identifier, password }),
      });
      await saveAppTokens(data.access, data.refresh);
      setUser(data.user);
      setScreen("home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid credentials.");
    } finally {
      setBusy(false);
    }
  }

  async function register() {
    setError("");
    setBusy(true);
    try {
      const payload: Record<string, string> = { password, full_name: fullName };
      if (identifier.includes("@")) {
        payload.email = identifier.trim().toLowerCase();
      } else {
        payload.phone = identifier.trim();
      }
      const data = await api<AuthResponse>("/api/auth/register/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      await saveAppTokens(data.access, data.refresh);
      setUser(data.user);
      setScreen("home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    const token = await getAppAccessToken();
    const refresh = await getAppRefreshToken();
    try {
      if (token && refresh) {
        await api("/api/auth/logout/", {
          method: "POST",
          token,
          body: JSON.stringify({ refresh }),
        });
      }
    } catch {
      // Still clear local tokens.
    }
    await clearAppTokens();
    setUser(null);
    setPassword("");
    setScreen("login");
  }

  if (screen === "loading") {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#22c55e" />
        <StatusBar style="light" />
      </View>
    );
  }

  if (screen === "home") {
    return (
      <View style={styles.center}>
        <Text style={styles.brand}>NAJIK</Text>
        <Text style={styles.title}>Everything near you</Text>
        <Text style={styles.muted}>Location and listings come next.</Text>
        <Text style={styles.user}>
          {user?.full_name || user?.email || user?.phone}
        </Text>
        <Pressable style={styles.secondary} onPress={logout}>
          <Text style={styles.secondaryText}>Log out</Text>
        </Pressable>
        <StatusBar style="light" />
      </View>
    );
  }

  const isRegister = screen === "register";

  return (
    <KeyboardAvoidingView
      style={styles.center}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.brand}>NAJIK</Text>
      <Text style={styles.title}>{isRegister ? "Create account" : "Welcome back"}</Text>
      <Text style={styles.muted}>Find • Connect • Buy • Sell • Rent • Hire</Text>
      {__DEV__ ? <Text style={styles.devHint}>API: {API_URL}</Text> : null}
      {isRegister ? (
        <TextInput
          placeholder="Full name"
          placeholderTextColor="#9ca3af"
          value={fullName}
          onChangeText={setFullName}
          style={styles.input}
        />
      ) : null}
      <TextInput
        placeholder="Email or Nepal phone"
        placeholderTextColor="#9ca3af"
        autoCapitalize="none"
        keyboardType="email-address"
        value={identifier}
        onChangeText={setIdentifier}
        style={styles.input}
      />
      <TextInput
        placeholder="Password (8+ characters)"
        placeholderTextColor="#9ca3af"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        style={styles.primary}
        onPress={isRegister ? register : login}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color="#07090c" />
        ) : (
          <Text style={styles.primaryText}>
            {isRegister ? "Register" : "Log in"}
          </Text>
        )}
      </Pressable>
      <Pressable
        onPress={() => {
          setError("");
          setScreen(isRegister ? "login" : "register");
        }}
      >
        <Text style={styles.link}>
          {isRegister ? "Already have an account? Log in" : "New here? Create an account"}
        </Text>
      </Pressable>
      <StatusBar style="light" />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: "#07090c",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  brand: {
    color: "#22c55e",
    letterSpacing: 4,
    fontWeight: "700",
    fontSize: 14,
  },
  title: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "700",
    marginTop: 8,
    textAlign: "center",
  },
  muted: {
    color: "#9ca3af",
    marginTop: 6,
    marginBottom: 8,
    textAlign: "center",
  },
  devHint: {
    color: "#6b7280",
    fontSize: 11,
    marginBottom: 16,
    textAlign: "center",
  },
  user: {
    color: "#ffffff",
    marginTop: 16,
    marginBottom: 24,
  },
  input: {
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: "#1f2933",
    backgroundColor: "#12151a",
    color: "#ffffff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  primary: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#22c55e",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  primaryText: {
    color: "#07090c",
    fontWeight: "700",
    fontSize: 16,
  },
  secondary: {
    borderWidth: 1,
    borderColor: "#1f2933",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  secondaryText: {
    color: "#ffffff",
  },
  link: {
    color: "#22c55e",
    marginTop: 16,
  },
  error: {
    color: "#f87171",
    marginBottom: 8,
    textAlign: "center",
  },
});

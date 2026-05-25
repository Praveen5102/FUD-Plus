import React, { useState, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../types/navigation";
import { APP_COLORS } from "../../theme/appTheme";
import { supabase } from "../../services/supabase";

const { width, height } = Dimensions.get("window");

export default function LoginScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  const [passwordValid, setPasswordValid] = useState<boolean | null>(null);

  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 12,
        duration: 55,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -12,
        duration: 55,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 8,
        duration: 55,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -8,
        duration: 55,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 55,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const validateEmail = (val: string) => {
    setEmail(val);
    if (!val.length) {
      setEmailValid(null);
      return;
    }
    setEmailValid(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val));
  };

  const validatePassword = (val: string) => {
    setPassword(val);
    if (!val.length) {
      setPasswordValid(null);
      return;
    }
    setPasswordValid(val.length >= 6);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      shake();
      Alert.alert("Missing Fields", "Please fill all fields.");
      return;
    }
    if (!emailValid) {
      shake();
      Alert.alert("Invalid Email", "Enter a valid email address.");
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        shake();
        Alert.alert("Login Failed", error.message);
        setLoading(false);
        return;
      }

      const user = data?.session?.user;
      if (!user) {
        Alert.alert("Session Error", "User session not found.");
        setLoading(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError || !profileData) {
        Alert.alert(
          "Profile Error",
          profileError?.message || "No profile found.",
        );
        setLoading(false);
        return;
      }

      navigation.reset({
        index: 0,

        routes: [
          {
            name: profileData.role === "admin" ? "AdminTabs" : "EmployeeTabs",
          },
        ],
      });
      setLoading(false);
    } catch (err: any) {
      shake();
      Alert.alert("Unexpected Error", err?.message || "Something went wrong.");
      setLoading(false);
    }
  };

  const borderColor = (focused: boolean, valid: boolean | null) => {
    if (valid === false) return "#f87171";
    if (valid === true) return "#34d399";
    if (focused) return "#38bdf8";
    return "rgba(255,255,255,0.1)";
  };

  const iconColor = (valid: boolean | null, defaultColor = "#7dd3fc") => {
    if (valid === false) return "#f87171";
    if (valid === true) return "#34d399";
    return defaultColor;
  };

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      {/* ── FULL SCREEN GRADIENT BG ── */}
      <LinearGradient
        colors={[
          "#0c1929",
          "#0a2540",
          "#0d3a6e",
          "#1a5fa8",
          "#2e8fd4",
          "#5bbfe8",
        ]}
        locations={[0, 0.2, 0.42, 0.62, 0.82, 1]}
        start={{ x: 0.3, y: 1 }}
        end={{ x: 0.7, y: 0 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Ambient blobs */}
      <View style={styles.blob1} />
      <View style={styles.blob2} />
      <View style={styles.blob3} />

      {/* Grid lines */}
      <View style={styles.gridH1} />
      <View style={styles.gridH2} />
      <View style={styles.gridV1} />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.kav}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          {/* ══ TOP SECTION: LOGO ══ */}
          <View style={styles.topSection}>
            {/* Logo with layered glow rings */}
            <View style={styles.logoGlow3}>
              <View style={styles.logoGlow2}>
                <View style={styles.logoGlow1}>
                  <View style={styles.logoContainer}>
                    <Image
                      source={require("../../../assets/images/logo.jpeg")}
                      style={styles.logo}
                      resizeMode="cover"
                    />
                  </View>
                </View>
              </View>
            </View>

            <Text style={styles.appName}>FlyurDream</Text>
            <Text style={styles.appTagline}>
              FUD Plus · Workforce Management
            </Text>
          </View>

          {/* ══ BOTTOM PANEL: FORM ══ */}
          <Animated.View
            style={[styles.panel, { transform: [{ translateX: shakeAnim }] }]}
          >
            {/* Top accent bar */}
            <LinearGradient
              colors={["#38bdf8", "#0369a1", "transparent"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.panelAccent}
            />

            <Text style={styles.welcomeText}>Sign In</Text>
            <Text style={styles.welcomeSub}>
              Enter your credentials to access your workspace
            </Text>

            {/* ── EMAIL FIELD ── */}
            <View style={styles.fieldWrap}>
              <View style={styles.fieldMeta}>
                <Text style={styles.fieldLabel}>EMAIL</Text>
                {emailValid === true && (
                  <View style={styles.chip}>
                    <Ionicons
                      name="checkmark-circle"
                      size={11}
                      color="#34d399"
                    />
                    <Text style={[styles.chipText, { color: "#34d399" }]}>
                      Verified
                    </Text>
                  </View>
                )}
                {emailValid === false && (
                  <View style={[styles.chip, styles.chipError]}>
                    <Ionicons name="warning" size={11} color="#f87171" />
                    <Text style={[styles.chipText, { color: "#f87171" }]}>
                      Invalid
                    </Text>
                  </View>
                )}
              </View>

              <View
                style={[
                  styles.inputRow,
                  { borderColor: borderColor(emailFocused, emailValid) },
                ]}
              >
                <View
                  style={[
                    styles.inputIcon,
                    { borderColor: borderColor(emailFocused, emailValid) },
                  ]}
                >
                  <Feather
                    name="mail"
                    size={15}
                    color={iconColor(emailValid)}
                  />
                </View>
                <TextInput
                  style={styles.textInput}
                  placeholder="you@company.com"
                  placeholderTextColor="#3d6a8a"
                  value={email}
                  onChangeText={validateEmail}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {emailValid === true && (
                  <Ionicons
                    name="checkmark-circle"
                    size={17}
                    color="#34d399"
                    style={{ marginRight: 14 }}
                  />
                )}
                {emailValid === false && (
                  <Ionicons
                    name="close-circle"
                    size={17}
                    color="#f87171"
                    style={{ marginRight: 14 }}
                  />
                )}
              </View>
            </View>

            {/* ── PASSWORD FIELD ── */}
            <View style={styles.fieldWrap}>
              <View style={styles.fieldMeta}>
                <Text style={styles.fieldLabel}>PASSWORD</Text>
                {passwordValid === false && (
                  <View style={[styles.chip, styles.chipError]}>
                    <Ionicons name="warning" size={11} color="#f87171" />
                    <Text style={[styles.chipText, { color: "#f87171" }]}>
                      Min 6 chars
                    </Text>
                  </View>
                )}
              </View>

              <View
                style={[
                  styles.inputRow,
                  { borderColor: borderColor(passwordFocused, passwordValid) },
                ]}
              >
                <View
                  style={[
                    styles.inputIcon,
                    {
                      borderColor: borderColor(passwordFocused, passwordValid),
                    },
                  ]}
                >
                  <Feather
                    name="lock"
                    size={15}
                    color={iconColor(passwordValid)}
                  />
                </View>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your password"
                  placeholderTextColor="#3d6a8a"
                  value={password}
                  onChangeText={validatePassword}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                >
                  <Feather
                    name={showPassword ? "eye" : "eye-off"}
                    size={16}
                    color="#4a90b8"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot */}
            <TouchableOpacity style={styles.forgotWrap}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            {/* ── SIGN IN BUTTON ── */}
            <TouchableOpacity
              onPress={handleLogin}
              activeOpacity={0.86}
              disabled={loading}
              style={styles.btnOuter}
            >
              <LinearGradient
                colors={
                  loading
                    ? ["#1e3a5f", "#1e3a5f"]
                    : ["#38bdf8", "#0284c7", "#0369a1"]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.btn}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <View style={styles.btnContent}>
                    <Text style={styles.btnText}>Sign In</Text>
                    <View style={styles.btnArrow}>
                      <Feather name="arrow-right" size={15} color="#0369a1" />
                    </View>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Secure note */}
            <View style={styles.secureRow}>
              <Ionicons
                name="shield-checkmark-outline"
                size={13}
                color="#2e6fa3"
              />
              <Text style={styles.secureNote}>
                256-bit encrypted · Powered by Supabase
              </Text>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const PANEL_RADIUS = 40;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0c1929" },
  safeArea: { flex: 1 },
  kav: { flex: 1, justifyContent: "space-between" },

  // Ambient blobs
  blob1: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    top: -60,
    right: -80,
    backgroundColor: "rgba(56,189,248,0.12)",
  },
  blob2: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    top: "30%",
    left: -80,
    backgroundColor: "rgba(14,165,233,0.10)",
  },
  blob3: {
    position: "absolute",
    width: 250,
    height: 250,
    borderRadius: 125,
    bottom: "30%",
    right: -60,
    backgroundColor: "rgba(3,105,161,0.14)",
  },

  // Subtle grid
  gridH1: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "28%",
    height: 1,
    backgroundColor: "rgba(56,189,248,0.06)",
  },
  gridH2: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "55%",
    height: 1,
    backgroundColor: "rgba(56,189,248,0.04)",
  },
  gridV1: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "50%",
    width: 1,
    backgroundColor: "rgba(56,189,248,0.04)",
  },

  // ── TOP SECTION ──
  topSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 20,
  },

  // Layered glow rings
  logoGlow3: {
    width: 148,
    height: 148,
    borderRadius: 74,
    backgroundColor: "rgba(56,189,248,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoGlow2: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: "rgba(56,189,248,0.10)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.15)",
  },
  logoGlow1: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(56,189,248,0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(56,189,248,0.25)",
  },
  logoContainer: {
    width: 90,
    height: 90,
    borderRadius: 26,
    overflow: "hidden",
    shadowColor: "#38bdf8",
    shadowOpacity: 0.7,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 20,
  },
  logo: { width: 90, height: 90 },

  appName: {
    marginTop: 22,
    color: "#f0f9ff",
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: -1,
    textShadowColor: "rgba(56,189,248,0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 16,
  },
  appTagline: {
    marginTop: 8,
    color: "rgba(148,212,240,0.7)",
    fontSize: 12.5,
    fontWeight: "600",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },

  // ── BOTTOM PANEL ──
  panel: {
    backgroundColor: "rgba(6,14,30,0.90)",
    borderTopLeftRadius: PANEL_RADIUS,
    borderTopRightRadius: PANEL_RADIUS,
    paddingHorizontal: 26,
    paddingTop: 28,
    paddingBottom: 36,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: "rgba(56,189,248,0.14)",
    shadowColor: "#38bdf8",
    shadowOpacity: 0.2,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: -8 },
    elevation: 24,
  },
  panelAccent: {
    position: "absolute",
    top: 0,
    left: 40,
    right: 40,
    height: 2,
    borderRadius: 2,
  },

  welcomeText: {
    color: "#f0f9ff",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.6,
    marginBottom: 6,
  },
  welcomeSub: {
    color: "#3d6a8a",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 26,
  },

  // Field
  fieldWrap: { marginBottom: 16 },
  fieldMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  fieldLabel: {
    color: "#4a90b8",
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: "rgba(52,211,153,0.1)",
  },
  chipError: { backgroundColor: "rgba(248,113,113,0.1)" },
  chipText: { fontSize: 10, fontWeight: "700" },

  inputRow: {
    height: 54,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1.5,
    overflow: "hidden",
  },
  inputIcon: {
    width: 48,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.06)",
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 14,
    color: "#e2f4ff",
    fontSize: 14.5,
    fontWeight: "500",
  },
  eyeBtn: { paddingHorizontal: 14, paddingVertical: 8 },

  // Forgot
  forgotWrap: { alignItems: "flex-end", marginBottom: 22 },
  forgotText: { color: "#38bdf8", fontSize: 13, fontWeight: "600" },

  // Button
  btnOuter: { borderRadius: 18, overflow: "hidden", marginBottom: 18 },
  btn: { height: 56, justifyContent: "center", alignItems: "center" },
  btnContent: { flexDirection: "row", alignItems: "center", gap: 12 },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  btnArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },

  // Secure
  secureRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  secureNote: { color: "#2e6fa3", fontSize: 11, fontWeight: "500" },
});

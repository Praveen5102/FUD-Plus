import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute } from "@react-navigation/native";
import GradientScreen from "../../../components/layout/GradientScreen";
import { supabase } from "../../../services/supabase";

const { width } = Dimensions.get("window");

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface EmployeeProfile {
  id: string;
  employee_id: string;
  full_name: string;
  email: string;
  department: string;
  phone_number: string;
  is_active: boolean;
  profile_image: string | null;
}

// ─── DEPARTMENTS LIST ─────────────────────────────────────────────────────────
const DEPARTMENTS = [
  "Engineering",
  "Finance",
  "Marketing",
  "HR",
  "Operations",
  "Design",
  "Sales",
  "IT",
];

export default function EditEmployeeScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { employee } = route.params as { employee: EmployeeProfile };

  // ─── FORM STATES ────────────────────────────────────────────────────────────
  const [fullName, setFullName] = useState(employee.full_name);
  const [email, setEmail] = useState(employee.email);
  const [phone, setPhone] = useState(employee.phone_number || "");
  const [department, setDepartment] = useState(employee.department);
  const [isActive, setIsActive] = useState(employee.is_active);

  const [saving, setSaving] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  // ─── DATABASE UPDATE ENGINE ─────────────────────────────────────────────────
  const handleUpdateEmployee = async () => {
    // Basic Form Validation Guardrails
    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      Alert.alert(
        "Required Fields Missing",
        "Please complete all fields to validate modifications.",
      );
      return;
    }

    const updatedPayload = {
      full_name: fullName.trim(),
      email: email.trim(),
      phone_number: phone.trim(),
      department: department,
      is_active: isActive,
    };

    try {
      setSaving(true);

      const { error } = await supabase
        .from("profiles")
        .update(updatedPayload)
        .eq("id", employee.id);

      if (error) throw error;

      Alert.alert("Success", "Employee records updated smoothly.", [
        {
          text: "OK",
          onPress: () => {
            // Navigate back to EmployeeDetails, sending the updated data payload down the route parameters pipeline
            navigation.navigate("EmployeeDetails", {
              employee: {
                ...employee,
                ...updatedPayload,
              },
            });
          },
        },
      ]);
    } catch (err: any) {
      console.error(err);
      Alert.alert(
        "Update Failed",
        err.message || "An error occurred writing to transaction logs.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <GradientScreen>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe}>
        {/* Header Action Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Feather name="arrow-left" size={18} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={{ width: 40 }} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollBody}
          >
            <Animated.View style={{ opacity: fadeAnim, gap: 20 }}>
              {/* Employee ID Badge Chip */}
              <View style={styles.idBadgeContainer}>
                <Text style={styles.idBadgeText}>
                  Modifying Record: {employee.employee_id}
                </Text>
              </View>

              {/* Form Card */}
              <View style={styles.glassFormCard}>
                {/* Field: Full Name */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <View style={styles.inputWrapper}>
                    <Feather
                      name="user"
                      size={16}
                      color="#64748b"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.textInput}
                      value={fullName}
                      onChangeText={setFullName}
                      placeholder="John Doe"
                      placeholderTextColor="#475569"
                      keyboardAppearance="dark"
                    />
                  </View>
                </View>

                {/* Field: Email Address */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <View style={styles.inputWrapper}>
                    <Feather
                      name="mail"
                      size={16}
                      color="#64748b"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.textInput}
                      value={email}
                      onChangeText={setEmail}
                      placeholder="john@company.com"
                      placeholderTextColor="#475569"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      keyboardAppearance="dark"
                    />
                  </View>
                </View>

                {/* Field: Phone Number */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Phone Number</Text>
                  <View style={styles.inputWrapper}>
                    <Feather
                      name="phone"
                      size={16}
                      color="#64748b"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.textInput}
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="9876543210"
                      placeholderTextColor="#475569"
                      keyboardType="phone-pad"
                      keyboardAppearance="dark"
                    />
                  </View>
                </View>

                {/* Field: Department */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Department Selection</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.deptRow}
                  >
                    {DEPARTMENTS.map((dept) => {
                      const isSelected = department === dept;
                      return (
                        <TouchableOpacity
                          key={dept}
                          style={[
                            styles.deptChip,
                            isSelected && styles.deptChipSelected,
                          ]}
                          onPress={() => setDepartment(dept)}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.deptChipText,
                              isSelected && styles.deptChipTextSelected,
                            ]}
                          >
                            {dept}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Field: Assignment Status Toggle Row */}
                <View style={styles.statusToggleRow}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.statusTitle}>
                      Profile Operational Status
                    </Text>
                    <Text style={styles.statusSubtitle}>
                      Inactive employees are locked out of punches
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.toggleTrack,
                      isActive
                        ? styles.toggleTrackActive
                        : styles.toggleTrackInactive,
                    ]}
                    onPress={() => setIsActive(!isActive)}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.toggleThumb,
                        isActive
                          ? styles.toggleThumbActive
                          : styles.toggleThumbInactive,
                      ]}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Submit Save Button */}
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleUpdateEmployee}
                disabled={saving}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={["#1d4ed8", "#3b82f6"]}
                  style={[StyleSheet.absoluteFill, { borderRadius: 18 }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Feather name="check-circle" size={16} color="#fff" />
                    <Text style={styles.saveBtnText}>Commit Adjustments</Text>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientScreen>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    color: "#f1f5f9",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 60,
  },
  idBadgeContainer: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(59,130,246,0.12)",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.25)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  idBadgeText: {
    color: "#60a5fa",
    fontSize: 11,
    fontWeight: "700",
  },
  glassFormCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    padding: 20,
    gap: 18,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    paddingLeft: 4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15,23,42,0.6)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    color: "#f1f5f9",
    fontSize: 14,
    fontWeight: "500",
  },
  deptRow: {
    gap: 8,
    paddingVertical: 6,
  },
  deptChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  deptChipSelected: {
    backgroundColor: "rgba(37,99,235,0.15)",
    borderColor: "rgba(59,130,246,0.4)",
  },
  deptChipText: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "600",
  },
  deptChipTextSelected: {
    color: "#60a5fa",
    fontWeight: "700",
  },
  statusToggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.01)",
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    paddingTop: 18,
    marginTop: 6,
  },
  statusTitle: {
    color: "#e2e8f0",
    fontSize: 13,
    fontWeight: "700",
  },
  statusSubtitle: {
    color: "#475569",
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
  toggleTrack: {
    width: 50,
    height: 28,
    borderRadius: 15,
    padding: 3,
    justifyContent: "center",
  },
  toggleTrackActive: {
    backgroundColor: "rgba(74,222,128,0.2)",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.4)",
  },
  toggleTrackInactive: {
    backgroundColor: "rgba(248,113,113,0.1)",
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.2)",
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  toggleThumbActive: {
    backgroundColor: "#4ade80",
    alignSelf: "flex-end",
  },
  toggleThumbInactive: {
    backgroundColor: "#f87171",
    alignSelf: "flex-start",
  },
  saveBtn: {
    flexDirection: "row",
    height: 54,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 10,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});

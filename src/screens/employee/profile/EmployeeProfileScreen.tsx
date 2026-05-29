import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
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
import { supabase } from "../../../services/supabase";
import { useAuth } from "../../../context/AuthContext";

export default function EmployeeProfileScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [passwordModal, setPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchProfile = async () => {
    try {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        Alert.alert("Profile Error", error.message);
        return;
      }
      setProfile(data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        Alert.alert("Logout Error", error.message);
        return;
      }
    } catch (error) {
      Alert.alert("Error", "Logout failed.");
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert("Missing Fields", "Please fill all fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Password Mismatch", "Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Weak Password", "Minimum 6 characters required.");
      return;
    }

    try {
      setUpdating(true);
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        Alert.alert("Error", error.message);
        return;
      }

      Alert.alert("Success", "Password updated successfully.");
      setPasswordModal(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Something went wrong.");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <LinearGradient
        colors={["#030712", "#0b1528", "#11254c", "#1d4ed8"]}
        style={styles.loader}
      >
        <ActivityIndicator size="large" color="#3b82f6" />
      </LinearGradient>
    );
  }

  const displayName = profile?.full_name || "Employee";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .map(() => [0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <LinearGradient
      colors={["#030712", "#0b1528", "#11254c", "#1d4ed8"]}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* PROFILE SECTION */}
          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              {profile?.profile_image ? (
                <Image
                  source={{ uri: profile.profile_image }}
                  style={styles.profileImage}
                />
              ) : (
                <LinearGradient
                  colors={["#2563eb", "#3b82f6"]}
                  style={styles.avatar}
                >
                  <Text style={styles.avatarInitials}>{initials}</Text>
                </LinearGradient>
              )}
            </View>
            <Text style={styles.name}>{displayName}</Text>
            <View style={styles.roleContainer}>
              <Text style={styles.roleLabel}>
                {profile?.role === "admin" ? "Administrator" : "Employee"}
              </Text>
            </View>
          </View>

          {/* DETAILS CARD */}
          <Text style={styles.sectionHeading}>Account Details</Text>
          <View style={styles.card}>
            {[
              {
                icon: "mail-outline",
                label: "Email Address",
                value: profile?.email || "—",
              },
              {
                icon: "call-outline",
                label: "Phone Connection",
                value: profile?.phone_number || "—",
              },
              {
                icon: "briefcase-outline",
                label: "Department Assignment",
                value: profile?.department || "—",
              },
              {
                icon: "id-card-outline",
                label: "System Employee ID",
                value: profile?.employee_id || "—",
              },
            ].map((item, index) => (
              <View
                key={index}
                style={[styles.infoRow, index === 3 && { marginBottom: 0 }]}
              >
                <View style={styles.iconBox}>
                  <Ionicons name={item.icon as any} size={16} color="#60a5fa" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>{item.label}</Text>
                  <Text style={styles.infoValue} numberOfLines={1}>
                    {item.value}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* ACTIONS CARD */}
          <Text style={styles.sectionHeading}>Preferences</Text>
          <View style={styles.card}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.actionRow}
              onPress={() => setPasswordModal(true)}
            >
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: "rgba(255,255,255,0.04)" },
                ]}
              >
                <Feather name="lock" size={16} color="#fff" />
              </View>
              <Text style={styles.actionText}>Change Passcode</Text>
              <Feather
                name="chevron-right"
                size={16}
                color="#475569"
                style={styles.chevronRight}
              />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.actionRow}
              onPress={handleLogout}
            >
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: "rgba(239,68,68,0.1)" },
                ]}
              >
                <Feather name="log-out" size={16} color="#f87171" />
              </View>
              <Text style={[styles.actionText, { color: "#f87171" }]}>
                Sign Out Account
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* PASSWORD UPDATE BOTTOM DIALOG MODAL */}
      <Modal
        visible={passwordModal}
        transparent
        animationType="slide"
        onRequestClose={() => setPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => setPasswordModal(false)}
          />
          <View style={styles.modalContainer}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Update Security Password</Text>

            <TextInput
              placeholder="Enter New Password"
              placeholderTextColor="#475569"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              style={styles.input}
            />

            <TextInput
              placeholder="Confirm New Password"
              placeholderTextColor="#475569"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              style={styles.input}
            />

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleChangePassword}
              disabled={updating}
            >
              <LinearGradient
                colors={["#1d4ed8", "#3b82f6"]}
                style={styles.updateButton}
              >
                {updating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.updateText}>Confirm Passcode</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setPasswordModal(false)}
            >
              <Text style={styles.cancelText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  safeArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 140 },
  profileSection: { alignItems: "center", marginBottom: 24 },
  avatarContainer: {
    borderWidth: 3,
    borderColor: "rgba(59,130,246,0.3)",
    borderRadius: 54,
    padding: 4,
    marginBottom: 12,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitials: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 1,
  },
  profileImage: { width: 90, height: 90, borderRadius: 45 },
  name: { color: "#f1f5f9", fontSize: 22, fontWeight: "900" },
  roleContainer: {
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: "rgba(59,130,246,0.12)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.2)",
  },
  roleLabel: {
    color: "#60a5fa",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  sectionHeading: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    padding: 16,
    borderRadius: 24,
    marginBottom: 24,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  infoLabel: { color: "#64748b", fontSize: 11, fontWeight: "500" },
  infoValue: {
    color: "#f1f5f9",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },
  actionRow: { flexDirection: "row", alignItems: "center", paddingVertical: 2 },
  actionText: {
    color: "#f1f5f9",
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
    marginLeft: 14,
  },
  chevronRight: { marginRight: 4 },
  divider: {
    height: 1,
    marginVertical: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(2,6,23,0.8)",
  },
  modalContainer: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 44,
    backgroundColor: "#0b1528",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: "#334155",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 20,
  },
  input: {
    height: 54,
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 14,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    color: "#fff",
    fontSize: 14,
  },
  updateButton: {
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
  },
  updateText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  cancelButton: {
    height: 50,
    borderRadius: 16,
    marginTop: 10,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  cancelText: { color: "#94a3b8", fontSize: 14, fontWeight: "700" },
});

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

  // FETCH PROFILE

  const fetchProfile = async () => {
    try {
      if (!user?.id) {
        setLoading(false);

        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.log(error);

        Alert.alert("Profile Error", error.message);

        setLoading(false);

        return;
      }

      setProfile(data);

      setLoading(false);
    } catch (error) {
      console.log(error);

      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // LOGOUT

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        Alert.alert("Logout Error", error.message);

        return;
      }

      Alert.alert("Success", "Logged out successfully.");
    } catch (error) {
      console.log(error);

      Alert.alert("Error", "Logout failed.");
    }
  };

  // PASSWORD UPDATE

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

      const timeout = new Promise((_, reject) =>
        setTimeout(() => {
          reject(new Error("Request timeout"));
        }, 10000),
      );

      const updateRequest = supabase.auth.updateUser({
        password: newPassword,
      });

      const result = (await Promise.race([updateRequest, timeout])) as any;

      if (result.error) {
        Alert.alert("Error", result.error.message);

        setUpdating(false);

        return;
      }

      Alert.alert("Success", "Password updated successfully.");

      setPasswordModal(false);

      setNewPassword("");

      setConfirmPassword("");

      setUpdating(false);
    } catch (error: any) {
      console.log(error);

      Alert.alert("Error", error.message || "Something went wrong.");

      setUpdating(false);
    }
  };

  // LOADER

  if (loading) {
    return (
      <LinearGradient
        colors={["#071226", "#0f1f3d", "#163a72", "#1d4ed8"]}
        style={styles.loader}
      >
        <ActivityIndicator size="large" color="#fff" />
      </LinearGradient>
    );
  }

  return (
    <>
      <LinearGradient
        colors={["#071226", "#0f1f3d", "#163a72", "#1d4ed8"]}
        style={styles.container}
      >
        <StatusBar barStyle="light-content" />

        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* PROFILE */}

            <View style={styles.profileSection}>
              {profile?.profile_image ? (
                <Image
                  source={{
                    uri: profile.profile_image,
                  }}
                  style={styles.profileImage}
                />
              ) : (
                <View style={styles.avatar}>
                  <Ionicons name="person" size={40} color="#fff" />
                </View>
              )}

              <Text style={styles.name}>
                {profile?.full_name || "Employee"}
              </Text>

              <View style={styles.roleContainer}>
                <Text style={styles.roleLabel}>
                  {profile?.role === "admin" ? "Administrator" : "Employee"}
                </Text>
              </View>
            </View>

            {/* DETAILS */}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Employee Details</Text>

              {[
                {
                  icon: "mail-outline",

                  label: "Email",

                  value: profile?.email || "--",
                },

                {
                  icon: "call-outline",

                  label: "Phone",

                  value: profile?.phone_number || "--",
                },

                {
                  icon: "briefcase-outline",

                  label: "Department",

                  value: profile?.department || "--",
                },

                {
                  icon: "id-card-outline",

                  label: "Employee ID",

                  value: profile?.employee_id || "--",
                },
              ].map((item, index) => (
                <View key={index} style={styles.infoRow}>
                  <View style={styles.iconBox}>
                    <Ionicons name={item.icon as any} size={18} color="#fff" />
                  </View>

                  <View>
                    <Text style={styles.infoLabel}>{item.label}</Text>

                    <Text style={styles.infoValue}>{item.value}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* ACTIONS */}

            <View style={styles.card}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.actionRow}
                onPress={() => setPasswordModal(true)}
              >
                <Feather name="lock" size={18} color="#fff" />

                <Text style={styles.actionText}>Change Password</Text>
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.actionRow}
                onPress={handleLogout}
              >
                <Feather name="log-out" size={18} color="#ef4444" />

                <Text
                  style={[
                    styles.actionText,
                    {
                      color: "#ef4444",
                    },
                  ]}
                >
                  Logout
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>

      {/* PASSWORD MODAL */}

      <Modal visible={passwordModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Change Password</Text>

            <TextInput
              placeholder="New Password"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              style={styles.input}
            />

            <TextInput
              placeholder="Confirm Password"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              style={styles.input}
            />

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={handleChangePassword}
              disabled={updating}
            >
              <LinearGradient
                colors={["#2563eb", "#60a5fa"]}
                style={styles.updateButton}
              >
                {updating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.updateText}>Update Password</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setPasswordModal(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  loader: {
    flex: 1,

    justifyContent: "center",

    alignItems: "center",
  },

  safeArea: {
    flex: 1,
  },

  scrollContent: {
    padding: 20,

    paddingBottom: 120,
  },

  profileSection: {
    alignItems: "center",

    marginBottom: 28,
  },

  avatar: {
    width: 90,
    height: 90,

    borderRadius: 45,

    justifyContent: "center",

    alignItems: "center",

    backgroundColor: "rgba(255,255,255,0.10)",
  },

  profileImage: {
    width: 90,
    height: 90,

    borderRadius: 45,
  },

  name: {
    color: "#fff",

    fontSize: 24,

    fontWeight: "800",

    marginTop: 14,
  },

  role: {
    color: "#bfdbfe",

    fontSize: 14,

    marginTop: 6,

    textTransform: "capitalize",
  },

  roleContainer: {
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: "rgba(37, 99, 235, 0.2)",
    borderRadius: 12,
  },

  roleLabel: {
    color: "#60a5fa",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },

  card: {
    padding: 20,

    borderRadius: 24,

    marginBottom: 20,

    backgroundColor: "rgba(255,255,255,0.08)",
  },

  cardTitle: {
    color: "#fff",

    fontSize: 17,

    fontWeight: "700",

    marginBottom: 20,
  },

  infoRow: {
    flexDirection: "row",

    alignItems: "center",

    marginBottom: 18,
  },

  iconBox: {
    width: 42,
    height: 42,

    borderRadius: 14,

    justifyContent: "center",

    alignItems: "center",

    marginRight: 14,

    backgroundColor: "rgba(255,255,255,0.10)",
  },

  infoLabel: {
    color: "#bfdbfe",

    fontSize: 12,
  },

  infoValue: {
    color: "#fff",

    fontSize: 14,

    fontWeight: "700",

    marginTop: 4,
  },

  actionRow: {
    flexDirection: "row",

    alignItems: "center",

    paddingVertical: 6,
  },

  actionText: {
    color: "#fff",

    fontSize: 15,

    fontWeight: "700",

    marginLeft: 14,
  },

  divider: {
    height: 1,

    marginVertical: 18,

    backgroundColor: "rgba(255,255,255,0.08)",
  },

  modalOverlay: {
    flex: 1,

    justifyContent: "center",

    backgroundColor: "rgba(0,0,0,0.6)",

    padding: 20,
  },

  modalContainer: {
    borderRadius: 28,

    padding: 22,

    backgroundColor: "#071226",
  },

  modalTitle: {
    color: "#fff",

    fontSize: 20,

    fontWeight: "800",

    marginBottom: 22,
  },

  input: {
    height: 56,

    borderRadius: 18,

    paddingHorizontal: 18,

    marginBottom: 16,

    backgroundColor: "rgba(255,255,255,0.08)",

    color: "#fff",
  },

  updateButton: {
    height: 54,

    borderRadius: 18,

    justifyContent: "center",

    alignItems: "center",
  },

  updateText: {
    color: "#fff",

    fontSize: 15,

    fontWeight: "700",
  },

  cancelButton: {
    height: 52,

    borderRadius: 18,

    marginTop: 12,

    justifyContent: "center",

    alignItems: "center",

    backgroundColor: "rgba(255,255,255,0.08)",
  },

  cancelText: {
    color: "#dbeafe",

    fontWeight: "700",
  },
});

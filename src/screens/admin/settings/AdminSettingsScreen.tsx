import React, { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import GradientScreen from "../../../components/layout/GradientScreen";
import AppHeader from "../../../components/ui/AppHeader";
import { APP_COLORS } from "../../../theme/appTheme";
import { useAuth } from "../../../context/AuthContext";
import { supabase } from "../../../services/supabase";

type RowItem =
  | {
      type: "toggle";
      icon: string;
      label: string;
      sub: string;
      key: string;
      color: string;
    }
  | {
      type: "nav";
      icon: string;
      label: string;
      sub: string;
      color: string;
      danger?: boolean;
      onPress?: () => void;
    };

interface StatItem {
  val: string;
  lbl: string;
  color: string;
  icon: string;
}
interface OfficeConfig {
  location: string;
  radius: number;
}
interface Employee {
  id: string;
  full_name: string;
  email: string;
  employee_id: string;
  department: string;
  role: string;
}

export default function AdminSettingsScreen() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<StatItem[]>([]);
  const [officeConfig] = useState<OfficeConfig>({
    location: "Hyderabad HQ",
    radius: 150,
  });
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    pushNotif: true,
    emailAlerts: false,
  });

  const [checkingDatabase, setCheckingDatabase] = useState(false);
  const [passwordModal, setPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const [resetModal, setResetModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null,
  );
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);
  const [generatedResetPw, setGeneratedResetPw] = useState("");
  const [showResetPwCard, setShowResetPwCard] = useState(false);

  const [adminModal, setAdminModal] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [roleSearch, setRoleSearch] = useState("");

  const fetchProfile = async () => {
    try {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (!error) setProfile(data);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const { count: employeeCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "employee");
      const { data: depts } = await supabase
        .from("profiles")
        .select("department")
        .eq("role", "employee");
      const uniqueDepts = new Set(
        depts?.map((d: any) => d.department).filter(Boolean),
      );
      const today = new Date().toISOString().split("T")[0];
      const { data: attendance } = await supabase
        .from("attendance")
        .select("id");
      const todayAttendance =
        attendance?.filter((item: any) => item.created_at?.startsWith(today)) ||
        [];
      const attendanceRate =
        employeeCount && employeeCount > 0
          ? Math.round((todayAttendance.length / employeeCount) * 100)
          : 0;

      setStats([
        {
          val: employeeCount?.toString() || "0",
          lbl: "Total Staff",
          color: "#60a5fa",
          icon: "people-outline",
        },
        {
          val: uniqueDepts.size.toString(),
          lbl: "Divisions",
          color: "#4ade80",
          icon: "business-outline",
        },
        {
          val: `${attendanceRate}%`,
          lbl: "Today's Rate",
          color: "#a78bfa",
          icon: "pie-chart-outline",
        },
      ]);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      setLoadingEmployees(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, employee_id, department, role")
        .neq("id", user?.id)
        .order("full_name", { ascending: true });
      if (!error) setEmployees(data || []);
    } catch (error) {
      console.log(error);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const flipToggle = (key: string) =>
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleVerifyDatabase = async () => {
    try {
      setCheckingDatabase(true);
      const startTime = Date.now();
      const { error } = await supabase.from("profiles").select("id").limit(1);
      if (error) throw error;
      Alert.alert(
        "Connection Secure",
        `Supabase Cluster Node response latency: ${Date.now() - startTime}ms`,
      );
    } catch (err: any) {
      Alert.alert(
        "Connection Failure",
        err.message || "Backend clustering node unreachable.",
      );
    } finally {
      setCheckingDatabase(false);
    }
  };

  const handleShowVersionSpecs = () => {
    Alert.alert(
      "System Specifications",
      "Application: FUD Plus\nEnvironment: Production\nBuild Signature: FUD-PROD-9842\nBundle Version: 1.0.0",
    );
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert("Missing Fields", "Please fill all fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Mismatch", "Passwords do not match.");
      return;
    }
    try {
      setUpdatingPassword(true);
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      Alert.alert("Success", "Password updated successfully.");
      setPasswordModal(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Something went wrong.");
    } finally {
      setUpdatingPassword(false);
    }
  };

  // Re-routed through updating-role Edge Function
  const handleRoleChange = async (emp: Employee) => {
    const nextRole = emp.role === "admin" ? "employee" : "admin";
    Alert.alert(
      "Confirm Role Change",
      `Are you sure you want to shift ${emp.full_name} to ${nextRole}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              setUpdatingRole(emp.id);
              const { data, error } = await supabase.functions.invoke(
                "update-role",
                {
                  body: { userId: emp.id, role: nextRole },
                },
              );

              if (error || (data && data.success === false)) {
                throw new Error(
                  error?.message || data?.error || "Edge logic rejection.",
                );
              }

              setEmployees((prev) =>
                prev.map((e) =>
                  e.id === emp.id ? { ...e, role: nextRole } : e,
                ),
              );
              Alert.alert("Success", "Security context state synced.");
            } catch (error: any) {
              Alert.alert("Error", error.message || "Role change failed.");
            } finally {
              setUpdatingRole(null);
            }
          },
        },
      ],
    );
  };

  // Re-routed through resetting-password Edge Function
  const handleResetEmployeePassword = async () => {
    if (!resetPassword || !resetConfirm) {
      Alert.alert(
        "Missing Fields",
        "Please populate all passcode constraints.",
      );
      return;
    }
    if (resetPassword !== resetConfirm) {
      Alert.alert("Mismatch", "Passwords do not match.");
      return;
    }
    if (!selectedEmployee) return;

    try {
      setResettingPassword(true);
      const { data, error } = await supabase.functions.invoke(
        "reset-password",
        {
          body: { userId: selectedEmployee.id, password: resetPassword },
        },
      );

      if (error || (data && data.success === false)) {
        throw new Error(
          error?.message || data?.error || "Edge function decryption error.",
        );
      }

      setGeneratedResetPw(resetPassword);
      setResetModal(false);
      setShowResetPwCard(true);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Something went wrong.");
    } finally {
      setResettingPassword(false);
    }
  };

  const openResetModal = (emp: Employee) => {
    setSelectedEmployee(emp);
    setResetPassword("");
    setResetConfirm("");
    setGeneratedResetPw("");
    setResetModal(true);
  };

  const handleAutoGenerate = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    let pw = "";
    for (let i = 0; i < 8; i++)
      pw += chars.charAt(Math.floor(Math.random() * chars.length));
    setResetPassword(pw);
    setResetConfirm(pw);
  };

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to close this terminal session?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await supabase.auth.signOut();
          },
        },
      ],
    );
  };

  const openAdminModal = () => {
    setAdminModal(true);
    fetchAllUsers();
  };

  const SETTINGS_SECTIONS: { title: string; items: RowItem[] }[] = [
    {
      title: "Notification Controls",
      items: [
        {
          type: "toggle",
          key: "pushNotif",
          icon: "bell",
          color: "#3b82f6",
          label: "Global Push Reminders",
          sub: "Broadcast system alerts directly to client apps",
        },
        {
          type: "toggle",
          key: "emailAlerts",
          icon: "mail",
          color: "#10b981",
          label: "Automated Email Reports",
          sub: "Forward monthly overviews to management",
        },
      ],
    },
    {
      title: "Account Security",
      items: [
        {
          type: "nav",
          icon: "lock",
          color: "#f59e0b",
          label: "Change Password",
          sub: "Update admin passcode credentials",
          onPress: () => setPasswordModal(true),
        },
        {
          type: "nav",
          icon: "shield",
          color: "#a78bfa",
          label: "Admin Management Node",
          sub: "Adjust system staff access bounds",
          onPress: openAdminModal,
        },
      ],
    },
    {
      title: "System Diagnostics",
      items: [
        {
          type: "nav",
          icon: "database",
          color: "#ec4899",
          label: "Database Connection Node",
          sub: checkingDatabase
            ? "Testing link latency..."
            : "Verify current Supabase server framework",
          onPress: handleVerifyDatabase,
        },
        {
          type: "nav",
          icon: "info",
          color: "#14b8a6",
          label: "Application Blueprint Profile",
          sub: "FUD Plus · Production Spec Suite",
          onPress: handleShowVersionSpecs,
        },
      ],
    },
  ];

  useEffect(() => {
    fetchProfile();
    fetchDashboardData();
  }, []);

  const filteredEmployees = employees.filter(
    (e) =>
      e.full_name?.toLowerCase().includes(roleSearch.toLowerCase()) ||
      e.email?.toLowerCase().includes(roleSearch.toLowerCase()) ||
      e.department?.toLowerCase().includes(roleSearch.toLowerCase()),
  );

  return (
    <>
      <GradientScreen>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.safe}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            <AppHeader title="Settings" subtitle="Admin Controls" />
            <View style={styles.profileCard}>
              <LinearGradient
                colors={["rgba(59,130,246,0.15)", "rgba(59,130,246,0.02)"]}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.avatarBox}>
                <LinearGradient
                  colors={["#2563eb", "#3b82f6"]}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.avatarText}>
                  {(profile?.full_name?.[0] || "A").toUpperCase()}
                </Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {profile?.full_name || "Admin User"}
                </Text>
                <Text style={styles.profileMail}>
                  {profile?.email || user?.email}
                </Text>
                <View style={styles.badge}>
                  <Ionicons name="shield-checkmark" size={11} color="#60a5fa" />
                  <Text style={styles.badgeText}>SUPER ADMIN</Text>
                </View>
              </View>
            </View>

            <View style={styles.statsRow}>
              {stats.map((item, index) => (
                <View key={index} style={styles.statCard}>
                  <LinearGradient
                    colors={[item.color + "12", "transparent"]}
                    style={StyleSheet.absoluteFill}
                  />
                  <View
                    style={[
                      styles.statIconWrap,
                      { backgroundColor: item.color + "15" },
                    ]}
                  >
                    <Ionicons
                      name={item.icon as any}
                      size={15}
                      color={item.color}
                    />
                  </View>
                  <Text style={[styles.statValue, { color: item.color }]}>
                    {item.val}
                  </Text>
                  <Text style={styles.statLabel}>{item.lbl}</Text>
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Office Workspace Profile</Text>
              <View style={styles.officeRow}>
                <View style={styles.officeBox}>
                  <Feather name="map-pin" size={16} color="#60a5fa" />
                  <Text style={styles.officeValue}>
                    {officeConfig.location}
                  </Text>
                  <Text style={styles.officeLabel}>Office Location</Text>
                </View>
                <View style={styles.officeDivider} />
                <View style={styles.officeBox}>
                  <Feather name="radio" size={16} color="#4ade80" />
                  <Text style={styles.officeValue}>{officeConfig.radius}m</Text>
                  <Text style={styles.officeLabel}>Allowed Geofence</Text>
                </View>
              </View>
            </View>

            {SETTINGS_SECTIONS.map((section, si) => (
              <View key={si}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <View style={styles.card}>
                  {section.items.map((item, index) => (
                    <SettingRow
                      key={index}
                      item={item}
                      isLast={index === section.items.length - 1}
                      toggleState={
                        item.type === "toggle" ? toggles[item.key] : undefined
                      }
                      onToggle={
                        item.type === "toggle"
                          ? () => flipToggle(item.key)
                          : undefined
                      }
                    />
                  ))}
                </View>
              </View>
            ))}

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.logoutBtn}
              onPress={handleLogout}
            >
              <View style={styles.logoutIcon}>
                <Feather name="log-out" size={16} color={APP_COLORS.danger} />
              </View>
              <Text style={styles.logoutText}>Terminate Admin Session</Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={APP_COLORS.danger}
              />
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                FUD Plus Enterprise Cloud Core
              </Text>
              <Text style={styles.footerVersion}>
                System Terminal Engine v1.0.0
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </GradientScreen>

      {/* CHANGE PASSWORD MODAL */}
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
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update System Passcode</Text>
              <TouchableOpacity
                onPress={() => {
                  setPasswordModal(false);
                  setNewPassword("");
                  setConfirmPassword("");
                }}
              >
                <Ionicons name="close" size={22} color="#475569" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>
              Adjust security configurations for default administrative log
              vectors
            </Text>
            <TextInput
              placeholder="New Root Passcode"
              placeholderTextColor="#475569"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              style={styles.input}
            />
            <TextInput
              placeholder="Confirm Root Passcode"
              placeholderTextColor="#475569"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              style={styles.input}
            />
            <TouchableOpacity
              activeOpacity={0.9}
              disabled={updatingPassword}
              onPress={handleChangePassword}
              style={styles.primaryBtn}
            >
              {updatingPassword ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Re-key Passcode</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setPasswordModal(false)}
            >
              <Text style={styles.cancelBtnText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ADMIN REPOSITORY OVERLAY */}
      <Modal
        visible={adminModal}
        transparent
        animationType="slide"
        onRequestClose={() => setAdminModal(false)}
      >
        <View style={styles.adminOverlay}>
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => setAdminModal(false)}
          />
          <View style={styles.adminContainer}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Staff Operations Node</Text>
              <TouchableOpacity
                onPress={() => {
                  setAdminModal(false);
                  setRoleSearch("");
                }}
              >
                <Ionicons name="close" size={22} color="#475569" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>
              Adjust node privileges or handle structural administrative role
              updates
            </Text>
            <View style={styles.searchBox}>
              <Feather name="search" size={15} color="#475569" />
              <TextInput
                placeholder="Query name, category, or division..."
                placeholderTextColor="#475569"
                value={roleSearch}
                onChangeText={setRoleSearch}
                style={styles.searchInput}
              />
            </View>

            {loadingEmployees ? (
              <View style={styles.listLoader}>
                <ActivityIndicator size="large" color="#3b82f6" />
              </View>
            ) : (
              <FlatList
                data={filteredEmployees}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 30 }}
                ListEmptyComponent={
                  <View style={styles.emptyWrap}>
                    <Text style={styles.emptyText}>No matches found.</Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const isAdmin = item.role === "admin";
                  const isUpdating = updatingRole === item.id;
                  return (
                    <View style={styles.userCard}>
                      <View
                        style={[
                          styles.userAvatar,
                          isAdmin && styles.userAvatarAdmin,
                        ]}
                      >
                        <Text
                          style={[
                            styles.userAvatarText,
                            isAdmin && { color: "#60a5fa" },
                          ]}
                        >
                          {(item.full_name?.[0] || "?").toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>{item.full_name}</Text>
                        <Text style={styles.userDept}>
                          {item.department || "Unassigned General"}
                        </Text>
                        <View
                          style={[
                            styles.rolePill,
                            isAdmin ? styles.rolePillAdmin : styles.rolePillEmp,
                          ]}
                        >
                          <Text
                            style={[
                              styles.rolePillText,
                              isAdmin
                                ? styles.rolePillTextAdmin
                                : styles.rolePillTextEmp,
                            ]}
                          >
                            {isAdmin ? "Admin Node" : "Employee"}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.cardActions}>
                        <TouchableOpacity
                          disabled={isUpdating}
                          onPress={() => handleRoleChange(item)}
                          style={[
                            styles.roleBtn,
                            isAdmin
                              ? styles.roleBtnDemote
                              : styles.roleBtnPromote,
                          ]}
                        >
                          {isUpdating ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={styles.roleBtnText}>
                              {isAdmin ? "Demote" : "Promote"}
                            </Text>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => openResetModal(item)}
                          style={styles.roleBtnReset}
                        >
                          <Text style={styles.roleBtnText}>Reset PW</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* OVERRIDE ACCOUNT PASSCODE */}
      <Modal
        visible={resetModal}
        transparent
        animationType="fade"
        onRequestClose={() => setResetModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Override Account Passcode</Text>
              <TouchableOpacity onPress={() => setResetModal(false)}>
                <Ionicons name="close" size={22} color="#475569" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>
              Inverting system password structures for:{" "}
              {selectedEmployee?.full_name}
            </Text>
            <TextInput
              placeholder="Inject New Access Passcode"
              placeholderTextColor="#475569"
              secureTextEntry
              value={resetPassword}
              onChangeText={setResetPassword}
              style={styles.input}
            />
            <TextInput
              placeholder="Confirm Passcode Verification"
              placeholderTextColor="#475569"
              secureTextEntry
              value={resetConfirm}
              onChangeText={setResetConfirm}
              style={styles.input}
            />
            <TouchableOpacity
              style={styles.generateBtn}
              onPress={handleAutoGenerate}
            >
              <Text style={styles.generateBtnText}>Auto-compute passcode</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.9}
              disabled={resettingPassword}
              onPress={handleResetEmployeePassword}
              style={styles.primaryBtn}
            >
              {resettingPassword ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>
                  Execute Passcode Reset
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setResetModal(false)}
            >
              <Text style={styles.cancelBtnText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* RESET SUCCESS OVERLAY */}
      <Modal visible={showResetPwCard} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.successIconWrap}>
              <Ionicons name="shield-checkmark" size={32} color="#4ade80" />
            </View>
            <Text
              style={[
                styles.modalTitle,
                { textAlign: "center", marginTop: 16 },
              ]}
            >
              Passcode Re-computed!
            </Text>
            <View style={styles.pwBox}>
              <Text style={styles.pwText}>{generatedResetPw}</Text>
            </View>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={async () => {
                const Clipboard = await import("expo-clipboard");
                await Clipboard.setStringAsync(generatedResetPw);
                Alert.alert("Copied Structure", "Credentials cached.");
              }}
            >
              <Text style={styles.primaryBtnText}>Copy Token Key</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setShowResetPwCard(false)}
            >
              <Text style={styles.cancelBtnText}>Finalize Setup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

function SettingRow({
  item,
  isLast,
  toggleState,
  onToggle,
}: {
  item: RowItem;
  isLast: boolean;
  toggleState?: boolean;
  onToggle?: () => void;
}) {
  const isDanger = item.type === "nav" && item.danger;
  return (
    <>
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.settingRow}
        onPress={item.type === "nav" ? item.onPress : undefined}
        disabled={item.type === "toggle"}
      >
        <View style={[styles.iconBox, { backgroundColor: item.color + "12" }]}>
          <Feather name={item.icon as any} size={16} color={item.color} />
        </View>
        <View style={styles.settingInfo}>
          <Text
            style={[
              styles.settingLabel,
              isDanger && { color: APP_COLORS.danger },
            ]}
          >
            {item.label}
          </Text>
          <Text style={styles.settingSub}>{item.sub}</Text>
        </View>
        {item.type === "toggle" ? (
          <Switch
            value={toggleState}
            onValueChange={onToggle}
            trackColor={{ false: "#1e293b", true: "#2563eb" }}
            thumbColor={toggleState ? "#60a5fa" : "#64748b"}
          />
        ) : (
          <Ionicons name="chevron-forward" size={16} color="#334155" />
        )}
      </TouchableOpacity>
      {!isLast && <View style={styles.divider} />}
    </>
  );
}

const GLASS = {
  backgroundColor: "rgba(255,255,255,0.03)",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.05)",
} as const;

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 120 },
  loaderWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  profileCard: {
    ...GLASS,
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarBox: {
    width: 62,
    height: 62,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.2)",
  },
  avatarText: { color: "#fff", fontSize: 22, fontWeight: "900" },
  profileInfo: { flex: 1, marginLeft: 14 },
  profileName: { color: APP_COLORS.white, fontSize: 16, fontWeight: "800" },
  profileMail: {
    color: "#475569",
    fontSize: 12,
    marginTop: 2,
    fontWeight: "500",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: "rgba(59,130,246,0.1)",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.15)",
  },
  badgeText: {
    color: "#60a5fa",
    fontSize: 9,
    fontWeight: "800",
    marginLeft: 4,
  },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  statCard: {
    ...GLASS,
    flex: 1,
    borderRadius: 20,
    padding: 12,
    alignItems: "center",
    overflow: "hidden",
  },
  statValue: { fontSize: 18, fontWeight: "900" },
  statLabel: {
    color: "#475569",
    fontSize: 11,
    marginTop: 2,
    fontWeight: "600",
  },
  statIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  card: { ...GLASS, borderRadius: 24, padding: 16, marginBottom: 20 },
  cardTitle: {
    color: APP_COLORS.white,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 14,
  },
  officeRow: { flexDirection: "row", alignItems: "center" },
  officeBox: { flex: 1, alignItems: "center" },
  officeDivider: {
    width: 1,
    height: 50,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  officeValue: {
    color: APP_COLORS.white,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 8,
  },
  officeLabel: {
    color: "#475569",
    fontSize: 10,
    marginTop: 2,
    fontWeight: "500",
  },
  sectionTitle: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 10,
    marginLeft: 4,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  settingInfo: { flex: 1, marginLeft: 14 },
  settingLabel: { color: APP_COLORS.white, fontSize: 14, fontWeight: "700" },
  settingSub: {
    color: "#475569",
    fontSize: 11,
    marginTop: 2,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
    marginVertical: 12,
  },
  logoutBtn: {
    ...GLASS,
    borderRadius: 20,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    borderColor: "rgba(239,68,68,0.15)",
  },
  logoutIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(239,68,68,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  logoutText: {
    flex: 1,
    color: APP_COLORS.danger,
    fontSize: 14,
    fontWeight: "800",
    marginLeft: 12,
  },
  footer: { alignItems: "center", paddingTop: 10 },
  footerText: { color: "#334155", fontSize: 11, fontWeight: "700" },
  footerVersion: {
    color: "#334155",
    fontSize: 10,
    marginTop: 2,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(2,6,23,0.85)",
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
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  modalTitle: { color: "#fff", fontSize: 18, fontWeight: "900" },
  modalSub: {
    color: "#475569",
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 20,
    fontWeight: "500",
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
  primaryBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
    marginBottom: 10,
  },
  primaryBtnText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  cancelBtn: {
    height: 50,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  cancelBtnText: { color: "#94a3b8", fontSize: 14, fontWeight: "700" },
  adminOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(2,6,23,0.85)",
  },
  adminContainer: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    backgroundColor: "#0b1528",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    height: "85%",
  },
  searchBox: {
    height: 50,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  searchInput: { flex: 1, marginLeft: 12, color: "#fff", fontSize: 14 },
  listLoader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyWrap: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { color: "#475569", fontSize: 13, fontWeight: "600" },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 20,
    marginBottom: 10,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    overflow: "hidden",
  },
  userAvatarAdmin: {
    backgroundColor: "rgba(59,130,246,0.1)",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.15)",
  },
  userAvatarText: { color: "#64748b", fontSize: 16, fontWeight: "800" },
  userInfo: { flex: 1, marginLeft: 12, justifyContent: "center" },
  userName: { color: "#fff", fontSize: 14, fontWeight: "700" },
  userDept: { color: "#475569", fontSize: 12, marginTop: 1, fontWeight: "500" },
  rolePill: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rolePillAdmin: { backgroundColor: "rgba(59,130,246,0.1)" },
  rolePillEmp: { backgroundColor: "rgba(255,255,255,0.04)" },
  rolePillText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  rolePillTextAdmin: { color: "#60a5fa" },
  rolePillTextEmp: { color: "#475569" },
  cardActions: { flexDirection: "column", gap: 6, alignItems: "flex-end" },
  roleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    minWidth: 80,
    justifyContent: "center",
  },
  roleBtnPromote: { backgroundColor: "#2563eb" },
  roleBtnDemote: { backgroundColor: "rgba(239,68,68,0.2)" },
  roleBtnText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  roleBtnReset: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    minWidth: 80,
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
    paddingVertical: 2,
  },
  generateBtnText: { color: "#60a5fa", fontSize: 12, fontWeight: "700" },
  pwBox: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.03)",
  },
  pwText: {
    color: "#38bdf8",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 4,
  },
  successIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(52,211,153,0.1)",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
  },
});

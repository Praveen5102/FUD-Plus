import React, { useEffect, useState } from "react";

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

import GradientScreen from "../../../components/layout/GradientScreen";

import AppHeader from "../../../components/ui/AppHeader";

import { APP_COLORS } from "../../../theme/appTheme";

import { useAuth } from "../../../context/AuthContext";

import { supabase } from "../../../services/supabase";

import { adminSupabase } from "../../../services/adminSupabase";

// TYPES

type RowItem =
  | { type: "toggle"; icon: string; label: string; sub: string; key: string }
  | {
      type: "nav";
      icon: string;
      label: string;
      sub: string;
      danger?: boolean;
      onPress?: () => void;
    };

interface StatItem {
  val: string;
  lbl: string;
  color: string;
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
    geo: true,
    selfie: true,
  });

  // PASSWORD MODAL — admin's own password
  const [passwordModal, setPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // RESET EMPLOYEE PASSWORD MODAL
  const [resetModal, setResetModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null,
  );
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);
  const [generatedResetPw, setGeneratedResetPw] = useState("");
  const [showResetPwCard, setShowResetPwCard] = useState(false);

  // ADMIN ACCESS MODAL
  const [adminModal, setAdminModal] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [roleSearch, setRoleSearch] = useState("");

  // FETCH PROFILE
  const fetchProfile = async () => {
    try {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (error) {
        console.log(error);
        return;
      }
      setProfile(data);
    } catch (error) {
      console.log(error);
    }
  };

  // FETCH DASHBOARD
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
          lbl: "Employees",
          color: "#93c5fd",
        },
        {
          val: uniqueDepts.size.toString(),
          lbl: "Departments",
          color: "#4ade80",
        },
        { val: `${attendanceRate}%`, lbl: "Attendance", color: "#c084fc" },
      ]);
      setLoading(false);
    } catch (error) {
      console.log(error);
      setLoading(false);
    }
  };

  // FETCH ALL USERS FOR ROLE MANAGEMENT
  const fetchAllUsers = async () => {
    try {
      setLoadingEmployees(true);
      const { data, error } = await adminSupabase
        .from("profiles")
        .select("id, full_name, email, employee_id, department, role")
        .neq("id", user?.id) // exclude self
        .order("full_name", { ascending: true });

      if (error) {
        console.log(error);
        setLoadingEmployees(false);
        return;
      }
      setEmployees(data || []);
      setLoadingEmployees(false);
    } catch (error) {
      console.log(error);
      setLoadingEmployees(false);
    }
  };

  // TOGGLE
  const flipToggle = (key: string) =>
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));

  // CHANGE ADMIN PASSWORD
  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert("Missing Fields", "Please fill all fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Mismatch", "Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Weak Password", "Minimum 6 characters required.");
      return;
    }
    try {
      setUpdatingPassword(true);
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) {
        Alert.alert("Error", error.message);
        setUpdatingPassword(false);
        return;
      }
      Alert.alert("Success", "Password updated successfully.");
      setPasswordModal(false);
      setNewPassword("");
      setConfirmPassword("");
      setUpdatingPassword(false);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Something went wrong.");
      setUpdatingPassword(false);
    }
  };

  // PROMOTE / DEMOTE
  const handleRoleChange = async (emp: Employee) => {
    const isAdmin = emp.role === "admin";
    const newRole = isAdmin ? "employee" : "admin";
    const actionLabel = isAdmin ? "demote to Employee" : "promote to Admin";

    Alert.alert(
      "Confirm Role Change",
      `Are you sure you want to ${actionLabel} ${emp.full_name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: isAdmin ? "destructive" : "default",
          onPress: async () => {
            try {
              setUpdatingRole(emp.id);
              const { error } = await adminSupabase
                .from("profiles")
                .update({ role: newRole })
                .eq("id", emp.id);

              if (error) {
                Alert.alert("Error", error.message);
                setUpdatingRole(null);
                return;
              }

              // Update local state immediately
              setEmployees((prev) =>
                prev.map((e) =>
                  e.id === emp.id ? { ...e, role: newRole } : e,
                ),
              );
              setUpdatingRole(null);
              Alert.alert(
                "Success",
                `${emp.full_name} has been ${isAdmin ? "demoted to Employee" : "promoted to Admin"}.`,
              );
            } catch (error: any) {
              Alert.alert("Error", error.message || "Role update failed.");
              setUpdatingRole(null);
            }
          },
        },
      ],
    );
  };

  // GENERATE PASSWORD
  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    let pw = "";
    for (let i = 0; i < 8; i++)
      pw += chars.charAt(Math.floor(Math.random() * chars.length));
    return pw;
  };

  // OPEN RESET PASSWORD MODAL
  const openResetModal = (emp: Employee) => {
    setSelectedEmployee(emp);
    setResetPassword("");
    setResetConfirm("");
    setGeneratedResetPw("");
    setResetModal(true);
  };

  // AUTO-GENERATE PASSWORD FOR EMPLOYEE
  const handleAutoGenerate = () => {
    const pw = generatePassword();
    setResetPassword(pw);
    setResetConfirm(pw);
  };

  // RESET EMPLOYEE PASSWORD
  const handleResetEmployeePassword = async () => {
    if (!resetPassword || !resetConfirm) {
      Alert.alert("Missing Fields", "Please fill all fields.");
      return;
    }
    if (resetPassword !== resetConfirm) {
      Alert.alert("Mismatch", "Passwords do not match.");
      return;
    }
    if (resetPassword.length < 6) {
      Alert.alert("Weak Password", "Minimum 6 characters required.");
      return;
    }
    if (!selectedEmployee) return;
    try {
      setResettingPassword(true);
      const { error } = await adminSupabase.auth.admin.updateUserById(
        selectedEmployee.id,
        { password: resetPassword },
      );
      if (error) {
        Alert.alert("Error", error.message);
        setResettingPassword(false);
        return;
      }
      setGeneratedResetPw(resetPassword);
      setResetModal(false);
      setShowResetPwCard(true);
      setResettingPassword(false);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Something went wrong.");
      setResettingPassword(false);
    }
  };

  // LOGOUT
  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.auth.signOut();
          if (error) Alert.alert("Error", error.message);
        },
      },
    ]);
  };

  // OPEN ADMIN MODAL
  const openAdminModal = () => {
    setAdminModal(true);
    fetchAllUsers();
  };

  // SETTINGS SECTIONS
  const SETTINGS_SECTIONS: { title: string; items: RowItem[] }[] = [
    {
      title: "Attendance Settings",
      items: [
        {
          type: "toggle",
          key: "geo",
          icon: "map-pin",
          label: "Geofence Validation",
          sub: "Allow attendance only near office",
        },
        {
          type: "toggle",
          key: "selfie",
          icon: "camera",
          label: "Mandatory Selfie",
          sub: "Require selfie for attendance",
        },
      ],
    },
    {
      title: "Account",
      items: [
        {
          type: "nav",
          icon: "lock",
          label: "Change Password",
          sub: "Update admin account password",
          onPress: () => setPasswordModal(true),
        },
        {
          type: "nav",
          icon: "shield",
          label: "Admin Access",
          sub: "Promote or demote employees",
          onPress: openAdminModal,
        },
      ],
    },
    {
      title: "System",
      items: [
        {
          type: "nav",
          icon: "database",
          label: "Database Status",
          sub: "Supabase backend connection",
        },
        {
          type: "nav",
          icon: "info",
          label: "Application Version",
          sub: "FUD Plus v1.0.0",
        },
      ],
    },
  ];

  // INIT
  useEffect(() => {
    fetchProfile();
    fetchDashboardData();
  }, []);

  // FILTERED EMPLOYEES FOR ROLE MODAL
  const filteredEmployees = employees.filter(
    (e) =>
      e.full_name?.toLowerCase().includes(roleSearch.toLowerCase()) ||
      e.email?.toLowerCase().includes(roleSearch.toLowerCase()) ||
      e.department?.toLowerCase().includes(roleSearch.toLowerCase()),
  );

  if (loading) {
    return (
      <GradientScreen>
        <SafeAreaView style={styles.loaderWrap}>
          <Text style={{ color: "#fff" }}>Loading settings...</Text>
        </SafeAreaView>
      </GradientScreen>
    );
  }

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

            {/* PROFILE */}
            <View style={styles.profileCard}>
              <View style={styles.avatarBox}>
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
                  <Ionicons name="shield-checkmark" size={11} color="#93c5fd" />
                  <Text style={styles.badgeText}>SUPER ADMIN</Text>
                </View>
              </View>
            </View>

            {/* STATS */}
            <View style={styles.statsRow}>
              {stats.map((item, index) => (
                <View
                  key={index}
                  style={[styles.statCard, { borderTopColor: item.color }]}
                >
                  <Text style={[styles.statValue, { color: item.color }]}>
                    {item.val}
                  </Text>
                  <Text style={styles.statLabel}>{item.lbl}</Text>
                </View>
              ))}
            </View>

            {/* OFFICE */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Office Configuration</Text>
              <View style={styles.officeRow}>
                <View style={styles.officeBox}>
                  <Feather name="map-pin" size={18} color="#93c5fd" />
                  <Text style={styles.officeValue}>
                    {officeConfig.location}
                  </Text>
                  <Text style={styles.officeLabel}>Office Location</Text>
                </View>
                <View style={styles.officeDivider} />
                <View style={styles.officeBox}>
                  <Feather name="radio" size={18} color="#4ade80" />
                  <Text style={styles.officeValue}>{officeConfig.radius}m</Text>
                  <Text style={styles.officeLabel}>Allowed Radius</Text>
                </View>
              </View>
            </View>

            {/* SETTINGS */}
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

            {/* LOGOUT */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.logoutBtn}
              onPress={handleLogout}
            >
              <View style={styles.logoutIcon}>
                <Feather name="log-out" size={18} color={APP_COLORS.danger} />
              </View>
              <Text style={styles.logoutText}>Logout</Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={APP_COLORS.danger}
              />
            </TouchableOpacity>

            {/* FOOTER */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                FUD Plus Workforce Management
              </Text>
              <Text style={styles.footerVersion}>Version 1.0.0</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </GradientScreen>

      {/* ─── CHANGE PASSWORD MODAL ─── */}
      <Modal visible={passwordModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* HEADER */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity
                onPress={() => {
                  setPasswordModal(false);
                  setNewPassword("");
                  setConfirmPassword("");
                }}
              >
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Update your admin account password
            </Text>

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
              disabled={updatingPassword}
              onPress={handleChangePassword}
              style={[styles.primaryBtn, updatingPassword && { opacity: 0.6 }]}
            >
              {updatingPassword ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Update Password</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => {
                setPasswordModal(false);
                setNewPassword("");
                setConfirmPassword("");
              }}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── ADMIN ACCESS MODAL ─── */}
      <Modal visible={adminModal} transparent animationType="slide">
        <View style={styles.adminOverlay}>
          <View style={styles.adminContainer}>
            {/* HEADER */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Admin Access</Text>
              <TouchableOpacity
                onPress={() => {
                  setAdminModal(false);
                  setRoleSearch("");
                }}
              >
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>
              Promote employees to admin or demote admins
            </Text>

            {/* SEARCH */}
            <View style={styles.searchBox}>
              <Feather name="search" size={16} color="#dbeafe" />
              <TextInput
                placeholder="Search by name or department"
                placeholderTextColor="#94a3b8"
                value={roleSearch}
                onChangeText={setRoleSearch}
                style={styles.searchInput}
              />
            </View>

            {/* LIST */}
            {loadingEmployees ? (
              <View style={styles.listLoader}>
                <ActivityIndicator size="large" color="#93c5fd" />
              </View>
            ) : (
              <FlatList
                data={filteredEmployees}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 20 }}
                ListEmptyComponent={
                  <View style={styles.emptyWrap}>
                    <Ionicons name="people-outline" size={40} color="#64748b" />
                    <Text style={styles.emptyText}>No users found</Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const isAdmin = item.role === "admin";
                  const isUpdating = updatingRole === item.id;

                  return (
                    <View style={styles.userCard}>
                      {/* AVATAR */}
                      <View
                        style={[
                          styles.userAvatar,
                          isAdmin && styles.userAvatarAdmin,
                        ]}
                      >
                        <Text style={styles.userAvatarText}>
                          {(item.full_name?.[0] || "?").toUpperCase()}
                        </Text>
                      </View>

                      {/* INFO */}
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>{item.full_name}</Text>
                        <Text style={styles.userDept}>
                          {item.department || "No department"}
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
                            {isAdmin ? "Admin" : "Employee"}
                          </Text>
                        </View>
                      </View>

                      {/* ACTIONS */}
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
                            <>
                              <Ionicons
                                name={
                                  isAdmin
                                    ? "arrow-down-circle-outline"
                                    : "arrow-up-circle-outline"
                                }
                                size={13}
                                color="#fff"
                              />
                              <Text style={styles.roleBtnText}>
                                {isAdmin ? "Demote" : "Promote"}
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => openResetModal(item)}
                          style={styles.roleBtnReset}
                        >
                          <Ionicons name="key-outline" size={13} color="#fff" />
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
      {/* ─── RESET EMPLOYEE PASSWORD MODAL ─── */}
      <Modal visible={resetModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reset Password</Text>
              <TouchableOpacity onPress={() => setResetModal(false)}>
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>
              Resetting password for{" "}
              <Text style={{ color: "#fff", fontWeight: "700" }}>
                {selectedEmployee?.full_name}
              </Text>
            </Text>

            <TextInput
              placeholder="New Password"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              value={resetPassword}
              onChangeText={setResetPassword}
              style={styles.input}
            />
            <TextInput
              placeholder="Confirm Password"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              value={resetConfirm}
              onChangeText={setResetConfirm}
              style={styles.input}
            />

            {/* AUTO GENERATE */}
            <TouchableOpacity
              style={styles.generateBtn}
              onPress={handleAutoGenerate}
            >
              <Ionicons name="refresh-outline" size={16} color="#93c5fd" />
              <Text style={styles.generateBtnText}>Auto-generate password</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              disabled={resettingPassword}
              onPress={handleResetEmployeePassword}
              style={[styles.primaryBtn, resettingPassword && { opacity: 0.6 }]}
            >
              {resettingPassword ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Reset Password</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setResetModal(false)}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── RESET SUCCESS PASSWORD CARD ─── */}
      <Modal visible={showResetPwCard} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Ionicons
              name="shield-checkmark"
              size={52}
              color="#60a5fa"
              style={{ alignSelf: "center" }}
            />
            <Text
              style={[
                styles.modalTitle,
                { textAlign: "center", marginTop: 12 },
              ]}
            >
              Password Reset!
            </Text>
            <Text style={[styles.modalSub, { textAlign: "center" }]}>
              New password for {selectedEmployee?.full_name}
            </Text>
            <View style={styles.pwBox}>
              <Text style={styles.pwText}>{generatedResetPw}</Text>
            </View>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={async () => {
                const Clipboard = await import("expo-clipboard");
                await Clipboard.setStringAsync(generatedResetPw);
                Alert.alert("Copied", "Password copied to clipboard.");
              }}
            >
              <Text style={styles.primaryBtnText}>Copy Password</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setShowResetPwCard(false)}
            >
              <Text style={styles.cancelBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

// SETTING ROW
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
  const onPress = item.type === "nav" ? item.onPress : undefined;

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.settingRow}
        onPress={onPress}
      >
        <View
          style={[
            styles.iconBox,
            isDanger && { backgroundColor: "rgba(239,68,68,0.12)" },
          ]}
        >
          <Feather
            name={item.icon as any}
            size={18}
            color={isDanger ? APP_COLORS.danger : "#93c5fd"}
          />
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
            trackColor={{ false: "rgba(255,255,255,0.1)", true: "#2563eb" }}
            thumbColor={toggleState ? "#93c5fd" : "rgba(255,255,255,0.5)"}
          />
        ) : (
          <Ionicons
            name="chevron-forward"
            size={16}
            color={APP_COLORS.textMuted}
          />
        )}
      </TouchableOpacity>
      {!isLast && <View style={styles.divider} />}
    </>
  );
}

const GLASS = {
  backgroundColor: "rgba(255,255,255,0.06)",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.08)",
} as const;

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 20, paddingBottom: 120 },
  loaderWrap: { flex: 1, justifyContent: "center", alignItems: "center" },

  profileCard: {
    ...GLASS,
    borderRadius: 28,
    padding: 20,
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "center",
  },
  avatarBox: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: "rgba(59,130,246,0.20)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.30)",
  },
  avatarText: { color: "#93c5fd", fontSize: 24, fontWeight: "800" },
  profileInfo: { flex: 1, marginLeft: 16 },
  profileName: { color: APP_COLORS.white, fontSize: 16, fontWeight: "700" },
  profileMail: { color: APP_COLORS.textLight, fontSize: 12, marginTop: 4 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "rgba(59,130,246,0.16)",
  },
  badgeText: {
    color: "#93c5fd",
    fontSize: 10,
    fontWeight: "800",
    marginLeft: 6,
  },

  statsRow: { flexDirection: "row", gap: 10, marginBottom: 18 },
  statCard: {
    ...GLASS,
    flex: 1,
    borderRadius: 22,
    padding: 16,
    alignItems: "center",
    borderTopWidth: 2.5,
  },
  statValue: { fontSize: 20, fontWeight: "900" },
  statLabel: { color: APP_COLORS.textMuted, fontSize: 11, marginTop: 4 },

  card: { ...GLASS, borderRadius: 28, padding: 20, marginBottom: 18 },
  cardTitle: {
    color: APP_COLORS.white,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 18,
  },

  officeRow: { flexDirection: "row", alignItems: "center" },
  officeBox: { flex: 1, alignItems: "center" },
  officeDivider: {
    width: 1,
    height: 60,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  officeValue: {
    color: APP_COLORS.white,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 10,
  },
  officeLabel: { color: APP_COLORS.textMuted, fontSize: 10, marginTop: 4 },

  sectionTitle: {
    color: APP_COLORS.white,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  settingInfo: { flex: 1, marginLeft: 14 },
  settingLabel: { color: APP_COLORS.white, fontSize: 14, fontWeight: "600" },
  settingSub: { color: APP_COLORS.textLight, fontSize: 12, marginTop: 4 },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginVertical: 14,
  },

  logoutBtn: {
    ...GLASS,
    borderRadius: 24,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    borderColor: "rgba(239,68,68,0.20)",
  },
  logoutIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(239,68,68,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  logoutText: {
    flex: 1,
    color: APP_COLORS.danger,
    fontSize: 15,
    fontWeight: "700",
    marginLeft: 14,
  },

  footer: { alignItems: "center", paddingTop: 10 },
  footerText: { color: APP_COLORS.textMuted, fontSize: 12, fontWeight: "700" },
  footerVersion: {
    color: APP_COLORS.textMuted,
    fontSize: 11,
    marginTop: 4,
    opacity: 0.6,
  },

  // MODALS SHARED
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  modalTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },
  modalSub: { color: "#93c5fd", fontSize: 13, marginBottom: 22 },
  input: {
    height: 56,
    borderRadius: 18,
    paddingHorizontal: 18,
    marginBottom: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    color: "#fff",
  },
  primaryBtn: {
    height: 54,
    borderRadius: 18,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  cancelBtn: {
    height: 50,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  cancelBtnText: { color: "#dbeafe", fontWeight: "700" },

  // PASSWORD MODAL
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 24,
  },
  modalContainer: { borderRadius: 28, padding: 24, backgroundColor: "#071226" },

  // ADMIN ACCESS MODAL
  adminOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  adminContainer: {
    backgroundColor: "#071226",
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    padding: 22,
    maxHeight: "88%",
    flex: 1,
  },
  searchBox: {
    height: 48,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  searchInput: { flex: 1, marginLeft: 10, color: "#fff", fontSize: 14 },
  listLoader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyWrap: { alignItems: "center", paddingTop: 60 },
  emptyText: { color: "#94a3b8", fontSize: 14, marginTop: 12 },

  // USER CARD
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 20,
    marginBottom: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  userAvatar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  userAvatarAdmin: { backgroundColor: "rgba(37,99,235,0.25)" },
  userAvatarText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  userInfo: { flex: 1, marginLeft: 12 },
  userName: { color: "#fff", fontSize: 14, fontWeight: "700" },
  userDept: { color: "#94a3b8", fontSize: 12, marginTop: 2 },
  rolePill: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  rolePillAdmin: { backgroundColor: "rgba(37,99,235,0.25)" },
  rolePillEmp: { backgroundColor: "rgba(255,255,255,0.08)" },
  rolePillText: { fontSize: 11, fontWeight: "700" },
  rolePillTextAdmin: { color: "#93c5fd" },
  rolePillTextEmp: { color: "#cbd5e1" },
  roleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 80,
    justifyContent: "center",
  },
  roleBtnPromote: { backgroundColor: "rgba(37,99,235,0.5)" },
  roleBtnDemote: { backgroundColor: "rgba(239,68,68,0.35)" },
  roleBtnText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  roleBtnReset: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 76,
    justifyContent: "center",
    backgroundColor: "rgba(99,102,241,0.45)",
    marginTop: 6,
  },
  cardActions: { flexDirection: "column", alignItems: "flex-end", gap: 0 },
  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    paddingVertical: 4,
  },
  generateBtnText: { color: "#93c5fd", fontSize: 13, fontWeight: "600" },
  pwBox: {
    width: "100%",
    paddingVertical: 18,
    borderRadius: 18,
    marginBottom: 16,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  pwText: {
    color: "#7dd3fc",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 3,
  },
});

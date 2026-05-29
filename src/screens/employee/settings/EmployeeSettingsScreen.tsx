import React, { useState } from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, Ionicons } from "@expo/vector-icons";

export default function EmployeeSettingsScreen() {
  const [notifications, setNotifications] = useState(true);
  const [privacyExpanded, setPrivacyExpanded] = useState(false);
  const [infoExpanded, setInfoExpanded] = useState(false);

  return (
    <LinearGradient
      colors={["#030712", "#0b1528", "#11254c", "#1d4ed8"]}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* HEADER */}
          <View style={styles.header}>
            <Text style={styles.eyebrow}>PREFERENCES</Text>
            <Text style={styles.title}>Settings</Text>
          </View>

          {/* APPLICATION CONFIGURATION CARD */}
          <Text style={styles.sectionHeading}>System Preferences</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View
                  style={[
                    styles.iconBox,
                    { backgroundColor: "rgba(59,130,246,0.1)" },
                  ]}
                >
                  <Ionicons
                    name="notifications-outline"
                    size={18}
                    color="#60a5fa"
                  />
                </View>
                <View>
                  <Text style={styles.settingText}>Push Notifications</Text>
                  <Text style={styles.settingSubtext}>
                    Reminders for punch timings
                  </Text>
                </View>
              </View>
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: "#1e293b", true: "#2563eb" }}
                thumbColor={notifications ? "#fff" : "#64748b"}
              />
            </View>
          </View>

          {/* SECURITY, PRIVACY & LEGAL COMPLIANCE LAYER */}
          <Text style={styles.sectionHeading}>Security & Support</Text>
          <View style={styles.card}>
            {/* PRIVACY POLICY ITEM */}
            <TouchableOpacity
              style={styles.settingRow}
              activeOpacity={0.7}
              onPress={() => setPrivacyExpanded(!privacyExpanded)}
            >
              <View style={styles.settingLeft}>
                <View
                  style={[
                    styles.iconBox,
                    { backgroundColor: "rgba(52,211,153,0.1)" },
                  ]}
                >
                  <Feather name="shield" size={16} color="#34d399" />
                </View>
                <Text style={styles.settingText}>Privacy Policy</Text>
              </View>
              <Feather
                name={privacyExpanded ? "chevron-down" : "chevron-right"}
                size={16}
                color="#475569"
              />
            </TouchableOpacity>

            {/* EXPANDABLE PRIVACY DETAILS */}
            {privacyExpanded && (
              <View style={styles.expandedContainer}>
                <View style={styles.ruleCard}>
                  <View style={styles.ruleHeaderRow}>
                    <Ionicons name="lock-closed" size={14} color="#34d399" />
                    <Text style={styles.ruleTitle}>
                      1. Data Encryption Standards
                    </Text>
                  </View>
                  <Text style={styles.ruleParagraph}>
                    All payload parameters, personal records, and check-in
                    geolocation coordinates are encrypted both in transit (TLS
                    1.3) and at rest via AES-256 protocols.
                  </Text>
                </View>

                <View style={styles.ruleCard}>
                  <View style={styles.ruleHeaderRow}>
                    <Ionicons name="pin" size={14} color="#34d399" />
                    <Text style={styles.ruleTitle}>
                      2. Location Coordinates Usage
                    </Text>
                  </View>
                  <Text style={styles.ruleParagraph}>
                    Geofencing data boundaries are computed strict locally on
                    the client system device. Profile trace vectors are
                    exclusively recorded during check-in/out procedures.
                  </Text>
                </View>

                <View style={styles.ruleCard}>
                  <View style={styles.ruleHeaderRow}>
                    <Ionicons name="eye-off" size={14} color="#34d399" />
                    <Text style={styles.ruleTitle}>
                      3. Zero Third-Party Sharing
                    </Text>
                  </View>
                  <Text style={styles.ruleParagraph}>
                    Biometric tokens, visual verification selfies, and tracking
                    matrices are never shared, sold, or aggregated for analytics
                    engines.
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.divider} />

            {/* APP INFORMATION ITEM */}
            <TouchableOpacity
              style={styles.settingRow}
              activeOpacity={0.7}
              onPress={() => setInfoExpanded(!infoExpanded)}
            >
              <View style={styles.settingLeft}>
                <View
                  style={[
                    styles.iconBox,
                    { backgroundColor: "rgba(251,191,36,0.1)" },
                  ]}
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={18}
                    color="#fbbf24"
                  />
                </View>
                <View>
                  <Text style={styles.settingText}>App Information</Text>
                  <Text style={styles.settingSubtext}>
                    Build parameters and architecture metadata
                  </Text>
                </View>
              </View>
              <Feather
                name={infoExpanded ? "chevron-down" : "chevron-right"}
                size={16}
                color="#475569"
              />
            </TouchableOpacity>

            {/* EXPANDABLE APPLICATION SPECIFICATIONS GRID */}
            {infoExpanded && (
              <View style={styles.expandedContainer}>
                <View style={styles.infoMetaCard}>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>App Status</Text>
                    <View style={styles.statusPill}>
                      <View style={styles.statusDot} />
                      <Text style={styles.statusText}>Production</Text>
                    </View>
                  </View>

                  <View style={styles.metaDivider} />

                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Version Profile</Text>
                    <Text style={styles.metaValue}>2.4.0 (Build 9842)</Text>
                  </View>

                  <View style={styles.metaDivider} />

                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Database Core</Text>
                    <Text style={styles.metaValue}>Supabase Engine v1.8.2</Text>
                  </View>

                  <View style={styles.metaDivider} />

                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Server Target</Text>
                    <Text style={styles.metaValue}>
                      AWS ap-south-1 (Mumbai)
                    </Text>
                  </View>

                  <View style={styles.metaDivider} />

                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Client Engine</Text>
                    <Text style={styles.metaValue}>Expo SDK Runtime 51</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 140 },
  header: { marginBottom: 24 },
  eyebrow: {
    color: "#3b82f6",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
  },
  title: { color: "#fff", fontSize: 26, fontWeight: "900", marginTop: 2 },
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
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  settingLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  settingText: { color: "#f1f5f9", fontSize: 14, fontWeight: "700" },
  settingSubtext: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
  },

  // Custom structural rules styles
  expandedContainer: {
    marginTop: 12,
    paddingHorizontal: 2,
    gap: 8,
  },
  ruleCard: {
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.03)",
  },
  ruleHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  ruleTitle: {
    color: "#e2e8f0",
    fontSize: 12,
    fontWeight: "700",
  },
  ruleParagraph: {
    color: "#64748b",
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "500",
  },

  // Application parameters specs visual tags styling
  infoMetaCard: {
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.03)",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  metaLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "600",
  },
  metaValue: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "700",
  },
  metaDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.03)",
    marginVertical: 2,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(34,197,94,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.15)",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22c55e",
  },
  statusText: {
    color: "#4ade80",
    fontSize: 10,
    fontWeight: "800",
  },
});

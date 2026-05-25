import React from "react";

import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { LinearGradient } from "expo-linear-gradient";

import { Feather, Ionicons } from "@expo/vector-icons";

import { COLORS } from "../../../constants/colors";

export default function EmployeeSettingsScreen() {
  return (
    <LinearGradient
      colors={["#071226", "#0f1f3d", "#163a72", "#1d4ed8"]}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Settings</Text>

          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons
                  name="notifications-outline"
                  size={20}
                  color={COLORS.white}
                />

                <Text style={styles.settingText}>Notifications</Text>
              </View>

              <Switch value />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Feather name="shield" size={20} color={COLORS.white} />

                <Text style={styles.settingText}>Privacy</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={COLORS.white}
                />

                <Text style={styles.settingText}>App Info</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
  },

  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },

  title: {
    color: COLORS.white,

    fontSize: 24,
    fontWeight: "800",

    marginBottom: 26,
  },

  card: {
    padding: 22,

    borderRadius: 26,

    backgroundColor: "rgba(255,255,255,0.08)",
  },

  settingRow: {
    flexDirection: "row",

    justifyContent: "space-between",

    alignItems: "center",

    paddingVertical: 10,
  },

  settingLeft: {
    flexDirection: "row",

    alignItems: "center",
  },

  settingText: {
    color: COLORS.white,

    fontSize: 15,
    fontWeight: "600",

    marginLeft: 14,
  },

  divider: {
    height: 1,

    marginVertical: 16,

    backgroundColor: "rgba(255,255,255,0.08)",
  },
});

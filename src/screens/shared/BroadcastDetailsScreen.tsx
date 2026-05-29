import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Broadcast } from "../../types/broadcast";
import { broadcastService } from "../../services/broadcast";
import { Ionicons, Feather } from "@expo/vector-icons";

export default function BroadcastDetailsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { broadcast, isAdmin } = route.params as {
    broadcast: Broadcast;
    isAdmin?: boolean;
  };

  useEffect(() => {
    if (!isAdmin && !broadcast.read_by_user) {
      broadcastService.markAsRead(broadcast.id);
    }
  }, []);

  return (
    <LinearGradient
      colors={["#030712", "#0b1528", "#11254c", "#1d4ed8"]}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        {/* HEADER BAR */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.7}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Announcement</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollBody}
        >
          {/* GLASSMORPHIC CONTENT NODE */}
          <View style={styles.card}>
            <View style={styles.metaRow}>
              <View style={styles.typeBadge}>
                <Feather name="info" size={12} color="#60a5fa" />
                <Text style={styles.typeText}>Official Update</Text>
              </View>
              <View style={styles.dateRow}>
                <Feather name="clock" size={12} color="#475569" />
                <Text style={styles.date}>
                  {new Date(broadcast.created_at).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            </View>

            <Text style={styles.title}>{broadcast.title}</Text>
            <View style={styles.divider} />
            <Text style={styles.message}>{broadcast.message}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#f1f5f9" },
  scrollBody: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 60 },
  card: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(59,130,246,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.15)",
  },
  typeText: {
    color: "#60a5fa",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  date: { fontSize: 11, color: "#64748b", fontWeight: "600" },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#f1f5f9",
    lineHeight: 28,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    marginVertical: 16,
  },
  message: {
    fontSize: 15,
    color: "#cbd5e1",
    lineHeight: 24,
    fontWeight: "500",
  },
});

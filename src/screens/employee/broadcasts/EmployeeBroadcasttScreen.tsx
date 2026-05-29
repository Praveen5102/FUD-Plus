import React, { useMemo } from "react";
import {
  View,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBroadcasts } from "../../../hooks/useBroadcasts";
import { BroadcastCard } from "../../../components/broadcasts/BroadcastCard";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, Feather } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../types/navigation";

type NavigationProps = NativeStackNavigationProp<
  RootStackParamList,
  "EmployeeTabs"
>;

export default function EmployeeBroadcastScreen() {
  const { broadcasts, loading, refreshing, fetchBroadcasts, markAsRead } =
    useBroadcasts();
  const navigation = useNavigation<NavigationProps>();

  // Real-time tracking analytics for company feeds
  const metrics = useMemo(() => {
    const total = broadcasts.length;
    const unread = broadcasts.filter((b) => !b.read_by_user).length;
    const critical = broadcasts.filter((b) => b.priority === "critical").length;
    return { total, unread, critical };
  }, [broadcasts]);

  return (
    <LinearGradient
      colors={["#030712", "#0b1528", "#11254c", "#1d4ed8"]}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        {/* HEADER SECTION */}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>COMPANY FEEDS</Text>
          <Text style={styles.title}>Announcements</Text>
          <Text style={styles.subtitle}>
            {metrics.unread} unread · {metrics.total} total channels
          </Text>
        </View>

        {/* METRICS METADATA BANNER CARD */}
        {metrics.total > 0 && (
          <View style={styles.metricsBanner}>
            <LinearGradient
              colors={["rgba(255,255,255,0.03)", "rgba(255,255,255,0.01)"]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.metricCell}>
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: "rgba(59,130,246,0.1)" },
                ]}
              >
                <Feather name="mail" size={14} color="#60a5fa" />
              </View>
              <Text style={styles.metricValue}>{metrics.unread}</Text>
              <Text style={styles.metricLabel}>New Feeds</Text>
            </View>
            <View style={styles.cardDivider} />
            <View style={styles.metricCell}>
              {/* FIXED: Switched component wrapper target to Ionicons array for structural icon name match safety */}
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: "rgba(239,68,68,0.1)" },
                ]}
              >
                <Ionicons
                  name="shield-half-outline"
                  size={14}
                  color="#f87171"
                />
              </View>
              <Text
                style={[
                  styles.metricValue,
                  metrics.critical > 0 && { color: "#f87171" },
                ]}
              >
                {metrics.critical}
              </Text>
              <Text style={styles.metricLabel}>Critical Alerts</Text>
            </View>
          </View>
        )}

        {/* FEED MATRIX LIST */}
        <FlatList
          data={broadcasts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <BroadcastCard
              broadcast={item}
              onPress={() =>
                navigation.navigate("BroadcastDetails", { broadcast: item })
              }
              onMarkAsRead={() => markAsRead(item.id)}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={fetchBroadcasts}
              tintColor="#60a5fa"
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            loading ? (
              <View style={styles.loaderWrap}>
                <ActivityIndicator size="large" color="#3b82f6" />
              </View>
            ) : (
              <View style={styles.emptyWrap}>
                <Ionicons name="mail-open-outline" size={44} color="#475569" />
                <Text style={styles.emptyText}>
                  All logs cleared. No active notifications.
                </Text>
              </View>
            )
          }
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 },
  eyebrow: {
    color: "#3b82f6",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
  },
  title: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "900",
    marginTop: 2,
    letterSpacing: -0.5,
  },
  subtitle: { color: "#475569", fontSize: 12, fontWeight: "600", marginTop: 4 },

  // High-End Micro Analytics Glassmorphic Banner
  metricsBanner: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 20,
    padding: 12,
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    overflow: "hidden",
  },
  metricCell: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingLeft: 6,
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  metricValue: { color: "#fff", fontSize: 16, fontWeight: "900" },
  metricLabel: { color: "#475569", fontSize: 11, fontWeight: "600" },
  cardDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    marginVertical: 2,
  },

  listContent: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 140 },
  loaderWrap: {
    paddingVertical: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 100,
    gap: 12,
  },
  emptyText: { color: "#475569", fontSize: 13, fontWeight: "600" },
});

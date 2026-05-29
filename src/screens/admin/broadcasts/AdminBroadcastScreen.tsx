import React from "react";
import {
  ActivityIndicator,
  View,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBroadcasts } from "../../../hooks/useBroadcasts";
import { BroadcastCard } from "../../../components/broadcasts/BroadcastCard";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { RootStackParamList } from "../../../types/navigation";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { broadcastService } from "../../../services/broadcast";
import { Broadcast } from "../../../types/broadcast";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function AdminBroadcastScreen() {
  const { broadcasts, loading, refreshing, fetchBroadcasts } = useBroadcasts();
  const navigation = useNavigation<NavigationProp>();

  const handleDelete = async (id: string) => {
    await broadcastService.deleteBroadcast(id);
    fetchBroadcasts();
  };

  const handleEdit = (broadcast: Broadcast) => {
    navigation.navigate("EditBroadcast", { broadcast });
  };

  return (
    <LinearGradient
      colors={["#030712", "#0b1528", "#11254c", "#1d4ed8"]}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>HQ BROADCAST HUB</Text>
            <Text style={styles.title}>Announcements</Text>
            <Text style={styles.subtitle}>
              {broadcasts.length} System Nodes Active
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            activeOpacity={0.85}
            onPress={() => navigation.navigate("CreateBroadcast")}
          >
            <LinearGradient
              colors={["#2563eb", "#3b82f6"]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* LIST PATTERN */}
        <FlatList
          data={broadcasts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <BroadcastCard
              broadcast={item}
              isAdmin={true}
              onPress={() =>
                navigation.navigate("BroadcastDetails", {
                  broadcast: item,
                  isAdmin: true,
                })
              }
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={fetchBroadcasts}
              tintColor="#3b82f6"
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            loading ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                {/* FIXED: Switched from Feather to Ionicons to support native megaphone icon types safely */}
                <Ionicons name="megaphone-outline" size={40} color="#334155" />
                <Text style={styles.emptyText}>
                  No tracking system parameters deployed.
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  eyebrow: {
    color: "#3b82f6",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  title: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "900",
    marginTop: 2,
    letterSpacing: -0.5,
  },
  subtitle: { color: "#475569", fontSize: 12, marginTop: 4, fontWeight: "600" },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  listContent: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 140 },
  centerContainer: {
    paddingVertical: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 100,
    gap: 12,
  },
  emptyText: { color: "#475569", fontSize: 13, fontWeight: "600" },
});

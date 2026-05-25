import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  RefreshControl,
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
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import GradientScreen from "../../../components/layout/GradientScreen";
import { APP_COLORS } from "../../../theme/appTheme";
import { supabase } from "../../../services/supabase";
import { RootStackParamList } from "../../../types/navigation";
import AddEmployeeModal from "../../../components/modals/AddEmployeeModal";

const { width } = Dimensions.get("window");
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// ─── DEPARTMENT COLOR MAP ─────────────────────────────────────────────────────
const DEPT_COLORS: Record<string, [string, string]> = {
  Engineering: ["#2563eb", "#60a5fa"],
  Finance: ["#059669", "#34d399"],
  Marketing: ["#7c3aed", "#a78bfa"],
  HR: ["#db2777", "#f472b6"],
  Operations: ["#d97706", "#fbbf24"],
  Design: ["#0891b2", "#22d3ee"],
  Sales: ["#dc2626", "#f87171"],
  IT: ["#2563eb", "#60a5fa"],
  Management: ["#7c3aed", "#a78bfa"],
  Default: ["#1e40af", "#3b82f6"],
};

function getDeptColors(dept: string): [string, string] {
  return DEPT_COLORS[dept] ?? DEPT_COLORS.Default;
}

// ─── ANIMATED EMPLOYEE CARD ───────────────────────────────────────────────────
function EmployeeCard({
  item,
  index,
  onPress,
}: {
  item: any;
  index: number;
  onPress: () => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [colors] = useState<[string, string]>(getDeptColors(item.department));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  const initials = item.full_name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
      }}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View style={styles.card}>
          {/* Left accent bar */}
          <LinearGradient
            colors={[colors[0], colors[1]]}
            style={styles.cardAccentBar}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />

          {/* Avatar */}
          <View style={styles.cardAvatarWrap}>
            {item.profile_image ? (
              <Image
                source={{ uri: item.profile_image }}
                style={styles.cardAvatar}
              />
            ) : (
              <LinearGradient
                colors={[colors[0] + "cc", colors[1] + "cc"]}
                style={styles.cardAvatarGradient}
              >
                <Text style={styles.cardInitials}>{initials}</Text>
              </LinearGradient>
            )}
            {/* Online dot */}
            {item.is_active && <View style={styles.onlineDot} />}
          </View>

          {/* Info */}
          <View style={styles.cardInfo}>
            <Text style={styles.cardName} numberOfLines={1}>
              {item.full_name}
            </Text>

            {/* Dept chip */}
            <View
              style={[
                styles.deptChip,
                {
                  backgroundColor: colors[0] + "25",
                  borderColor: colors[0] + "50",
                },
              ]}
            >
              <View style={[styles.deptDot, { backgroundColor: colors[1] }]} />
              <Text style={[styles.deptText, { color: colors[1] }]}>
                {item.department}
              </Text>
            </View>

            <Text style={styles.cardId}>
              <Ionicons name="card-outline" size={10} color="#475569" />
              {"  "}
              {item.employee_id}
            </Text>
          </View>

          {/* Right side */}
          <View style={styles.cardRight}>
            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor: item.is_active
                    ? "rgba(74,222,128,0.12)"
                    : "rgba(248,113,113,0.12)",
                  borderColor: item.is_active
                    ? "rgba(74,222,128,0.35)"
                    : "rgba(248,113,113,0.35)",
                },
              ]}
            >
              <Text
                style={[
                  styles.statusPillText,
                  { color: item.is_active ? "#4ade80" : "#f87171" },
                ]}
              >
                {item.is_active ? "Active" : "Inactive"}
              </Text>
            </View>

            <View style={styles.chevronWrap}>
              <Feather name="chevron-right" size={14} color="#60a5fa" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
export default function EmployeesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [modalVisible, setModalVisible] = useState(false);
  const headerAnim = useRef(new Animated.Value(0)).current;

  const FILTERS = ["All", "Active", "Inactive"];

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "employee")
        .order("created_at", { ascending: false });
      if (error) {
        console.log(error);
        setLoading(false);
        return;
      }
      setEmployees(data || []);
      setLoading(false);
    } catch (e) {
      console.log(e);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEmployees();
    setRefreshing(false);
  };

  const handleEmployeeCreated = async () => {
    await fetchEmployees();
  };

  const filtered = employees.filter((item) => {
    const matchSearch =
      item.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      item.department?.toLowerCase().includes(search.toLowerCase()) ||
      item.employee_id?.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      activeFilter === "All"
        ? true
        : activeFilter === "Active"
          ? item.is_active
          : !item.is_active;
    return matchSearch && matchFilter;
  });

  const departments = [...new Set(employees.map((e) => e.department))];
  const activeCount = employees.filter((e) => e.is_active).length;

  return (
    <>
      <GradientScreen>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.safe}>
          {/* ── HEADER ───────────────────────────────────────────────────── */}
          <Animated.View
            style={[
              styles.header,
              {
                opacity: headerAnim,
                transform: [
                  {
                    translateY: Animated.multiply(
                      headerAnim,
                      new Animated.Value(-1),
                    ).interpolate({
                      inputRange: [-1, 0],
                      outputRange: [0, -20],
                    }),
                  },
                ],
              },
            ]}
          >
            <View>
              <Text style={styles.headerEyebrow}>WORKFORCE</Text>
              <Text style={styles.headerTitle}>Employees</Text>
            </View>
            <TouchableOpacity
              style={styles.headerAction}
              onPress={() => setModalVisible(true)}
            >
              <LinearGradient
                colors={["#1d4ed8", "#3b82f6"]}
                style={styles.headerActionGradient}
              >
                <Ionicons name="add" size={22} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#60a5fa"
              />
            }
          >
            {/* ── STATS STRIP ──────────────────────────────────────────── */}
            <View style={styles.statsStrip}>
              <View style={styles.stripCard}>
                <LinearGradient
                  colors={["rgba(37,99,235,0.25)", "rgba(37,99,235,0.08)"]}
                  style={[StyleSheet.absoluteFill, { borderRadius: 18 }]}
                />
                <Text style={styles.stripValue}>{employees.length}</Text>
                <Text style={styles.stripLabel}>Total</Text>
              </View>

              <View style={styles.stripCard}>
                <LinearGradient
                  colors={["rgba(74,222,128,0.2)", "rgba(74,222,128,0.06)"]}
                  style={[StyleSheet.absoluteFill, { borderRadius: 18 }]}
                />
                <Text style={[styles.stripValue, { color: "#4ade80" }]}>
                  {activeCount}
                </Text>
                <Text style={styles.stripLabel}>Active</Text>
              </View>

              <View style={styles.stripCard}>
                <LinearGradient
                  colors={["rgba(248,113,113,0.2)", "rgba(248,113,113,0.06)"]}
                  style={[StyleSheet.absoluteFill, { borderRadius: 18 }]}
                />
                <Text style={[styles.stripValue, { color: "#f87171" }]}>
                  {employees.length - activeCount}
                </Text>
                <Text style={styles.stripLabel}>Inactive</Text>
              </View>

              <View style={styles.stripCard}>
                <LinearGradient
                  colors={["rgba(167,139,250,0.2)", "rgba(167,139,250,0.06)"]}
                  style={[StyleSheet.absoluteFill, { borderRadius: 18 }]}
                />
                <Text style={[styles.stripValue, { color: "#a78bfa" }]}>
                  {departments.length}
                </Text>
                <Text style={styles.stripLabel}>Depts</Text>
              </View>
            </View>

            {/* ── SEARCH ───────────────────────────────────────────────── */}
            <View style={styles.searchWrap}>
              <Feather name="search" size={16} color="#60a5fa" />
              <TextInput
                placeholder="Search name, ID, department…"
                placeholderTextColor="#334155"
                value={search}
                onChangeText={setSearch}
                style={styles.searchInput}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch("")}>
                  <Ionicons name="close-circle" size={18} color="#475569" />
                </TouchableOpacity>
              )}
            </View>

            {/* ── FILTER PILLS ─────────────────────────────────────────── */}
            <View style={styles.filterRow}>
              {FILTERS.map((f) => (
                <TouchableOpacity
                  key={f}
                  onPress={() => setActiveFilter(f)}
                  style={[
                    styles.filterPill,
                    activeFilter === f && styles.filterPillActive,
                  ]}
                >
                  {activeFilter === f && (
                    <LinearGradient
                      colors={["#1d4ed8", "#3b82f6"]}
                      style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    />
                  )}
                  <Text
                    style={[
                      styles.filterText,
                      activeFilter === f && styles.filterTextActive,
                    ]}
                  >
                    {f}
                  </Text>
                </TouchableOpacity>
              ))}

              <View style={styles.filterCount}>
                <Text style={styles.filterCountText}>{filtered.length}</Text>
              </View>
            </View>

            {/* ── LIST ─────────────────────────────────────────────────── */}
            {loading ? (
              <View style={styles.loaderWrap}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Loading employees…</Text>
              </View>
            ) : filtered.length === 0 ? (
              <View style={styles.emptyWrap}>
                <View style={styles.emptyIconRing}>
                  <Ionicons name="people-outline" size={36} color="#1e40af" />
                </View>
                <Text style={styles.emptyTitle}>No employees found</Text>
                <Text style={styles.emptySubtitle}>
                  Try adjusting your search or filters
                </Text>
              </View>
            ) : (
              filtered.map((item, index) => (
                <EmployeeCard
                  key={item.id}
                  item={item}
                  index={index}
                  onPress={() =>
                    navigation.navigate("EmployeeDetails", { employee: item })
                  }
                />
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </GradientScreen>

      {/* Add Employee Modal */}
      <AddEmployeeModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onEmployeeCreated={handleEmployeeCreated}
      />
    </>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 18,
  },
  headerEyebrow: {
    color: "#1d4ed8",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2.5,
    marginBottom: 2,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  headerAction: { borderRadius: 18 },
  headerActionGradient: {
    width: 46,
    height: 46,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  scroll: { paddingHorizontal: 18, paddingBottom: 130 },

  // Stats strip
  statsStrip: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  stripCard: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    overflow: "hidden",
  },
  stripValue: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
  },
  stripLabel: {
    color: "#475569",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 3,
  },

  // Search
  searchWrap: {
    height: 52,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.15)",
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    color: "#e2e8f0",
    fontSize: 14,
  },

  // Filters
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 22,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    overflow: "hidden",
  },
  filterPillActive: {
    borderColor: "rgba(59,130,246,0.4)",
  },
  filterText: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "600",
  },
  filterTextActive: {
    color: "#fff",
  },
  filterCount: {
    marginLeft: "auto",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "rgba(37,99,235,0.2)",
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.3)",
  },
  filterCountText: {
    color: "#60a5fa",
    fontSize: 12,
    fontWeight: "800",
  },

  // Card
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 24,
    marginBottom: 12,
    backgroundColor: "rgba(255,255,255,0.055)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
    paddingVertical: 16,
    paddingRight: 16,
  },
  cardAccentBar: {
    width: 4,
    height: "70%",
    borderRadius: 2,
    marginRight: 14,
    marginLeft: 2,
  },
  cardAvatarWrap: {
    position: "relative",
  },
  cardAvatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.1)",
  },
  cardAvatarGradient: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  cardInitials: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 1,
  },
  onlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#4ade80",
    borderWidth: 2,
    borderColor: "#020617",
  },
  cardInfo: {
    flex: 1,
    marginLeft: 14,
    gap: 5,
  },
  cardName: {
    color: "#f1f5f9",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  deptChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  deptDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  deptText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  cardId: {
    color: "#475569",
    fontSize: 11,
    fontWeight: "500",
  },
  cardRight: {
    alignItems: "flex-end",
    gap: 10,
    marginLeft: 8,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  chevronWrap: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: "rgba(96,165,250,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },

  // States
  loaderWrap: {
    alignItems: "center",
    paddingTop: 80,
    gap: 14,
  },
  loadingText: {
    color: "#475569",
    fontSize: 13,
  },
  emptyWrap: {
    alignItems: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyIconRing: {
    width: 80,
    height: 80,
    borderRadius: 28,
    backgroundColor: "rgba(37,99,235,0.1)",
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    color: "#94a3b8",
    fontSize: 16,
    fontWeight: "700",
  },
  emptySubtitle: {
    color: "#334155",
    fontSize: 12,
  },
});

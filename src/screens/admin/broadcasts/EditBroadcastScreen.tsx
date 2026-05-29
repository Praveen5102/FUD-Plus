import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { broadcastService } from "../../../services/broadcast";
import {
  Broadcast,
  BroadcastType,
  BroadcastPriority,
} from "../../../types/broadcast";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons, Feather } from "@expo/vector-icons";

export default function EditBroadcastScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { broadcast } = route.params as { broadcast: Broadcast };

  const [title, setTitle] = useState(broadcast.title);
  const [message, setMessage] = useState(broadcast.message);
  const [broadcastType, setBroadcastType] = useState<BroadcastType>(
    broadcast.broadcast_type,
  );
  const [targetDepartment, setTargetDepartment] = useState(
    broadcast.target_department || "",
  );
  const [priority, setPriority] = useState<BroadcastPriority>(
    broadcast.priority,
  );
  const [isPinned, setIsPinned] = useState(broadcast.is_pinned);

  const handleUpdate = async () => {
    if (!title.trim() || !message.trim()) {
      Alert.alert(
        "Required Fields",
        "Please populate both the summary title and baseline message body.",
      );
      return;
    }
    try {
      await broadcastService.updateBroadcast(broadcast.id, {
        title: title.trim(),
        message: message.trim(),
        broadcast_type: broadcastType,
        target_department:
          broadcastType === "department" ? targetDepartment.trim() : null,
        priority,
        is_pinned: isPinned,
      });
      Alert.alert(
        "Success",
        "Announcement pipeline parameters modified successfully.",
      );
      navigation.goBack();
    } catch (error) {
      Alert.alert(
        "Mutation Failure",
        "Failed to commit adjustments to the cloud matrix node.",
      );
    }
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
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.7}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.eyebrow}>MUTATION MATRIX</Text>
            <Text style={styles.headerTitle}>Edit Announcement</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* CONTENT CARD */}
          <View style={styles.formCard}>
            <Text style={styles.fieldLabel}>Announcement Header Title</Text>
            <View style={styles.inputContainer}>
              <Feather
                name="type"
                size={14}
                color="#475569"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholderTextColor="#475569"
              />
            </View>

            <Text style={styles.fieldLabel}>Payload Message Content</Text>
            <View style={[styles.inputContainer, styles.multilineContainer]}>
              <Feather
                name="align-left"
                size={14}
                color="#475569"
                style={[styles.inputIcon, { marginTop: 14 }]}
              />
              <TextInput
                style={[styles.input, styles.multilineInput]}
                multiline
                numberOfLines={4}
                value={message}
                onChangeText={setMessage}
                placeholderTextColor="#475569"
              />
            </View>
          </View>

          {/* CHANNELS CARD */}
          <Text style={styles.sectionHeading}>Distribution Scope</Text>
          <View style={styles.formCard}>
            <Text style={styles.innerFieldLabel}>Target Feed Channels</Text>
            <View style={styles.pillsGrid}>
              {(
                [
                  "global",
                  "department",
                  "emergency",
                  "event",
                ] as BroadcastType[]
              ).map((type) => {
                const isActive = broadcastType === type;
                let activeBg = "rgba(59,130,246,0.15)";
                let activeColor = "#60a5fa";
                if (type === "emergency" && isActive) {
                  activeBg = "rgba(239,68,68,0.15)";
                  activeColor = "#f87171";
                }

                return (
                  <TouchableOpacity
                    key={type}
                    activeOpacity={0.7}
                    style={[
                      styles.pillButton,
                      isActive && {
                        backgroundColor: activeBg,
                        borderColor: activeColor + "30",
                      },
                    ]}
                    onPress={() => setBroadcastType(type)}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        isActive && { color: activeColor },
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {broadcastType === "department" && (
              <View style={styles.departmentBlock}>
                <Text style={styles.fieldLabel}>
                  Target Division Routing Key
                </Text>
                <View style={styles.inputContainer}>
                  <Feather
                    name="briefcase"
                    size={14}
                    color="#475569"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    value={targetDepartment}
                    onChangeText={setTargetDepartment}
                    placeholder="e.g., IT, HR, FINANCE"
                    placeholderTextColor="#475569"
                    autoCapitalize="characters"
                  />
                </View>
              </View>
            )}
          </View>

          {/* URGENCY SETTINGS CARD */}
          <Text style={styles.sectionHeading}>Urgency Configuration</Text>
          <View style={styles.formCard}>
            <Text style={styles.innerFieldLabel}>
              Priority Index Assignment
            </Text>
            <View style={styles.pillsGrid}>
              {(["normal", "important", "critical"] as BroadcastPriority[]).map(
                (p) => {
                  const isActive = priority === p;
                  let priorityColor = "#64748b";
                  let priorityBg = "rgba(255,255,255,0.02)";
                  if (isActive) {
                    if (p === "normal") {
                      priorityColor = "#4ade80";
                      priorityBg = "rgba(74,222,128,0.12)";
                    }
                    if (p === "important") {
                      priorityColor = "#fbbf24";
                      priorityBg = "rgba(251,191,36,0.12)";
                    }
                    if (p === "critical") {
                      priorityColor = "#f87171";
                      priorityBg = "rgba(248,113,113,0.12)";
                    }
                  }

                  return (
                    <TouchableOpacity
                      key={p}
                      activeOpacity={0.7}
                      style={[
                        styles.pillButton,
                        isActive && {
                          backgroundColor: priorityBg,
                          borderColor: priorityColor + "30",
                        },
                      ]}
                      onPress={() => setPriority(p)}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          isActive && { color: priorityColor },
                        ]}
                      >
                        {p}
                      </Text>
                    </TouchableOpacity>
                  );
                },
              )}
            </View>

            <View style={styles.cardDivider} />

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.checkboxRow}
              onPress={() => setIsPinned(!isPinned)}
            >
              <View
                style={[styles.checkbox, isPinned && styles.checkboxChecked]}
              >
                {isPinned && <Feather name="check" size={11} color="#fff" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.checkboxLabel}>
                  Pin announcement back to global boundary bounds
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* EMIT ACTION TRIPPERS BUTTON */}
          <TouchableOpacity
            style={styles.updateButton}
            activeOpacity={0.85}
            onPress={handleUpdate}
          >
            <LinearGradient
              colors={["#2563eb", "#3b82f6"]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
            <Feather
              name="save"
              size={16}
              color="#fff"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.updateButtonText}>Commit Variations</Text>
          </TouchableOpacity>
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
  headerTitleWrap: { alignItems: "center" },
  eyebrow: {
    color: "#3b82f6",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#f1f5f9",
    marginTop: 1,
  },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 140 },
  formCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    marginBottom: 20,
  },
  fieldLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 2,
  },
  innerFieldLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 2,
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
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 50,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, color: "#fff", fontSize: 14, fontWeight: "600" },
  multilineContainer: { height: 120, alignItems: "flex-start" },
  multilineInput: {
    height: "100%",
    paddingVertical: 14,
    textAlignVertical: "top",
  },
  pillsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pillButton: {
    flex: 1,
    minWidth: "45%",
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    justifyContent: "center",
    alignItems: "center",
  },
  pillText: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  departmentBlock: { marginTop: 14 },
  cardDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
    marginVertical: 14,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 2,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#3b82f6",
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  checkboxLabel: { color: "#cbd5e1", fontSize: 13, fontWeight: "700" },
  updateButton: {
    height: 54,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    overflow: "hidden",
  },
  updateButtonText: { color: "#fff", fontWeight: "900", fontSize: 15 },
});

import React, { memo, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, Feather } from "@expo/vector-icons";
import { formatDistanceToNow } from "date-fns";
import { Broadcast, BroadcastPriority } from "../../types/broadcast";

const priorityConfig: Record<
  BroadcastPriority,
  { color: string; bg: string; icon: string }
> = {
  normal: { color: "#60a5fa", bg: "rgba(96,165,250,0.1)", icon: "info" },
  important: {
    color: "#fb923c",
    bg: "rgba(251,146,60,0.1)",
    icon: "alert-circle",
  },
  critical: {
    color: "#f87171",
    bg: "rgba(248,113,113,0.12)",
    icon: "shield-alert",
  },
};

// Reusable micro-interaction scale feedback block
const ScaleButton = ({
  children,
  onPress,
  activeOpacity = 0.9,
  style,
}: any) => {
  const scaleValue = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.96,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };
  const onPressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  return (
    <TouchableOpacity
      activeOpacity={activeOpacity}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={onPress}
      style={style}
    >
      <Animated.View
        style={{ transform: [{ scale: scaleValue }], width: "100%" }}
      >
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

export const BroadcastCard = memo(
  ({
    broadcast,
    onPress,
    isAdmin = false,
    onDelete,
    onEdit,
  }: {
    broadcast: Broadcast;
    onPress: () => void;
    onMarkAsRead?: () => void;
    isAdmin?: boolean;
    onDelete?: (id: string) => void;
    onEdit?: (broadcast: Broadcast) => void;
  }) => {
    const isUnread = !broadcast.read_by_user;
    const config = priorityConfig[broadcast.priority] || priorityConfig.normal;

    const handleDelete = () => {
      Alert.alert(
        "Discard Announcement",
        "Are you certain you want to purge this data link node statement? This baseline payload tracking cannot be reversed.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Purge Node",
            style: "destructive",
            onPress: () => onDelete?.(broadcast.id),
          },
        ],
      );
    };

    return (
      <ScaleButton onPress={onPress} style={{ marginBottom: 12 }}>
        <View style={[styles.card, broadcast.is_pinned && styles.pinnedCard]}>
          <LinearGradient
            colors={["rgba(255,255,255,0.04)", "rgba(255,255,255,0.01)"]}
            style={StyleSheet.absoluteFill}
          />

          {/* Priority visual boundary bar */}
          <View
            style={[styles.priorityStrip, { backgroundColor: config.color }]}
          />

          <View style={styles.cardHeader}>
            <View style={styles.titleContainer}>
              <View
                style={[styles.iconIndicator, { backgroundColor: config.bg }]}
              >
                <Feather
                  name={config.icon as any}
                  size={12}
                  color={config.color}
                />
              </View>
              <Text style={styles.title} numberOfLines={1}>
                {broadcast.title}
              </Text>
            </View>

            <View style={styles.rightHeaderActions}>
              {broadcast.is_pinned && (
                <Ionicons
                  name="pin"
                  size={12}
                  color="#fbbf24"
                  style={styles.pinIcon}
                />
              )}
              {isUnread && !isAdmin && <View style={styles.unreadDot} />}

              {isAdmin && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    onPress={() => onEdit?.(broadcast)}
                    style={styles.actionBtn}
                    hitSlop={8}
                  >
                    <Feather name="edit-2" size={14} color="#60a5fa" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleDelete}
                    style={styles.actionBtn}
                    hitSlop={8}
                  >
                    <Feather name="trash-2" size={14} color="#f87171" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          <Text style={styles.message} numberOfLines={2}>
            {broadcast.message}
          </Text>

          <View style={styles.footer}>
            <View style={styles.timeRow}>
              <Feather name="clock" size={10} color="#475569" />
              <Text style={styles.time}>
                {formatDistanceToNow(new Date(broadcast.created_at), {
                  addSuffix: true,
                })}
              </Text>
            </View>

            <View style={styles.tagsContainer}>
              {broadcast.broadcast_type === "department" && (
                <View style={styles.departmentTag}>
                  <Text style={styles.departmentText}>
                    {broadcast.target_department}
                  </Text>
                </View>
              )}
              <View
                style={[
                  styles.priorityTag,
                  {
                    backgroundColor: config.bg,
                    borderColor: config.color + "25",
                  },
                ]}
              >
                <Text style={[styles.priorityText, { color: config.color }]}>
                  {broadcast.priority}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScaleButton>
    );
  },
);

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    backgroundColor: "rgba(255,255,255,0.01)",
    overflow: "hidden",
    position: "relative",
  },
  pinnedCard: {
    borderColor: "rgba(251,191,36,0.3)",
    backgroundColor: "rgba(251,191,36,0.02)",
  },
  priorityStrip: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3.5,
    opacity: 0.8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  iconIndicator: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    color: "#f1f5f9",
    letterSpacing: -0.2,
  },
  rightHeaderActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  pinIcon: { opacity: 0.9 },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#3b82f6",
  },
  message: {
    fontSize: 12,
    color: "#94a3b8",
    lineHeight: 18,
    marginBottom: 14,
    paddingLeft: 2,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  time: { fontSize: 11, color: "#475569", fontWeight: "500" },
  tagsContainer: { flexDirection: "row", gap: 6 },
  departmentTag: {
    backgroundColor: "rgba(96,165,250,0.08)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.15)",
  },
  departmentText: {
    fontSize: 9,
    color: "#60a5fa",
    fontWeight: "800",
    textTransform: "uppercase",
  },
  priorityTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  priorityText: { fontSize: 9, fontWeight: "800", textTransform: "uppercase" },
  actionButtons: { flexDirection: "row", gap: 8 },
  actionBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.03)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
});

// components/NotificationCard.tsx
import React, { useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  Notification,
  NOTIFICATION_META,
} from "../../services/notificationService";

interface Props {
  notification: Notification;
  onPress: (n: Notification) => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

const NotificationCard = React.memo(({ notification, onPress }: Props) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const meta = NOTIFICATION_META[notification.type] ?? NOTIFICATION_META.system;
  const isUnread = !notification.is_read;

  const handlePressIn = () =>
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
    }).start();
  const handlePressOut = () =>
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
    }).start();

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => onPress(notification)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View style={[styles.card, isUnread && styles.cardUnread]}>
          {/* Unread accent bar */}
          {isUnread && (
            <LinearGradient
              colors={[meta.color, meta.color + "00"]}
              style={styles.unreadBar}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
          )}

          {/* Icon */}
          <View
            style={[
              styles.iconWrap,
              { backgroundColor: meta.bg, borderColor: meta.color + "40" },
            ]}
          >
            <Ionicons name={meta.icon as any} size={20} color={meta.color} />
          </View>

          {/* Content */}
          <View style={styles.content}>
            <View style={styles.topRow}>
              <Text
                style={[styles.title, isUnread && styles.titleUnread]}
                numberOfLines={1}
              >
                {notification.title}
              </Text>
              <Text style={styles.time}>
                {timeAgo(notification.created_at)}
              </Text>
            </View>
            <Text style={styles.message} numberOfLines={2}>
              {notification.message}
            </Text>

            {/* Type badge */}
            <View
              style={[
                styles.typeBadge,
                { backgroundColor: meta.bg, borderColor: meta.color + "30" },
              ]}
            >
              <Text style={[styles.typeText, { color: meta.color }]}>
                {meta.label}
              </Text>
            </View>
          </View>

          {/* Unread dot */}
          {isUnread && (
            <View style={[styles.unreadDot, { backgroundColor: meta.color }]} />
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

export default NotificationCard;

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 20,
    marginBottom: 10,
    backgroundColor: "rgba(255,255,255,0.055)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    overflow: "hidden",
    gap: 12,
  },
  cardUnread: {
    backgroundColor: "rgba(255,255,255,0.075)",
    borderColor: "rgba(255,255,255,0.1)",
  },
  unreadBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  iconWrap: {
    width: 46,
    height: 46,
    minWidth: 46,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  content: { flex: 1, gap: 4 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  title: { color: "#94a3b8", fontSize: 13, fontWeight: "600", flex: 1 },
  titleUnread: { color: "#f1f5f9", fontWeight: "700" },
  message: { color: "#64748b", fontSize: 12, lineHeight: 17 },
  time: { color: "#334155", fontSize: 10, fontWeight: "600" },
  typeBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 2,
  },
  typeText: {
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: "absolute",
    top: 14,
    right: 14,
  },
});

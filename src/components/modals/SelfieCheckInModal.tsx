import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../../services/supabase";
import { useAuth } from "../../context/AuthContext";

// ─── TYPES ────────────────────────────────────────────────────────────────────
type AttendanceState =
  | "loading" // checking DB for today's record
  | "no_record" // no check-in yet → show Check In
  | "checked_in" // checked in, no checkout → show Check Out
  | "completed" // both check-in and check-out done → disable all
  | "error"; // something went wrong loading state

interface TodayRecord {
  id: string;
  check_in: string;
  check_out: string | null;
  work_status: string | null;
  total_work_hours: number | null;
  attendance_date: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// ─── OFFICE CONFIG ────────────────────────────────────────────────────────────
const OFFICE_LAT = 17.445402832633054;
const OFFICE_LNG = 78.38262959112612;
const OFFICE_RADIUS = 100; // metres

// ─── ATTENDANCE STATUS LOGIC ──────────────────────────────────────────────────
/**
 * RULE 1: Check-in before 11:00 AM  → Present
 * RULE 2: Check-in after  11:00 AM  → Late
 * RULE 3: Late + worked 8+ hours    → Present (override)
 * RULE 4: Late + worked 4-8 hours   → Half Day
 * RULE 5: Late + worked < 4 hours   → Absent
 */
function computeWorkStatus(
  checkInISO: string,
  checkOutISO: string,
): { work_status: string; total_work_hours: number } {
  const checkIn = new Date(checkInISO);
  const checkOut = new Date(checkOutISO);
  const totalHours =
    (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
  const roundedHours = Math.round(totalHours * 100) / 100;

  const checkInHour = checkIn.getHours();
  const checkInMinute = checkIn.getMinutes();
  const isLate = checkInHour > 11 || (checkInHour === 11 && checkInMinute > 0);

  let work_status: string;
  if (!isLate) {
    work_status = "Present";
  } else if (roundedHours >= 8) {
    work_status = "Present"; // RULE 3
  } else if (roundedHours >= 4) {
    work_status = "Half Day"; // RULE 4
  } else {
    work_status = "Absent"; // RULE 5
  }

  return { work_status, total_work_hours: roundedHours };
}

// ─── HAVERSINE DISTANCE ───────────────────────────────────────────────────────
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export default function SelfieCheckInModal({
  visible,
  onClose,
  onSuccess,
}: Props) {
  const { user } = useAuth();
  const cameraRef = useRef<any>(null);
  const [permission, requestPermission] = useCameraPermissions();

  // Attendance state machine
  const [attendanceState, setAttendanceState] =
    useState<AttendanceState>("loading");
  const [todayRecord, setTodayRecord] = useState<TodayRecord | null>(null);

  // Location
  const [insideOffice, setInsideOffice] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  // UI
  const [submitting, setSubmitting] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [uploadStep, setUploadStep] = useState("");
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // ── Clock ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const tick = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }),
      );
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  // ── Pulse animation for location dot ──────────────────────────────────────
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.4,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  // ── Load today's attendance state ─────────────────────────────────────────
  const loadTodayState = useCallback(async () => {
    if (!user?.id) return;
    try {
      setAttendanceState("loading");
      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("attendance")
        .select(
          "id, check_in, check_out, work_status, total_work_hours, attendance_date",
        )
        .eq("employee_id", user.id)
        .eq("attendance_date", today)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setTodayRecord(null);
        setAttendanceState("no_record");
      } else if (data.check_in && !data.check_out) {
        setTodayRecord(data);
        setAttendanceState("checked_in");
      } else if (data.check_in && data.check_out) {
        setTodayRecord(data);
        setAttendanceState("completed");
      } else {
        setAttendanceState("no_record");
      }
    } catch (e) {
      console.error("loadTodayState:", e);
      setAttendanceState("error");
    }
  }, [user?.id]);

  // ── Location polling ──────────────────────────────────────────────────────
  const checkLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });
      const dist = haversineDistance(
        OFFICE_LAT,
        OFFICE_LNG,
        loc.coords.latitude,
        loc.coords.longitude,
      );
      setDistance(Math.round(dist));
      setInsideOffice(dist <= OFFICE_RADIUS);
    } catch (e) {
      console.warn("Location error:", e);
    }
  }, []);

  useEffect(() => {
    if (!visible) {
      if (locationIntervalRef.current)
        clearInterval(locationIntervalRef.current);
      return;
    }
    loadTodayState();
    checkLocation();
    locationIntervalRef.current = setInterval(checkLocation, 6000);
    return () => {
      if (locationIntervalRef.current)
        clearInterval(locationIntervalRef.current);
    };
  }, [visible, loadTodayState, checkLocation]);

  // ── Upload selfie to Supabase Storage ────────────────────────────────────
  const uploadSelfie = async (
    uri: string,
    suffix: "checkin" | "checkout",
  ): Promise<string> => {
    setUploadStep("Compressing image…");
    const compressed = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 600 } }],
      {
        compress: 0.4,
        format: ImageManipulator.SaveFormat.JPEG,
      },
    );

    setUploadStep("Uploading selfie…");
    const today = new Date().toISOString().split("T")[0];
    const fileName = `${today}_${suffix}_${Date.now()}.jpg`;
    const filePath = `${user!.id}/${fileName}`;
    const base64 = await FileSystem.readAsStringAsync(compressed.uri, {
      encoding: "base64",
    });

    const { error: uploadError } = await supabase.storage
      .from("attendance-selfies")
      .upload(filePath, decode(base64), {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    const { data: urlData } = supabase.storage
      .from("attendance-selfies")
      .getPublicUrl(filePath);
    return urlData.publicUrl;
  };

  // ── CAPTURE & SUBMIT ──────────────────────────────────────────────────────
  const handleCapture = async () => {
    if (submitting) return; // prevent double-tap
    if (!insideOffice) {
      Alert.alert(
        "Outside Office",
        `You are ${distance ?? "?"}m away. Must be within ${OFFICE_RADIUS}m.`,
      );
      return;
    }
    if (!cameraRef.current) return;
    if (attendanceState === "completed") return;

    setSubmitting(true);
    setUploadStep("Taking photo…");

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.6,
        skipProcessing: false,
      });
      const selfieUrl = await uploadSelfie(
        photo.uri,
        attendanceState === "no_record" ? "checkin" : "checkout",
      );
      const now = new Date();
      const today = now.toISOString().split("T")[0];

      // ── CHECK-IN ────────────────────────────────────────────────────────
      if (attendanceState === "no_record") {
        setUploadStep("Recording check-in…");

        // Double-guard: check DB again right before insert (race condition safety)
        const { data: existing } = await supabase
          .from("attendance")
          .select("id")
          .eq("employee_id", user!.id)
          .eq("attendance_date", today)
          .maybeSingle();

        if (existing) {
          Alert.alert(
            "Already Checked In",
            "You have already checked in today.",
          );
          await loadTodayState();
          return;
        }

        const checkInHour = now.getHours();
        const initialStatus =
          checkInHour > 11 || (checkInHour === 11 && now.getMinutes() > 0)
            ? "Late"
            : "Working";

        const { error: insertError } = await supabase
          .from("attendance")
          .insert({
            employee_id: user!.id,
            attendance_date: today,
            check_in: now.toISOString(),
            check_in_selfie: selfieUrl,
            work_status: initialStatus,
            attendance_status: initialStatus === "Late" ? "Late" : "Present",
          });

        if (insertError) {
          // Unique constraint violation = already checked in (race condition caught at DB level)
          if (insertError.code === "23505") {
            Alert.alert(
              "Already Checked In",
              "You have already checked in today.",
            );
            await loadTodayState();
            return;
          }
          throw new Error(insertError.message);
        }

        onSuccess?.();
        onClose();
        Alert.alert(
          "✅ Checked In",
          `Check-in recorded at ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}`,
        );

        // ── CHECK-OUT ───────────────────────────────────────────────────────
      } else if (attendanceState === "checked_in" && todayRecord) {
        setUploadStep("Computing work hours…");

        if (todayRecord.check_out) {
          Alert.alert(
            "Already Checked Out",
            "You have already checked out today.",
          );
          await loadTodayState();
          return;
        }

        const { work_status, total_work_hours } = computeWorkStatus(
          todayRecord.check_in,
          now.toISOString(),
        );

        setUploadStep("Recording check-out…");
        const { error: updateError } = await supabase
          .from("attendance")
          .update({
            check_out: now.toISOString(),
            check_out_selfie: selfieUrl,
            total_work_hours,
            work_status,
            // keep legacy columns in sync
            total_hours: String(total_work_hours),
            attendance_status: work_status,
          })
          .eq("id", todayRecord.id)
          .is("check_out", null); // only update if still null — DB-level guard

        if (updateError) throw new Error(updateError.message);

        onSuccess?.();
        onClose();
        Alert.alert(
          "✅ Checked Out",
          `Work hours: ${total_work_hours.toFixed(1)}h\nStatus: ${work_status}`,
        );
      }
    } catch (e: any) {
      console.error("handleCapture:", e);
      Alert.alert(
        "Error",
        e?.message ?? "Something went wrong. Please try again.",
      );
    } finally {
      setSubmitting(false);
      setUploadStep("");
    }
  };

  // ── PERMISSION GATES ──────────────────────────────────────────────────────
  if (!permission) return null;
  if (!permission.granted) {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.permissionOverlay}>
          <View style={styles.permissionCard}>
            <Ionicons name="camera-outline" size={48} color="#60a5fa" />
            <Text style={styles.permissionTitle}>Camera Required</Text>
            <Text style={styles.permissionSub}>
              Grant camera access to capture your attendance selfie.
            </Text>
            <TouchableOpacity
              style={styles.permissionBtn}
              onPress={requestPermission}
            >
              <Text style={styles.permissionBtnText}>Grant Permission</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={{ marginTop: 12 }}>
              <Text style={{ color: "#475569", fontSize: 13 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // ── COMPLETED STATE — no camera needed ───────────────────────────────────
  if (attendanceState === "completed" && visible) {
    const checkIn = todayRecord?.check_in
      ? new Date(todayRecord.check_in).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      : "—";
    const checkOut = todayRecord?.check_out
      ? new Date(todayRecord.check_out).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      : "—";

    return (
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.completedOverlay}>
          <View style={styles.completedCard}>
            <LinearGradient
              colors={["#052e16", "#14532d"]}
              style={[StyleSheet.absoluteFill, { borderRadius: 28 }]}
            />
            <View style={styles.completedIcon}>
              <Ionicons name="checkmark-circle" size={52} color="#4ade80" />
            </View>
            <Text style={styles.completedTitle}>Attendance Complete</Text>
            <Text style={styles.completedSub}>
              Your attendance for today is fully recorded.
            </Text>
            <View style={styles.completedRow}>
              <View style={styles.completedStat}>
                <Text style={styles.completedStatLabel}>Check-In</Text>
                <Text style={styles.completedStatValue}>{checkIn}</Text>
              </View>
              <View style={styles.completedDivider} />
              <View style={styles.completedStat}>
                <Text style={styles.completedStatLabel}>Check-Out</Text>
                <Text style={styles.completedStatValue}>{checkOut}</Text>
              </View>
              <View style={styles.completedDivider} />
              <View style={styles.completedStat}>
                <Text style={styles.completedStatLabel}>Hours</Text>
                <Text style={styles.completedStatValue}>
                  {todayRecord?.total_work_hours?.toFixed(1) ?? "—"}h
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor: "rgba(74,222,128,0.15)",
                  borderColor: "rgba(74,222,128,0.4)",
                },
              ]}
            >
              <View style={styles.statusPillDot} />
              <Text style={styles.statusPillText}>
                {todayRecord?.work_status ?? "Present"}
              </Text>
            </View>
            <TouchableOpacity style={styles.completedClose} onPress={onClose}>
              <Text style={styles.completedCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // ── MAIN CAMERA VIEW ──────────────────────────────────────────────────────
  const isCheckIn = attendanceState === "no_record";
  const isCheckOut = attendanceState === "checked_in";
  const btnColors: [string, string] = isCheckOut
    ? ["#991b1b", "#dc2626"]
    : ["#1d4ed8", "#3b82f6"];
  const btnLabel = submitting
    ? uploadStep
    : isCheckOut
      ? "Capture Checkout Selfie"
      : "Capture Check-In Selfie";

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
    >
      <View style={styles.container}>
        <View style={styles.cameraCard}>
          {attendanceState === "loading" ? (
            <View style={styles.stateLoader}>
              <ActivityIndicator size="large" color="#60a5fa" />
              <Text style={styles.stateLoaderText}>Checking attendance…</Text>
            </View>
          ) : (
            <>
              <CameraView
                ref={cameraRef}
                facing="front"
                style={StyleSheet.absoluteFill}
              />

              <LinearGradient
                colors={[
                  "rgba(0,0,0,0.72)",
                  "transparent",
                  "transparent",
                  "rgba(0,0,0,0.88)",
                ]}
                style={StyleSheet.absoluteFill}
                locations={[0, 0.25, 0.6, 1]}
              />

              {/* ── TOP BAR ──────────────────────────────────────────── */}
              <View style={styles.topBar}>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeBtn}
                  disabled={submitting}
                >
                  <Ionicons name="close" size={22} color="#fff" />
                </TouchableOpacity>

                {/* Location badge */}
                <View
                  style={[
                    styles.locationBadge,
                    {
                      backgroundColor: insideOffice
                        ? "rgba(74,222,128,0.18)"
                        : "rgba(248,113,113,0.18)",
                      borderColor: insideOffice
                        ? "rgba(74,222,128,0.4)"
                        : "rgba(248,113,113,0.4)",
                    },
                  ]}
                >
                  <Animated.View
                    style={[
                      styles.locationPulse,
                      {
                        backgroundColor: insideOffice ? "#4ade80" : "#f87171",
                        transform: [{ scale: pulseAnim }],
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.locationText,
                      { color: insideOffice ? "#4ade80" : "#f87171" },
                    ]}
                  >
                    {insideOffice ? "In Office" : `${distance ?? "…"}m away`}
                  </Text>
                </View>

                {/* Mode badge */}
                <View
                  style={[
                    styles.modeBadge,
                    {
                      backgroundColor: isCheckOut
                        ? "rgba(220,38,38,0.2)"
                        : "rgba(37,99,235,0.2)",
                    },
                  ]}
                >
                  <Ionicons
                    name={isCheckOut ? "log-out-outline" : "log-in-outline"}
                    size={12}
                    color={isCheckOut ? "#f87171" : "#60a5fa"}
                  />
                  <Text
                    style={[
                      styles.modeBadgeText,
                      { color: isCheckOut ? "#f87171" : "#60a5fa" },
                    ]}
                  >
                    {isCheckOut ? "Check Out" : "Check In"}
                  </Text>
                </View>
              </View>

              {/* ── FACE GUIDE ───────────────────────────────────────── */}
              <View style={styles.faceGuideWrap}>
                <View
                  style={[
                    styles.faceGuide,
                    {
                      borderColor: insideOffice
                        ? "rgba(74,222,128,0.7)"
                        : "rgba(248,113,113,0.5)",
                    },
                  ]}
                >
                  {/* Corner accents */}
                  {["tl", "tr", "bl", "br"].map((pos) => (
                    <View
                      key={pos}
                      style={[
                        styles.corner,
                        styles[pos as keyof typeof styles] as any,
                        { borderColor: insideOffice ? "#4ade80" : "#f87171" },
                      ]}
                    />
                  ))}
                </View>
                <Text style={styles.faceGuideHint}>
                  Align your face in the frame
                </Text>
              </View>

              {/* ── BOTTOM ───────────────────────────────────────────── */}
              <View style={styles.bottomBar}>
                <Text style={styles.clock}>{currentTime}</Text>

                {isCheckOut && todayRecord?.check_in && (
                  <Text style={styles.sinceText}>
                    Since{" "}
                    {new Date(todayRecord.check_in).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </Text>
                )}

                {!insideOffice && (
                  <View style={styles.officeWarning}>
                    <Ionicons
                      name="warning-outline"
                      size={14}
                      color="#fbbf24"
                    />
                    <Text style={styles.officeWarningText}>
                      Must be within {OFFICE_RADIUS}m of office
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  onPress={handleCapture}
                  disabled={submitting || !insideOffice}
                  activeOpacity={0.85}
                  style={{ width: "100%", marginTop: 12 }}
                >
                  <LinearGradient
                    colors={
                      submitting || !insideOffice
                        ? ["#1e293b", "#1e293b"]
                        : btnColors
                    }
                    style={styles.captureBtn}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {submitting ? (
                      <>
                        <ActivityIndicator color="#fff" size="small" />
                        <Text style={styles.captureBtnText}>
                          {uploadStep || "Processing…"}
                        </Text>
                      </>
                    ) : (
                      <>
                        <Ionicons
                          name="camera"
                          size={20}
                          color={insideOffice ? "#fff" : "#475569"}
                        />
                        <Text
                          style={[
                            styles.captureBtnText,
                            !insideOffice && { color: "#475569" },
                          ]}
                        >
                          {btnLabel}
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  cameraCard: {
    width: "92%",
    height: "88%",
    borderRadius: 32,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  stateLoader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    backgroundColor: "#060d1f",
  },
  stateLoaderText: { color: "#60a5fa", fontSize: 14, fontWeight: "600" },

  // Top bar
  topBar: {
    position: "absolute",
    top: 20,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  locationBadge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  locationPulse: { width: 8, height: 8, borderRadius: 4 },
  locationText: { fontSize: 12, fontWeight: "700" },
  modeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
  },
  modeBadgeText: { fontSize: 11, fontWeight: "800" },

  // Face guide
  faceGuideWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  faceGuide: {
    width: 220,
    height: 290,
    borderRadius: 130,
    borderWidth: 2,
    position: "relative",
  },
  faceGuideHint: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
    marginTop: 18,
    fontWeight: "500",
  },
  corner: { position: "absolute", width: 20, height: 20, borderWidth: 3 },
  tl: {
    top: -2,
    left: -2,
    borderBottomWidth: 0,
    borderRightWidth: 0,
    borderTopLeftRadius: 6,
  },
  tr: {
    top: -2,
    right: -2,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopRightRadius: 6,
  },
  bl: {
    bottom: -2,
    left: -2,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomLeftRadius: 6,
  },
  br: {
    bottom: -2,
    right: -2,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomRightRadius: 6,
  },

  // Bottom
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    alignItems: "center",
  },
  clock: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 4,
  },
  sinceText: { color: "rgba(255,255,255,0.55)", fontSize: 12, marginBottom: 6 },
  officeWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(251,191,36,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 4,
  },
  officeWarningText: { color: "#fbbf24", fontSize: 11, fontWeight: "600" },
  captureBtn: {
    height: 58,
    borderRadius: 20,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  captureBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },

  // Permission
  permissionOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  permissionCard: {
    backgroundColor: "#0f172a",
    borderRadius: 28,
    padding: 32,
    alignItems: "center",
    width: "100%",
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  permissionTitle: { color: "#f1f5f9", fontSize: 20, fontWeight: "900" },
  permissionSub: {
    color: "#64748b",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
  permissionBtn: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 8,
  },
  permissionBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },

  // Completed
  completedOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 28,
  },
  completedCard: {
    width: "100%",
    borderRadius: 28,
    padding: 32,
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.2)",
    gap: 8,
  },
  completedIcon: { marginBottom: 8 },
  completedTitle: { color: "#f1f5f9", fontSize: 22, fontWeight: "900" },
  completedSub: { color: "#64748b", fontSize: 13, textAlign: "center" },
  completedRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 4,
  },
  completedStat: { flex: 1, alignItems: "center", gap: 4 },
  completedStatLabel: {
    color: "#475569",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  completedStatValue: { color: "#f1f5f9", fontSize: 16, fontWeight: "900" },
  completedDivider: {
    width: 1,
    height: 36,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 8,
  },
  statusPillDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#4ade80",
  },
  statusPillText: { color: "#4ade80", fontWeight: "800", fontSize: 13 },
  completedClose: {
    marginTop: 24,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  completedCloseText: { color: "#94a3b8", fontWeight: "700", fontSize: 14 },
});

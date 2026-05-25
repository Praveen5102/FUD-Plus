import React, { useEffect, useRef, useState } from "react";

import {
  ActivityIndicator,
  Alert,
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

interface Props {
  visible: boolean;

  onClose: () => void;

  onSuccess?: () => void;
}

// REAL OFFICE LOCATION

const OFFICE_LAT = 17.445402832633054;

const OFFICE_LNG = 78.38262959112612;

// STRICT 100 METERS

const OFFICE_RADIUS = 100;

export default function SelfieCheckInModal({
  visible,
  onClose,
  onSuccess,
}: Props) {
  const { user } = useAuth();

  const cameraRef = useRef<any>(null);

  const [permission, requestPermission] = useCameraPermissions();

  const [loading, setLoading] = useState(false);

  const [insideOffice, setInsideOffice] = useState(false);

  const [distanceText, setDistanceText] = useState("");

  const [currentTime, setCurrentTime] = useState("");

  // LIVE CLOCK

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();

      setCurrentTime(
        now.toLocaleTimeString([], {
          hour: "2-digit",

          minute: "2-digit",

          hour12: true,
        }),
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // LIVE LOCATION CHECK

  useEffect(() => {
    let interval: any;

    if (visible) {
      checkLocation();

      interval = setInterval(() => {
        checkLocation();
      }, 5000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [visible]);

  // LOCATION VALIDATION

  const checkLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert("Permission Required", "Location permission is required.");

        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,

        mayShowUserSettingsDialog: true,
      });

      const userLat = location.coords.latitude;

      const userLng = location.coords.longitude;

      console.log("USER LAT:", userLat);

      console.log("USER LNG:", userLng);

      const distance = calculateDistance(
        OFFICE_LAT,
        OFFICE_LNG,
        userLat,
        userLng,
      );

      console.log("DISTANCE:", distance);

      setDistanceText(`${Math.round(distance)} meters`);

      if (distance <= OFFICE_RADIUS) {
        setInsideOffice(true);
      } else {
        setInsideOffice(false);
      }
    } catch (error) {
      console.log(error);

      Alert.alert("Location Error", "Unable to fetch your location.");
    }
  };

  // DISTANCE FORMULA

  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) => {
    const R = 6371e3;

    const φ1 = (lat1 * Math.PI) / 180;

    const φ2 = (lat2 * Math.PI) / 180;

    const Δφ = ((lat2 - lat1) * Math.PI) / 180;

    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // CAMERA PERMISSION

  if (!permission) {
    return null;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Camera permission required</Text>

        <TouchableOpacity
          onPress={requestPermission}
          style={styles.permissionButton}
        >
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // CAPTURE ATTENDANCE

  const handleCapture = async () => {
    try {
      if (!insideOffice) {
        Alert.alert("Outside Office", "You are outside office range.");

        return;
      }

      if (!cameraRef.current) {
        return;
      }

      setLoading(true);

      // TAKE PHOTO

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
      });

      // COMPRESS IMAGE

      const compressed = await ImageManipulator.manipulateAsync(photo.uri, [], {
        compress: 0.4,

        format: ImageManipulator.SaveFormat.JPEG,
      });

      // FILE

      const fileName = `${Date.now()}.jpg`;

      const filePath = `${user?.id}/${fileName}`;

      // BASE64

      const base64 = await FileSystem.readAsStringAsync(compressed.uri, {
        encoding: "base64",
      });

      // UPLOAD TO STORAGE

      const { error: uploadError } = await supabase.storage
        .from("attendance-selfies")
        .upload(filePath, decode(base64), {
          contentType: "image/jpeg",
        });

      if (uploadError) {
        console.log(uploadError);

        Alert.alert("Upload Failed", uploadError.message);

        setLoading(false);

        return;
      }

      // GET URL

      const { data: publicData } = supabase.storage
        .from("attendance-selfies")
        .getPublicUrl(filePath);

      // TODAY

      const today = new Date().toISOString().split("T")[0];

      // CHECK EXISTING

      const { data: existingAttendance } = await supabase
        .from("attendance")
        .select("*")
        .eq("employee_id", user?.id)
        .gte("created_at", `${today}T00:00:00`)
        .lte("created_at", `${today}T23:59:59`)
        .maybeSingle();

      // CHECKOUT FLOW

      if (existingAttendance && !existingAttendance.check_out) {
        const checkInTime = new Date(existingAttendance.check_in);

        const now = new Date();

        const totalHours = (
          (now.getTime() - checkInTime.getTime()) /
          1000 /
          60 /
          60
        ).toFixed(1);

        const { error: updateError } = await supabase
          .from("attendance")
          .update({
            check_out: now.toISOString(),

            check_out_selfie: publicData.publicUrl,

            total_hours: totalHours,
          })
          .eq("id", existingAttendance.id);

        if (updateError) {
          Alert.alert("Checkout Failed", updateError.message);

          setLoading(false);

          return;
        }

        Alert.alert("Checked Out", `Worked ${totalHours} hours`);
      } else {
        // CHECKIN FLOW

        const { error: insertError } = await supabase
          .from("attendance")
          .insert({
            employee_id: user?.id,

            check_in: new Date().toISOString(),

            check_in_selfie: publicData.publicUrl,

            attendance_status: "Present",
          });

        if (insertError) {
          Alert.alert("Check In Failed", insertError.message);

          setLoading(false);

          return;
        }

        Alert.alert("Checked In", `Attendance captured at ${currentTime}`);
      }

      setLoading(false);

      onSuccess?.();

      onClose();
    } catch (error) {
      console.log(error);

      setLoading(false);

      Alert.alert("Error", "Attendance failed.");
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.modalContainer}>
        <View style={styles.cameraCard}>
          <CameraView ref={cameraRef} facing="front" style={styles.camera} />

          {/* OVERLAY */}

          <LinearGradient
            colors={["rgba(0,0,0,0.6)", "transparent", "rgba(0,0,0,0.85)"]}
            style={styles.overlay}
          >
            {/* TOP */}

            <View style={styles.topContainer}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>

              <View
                style={[
                  styles.locationBadge,
                  {
                    backgroundColor: insideOffice
                      ? "rgba(34,197,94,0.18)"
                      : "rgba(239,68,68,0.18)",
                  },
                ]}
              >
                <View
                  style={[
                    styles.locationDot,
                    {
                      backgroundColor: insideOffice ? "#22c55e" : "#ef4444",
                    },
                  ]}
                />

                <Text style={styles.locationText}>
                  {insideOffice
                    ? "Within Office Range"
                    : "Outside Office Range"}
                </Text>
              </View>
            </View>

            {/* CENTER */}

            <View style={styles.centerContainer}>
              <View style={styles.faceGuide} />
            </View>

            {/* BOTTOM */}

            <View style={styles.bottomContainer}>
              <Text style={styles.timeText}>{currentTime}</Text>

              <Text style={styles.distanceText}>Distance: {distanceText}</Text>

              <Text
                style={{
                  color: "rgba(255,255,255,0.6)",

                  marginBottom: 18,
                }}
              >
                Office Radius: {OFFICE_RADIUS}m
              </Text>

              <TouchableOpacity
                disabled={loading}
                activeOpacity={0.9}
                onPress={handleCapture}
              >
                <LinearGradient
                  colors={["#2563eb", "#3b82f6"]}
                  style={styles.captureButton}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="camera" size={22} color="#fff" />

                      <Text style={styles.captureText}>Capture Selfie</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,

    justifyContent: "center",

    alignItems: "center",

    backgroundColor: "rgba(0,0,0,0.9)",
  },

  cameraCard: {
    width: "92%",

    height: "86%",

    borderRadius: 30,

    overflow: "hidden",

    backgroundColor: "#000",
  },

  camera: {
    flex: 1,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,

    justifyContent: "space-between",
  },

  topContainer: {
    marginTop: 20,

    paddingHorizontal: 20,

    flexDirection: "row",

    justifyContent: "space-between",

    alignItems: "center",
  },

  closeButton: {
    width: 44,

    height: 44,

    borderRadius: 22,

    justifyContent: "center",

    alignItems: "center",

    backgroundColor: "rgba(255,255,255,0.1)",
  },

  locationBadge: {
    flexDirection: "row",

    alignItems: "center",

    paddingHorizontal: 14,

    paddingVertical: 8,

    borderRadius: 20,
  },

  locationDot: {
    width: 8,

    height: 8,

    borderRadius: 8,

    marginRight: 8,
  },

  locationText: {
    color: "#fff",

    fontWeight: "700",
  },

  centerContainer: {
    alignItems: "center",
  },

  faceGuide: {
    width: 220,

    height: 300,

    borderWidth: 3,

    borderColor: "rgba(255,255,255,0.7)",

    borderRadius: 140,
  },

  bottomContainer: {
    alignItems: "center",

    marginBottom: 40,
  },

  timeText: {
    color: "#fff",

    fontSize: 22,

    fontWeight: "800",

    marginBottom: 8,
  },

  distanceText: {
    color: "rgba(255,255,255,0.7)",

    marginBottom: 4,
  },

  captureButton: {
    width: 240,

    height: 60,

    borderRadius: 20,

    flexDirection: "row",

    justifyContent: "center",

    alignItems: "center",
  },

  captureText: {
    color: "#fff",

    fontWeight: "700",

    fontSize: 15,

    marginLeft: 10,
  },

  permissionContainer: {
    flex: 1,

    justifyContent: "center",

    alignItems: "center",

    backgroundColor: "#071226",
  },

  permissionText: {
    color: "#fff",

    marginBottom: 20,

    fontSize: 16,
  },

  permissionButton: {
    paddingHorizontal: 20,

    paddingVertical: 12,

    borderRadius: 16,

    backgroundColor: "#2563eb",
  },

  permissionButtonText: {
    color: "#fff",

    fontWeight: "700",
  },
});

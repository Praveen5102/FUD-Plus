import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, Ionicons } from "@expo/vector-icons";
import { supabase } from "../../services/supabase";

interface Props {
  visible: boolean;
  onClose: () => void;
  onEmployeeCreated: () => Promise<void>;
}

const departments = [
  "IT",
  "HR",
  "Management",
  "Finance",
  "Operations",
  "Marketing",
];

export default function AddEmployeeModal({
  visible,
  onClose,
  onEmployeeCreated,
}: Props) {
  const [fullName, setFullName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [department, setDepartment] = useState("IT");
  const [joiningDate, setJoiningDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [showPasswordCard, setShowPasswordCard] = useState(false);

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    let password = "";
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert(
        "Permission Required",
        "This application requires media storage permissions.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const copyPassword = async () => {
    await Clipboard.setStringAsync(generatedPassword);
    Alert.alert("Copied", "Password copied successfully.");
  };

  const resetForm = () => {
    setFullName("");
    setEmployeeId("");
    setEmail("");
    setPhoneNumber("");
    setDepartment("IT");
    setProfileImage(null);
    setJoiningDate(new Date());
  };

  const handleCreateEmployee = async () => {
    if (loading) return;

    if (!fullName || !employeeId || !email || !phoneNumber || !department) {
      Alert.alert("Missing Fields", "All fields are mandatory.");
      return;
    }

    try {
      setLoading(true);
      const password = generatePassword();

      let uploadedImage = null;
      if (profileImage) {
        try {
          const response = await fetch(profileImage);
          const arrayBuffer = await response.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          const fileName = `employee_${Date.now()}.jpg`;

          const { data: uploadData, error: uploadError } =
            await supabase.storage
              .from("employee-images")
              .upload(fileName, uint8Array, {
                contentType: "image/jpeg",
                upsert: false,
              });

          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from("employee-images")
              .getPublicUrl(fileName);
            uploadedImage = urlData.publicUrl;
          }
        } catch (err) {
          console.log("Image upload failure cascade:", err);
        }
      }

      // Intercept and route via Create Employee Edge Function
      const { data, error } = await supabase.functions.invoke(
        "create-employee",
        {
          body: {
            full_name: fullName.trim(),
            employee_id: employeeId.trim(),
            email: email.trim(),
            phone_number: phoneNumber.trim(),
            department,
            joining_date: joiningDate.toISOString(),
            profile_image: uploadedImage,
            password,
          },
        },
      );

      if (error || (data && data.success === false)) {
        const errorMsg =
          error?.message || data?.error || "Failed to finalize employee setup.";
        Alert.alert("Registration Error", errorMsg);
        setLoading(false);
        return;
      }

      setGeneratedPassword(password);
      resetForm();
      onClose();
      setShowPasswordCard(true);

      setTimeout(async () => {
        try {
          await onEmployeeCreated();
        } catch (err) {
          console.log("Refresh handling error:", err);
        }
      }, 300);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.header}>
                <Text style={styles.title}>Add Employee</Text>
                <TouchableOpacity onPress={onClose}>
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                {profileImage ? (
                  <Image
                    source={{ uri: profileImage }}
                    style={styles.profileImage}
                  />
                ) : (
                  <>
                    <Feather name="upload" size={24} color="#dbeafe" />
                    <Text style={styles.uploadText}>Upload Image</Text>
                  </>
                )}
              </TouchableOpacity>

              <TextInput
                placeholder="Full Name"
                placeholderTextColor="#94a3b8"
                value={fullName}
                onChangeText={setFullName}
                style={styles.input}
              />
              <TextInput
                placeholder="Employee ID"
                placeholderTextColor="#94a3b8"
                value={employeeId}
                onChangeText={setEmployeeId}
                style={styles.input}
              />
              <TextInput
                placeholder="Email"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
              />
              <TextInput
                placeholder="Phone Number"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                style={styles.input}
              />

              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateText}>
                  Joining: {joiningDate.toDateString()}
                </Text>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={joiningDate}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) setJoiningDate(selectedDate);
                  }}
                />
              )}

              <Text style={styles.departmentTitle}>Department</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {departments.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.departmentButton,
                      department === item && styles.activeDepartment,
                    ]}
                    onPress={() => setDepartment(item)}
                  >
                    <Text
                      style={[
                        styles.departmentText,
                        department === item && styles.activeDepartmentText,
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity
                disabled={loading}
                activeOpacity={loading ? 1 : 0.8}
                onPress={handleCreateEmployee}
              >
                <LinearGradient
                  colors={
                    loading ? ["#1e40af", "#3b82f6"] : ["#2563eb", "#60a5fa"]
                  }
                  style={[
                    styles.createButton,
                    loading && styles.buttonDisabled,
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.createButtonText}>Create Employee</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showPasswordCard} transparent animationType="fade">
        <View style={styles.passwordOverlay}>
          <View style={styles.passwordContainer}>
            <Ionicons name="shield-checkmark" size={60} color="#60a5fa" />
            <Text style={styles.passwordTitle}>Employee Created!</Text>
            <Text style={styles.passwordSubtitle}>
              Share this temporary password with the employee.
            </Text>
            <View style={styles.passwordBox}>
              <Text style={styles.passwordText}>{generatedPassword}</Text>
            </View>
            <TouchableOpacity onPress={copyPassword}>
              <LinearGradient
                colors={["#2563eb", "#60a5fa"]}
                style={styles.copyButton}
              >
                <Ionicons name="copy" size={18} color="#fff" />
                <Text style={styles.copyButtonText}>Copy Password</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => setShowPasswordCard(false)}
            >
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  container: {
    backgroundColor: "#071226",
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    padding: 22,
    maxHeight: "92%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: { color: "#fff", fontSize: 22, fontWeight: "800" },
  imagePicker: {
    height: 130,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  uploadText: { color: "#dbeafe", marginTop: 10 },
  profileImage: { width: 130, height: 130, borderRadius: 24 },
  input: {
    height: 56,
    borderRadius: 18,
    paddingHorizontal: 18,
    marginBottom: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    color: "#fff",
  },
  dateButton: {
    height: 56,
    borderRadius: 18,
    justifyContent: "center",
    paddingHorizontal: 18,
    marginBottom: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  dateText: { color: "#fff" },
  departmentTitle: { color: "#fff", fontWeight: "700", marginBottom: 12 },
  departmentButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
    marginRight: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  activeDepartment: { backgroundColor: "rgba(37,99,235,0.35)" },
  departmentText: { color: "#cbd5e1" },
  activeDepartmentText: { color: "#fff" },
  createButton: {
    height: 58,
    borderRadius: 18,
    marginTop: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  createButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  passwordOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(2,6,23,0.92)",
  },
  passwordContainer: {
    width: "82%",
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
    backgroundColor: "#050816",
  },
  passwordTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 16,
  },
  passwordSubtitle: {
    color: "#93c5fd",
    marginTop: 6,
    textAlign: "center",
    fontSize: 13,
  },
  passwordBox: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 18,
    marginTop: 18,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  passwordText: {
    color: "#7dd3fc",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 3,
  },
  copyButton: {
    width: "100%",
    height: 50,
    borderRadius: 16,
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  copyButtonText: { color: "#fff", fontWeight: "700", marginLeft: 8 },
  doneButton: {
    width: "100%",
    height: 50,
    borderRadius: 16,
    marginTop: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  doneText: { color: "#dbeafe", fontWeight: "700" },
});

import React, { useEffect, useRef } from "react";

import {
  Animated,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { LinearGradient } from "expo-linear-gradient";

import { COLORS } from "../../constants/colors";

import { supabase } from "../../services/supabase";

export default function SplashScreen({ navigation }: any) {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // ANIMATION

    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,

        duration: 1200,

        useNativeDriver: true,
      }),

      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1,

            duration: 1800,

            useNativeDriver: true,
          }),

          Animated.timing(scaleAnim, {
            toValue: 0.95,

            duration: 1800,

            useNativeDriver: true,
          }),
        ]),
      ),
    ]).start();

    checkUser();
  }, []);

  // CHECK AUTH

  const checkUser = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // SMALL DELAY FOR SMOOTH UX

      setTimeout(async () => {
        // NOT LOGGED IN

        if (!session?.user) {
          navigation.replace("Login");

          return;
        }

        // GET PROFILE

        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        // ROLE ROUTING

        if (profile?.role === "admin") {
          navigation.replace("AdminTabs");
        } else {
          navigation.replace("EmployeeTabs");
        }
      }, 2200);
    } catch (error) {
      console.log(error);

      navigation.replace("Login");
    }
  };

  return (
    <LinearGradient
      colors={["#071226", "#0a1628", "#132754", "#1e5fc4"]}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />

      <View style={styles.glowTop} />

      <View style={styles.glowBottom} />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: opacityAnim,

            transform: [
              {
                scale: scaleAnim,
              },
            ],
          },
        ]}
      >
        <View style={styles.logoWrapper}>
          <Image
            source={require("../../../assets/images/logo.jpeg")}
            style={styles.logo}
          />
        </View>

        <Text style={styles.title}>FLYURDREAM</Text>

        <Text style={styles.subtitle}>Attendance Portal</Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,

    justifyContent: "center",

    alignItems: "center",
  },

  glowTop: {
    position: "absolute",

    top: -120,

    right: -80,

    width: 260,

    height: 260,

    borderRadius: 260,

    backgroundColor: "rgba(59,130,246,0.18)",
  },

  glowBottom: {
    position: "absolute",

    bottom: -140,

    left: -100,

    width: 300,

    height: 300,

    borderRadius: 300,

    backgroundColor: "rgba(255,255,255,0.06)",
  },

  content: {
    alignItems: "center",
  },

  logoWrapper: {
    width: 140,

    height: 140,

    borderRadius: 70,

    justifyContent: "center",

    alignItems: "center",

    backgroundColor: "rgba(255,255,255,0.08)",

    borderWidth: 1.5,

    borderColor: "rgba(255,255,255,0.15)",
  },

  logo: {
    width: 112,

    height: 112,

    borderRadius: 56,
  },

  title: {
    marginTop: 28,

    color: COLORS.white,

    fontSize: 30,

    fontWeight: "900",

    letterSpacing: 2,
  },

  subtitle: {
    marginTop: 10,

    color: COLORS.text2,

    fontSize: 16,

    fontWeight: "500",

    letterSpacing: 0.8,
  },
});

// src/navigation/AppNavigator.tsx
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SplashScreen from "../screens/splash/SplashScreen";
import LoginScreen from "../screens/auth/LoginScreen";
import AdminTabs from "./AdminTabs";
import EmployeeTabs from "./EmployeeTabs";
import EmployeeDetailsScreen from "../screens/admin/employees/EmployeeDetailsScreen";
import EditEmployeeScreen from "../screens/admin/employees/EditEmployeeScreen";
import { RootStackParamList } from "../types/navigation";
import { useAuth } from "../context/AuthContext";
import { ActivityIndicator, View } from "react-native";
import { APP_COLORS } from "../theme/appTheme";

// ========== NEW IMPORTS FOR BROADCASTS ==========
import CreateBroadcastModal from "../components/modals/CreateBroadcastModal";
import BroadcastDetailsScreen from "../screens/shared/BroadcastDetailsScreen";
import EditBroadcastScreen from "../screens/admin/broadcasts/EditBroadcastScreen";
import NotificationsScreen from "../screens/shared/NotificationsScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#020617",
        }}
      >
        <ActivityIndicator size="large" color={APP_COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          // Not logged in
          <>
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
          </>
        ) : profile?.role === "admin" ? (
          // Admin stack
          <>
            <Stack.Screen name="AdminTabs" component={AdminTabs} />
            <Stack.Screen
              name="EmployeeDetails"
              component={EmployeeDetailsScreen}
            />
            <Stack.Screen
              name="EditEmployeeScreen"
              component={EditEmployeeScreen}
            />

            {/* NEW ADMIN BROADCAST SCREENS */}
            <Stack.Screen
              name="CreateBroadcast"
              component={CreateBroadcastModal}
            />
            <Stack.Screen
              name="BroadcastDetails"
              component={BroadcastDetailsScreen}
            />
            <Stack.Screen
              name="EditBroadcast"
              component={EditBroadcastScreen}
            />
            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
            />
          </>
        ) : (
          // Employee stack
          <>
            <Stack.Screen name="EmployeeTabs" component={EmployeeTabs} />
            {/* EMPLOYEE BROADCAST DETAILS */}
            <Stack.Screen
              name="BroadcastDetails"
              component={BroadcastDetailsScreen}
            />
            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

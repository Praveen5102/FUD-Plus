import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SplashScreen from "../screens/splash/SplashScreen";
import LoginScreen from "../screens/auth/LoginScreen";
import AdminTabs from "./AdminTabs";
import EmployeeTabs from "./EmployeeTabs";
import EmployeeDetailsScreen from "../screens/admin/employees/EmployeeDetailsScreen";
// Import added here to clear code 2304 error:
import EditEmployeeScreen from "../screens/admin/employees/EditEmployeeScreen";
import { RootStackParamList } from "../types/navigation";
import { useAuth } from "../context/AuthContext";
import { ActivityIndicator, View } from "react-native";
import { APP_COLORS } from "../theme/appTheme";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { user, profile, loading } = useAuth();

  // LOADING
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
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {/* NOT LOGGED IN */}
        {!user ? (
          <>
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
          </>
        ) : profile?.role === "admin" ? (
          /* ADMIN — tabs + any admin stack screens */
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
          </>
        ) : (
          /* EMPLOYEE */
          <Stack.Screen name="EmployeeTabs" component={EmployeeTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

import React, { useRef, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ActivityIndicator, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import HomeScreen from "./src/screens/HomeScreen";
import CalendarScreen from "./src/screens/CalendarScreen";
import AccountSettingsScreen from "./src/screens/AccountSettingsScreen";
import CreateHabitScreen from "./src/screens/CreateHabitScreen";
import EditHabitScreen from "./src/screens/EditHabitScreen";
import FloatingActionButton from "./src/components/FloatingActionButton";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Bottom Tab Navigator for main app screens
function MainTabs() {
  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        initialRouteName="HomeTab"
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === "CalendarTab") {
              iconName = focused ? "calendar" : "calendar-outline";
            } else if (route.name === "HomeTab") {
              iconName = focused ? "home" : "home-outline";
            } else if (route.name === "SettingsTab") {
              iconName = focused ? "settings" : "settings-outline";
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: "#007AFF",
          tabBarInactiveTintColor: "#666",
          tabBarStyle: {
            paddingBottom: 5,
            paddingTop: 5,
            height: 60,
          },
        })}
      >
        <Tab.Screen
          name="CalendarTab"
          component={CalendarScreen}
          options={{ title: "Progress" }}
        />
        <Tab.Screen
          name="HomeTab"
          component={HomeScreen}
          options={{ title: "Home" }}
        />
        <Tab.Screen
          name="SettingsTab"
          component={AccountSettingsScreen}
          options={{ title: "Settings" }}
        />
      </Tab.Navigator>
      <FloatingActionButton />
    </View>
  );
}

function RootNavigator() {
  const authContext = useAuth();
  const navigationRef = useRef(null);

  // Ensure we have valid context values, defaulting to false if undefined
  const isLoading =
    authContext && typeof authContext.loading === "boolean"
      ? authContext.loading
      : true;
  const isAuth =
    authContext && typeof authContext.isAuthenticated === "boolean"
      ? authContext.isAuthenticated
      : false;

  // Handle navigation when auth state changes
  useEffect(() => {
    if (!isLoading && navigationRef.current) {
      if (isAuth === true) {
        navigationRef.current.reset({
          index: 0,
          routes: [{ name: "MainTabs" }],
        });
      } else {
        navigationRef.current.reset({
          index: 0,
          routes: [{ name: "Login" }],
        });
      }
    }
  }, [isAuth, isLoading]);

  if (isLoading === true) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // Use a single navigator with all screens, but control initial route
  const initialRouteName = isAuth === true ? "MainTabs" : "Login";

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName={initialRouteName}
        screenOptions={{
          headerShown: false,
        }}
      >
        {/* Auth screens */}
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />

        {/* Main app with bottom tabs */}
        <Stack.Screen name="MainTabs" component={MainTabs} />

        {/* Modal/overlay screens that push over tabs */}
        <Stack.Screen
          name="CreateHabit"
          component={CreateHabitScreen}
          options={{ presentation: "modal" }}
        />
        <Stack.Screen
          name="EditHabit"
          component={EditHabitScreen}
          options={{ presentation: "card" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "../context/AuthContext";
import { apiService } from "../api/api";

export default function AccountSettingsScreen({ navigation }) {
  const { user, userProfile, refreshUserProfile, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [userDataId, setUserDataId] = useState(null);
  const [originalUserData, setOriginalUserData] = useState({
    username: "",
    phone: "",
    preferred_contact_method: "email",
  });
  const [formData, setFormData] = useState({
    username: "",
    phone: "",
    preferred_contact_method: "email",
  });

  useEffect(() => {
    if (userProfile) {
      // Use userProfile from context if available
      initializeFormData(userProfile);
    } else if (user?.id) {
      // Fallback: fetch if not in context
      fetchUserData();
    }
  }, [userProfile, user?.id]);

  const initializeFormData = (userData) => {
    // Store original values to use as placeholders
    const originalData = {
      username: userData.username || "",
      phone: userData.phone?.toString() || "",
      preferred_contact_method: userData.preferred_contact_method || "email",
    };
    setOriginalUserData(originalData);

    // Initialize form data as empty - placeholders will show original values
    setFormData({
      username: "",
      phone: "",
      preferred_contact_method: originalData.preferred_contact_method,
    });

    // Store the UserData ID for updates
    setUserDataId(userData.id);

    setFetching(false);
  };

  const fetchUserData = async () => {
    try {
      setFetching(true);
      // Get UserData record using auth_user_id
      if (!user?.id) {
        Alert.alert("Error", "User not authenticated");
        navigation.goBack();
        return;
      }

      // Token is automatically sent via Authorization header
      const userData = await apiService.getCurrentUser();

      if (!userData) {
        Alert.alert(
          "Error",
          "User profile not found. This may happen if your account was created before the profile system was added. Please contact support."
        );
        navigation.goBack();
        return;
      }

      initializeFormData(userData);
      console.log("Loaded user data:", userData);
    } catch (error) {
      console.error("Error fetching user data:", error);
      console.error("Error details:", {
        message: error.message,
        response: error.response?.data,
        authUserId: user?.id,
      });

      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to load user data";

      Alert.alert(
        "Error",
        errorMessage +
          "\n\nIf you just created your account, try logging out and back in."
      );
    } finally {
      setFetching(false);
    }
  };

  const handleUpdate = async () => {
    // Use form values if provided, otherwise fall back to original values
    const usernameToSave =
      formData.username.trim() || originalUserData.username;
    const phoneToSave = formData.phone.trim() || originalUserData.phone;

    if (!usernameToSave || !phoneToSave) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);

      if (!userDataId) {
        Alert.alert("Error", "User data not loaded");
        return;
      }

      const updatedUser = await apiService.updateUser(userDataId, {
        username: usernameToSave,
        phone: parseInt(phoneToSave, 10),
        preferred_contact_method: formData.preferred_contact_method,
      });

      // Refresh user profile in context so all screens see the update
      await refreshUserProfile();

      Alert.alert("Success", "Account updated successfully", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error("Error updating user:", error);
      Alert.alert(
        "Error",
        error.response?.data?.error ||
          error.message ||
          "Failed to update account"
      );
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <StatusBar style="auto" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Account Settings</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.label}>Username *</Text>
            <TextInput
              style={styles.input}
              placeholder={originalUserData.username || "Username"}
              placeholderTextColor="#bbb"
              value={formData.username}
              onChangeText={(text) =>
                setFormData({ ...formData, username: text })
              }
              autoCapitalize="none"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Phone Number *</Text>
            <TextInput
              style={styles.input}
              placeholder={originalUserData.phone || "Phone Number"}
              placeholderTextColor="#bbb"
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Preferred Contact Method</Text>
            <View style={styles.pickerWrapper}>
              <TouchableOpacity
                style={[
                  styles.pickerOption,
                  formData.preferred_contact_method === "email" &&
                    styles.pickerOptionSelected,
                ]}
                onPress={() =>
                  setFormData({
                    ...formData,
                    preferred_contact_method: "email",
                  })
                }
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    formData.preferred_contact_method === "email" &&
                      styles.pickerOptionTextSelected,
                  ]}
                >
                  Email
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.pickerOption,
                  formData.preferred_contact_method === "phone" &&
                    styles.pickerOptionSelected,
                ]}
                onPress={() =>
                  setFormData({
                    ...formData,
                    preferred_contact_method: "phone",
                  })
                }
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    formData.preferred_contact_method === "phone" &&
                      styles.pickerOptionTextSelected,
                  ]}
                >
                  Phone
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleUpdate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Save Changes</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  scrollContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backButton: {
    marginRight: 15,
  },
  backButtonText: {
    fontSize: 16,
    color: "#007AFF",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 25,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  pickerWrapper: {
    flexDirection: "row",
    gap: 10,
  },
  pickerOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 15,
    alignItems: "center",
  },
  pickerOptionSelected: {
    borderColor: "#007AFF",
    backgroundColor: "#E3F2FD",
  },
  pickerOptionText: {
    fontSize: 16,
    color: "#666",
  },
  pickerOptionTextSelected: {
    color: "#007AFF",
    fontWeight: "600",
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  logoutButton: {
    backgroundColor: "#e0e0e0",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 30,
  },
  logoutButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
});

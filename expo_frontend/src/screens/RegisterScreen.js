import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useAuth } from "../context/AuthContext";

export default function RegisterScreen({ navigation }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredContactMethod, setPreferredContactMethod] = useState("email");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleRegister = async () => {
    if (!username || !email || !password || !phone) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    setLoading(true);
    const result = await register(
      username,
      password,
      email,
      phone,
      preferredContactMethod
    );
    setLoading(false);

    if (!result.success) {
      Alert.alert(
        "Registration Failed",
        result.message || "Could not create account"
      );
    }
    // Navigation will happen automatically via AuthContext
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join HappyHabits today</Text>

        <TextInput
          style={styles.input}
          placeholder="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Phone Number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>Preferred Contact Method:</Text>
          <View style={styles.pickerWrapper}>
            <TouchableOpacity
              style={[
                styles.pickerOption,
                preferredContactMethod === "email" &&
                  styles.pickerOptionSelected,
              ]}
              onPress={() => setPreferredContactMethod("email")}
            >
              <Text
                style={[
                  styles.pickerOptionText,
                  preferredContactMethod === "email" &&
                    styles.pickerOptionTextSelected,
                ]}
              >
                Email
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.pickerOption,
                preferredContactMethod === "phone" &&
                  styles.pickerOptionSelected,
              ]}
              onPress={() => setPreferredContactMethod("phone")}
            >
              <Text
                style={[
                  styles.pickerOptionText,
                  preferredContactMethod === "phone" &&
                    styles.pickerOptionTextSelected,
                ]}
              >
                Phone
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, loading ? styles.buttonDisabled : null]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign Up</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.navigate("Login")}
        >
          <Text style={styles.linkText}>
            Already have an account?{" "}
            <Text style={styles.linkTextBold}>Login</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    textAlign: "center",
    color: "#666",
    marginBottom: 40,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  pickerContainer: {
    marginBottom: 20,
  },
  pickerLabel: {
    fontSize: 14,
    marginBottom: 10,
    color: "#333",
  },
  pickerWrapper: {
    flexDirection: "row",
  },
  pickerOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 15,
    alignItems: "center",
    marginRight: 5,
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
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  linkButton: {
    marginTop: 20,
    alignItems: "center",
  },
  linkText: {
    color: "#666",
    fontSize: 14,
  },
  linkTextBold: {
    fontWeight: "600",
    color: "#007AFF",
  },
});

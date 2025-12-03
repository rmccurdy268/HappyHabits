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
import CategorySelector from "../components/CategorySelector";

// Helper function to format date as YYYY-MM-DD in local timezone
const formatDateLocal = (date) => {
  if (!date) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function EditHabitScreen({ navigation, route }) {
  const { userProfile } = useAuth();
  const { habit } = route.params;
  const [loading, setLoading] = useState(false);
  const [todayLogs, setTodayLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [undoingLogId, setUndoingLogId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    category_id: null,
    times_per_day: "1",
  });

  useEffect(() => {
    if (habit) {
      setForm({
        name: habit.name || "",
        description: habit.description || "",
        category_id: habit.category_id || null,
        times_per_day: habit.times_per_day?.toString() || "1",
      });
      fetchTodayLogs();
    }
  }, [habit]);

  const fetchTodayLogs = async () => {
    if (!habit?.id) return;

    try {
      setLoadingLogs(true);
      const today = formatDateLocal(new Date()); // YYYY-MM-DD
      const logs = await apiService.getTodayHabitLogs(habit.id, today);
      setTodayLogs(logs || []);
    } catch (err) {
      console.error("Error fetching today's logs:", err);
      setTodayLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleUndoLog = async (logId) => {
    try {
      setUndoingLogId(logId);
      await apiService.deleteHabitLog(logId);
      // Refresh today's logs
      await fetchTodayLogs();
      Alert.alert("Success", "Log entry removed");
    } catch (err) {
      console.error("Error undoing log:", err);
      Alert.alert(
        "Error",
        err.response?.data?.error || err.message || "Failed to remove log entry"
      );
    } finally {
      setUndoingLogId(null);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      Alert.alert("Error", "Name is required");
      return;
    }

    if (!form.description.trim()) {
      Alert.alert("Error", "Description is required");
      return;
    }

    if (!form.category_id) {
      Alert.alert("Error", "Category is required");
      return;
    }

    if (!habit?.id) {
      Alert.alert("Error", "Habit ID not found");
      return;
    }

    try {
      setLoading(true);
      const habitData = {
        name: form.name.trim(),
        description: form.description.trim() || "",
        category_id: form.category_id,
        times_per_day: parseInt(form.times_per_day, 10) || 1,
      };

      await apiService.updateHabit(habit.id, habitData);
      Alert.alert("Success", "Habit updated successfully", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error("Error updating habit:", error);
      Alert.alert(
        "Error",
        error.response?.data?.error || error.message || "Failed to update habit"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Edit Habit</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <Text style={styles.sectionTitle}>Edit Habit Details</Text>

            <View style={styles.section}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Habit name"
                value={form.name}
                onChangeText={(text) => setForm({ ...form, name: text })}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Description (required)"
                value={form.description}
                onChangeText={(text) => setForm({ ...form, description: text })}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Category *</Text>
              <CategorySelector
                selectedCategoryId={form.category_id}
                onSelect={(categoryId) =>
                  setForm({ ...form, category_id: categoryId })
                }
                userId={userProfile?.id}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Times per Day</Text>
              <TextInput
                style={styles.input}
                placeholder="1"
                value={form.times_per_day}
                onChangeText={(text) =>
                  setForm({ ...form, times_per_day: text })
                }
                keyboardType="numeric"
              />
            </View>

            {/* Today's Logs Section */}
            <View style={styles.section}>
              <Text style={styles.label}>Today's Completions</Text>
              {loadingLogs ? (
                <ActivityIndicator
                  size="small"
                  color="#007AFF"
                  style={styles.logsLoading}
                />
              ) : todayLogs.length === 0 ? (
                <Text style={styles.noLogsText}>
                  No completions logged today
                </Text>
              ) : (
                <View style={styles.logsContainer}>
                  {todayLogs.map((log) => (
                    <View key={log.id} style={styles.logItem}>
                      <View style={styles.logInfo}>
                        <Text style={styles.logTime}>
                          {formatTime(log.time_completed)}
                        </Text>
                        {log.notes && (
                          <Text style={styles.logNotes}>{log.notes}</Text>
                        )}
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.undoButton,
                          undoingLogId === log.id && styles.buttonDisabled,
                        ]}
                        onPress={() => handleUndoLog(log.id)}
                        disabled={undoingLogId === log.id}
                      >
                        {undoingLogId === log.id ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.undoButtonText}>Undo</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.submitButton,
                  loading && styles.buttonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    flexGrow: 1,
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 20,
    color: "#333",
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
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  cancelButtonText: {
    color: "#333",
    fontSize: 16,
    fontWeight: "600",
  },
  submitButton: {
    backgroundColor: "#007AFF",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  logsLoading: {
    marginVertical: 10,
  },
  noLogsText: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
    paddingVertical: 10,
  },
  logsContainer: {
    gap: 10,
    marginTop: 10,
  },
  logItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  logInfo: {
    flex: 1,
  },
  logTime: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  logNotes: {
    fontSize: 12,
    color: "#666",
  },
  undoButton: {
    backgroundColor: "#ff9500",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 10,
  },
  undoButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
});

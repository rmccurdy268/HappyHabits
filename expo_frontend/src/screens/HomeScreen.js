import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { apiService } from "../api/api";

// Helper function to format date as YYYY-MM-DD in local timezone
const formatDateLocal = (date) => {
  if (!date) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function HomeScreen({ navigation }) {
  const { user, userProfile } = useAuth();
  const [habits, setHabits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [todayLogs, setTodayLogs] = useState({}); // { habitId: [logs] }
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [archivingId, setArchivingId] = useState(null);
  const [loggingId, setLoggingId] = useState(null);

  // Fetch data when userProfile becomes available
  useEffect(() => {
    if (userProfile?.id) {
      fetchData();
    } else if (userProfile === null) {
      // If userProfile is explicitly null (not just undefined), clear loading
      setLoading(false);
    }
  }, [userProfile?.id]);

  useFocusEffect(
    useCallback(() => {
      // Only fetch data if userProfile is available
      // If not available, the useEffect above will handle it when userProfile loads
      if (userProfile?.id) {
        fetchData();
      }
    }, [userProfile?.id])
  );

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      await Promise.all([fetchHabits(), fetchCategories()]);
      // Fetch today's logs after habits are loaded
      await fetchAllTodayLogs();
    } catch (err) {
      setError(err.message || "Failed to fetch data");
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHabits = async () => {
    if (!userProfile?.id) {
      // Don't set error if userProfile is just not loaded yet
      // This will be handled by the useEffect waiting for userProfile
      return;
    }
    try {
      const data = await apiService.getUserHabits(userProfile.id);
      setHabits(data);
    } catch (err) {
      throw new Error(
        err.response?.data?.error || err.message || "Failed to fetch habits"
      );
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await apiService.getCategories();
      setCategories(data);
    } catch (err) {
      console.error("Error fetching categories:", err);
      // Don't throw - we can still show habits without category names
    }
  };

  const fetchAllTodayLogs = async () => {
    if (!habits || habits.length === 0) return;

    const today = formatDateLocal(new Date()); // YYYY-MM-DD
    const logsMap = {};

    try {
      // Fetch logs for all habits in parallel
      const logPromises = habits.map(async (habit) => {
        try {
          const logs = await apiService.getTodayHabitLogs(habit.id, today);
          logsMap[habit.id] = logs || [];
        } catch (err) {
          console.error(`Error fetching logs for habit ${habit.id}:`, err);
          logsMap[habit.id] = [];
        }
      });

      await Promise.all(logPromises);
      setTodayLogs(logsMap);
    } catch (err) {
      console.error("Error fetching today's logs:", err);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchHabits(), fetchCategories()]);
      // Fetch today's logs will be triggered by the useEffect when habits update
    } catch (err) {
      setError(err.message || "Failed to refresh data");
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Update today's logs when habits change
  useEffect(() => {
    if (habits.length > 0) {
      fetchAllTodayLogs();
    }
  }, [habits]);

  const getCategoryName = (categoryId) => {
    if (!categoryId) return "Uncategorized";
    const category = categories.find((c) => c.id === categoryId);
    return category ? category.name : "Unknown";
  };

  const getTodayLogsForHabit = (habitId) => {
    return todayLogs[habitId] || [];
  };

  const getCompletionCount = (habitId) => {
    const logs = getTodayLogsForHabit(habitId);
    return logs.length;
  };

  const isFullyCompleted = (habit) => {
    const completionCount = getCompletionCount(habit.id);
    return completionCount >= habit.times_per_day;
  };

  const handleEdit = (habit) => {
    navigation.navigate("EditHabit", { habit });
  };

  const handleArchive = (habit) => {
    console.log("handleArchive called for habit:", habit);

    // Use window.confirm on web, Alert.alert on mobile
    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        `Are you sure you want to archive "${habit.name}"? This will move it to inactive status.`
      );
      if (confirmed) {
        console.log(
          "Archive confirmed (web), calling archiveHabit with ID:",
          habit.id
        );
        archiveHabit(habit.id);
      } else {
        console.log("Archive cancelled (web)");
      }
    } else {
      Alert.alert(
        "Archive Habit",
        `Are you sure you want to archive "${habit.name}"? This will move it to inactive status.`,
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => console.log("Archive cancelled"),
          },
          {
            text: "Archive",
            style: "destructive",
            onPress: () => {
              console.log(
                "Archive confirmed, calling archiveHabit with ID:",
                habit.id
              );
              archiveHabit(habit.id);
            },
          },
        ],
        { cancelable: true }
      );
    }
  };

  const archiveHabit = async (habitId) => {
    try {
      setArchivingId(habitId);
      console.log("Archiving habit with ID:", habitId);
      const result = await apiService.archiveHabit(habitId);
      console.log("Archive result:", result);
      // Refresh the list
      await fetchHabits();
      Alert.alert("Success", "Habit archived successfully");
    } catch (err) {
      console.error("Error archiving habit:", err);
      console.error("Error response:", err.response);
      Alert.alert(
        "Error",
        err.response?.data?.error || err.message || "Failed to archive habit"
      );
    } finally {
      setArchivingId(null);
    }
  };

  const handleLog = async (habit) => {
    try {
      setLoggingId(habit.id);
      const today = formatDateLocal(new Date()); // YYYY-MM-DD
      const now = new Date().toISOString();

      await apiService.createHabitLog(habit.id, {
        date: today,
        time_completed: now,
      });

      // Refresh today's logs for this habit
      const logs = await apiService.getTodayHabitLogs(habit.id, today);
      setTodayLogs((prev) => ({
        ...prev,
        [habit.id]: logs || [],
      }));
    } catch (err) {
      console.error("Error logging habit:", err);
      Alert.alert(
        "Error",
        err.response?.data?.error || err.message || "Failed to log habit"
      );
    } finally {
      setLoggingId(null);
    }
  };

  const renderCompletionStatus = (habit) => {
    const completionCount = getCompletionCount(habit.id);
    const isCompleted = isFullyCompleted(habit);

    if (habit.times_per_day === 1) {
      // Single completion habit
      if (isCompleted) {
        return (
          <View style={styles.completionStatus}>
            <Text style={styles.completionCheckmark}>✓</Text>
            <Text style={styles.completionText}>Completed</Text>
          </View>
        );
      }
      return null;
    } else {
      // Multiple completions habit
      return (
        <View style={styles.completionStatus}>
          <Text
            style={[
              styles.completionCounter,
              isCompleted && styles.completionCounterCompleted,
            ]}
          >
            {completionCount}/{habit.times_per_day}
          </Text>
        </View>
      );
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <StatusBar style="auto" />
        <View style={styles.header}>
          <Text style={styles.title}>My Habits</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.header}>
        <Text style={styles.title}>My Habits</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {user && (
          <Text style={styles.welcomeText}>
            Welcome, {userProfile?.username || user.email || "User"}!
          </Text>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Error: {error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {!error && habits.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No habits yet</Text>
            <Text style={styles.emptySubtext}>
              Create your first habit to get started!
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => navigation.navigate("CreateHabit")}
            >
              <Text style={styles.createButtonText}>Create Habit</Text>
            </TouchableOpacity>
          </View>
        )}

        {!error && habits.length > 0 && (
          <View style={styles.habitsList}>
            {habits
              .slice()
              .sort((a, b) => {
                // First sort by completion status (non-completed first)
                const aCompleted = isFullyCompleted(a);
                const bCompleted = isFullyCompleted(b);

                if (aCompleted !== bCompleted) {
                  return aCompleted ? 1 : -1; // Non-completed comes first
                }

                // Then sort alphabetically by name
                const aName = (a.name || "").toLowerCase();
                const bName = (b.name || "").toLowerCase();
                if (aName < bName) return -1;
                if (aName > bName) return 1;
                return 0;
              })
              .map((habit) => {
                const isCompleted = isFullyCompleted(habit);
                const completionCount = getCompletionCount(habit.id);
                const hasLogs = completionCount > 0;

                return (
                  <View
                    key={habit.id}
                    style={[
                      styles.habitItem,
                      isCompleted && styles.habitItemCompleted,
                    ]}
                  >
                    <View style={styles.habitInfo}>
                      <View style={styles.habitHeader}>
                        <Text
                          style={[
                            styles.habitName,
                            isCompleted && styles.habitNameCompleted,
                          ]}
                        >
                          {habit.name}
                        </Text>
                        {renderCompletionStatus(habit)}
                      </View>
                      <View style={styles.habitDetails}>
                        {habit.description && (
                          <Text style={styles.habitDescription}>
                            {habit.description}
                          </Text>
                        )}
                        <Text style={styles.habitDetail}>
                          Category: {getCategoryName(habit.category_id)}
                        </Text>
                        {habit.times_per_day > 1 && (
                          <Text style={styles.habitDetail}>
                            Goal: {habit.times_per_day} times per day
                          </Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.habitActions}>
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          styles.logButton,
                          (loggingId === habit.id ||
                            archivingId === habit.id ||
                            isCompleted) &&
                            styles.buttonDisabled,
                        ]}
                        onPress={() => handleLog(habit)}
                        disabled={
                          loggingId === habit.id ||
                          archivingId === habit.id ||
                          isCompleted
                        }
                        activeOpacity={0.7}
                      >
                        {loggingId === habit.id ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.logButtonText}>Log</Text>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.editButton]}
                        onPress={() => handleEdit(habit)}
                      >
                        <Text style={styles.editButtonText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          styles.archiveButton,
                          archivingId === habit.id && styles.buttonDisabled,
                        ]}
                        onPress={() => {
                          console.log(
                            "Remove button pressed for habit:",
                            habit.id,
                            habit.name
                          );
                          handleArchive(habit);
                        }}
                        disabled={archivingId === habit.id}
                        activeOpacity={0.7}
                      >
                        {archivingId === habit.id ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.archiveButtonText}>Remove</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    backgroundColor: "#ffebee",
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
  },
  errorText: {
    color: "#c62828",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: "#c62828",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 16,
    color: "#666",
    marginBottom: 30,
    textAlign: "center",
  },
  createButton: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 8,
    paddingHorizontal: 30,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  habitsList: {
    gap: 15,
  },
  habitItem: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  habitItemCompleted: {
    backgroundColor: "#e8f5e9",
    borderColor: "#4caf50",
    borderWidth: 2,
  },
  habitInfo: {
    marginBottom: 12,
  },
  habitHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  habitName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  habitNameCompleted: {
    color: "#2e7d32",
  },
  completionStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  completionCheckmark: {
    fontSize: 20,
    color: "#4caf50",
    fontWeight: "bold",
  },
  completionText: {
    fontSize: 14,
    color: "#4caf50",
    fontWeight: "600",
  },
  completionCounter: {
    fontSize: 16,
    color: "#666",
    fontWeight: "600",
  },
  completionCounterCompleted: {
    color: "#4caf50",
    fontWeight: "bold",
  },
  habitDetails: {
    gap: 4,
  },
  habitDescription: {
    fontSize: 14,
    color: "#333",
    fontStyle: "italic",
    marginBottom: 4,
  },
  habitDetail: {
    fontSize: 14,
    color: "#666",
  },
  habitActions: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  editButton: {
    backgroundColor: "#007AFF",
  },
  editButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  logButton: {
    backgroundColor: "#34C759",
  },
  logButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  archiveButton: {
    backgroundColor: "#ff4444",
  },
  archiveButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  welcomeText: {
    fontSize: 18,
    marginBottom: 20,
    color: "#333",
    fontWeight: "500",
  },
});

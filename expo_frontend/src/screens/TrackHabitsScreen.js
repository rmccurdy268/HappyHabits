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

export default function TrackHabitsScreen({ navigation }) {
  const { userProfile } = useAuth();
  const [habits, setHabits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [todayLogs, setTodayLogs] = useState({}); // { habitId: [logs] }
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [loggingHabitId, setLoggingHabitId] = useState(null);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const getTodayDate = () => {
    const today = new Date();
    return formatDateLocal(today); // YYYY-MM-DD format
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const habitsData = await fetchHabits();
      await fetchCategories();
      // After fetching habits, fetch today's logs for each habit
      if (habitsData && habitsData.length > 0) {
        await fetchAllTodayLogs(habitsData);
      }
    } catch (err) {
      setError(err.message || "Failed to fetch data");
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHabits = async () => {
    if (!userProfile?.id) {
      setError("User not found");
      return [];
    }
    try {
      const data = await apiService.getUserHabits(userProfile.id);
      setHabits(data);
      return data;
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

  const fetchAllTodayLogs = async (habitsToFetch = null) => {
    const habitsList = habitsToFetch || habits;
    if (!habitsList || habitsList.length === 0) return;

    const todayDate = getTodayDate();
    const logsMap = {};

    try {
      // Fetch today's logs for all habits in parallel
      const logPromises = habitsList.map(async (habit) => {
        try {
          const logs = await apiService.getTodayHabitLogs(habit.id, todayDate);
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
      const habitsData = await fetchHabits();
      await fetchCategories();
      if (habitsData && habitsData.length > 0) {
        await fetchAllTodayLogs(habitsData);
      }
    } catch (err) {
      setError(err.message || "Failed to refresh data");
    } finally {
      setRefreshing(false);
    }
  }, []);

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
    // If a log exists, it means the habit was completed
    return logs.length;
  };

  const isHabitCompleted = (habit) => {
    const completionCount = getCompletionCount(habit.id);
    return completionCount >= habit.times_per_day;
  };

  const handleLogHabit = async (habit) => {
    if (!habit.id) {
      Alert.alert("Error", "Habit ID not found");
      return;
    }

    try {
      setLoggingHabitId(habit.id);
      const todayDate = getTodayDate();
      const now = new Date().toISOString();

      await apiService.createHabitLog(habit.id, {
        date: todayDate,
        time_completed: now,
      });

      // Refresh today's logs for this habit
      const logs = await apiService.getTodayHabitLogs(habit.id, todayDate);
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
      setLoggingHabitId(null);
    }
  };

  const handleUndoLog = async (habit) => {
    const logs = getTodayLogsForHabit(habit.id);
    if (logs.length === 0) return;

    // Get the most recent log
    const mostRecentLog = logs[0]; // Logs are ordered by time_completed descending

    const confirmMessage =
      Platform.OS === "web"
        ? `Undo completion for "${habit.name}"?`
        : `Undo completion for "${habit.name}"?`;

    const handleUndo = async () => {
      try {
        setLoggingHabitId(habit.id);
        await apiService.deleteHabitLog(mostRecentLog.id);

        // Refresh today's logs for this habit
        const todayDate = getTodayDate();
        const updatedLogs = await apiService.getTodayHabitLogs(
          habit.id,
          todayDate
        );
        setTodayLogs((prev) => ({
          ...prev,
          [habit.id]: updatedLogs || [],
        }));
      } catch (err) {
        console.error("Error undoing log:", err);
        Alert.alert(
          "Error",
          err.response?.data?.error || err.message || "Failed to undo log"
        );
      } finally {
        setLoggingHabitId(null);
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm(confirmMessage)) {
        handleUndo();
      }
    } else {
      Alert.alert("Undo Completion", confirmMessage, [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Undo",
          style: "destructive",
          onPress: handleUndo,
        },
      ]);
    }
  };

  const renderHabitItem = (habit) => {
    const completionCount = getCompletionCount(habit.id);
    const isCompleted = isHabitCompleted(habit);
    const logs = getTodayLogsForHabit(habit.id);
    const isLogging = loggingHabitId === habit.id;

    return (
      <View
        key={habit.id}
        style={[styles.habitItem, isCompleted && styles.habitItemCompleted]}
      >
        <View style={styles.habitInfo}>
          <View style={styles.habitHeader}>
            <Text style={styles.habitName}>{habit.name}</Text>
            {isCompleted && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <View style={styles.habitDetails}>
            <Text style={styles.habitDetail}>
              Category: {getCategoryName(habit.category_id)}
            </Text>
            {habit.times_per_day > 1 ? (
              <View style={styles.counterContainer}>
                <Text style={styles.counterText}>
                  {completionCount} / {habit.times_per_day} completed today
                </Text>
                {completionCount > 0 &&
                  completionCount < habit.times_per_day && (
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${
                              (completionCount / habit.times_per_day) * 100
                            }%`,
                          },
                        ]}
                      />
                    </View>
                  )}
              </View>
            ) : (
              <Text style={styles.habitDetail}>
                {isCompleted ? "Completed today" : "Not completed today"}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.habitActions}>
          {isCompleted ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.undoButton]}
              onPress={() => handleUndoLog(habit)}
              disabled={isLogging}
            >
              {isLogging ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.undoButtonText}>Undo</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, styles.logButton]}
              onPress={() => handleLogHabit(habit)}
              disabled={isLogging}
            >
              {isLogging ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.logButtonText}>
                  {habit.times_per_day > 1 ? "Log +1" : "Log"}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
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
          <Text style={styles.title}>Track Habits</Text>
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
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Track Habits</Text>
        <Text style={styles.subtitle}>
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
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
            <Text style={styles.emptyText}>No habits to track</Text>
            <Text style={styles.emptySubtext}>
              Create a habit to start tracking!
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
            {habits.map((habit) => renderHabitItem(habit))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backButton: {
    marginBottom: 10,
  },
  backButtonText: {
    fontSize: 16,
    color: "#007AFF",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 5,
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
  checkmark: {
    fontSize: 24,
    color: "#4caf50",
    fontWeight: "bold",
  },
  habitDetails: {
    gap: 4,
  },
  habitDetail: {
    fontSize: 14,
    color: "#666",
  },
  counterContainer: {
    marginTop: 4,
  },
  counterText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 6,
  },
  progressBar: {
    height: 6,
    backgroundColor: "#e0e0e0",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4caf50",
    borderRadius: 3,
  },
  habitActions: {
    flexDirection: "row",
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  logButton: {
    backgroundColor: "#007AFF",
  },
  logButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  undoButton: {
    backgroundColor: "#ff9800",
  },
  undoButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});

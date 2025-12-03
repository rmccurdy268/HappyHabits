import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { apiService } from "../api/api";
import HabitLegend from "../components/HabitLegend";
import CalendarView from "../components/CalendarView";

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

// Helper function to format date as YYYY-MM-DD in local timezone
const formatDateLocal = (date) => {
  if (!date) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function CalendarScreen({ navigation }) {
  const { user, userProfile } = useAuth();
  const [habits, setHabits] = useState([]);
  const [logs, setLogs] = useState([]);
  const [calendarViewMode, setCalendarViewMode] = useState("week"); // 'week' or 'month'
  const [loadingCalendar, setLoadingCalendar] = useState(true);
  const [hasFullMonthData, setHasFullMonthData] = useState(false);

  // Cache for calendar data
  const cacheRef = useRef({
    habits: null,
    habitsTimestamp: null,
    logs: {}, // key: "startDate_endDate", value: { logs: [], timestamp: number }
  });
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Only fetch calendar data if userProfile is available
    if (userProfile?.id) {
      fetchCalendarData(false); // Don't force refresh on initial load
    } else if (userProfile === null) {
      // If userProfile is explicitly null (not just undefined), clear loading
      // This handles the case where auth context has finished loading but no profile exists
      setLoadingCalendar(false);
    }
  }, [userProfile]);

  useFocusEffect(
    useCallback(() => {
      // On initial mount, don't force refresh (handled by useEffect)
      if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
      }

      // When returning to the screen, refresh cache to show newly created habits
      // and any log changes (created, updated, deleted)
      if (userProfile?.id) {
        // Force refresh both habits and logs to ensure cache is up to date
        fetchCalendarData(true); // Force refresh to get newly created habits and updated logs
      }
    }, [userProfile])
  );

  const fetchCalendarData = async (forceRefresh = false) => {
    if (!userProfile?.id) {
      console.log("No userProfile.id, skipping calendar fetch");
      setLoadingCalendar(false); // Clear loading state if no userProfile
      return;
    }

    try {
      // Always calculate full month range (5 weeks) regardless of view mode
      const today = new Date();
      const currentWeekStart = new Date(today);
      currentWeekStart.setDate(today.getDate() - today.getDay()); // Sunday of current week

      // Start date: 4 weeks before current week start (Sunday)
      const startDateObj = new Date(currentWeekStart);
      startDateObj.setDate(currentWeekStart.getDate() - 4 * 7);
      const startDate = formatDateLocal(startDateObj);

      // End date: Saturday of current week
      const endDateObj = new Date(currentWeekStart);
      endDateObj.setDate(currentWeekStart.getDate() + 6); // Saturday
      const endDate = formatDateLocal(endDateObj);

      const cacheKey = `month_${startDate}_${endDate}`;
      const now = Date.now();

      // Check cache for logs (can be force refreshed)
      const cachedLogs = cacheRef.current.logs[cacheKey];
      const logsCacheValid =
        cachedLogs && !forceRefresh && now - cachedLogs.timestamp < CACHE_TTL;

      // Check cache for habits (can be force refreshed)
      const habitsCacheValid =
        cacheRef.current.habits !== null &&
        !forceRefresh &&
        cacheRef.current.habitsTimestamp &&
        now - cacheRef.current.habitsTimestamp < CACHE_TTL;

      // Use cached habits if available
      if (habitsCacheValid) {
        console.log("Using cached habits");
        setHabits(cacheRef.current.habits);
      } else {
        // Only show loading on initial load or when fetching habits
        if (habits.length === 0) {
          setLoadingCalendar(true);
        }
        console.log("Fetching habits from API");
        const habitsData = await apiService.getUserHabits(userProfile.id);
        console.log("Fetched habits:", habitsData?.length || 0);
        setHabits(habitsData || []);
        // Update cache
        cacheRef.current.habits = habitsData || [];
        cacheRef.current.habitsTimestamp = now;
      }

      // Use cached logs if available
      if (logsCacheValid) {
        console.log(
          "Using cached month logs for range",
          startDate,
          "to",
          endDate
        );
        // Always set full month logs, view will filter as needed
        setLogs(cachedLogs.logs);
        setHasFullMonthData(true);
        setLoadingCalendar(false);
        return; // Early return - no need to fetch logs
      }

      // Fetch logs for full month range
      if (habits.length === 0 && !habitsCacheValid) {
        setLoadingCalendar(true);
      }
      console.log(
        "Fetching month logs from API for range",
        startDate,
        "to",
        endDate
      );
      const logsData = await apiService.getUserLogsForDateRange(
        userProfile.id,
        startDate,
        endDate
      );
      console.log(
        "Fetched month logs:",
        logsData?.length || 0,
        "for range",
        startDate,
        "to",
        endDate
      );

      // Always store full month logs
      setLogs(logsData || []);

      // Update cache with month data
      cacheRef.current.logs[cacheKey] = {
        logs: logsData || [],
        timestamp: now,
      };

      // Mark that we have full month data
      setHasFullMonthData(true);
    } catch (err) {
      console.error("Error fetching calendar data:", err);
      console.error("Error details:", err.response?.data || err.message);
      // Don't set error state - calendar is optional
      // Keep existing data if available
      if (habits.length === 0) {
        setHabits([]);
      }
      if (logs.length === 0) {
        setLogs([]);
      }
    } finally {
      // Always clear loading state, even if there was an error or early return
      setLoadingCalendar(false);
    }
  };

  const toggleCalendarView = () => {
    // Just toggle the view mode - no API calls needed
    // The view will use existing cached month data
    const newMode = calendarViewMode === "week" ? "month" : "week";
    setCalendarViewMode(newMode);
    // We always have full month data cached, so both views can use it
    setHasFullMonthData(true);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />

      <View style={styles.header}>
        <Text style={styles.title}>Habit Tracking</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Calendar Section */}
        <View style={styles.calendarSection}>
          <View style={styles.calendarHeader}>
            <Text style={styles.calendarTitle}>Track Your Progress</Text>
            <TouchableOpacity
              style={styles.expandButton}
              onPress={toggleCalendarView}
            >
              <Text style={styles.expandButtonText}>
                {calendarViewMode === "week" ? "Show Month" : "Show Week"}
              </Text>
            </TouchableOpacity>
          </View>

          {habits.length > 0 ? (
            <>
              <View style={styles.calendarContainer}>
                <CalendarView
                  habits={habits}
                  logs={logs}
                  viewMode={calendarViewMode}
                  hasFullMonthData={hasFullMonthData}
                />
              </View>
              <HabitLegend habits={habits} />
            </>
          ) : loadingCalendar ? (
            <ActivityIndicator
              size="small"
              color="#007AFF"
              style={styles.calendarLoader}
            />
          ) : (
            <Text style={styles.noHabitsText}>
              No habits yet. Create a habit to see your progress!
            </Text>
          )}
        </View>
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
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    color: "#007AFF",
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  welcomeText: {
    fontSize: 18,
    marginBottom: 20,
    color: "#333",
  },
  createHabitButton: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
    width: "100%",
    alignItems: "center",
  },
  createHabitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  settingsButton: {
    backgroundColor: "#f0f0f0",
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
    width: "100%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  settingsButtonText: {
    color: "#333",
    fontSize: 16,
    fontWeight: "600",
  },
  myHabitsButton: {
    backgroundColor: "#34C759",
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
    width: "100%",
    alignItems: "center",
  },
  myHabitsButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  calendarSection: {
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  expandButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  expandButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  calendarLoader: {
    marginVertical: 20,
  },
  calendarContainer: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  noHabitsText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    paddingVertical: 20,
    fontStyle: "italic",
  },
});

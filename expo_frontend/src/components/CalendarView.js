import React, { useEffect, useRef, useState, useMemo } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { getHabitColor as getHabitColorFromLegend } from "./HabitLegend";

// Local getHabitColor that accepts index parameter
const getHabitColor = (habitId, habitIndex = null) => {
  // First habit always gets blue
  if (habitIndex === 0) {
    return "#2196F3"; // Blue
  }
  // Other habits use the color palette (blue is excluded)
  return getHabitColorFromLegend(habitId);
};

const DAY_ABBREVIATIONS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Get the start of the current week (Sunday)
 */
const getWeekStart = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day; // Get Sunday of current week
  return new Date(d.setDate(diff));
};

/**
 * Get all days in a week
 */
const getWeekDays = (weekStart) => {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    days.push(date);
  }
  return days;
};

/**
 * Get the last 5 weeks (current week + 4 preceding weeks)
 * Returns an array of week arrays, with current week last
 */
const getLast5Weeks = (today = new Date()) => {
  const weeks = [];
  const currentWeekStart = getWeekStart(today);

  // Get current week and 4 preceding weeks (5 weeks total)
  for (let i = 4; i >= 0; i--) {
    const weekStart = new Date(currentWeekStart);
    weekStart.setDate(currentWeekStart.getDate() - i * 7);
    const weekDays = getWeekDays(weekStart);
    weeks.push(weekDays);
  }

  return weeks;
};

/**
 * Format date as YYYY-MM-DD in local timezone
 */
const formatDate = (date) => {
  if (!date) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Check if a habit is fully completed on a given day
 */
const isHabitCompletedOnDate = (habit, logs, dateStr) => {
  if (!dateStr) return false;

  const dayLogs = logs.filter((log) => {
    if (log.user_habit_id !== habit.id) return false;

    // Handle both date strings and Date objects
    const logDateStr =
      typeof log.date === "string"
        ? log.date.split("T")[0]
        : formatDate(new Date(log.date));

    return logDateStr === dateStr;
  });

  return dayLogs.length >= habit.times_per_day;
};

/**
 * Get the position in a 3x3 grid for a habit index
 * Grid positions (1-9):
 * 1 2 3
 * 4 5 6
 * 7 8 9
 *
 * If only 1 habit: position 5 (center)
 * If 2+ habits: first habit in top left (1), then fill rows left to right:
 * - Row 1: 1, 2, 3
 * - Row 2: 4, 5, 6
 * - Row 3: 7, 8, 9
 */
const getGridPosition = (index, totalHabits) => {
  if (totalHabits === 0) return null;
  if (totalHabits === 1) return 5; // Single habit in center
  if (index === 0) return 1; // First habit in top left for 2+ habits

  // Fill order for 2+ habits: rows left to right (1, 2, 3, 4, 5, 6, 7, 8, 9)
  const fillOrder = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  return fillOrder[index] || null;
};

/**
 * Filter habits that were created on or before the given date
 */
const filterHabitsByDate = (habits, dateStr) => {
  if (!dateStr || !habits) return [];

  return habits.filter((habit) => {
    // Get the habit's creation date
    const createDate = habit.create_date || habit.created_at;
    if (!createDate) return true; // If no create date, show the habit (backward compatibility)

    // Convert to date string for comparison (YYYY-MM-DD)
    const habitCreateDateStr =
      typeof createDate === "string"
        ? createDate.split("T")[0]
        : formatDate(new Date(createDate));

    // Only show habit if the date is on or after creation date
    return dateStr >= habitCreateDateStr;
  });
};

/**
 * Create a 3x3 grid array with habits placed in their positions
 * Returns array of 9 elements, each is { habit, originalIndex } or null
 * @param {Array} habits - All habits
 * @param {string} dateStr - Date string (YYYY-MM-DD) to filter habits by creation date
 */
const createHabitGrid = (habits, dateStr) => {
  // Filter habits to only include those created on or before the date
  const filteredHabits = filterHabitsByDate(habits, dateStr);

  const grid = Array(9).fill(null);
  filteredHabits.forEach((habit, index) => {
    // Find the original index in the full habits array for color consistency
    const originalIndex = habits.findIndex((h) => h.id === habit.id);
    const position = getGridPosition(index, filteredHabits.length);
    if (position !== null && position >= 1 && position <= 9) {
      grid[position - 1] = { habit, originalIndex }; // Store original index for color
    }
  });
  return grid;
};

export default function CalendarView({
  habits,
  logs,
  viewMode = "week",
  hasFullMonthData = true,
}) {
  if (!habits || habits.length === 0) {
    return null;
  }

  const today = new Date();
  const weekStart = getWeekStart(today);
  const todayStr = formatDate(today);

  // Filter logs based on view mode
  // If week view, only show logs for current week
  // If month view, show all logs (full month range)
  const filteredLogs = useMemo(() => {
    if (viewMode === "week" && logs && logs.length > 0) {
      // Get current week date range
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // Saturday
      const weekStartStr = formatDate(weekStart);
      const weekEndStr = formatDate(weekEnd);

      // Filter logs to only include current week
      return logs.filter((log) => {
        const logDateStr =
          typeof log.date === "string"
            ? log.date.split("T")[0]
            : formatDate(new Date(log.date));
        return logDateStr >= weekStartStr && logDateStr <= weekEndStr;
      });
    }
    // Month view: return all logs
    return logs || [];
  }, [logs, viewMode, weekStart]);

  // Animation values for smooth month view transition
  // Initialize with stable values to prevent re-renders
  const containerHeight = useRef(new Animated.Value(0)).current; // 0 = 1 week, 1 = 5 weeks
  const currentWeekTranslateY = useRef(new Animated.Value(0)).current; // Moves down as container expands
  const pastWeeksOpacity = useRef(new Animated.Value(0)).current;
  const [isCollapsing, setIsCollapsing] = useState(false);
  const prevViewMode = useRef(viewMode);
  const prevHasFullMonthData = useRef(hasFullMonthData);
  const isInitialMount = useRef(true);

  // Show week view until month data is ready
  // Also ensure we have habits data before rendering month view
  // If collapsing, keep month structure visible during animation
  const effectiveViewMode =
    viewMode === "month" &&
    (!hasFullMonthData || !habits || habits.length === 0)
      ? "week"
      : viewMode === "week" && isCollapsing
      ? "month" // Keep month structure during collapse animation
      : viewMode;

  // Calculate days based on effective view mode, not actual view mode
  const days = effectiveViewMode === "week" ? getWeekDays(weekStart) : null; // Month view uses getLast5Weeks directly

  // Estimate week row height (reduced for tighter spacing)
  // Use useMemo to prevent recalculation on every render
  // weekRowHeight includes content + marginBottom (60 + 2 = 62)
  const { weekRowHeight, totalWeeksHeight, singleWeekHeight, headerHeight } =
    useMemo(
      () => ({
        weekRowHeight: 62, // Content height (60) + marginBottom (2)
        totalWeeksHeight: 62 * 5, // 5 weeks with consistent spacing
        singleWeekHeight: 62,
        headerHeight: 30,
      }),
      []
    );

  // Animate when switching between week and month views
  // Only run when viewMode or hasFullMonthData actually changes
  useEffect(() => {
    // Skip if values haven't actually changed
    if (
      prevViewMode.current === viewMode &&
      prevHasFullMonthData.current === hasFullMonthData
    ) {
      return;
    }

    // On initial mount, just set refs and return (don't animate)
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevViewMode.current = viewMode;
      prevHasFullMonthData.current = hasFullMonthData;
      // Ensure week view values are set correctly on initial mount
      if (viewMode === "week") {
        containerHeight.setValue(0);
        currentWeekTranslateY.setValue(0);
        pastWeeksOpacity.setValue(0);
        setIsCollapsing(false);
      }
      return;
    }

    // Update refs
    prevViewMode.current = viewMode;
    prevHasFullMonthData.current = hasFullMonthData;

    if (viewMode === "month" && hasFullMonthData) {
      // Expanding to month view: current week moves down, container expands, past weeks fade in
      setIsCollapsing(false);
      Animated.parallel([
        // Expand container height from 1 week to 5 weeks
        Animated.timing(containerHeight, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false, // Height animation can't use native driver
        }),
        // Move current week down as space opens above
        Animated.timing(currentWeekTranslateY, {
          toValue: weekRowHeight * 4, // Move down by exactly 4 weeks (320px) to end at bottom
          duration: 2000,
          useNativeDriver: true,
        }),
        // Fade in past weeks as they become visible
        Animated.timing(pastWeeksOpacity, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (
      viewMode === "week" &&
      hasFullMonthData &&
      prevViewMode.current === "month"
    ) {
      // Collapsing to week view: current week moves up, container shrinks, past weeks fade out
      // Only animate if we're actually transitioning from month to week
      setIsCollapsing(true);
      Animated.parallel([
        // Shrink container height from 5 weeks to 1 week
        Animated.timing(containerHeight, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: false, // Height animation can't use native driver
        }),
        // Move current week up to the top
        Animated.timing(currentWeekTranslateY, {
          toValue: 0, // Move back to top (0)
          duration: 2000,
          useNativeDriver: true,
        }),
        // Fade out past weeks
        Animated.timing(pastWeeksOpacity, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // After animation completes, stop showing month structure
        setIsCollapsing(false);
      });
    } else if (viewMode === "week") {
      // Week view - ensure values are set to week view state immediately
      // Use stopAnimation to cancel any ongoing animations first
      containerHeight.stopAnimation();
      currentWeekTranslateY.stopAnimation();
      pastWeeksOpacity.stopAnimation();
      containerHeight.setValue(0);
      currentWeekTranslateY.setValue(0);
      pastWeeksOpacity.setValue(0);
      setIsCollapsing(false);
    }
  }, [viewMode, hasFullMonthData, weekRowHeight]);

  if (effectiveViewMode === "week") {
    // Use stable height calculation to prevent re-renders
    const weekViewHeight = singleWeekHeight + headerHeight;
    return (
      <View style={[styles.container, { minHeight: weekViewHeight }]}>
        <View style={styles.weekViewRow}>
          {days.map((date, index) => {
            const dateStr = formatDate(date);
            const isToday = dateStr === todayStr;

            return (
              <View key={index} style={styles.dayColumn}>
                <Text style={[styles.dayLabel, isToday && styles.todayLabel]}>
                  {DAY_ABBREVIATIONS[date.getDay()]}
                </Text>
                <Text style={[styles.dateLabel, isToday && styles.todayDate]}>
                  {date.getDate()}
                </Text>
                <View style={styles.habitBoxes}>
                  {createHabitGrid(habits || [], dateStr).map(
                    (gridItem, gridIndex) => {
                      if (!gridItem) {
                        // Empty position - render empty box to maintain grid
                        return (
                          <View
                            key={`empty-${gridIndex}`}
                            style={[styles.habitBox, styles.emptyHabitBox]}
                          />
                        );
                      }
                      const { habit, originalIndex } = gridItem;
                      const isCompleted = isHabitCompletedOnDate(
                        habit,
                        filteredLogs,
                        dateStr
                      );
                      const color = getHabitColor(habit.id, originalIndex);

                      return (
                        <View
                          key={habit.id}
                          style={[
                            styles.habitBox,
                            {
                              backgroundColor: isCompleted
                                ? color
                                : "transparent",
                              borderColor: color,
                            },
                          ]}
                        />
                      );
                    }
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  } else {
    // Month view - show last 5 weeks (current week at bottom)
    const allWeeks = getLast5Weeks(today);
    const pastWeeks =
      allWeeks && allWeeks.length >= 4 ? allWeeks.slice(0, 4) : [];
    const currentWeek = allWeeks && allWeeks.length >= 5 ? allWeeks[4] : null;

    // Safety check: if we don't have valid data, return null
    if (!currentWeek || !habits || habits.length === 0) {
      return null;
    }

    return (
      <View style={styles.container}>
        <Animated.View
          style={{
            height: containerHeight.interpolate({
              inputRange: [0, 1],
              outputRange: [
                singleWeekHeight + headerHeight, // Start: header + 1 week
                totalWeeksHeight + headerHeight, // End: header + 5 weeks (current week ends at bottom)
              ],
            }),
            overflow: "hidden", // Clip to prevent extending beyond container
          }}
        >
          <View style={styles.monthHeader}>
            {DAY_ABBREVIATIONS.map((day) => (
              <View key={day} style={styles.monthDayHeader}>
                <Text style={styles.monthDayLabel}>{day}</Text>
              </View>
            ))}
          </View>

          {/* Current week - starts at top, moves down to bottom as container expands */}
          <Animated.View
            style={{
              transform: [{ translateY: currentWeekTranslateY }],
              marginTop: 1, // Match spacing between rows
            }}
          >
            <View style={styles.weekRow}>
              {currentWeek &&
                currentWeek.map((date, dayIndex) => {
                  if (!date) return null;
                  const dateStr = formatDate(date);
                  const isToday = dateStr === todayStr;

                  return (
                    <View key={dayIndex} style={styles.dayColumn}>
                      <Text
                        style={[
                          styles.monthDateLabel,
                          isToday && styles.todayDate,
                        ]}
                      >
                        {date.getDate()}
                      </Text>
                      <View style={styles.habitBoxes}>
                        {createHabitGrid(habits || [], dateStr).map(
                          (gridItem, gridIndex) => {
                            if (!gridItem) {
                              // Empty position - render empty box to maintain grid
                              return (
                                <View
                                  key={`empty-${gridIndex}`}
                                  style={[
                                    styles.habitBox,
                                    styles.emptyHabitBox,
                                  ]}
                                />
                              );
                            }
                            const { habit, originalIndex } = gridItem;
                            const isCompleted = isHabitCompletedOnDate(
                              habit,
                              filteredLogs,
                              dateStr
                            );
                            const color = getHabitColor(
                              habit.id,
                              originalIndex
                            );

                            return (
                              <View
                                key={habit.id}
                                style={[
                                  styles.habitBox,
                                  {
                                    backgroundColor: isCompleted
                                      ? color
                                      : "transparent",
                                    borderColor: color,
                                  },
                                ]}
                              />
                            );
                          }
                        )}
                      </View>
                    </View>
                  );
                })}
            </View>
          </Animated.View>

          {/* Past weeks - positioned above current week, revealed as container expands */}
          {/* Keep rendered during animation so fade out works when collapsing to week view */}
          {pastWeeks.length > 0 && (
            <Animated.View
              style={{
                opacity: pastWeeksOpacity,
                position: "absolute",
                top: headerHeight,
                left: 0,
                right: 0,
              }}
            >
              {pastWeeks.map((week, weekIndex) => {
                if (!week || !Array.isArray(week)) return null;
                return (
                  <View key={weekIndex} style={styles.weekRow}>
                    {week.map((date, dayIndex) => {
                      if (!date) return null;
                      const dateStr = formatDate(date);
                      const isToday = dateStr === todayStr;

                      return (
                        <View key={dayIndex} style={styles.dayColumn}>
                          <Text
                            style={[
                              styles.monthDateLabel,
                              isToday && styles.todayDate,
                            ]}
                          >
                            {date.getDate()}
                          </Text>
                          <View style={styles.habitBoxes}>
                            {createHabitGrid(habits || [], dateStr).map(
                              (gridItem, gridIndex) => {
                                if (!gridItem) {
                                  // Empty position - render empty box to maintain grid
                                  return (
                                    <View
                                      key={`empty-${gridIndex}`}
                                      style={[
                                        styles.habitBox,
                                        styles.emptyHabitBox,
                                      ]}
                                    />
                                  );
                                }
                                const { habit, originalIndex } = gridItem;
                                const isCompleted = isHabitCompletedOnDate(
                                  habit,
                                  filteredLogs,
                                  dateStr
                                );
                                const color = getHabitColor(
                                  habit.id,
                                  originalIndex
                                );

                                return (
                                  <View
                                    key={habit.id}
                                    style={[
                                      styles.habitBox,
                                      {
                                        backgroundColor: isCompleted
                                          ? color
                                          : "transparent",
                                        borderColor: color,
                                      },
                                    ]}
                                  />
                                );
                              }
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </Animated.View>
          )}
        </Animated.View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    marginTop: 5,
    marginBottom: 2.5, // Half of original marginVertical
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 1,
  },
  weekViewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 1,
    paddingTop: 4, // Slight padding at top of single week view only
  },
  dayColumn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 2,
    paddingHorizontal: 4,
    minHeight: 60,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginBottom: 2,
  },
  todayLabel: {
    color: "#007AFF",
    fontWeight: "bold",
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 3,
  },
  monthDateLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  todayDate: {
    color: "#007AFF",
    fontWeight: "bold",
  },
  habitBoxes: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    width: 30, // Fixed width: 3 boxes * 8px + 2px margin = 30px
    alignSelf: "center", // Center the grid
  },
  habitBox: {
    width: 8,
    height: 8,
    borderRadius: 2,
    borderWidth: 1,
    margin: 1,
  },
  emptyHabitBox: {
    borderColor: "transparent",
    backgroundColor: "transparent",
  },
  monthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  monthDayHeader: {
    flex: 1,
    alignItems: "center",
  },
  monthDayLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
});

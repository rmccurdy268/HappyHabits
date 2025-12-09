import React from "react";
import { View, Text, StyleSheet } from "react-native";

// Color palette for habits (blue is reserved for first habit only)
const HABIT_COLORS = [
  "#4CAF50", // Green
  "#FF9800", // Orange
  "#9C27B0", // Purple
  "#F44336", // Red
  "#00BCD4", // Cyan
  "#FFEB3B", // Yellow
  "#795548", // Brown
  "#607D8B", // Blue Grey
  "#E91E63", // Pink
  "#3F51B5", // Indigo
  "#009688", // Teal
  "#FF5722", // Deep Orange
  "#673AB7", // Deep Purple
  "#CDDC39", // Lime
];

/**
 * Get a consistent color for a habit based on its ID
 * First habit (index 0) always gets blue
 * Other habits get colors from the palette (blue excluded)
 */
const getHabitColor = (habitId, habitIndex = null) => {
  // First habit always gets blue
  if (habitIndex === 0) {
    return "#2196F3"; // Blue
  }
  // Other habits use the color palette (blue is excluded)
  const index = habitId % HABIT_COLORS.length;
  return HABIT_COLORS[index];
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
 * Create a 3x3 grid array with habits placed in their positions
 * Returns array of 9 elements, each is { habit, originalIndex } or null
 */
const createHabitGrid = (habits) => {
  const grid = Array(9).fill(null);
  habits.forEach((habit, index) => {
    const position = getGridPosition(index, habits.length);
    if (position !== null && position >= 1 && position <= 9) {
      grid[position - 1] = { habit, originalIndex: index }; // Store original index for color
    }
  });
  return grid;
};

export default function HabitLegend({ habits }) {
  if (!habits || habits.length === 0) {
    return null;
  }

  // Always use 3 columns for 3x3 grid
  const cols = 3;
  const habitGrid = createHabitGrid(habits);

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {habitGrid.map((gridItem, gridIndex) => {
          if (!gridItem) {
            // Empty position - render empty space to maintain grid
            return (
              <View
                key={`empty-${gridIndex}`}
                style={[styles.legendItem, { width: `${100 / cols}%` }]}
              />
            );
          }
          const { habit, originalIndex } = gridItem;
          const color = getHabitColor(habit.id, originalIndex);
          return (
            <View
              key={habit.id}
              style={[styles.legendItem, { width: `${100 / cols}%` }]}
            >
              <View style={styles.legendContent}>
                <View
                  style={[
                    styles.colorBox,
                    { backgroundColor: color, borderColor: color },
                  ]}
                />
                <Text style={styles.habitName} numberOfLines={1}>
                  {habit.name}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// Export the color function for use in CalendarView
export { getHabitColor };

const styles = StyleSheet.create({
  container: {
    marginTop: 15,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: "100%",
  },
  legendItem: {
    padding: 4,
    minWidth: 0, // Allow flex to work properly
  },
  legendContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  colorBox: {
    width: 10,
    height: 10,
    borderRadius: 2,
    borderWidth: 1,
    marginRight: 6,
  },
  habitName: {
    fontSize: 11,
    color: "#666",
    flex: 1,
  },
});

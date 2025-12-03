import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import { apiService } from "../api/api";

export default function CategorySelector({
  selectedCategoryId,
  onSelect,
  userId,
}) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);

  useEffect(() => {
    console.log("CategorySelector mounted, fetching categories...");
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      console.log("Starting fetchCategories...");
      setLoading(true);
      console.log("Calling apiService.getCategories()...");
      const data = await apiService.getCategories();
      console.log("Categories received:", data);
      
      // Sort categories: custom first, then global alphabetically, with "Other" last
      const sorted = [...data].sort((a, b) => {
        const aIsCustom = a.user_id !== null;
        const bIsCustom = b.user_id !== null;
        const aName = (a.name || "").toLowerCase();
        const bName = (b.name || "").toLowerCase();
        const aIsOther = aName === "other";
        const bIsOther = bName === "other";
        
        // Custom categories come first
        if (aIsCustom && !bIsCustom) return -1;
        if (!aIsCustom && bIsCustom) return 1;
        
        // Within same type (both custom or both global), sort alphabetically
        // But "Other" always comes last
        if (aIsOther && !bIsOther) return 1;
        if (!aIsOther && bIsOther) return -1;
        
        // Alphabetical order
        if (aName < bName) return -1;
        if (aName > bName) return 1;
        return 0;
      });
      
      setCategories(sorted);
    } catch (error) {
      console.error("Error fetching categories:", error);
      console.error("Error response:", error.response);
      console.error("Error details:", error.response?.data);
      Alert.alert(
        "Error",
        `Failed to load categories: ${error.message || error.response?.data?.error || "Unknown error"}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert("Error", "Category name is required");
      return;
    }

    if (!userId) {
      Alert.alert("Error", "User ID is required");
      return;
    }

    try {
      setCreatingCategory(true);
      const newCategory = await apiService.createCategory(
        newCategoryName.trim(),
        userId
      );
      setCategories([...categories, newCategory]);
      onSelect(newCategory.id);
      setShowNewCategoryModal(false);
      setNewCategoryName("");
    } catch (error) {
      console.error("Error creating category:", error);
      Alert.alert(
        "Error",
        error.response?.data?.error || error.message || "Failed to create category"
      );
    } finally {
      setCreatingCategory(false);
    }
  };

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  }

  const handleCategorySelect = (categoryId) => {
    onSelect(categoryId);
    setShowCategoryPicker(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.selector}
        onPress={() => setShowCategoryPicker(true)}
      >
        <Text style={styles.selectorText}>
          {selectedCategory
            ? selectedCategory.name
            : "Select a category"}
        </Text>
        <Text style={styles.selectorArrow}>▼</Text>
      </TouchableOpacity>

      {/* Category Picker Modal */}
      <Modal
        visible={showCategoryPicker}
        transparent={true}
        animationType={Platform.OS === "web" ? "none" : "slide"}
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCategoryPicker(false)}
        >
          <TouchableOpacity
            style={styles.pickerModalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Category</Text>
              <TouchableOpacity
                onPress={() => setShowCategoryPicker(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerList}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryItem,
                    selectedCategoryId === category.id && styles.categoryItemSelected,
                  ]}
                  onPress={() => handleCategorySelect(category.id)}
                >
                  <Text
                    style={[
                      styles.categoryItemText,
                      selectedCategoryId === category.id && styles.categoryItemTextSelected,
                    ]}
                  >
                    {category.name}
                  </Text>
                  {selectedCategoryId === category.id && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.createNewButton}
              onPress={() => {
                setShowCategoryPicker(false);
                setShowNewCategoryModal(true);
              }}
            >
              <Text style={styles.createNewButtonText}>+ Create New Category</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Create New Category Modal */}
      <Modal
        visible={showNewCategoryModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowNewCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Category</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Category name"
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              autoCapitalize="words"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setShowNewCategoryModal(false);
                  setNewCategoryName("");
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSubmitButton]}
                onPress={handleCreateCategory}
                disabled={creatingCategory}
              >
                {creatingCategory ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalSubmitText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  selector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 15,
    backgroundColor: "#fff",
  },
  selectorText: {
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
  selectorArrow: {
    fontSize: 12,
    color: "#666",
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    ...(Platform.OS === "web" && {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1000,
    }),
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "80%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 20,
    color: "#333",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  modalCancelButton: {
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  modalCancelText: {
    color: "#333",
    fontSize: 16,
    fontWeight: "600",
  },
  modalSubmitButton: {
    backgroundColor: "#007AFF",
  },
  modalSubmitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  pickerModalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    width: "90%",
    maxWidth: 400,
    maxHeight: "80%",
    overflow: "hidden",
    ...(Platform.OS === "web" && {
      zIndex: 1001,
      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    }),
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  pickerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 24,
    color: "#666",
  },
  pickerList: {
    maxHeight: 300,
  },
  categoryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  categoryItemSelected: {
    backgroundColor: "#E3F2FD",
  },
  categoryItemText: {
    fontSize: 16,
    color: "#333",
  },
  categoryItemTextSelected: {
    color: "#007AFF",
    fontWeight: "600",
  },
  checkmark: {
    fontSize: 18,
    color: "#007AFF",
    fontWeight: "bold",
  },
  createNewButton: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    alignItems: "center",
  },
  createNewButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
});


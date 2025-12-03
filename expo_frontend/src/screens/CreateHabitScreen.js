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

const MODES = {
  SELECT: "select", // Template selection or custom choice
  TEMPLATE_FORM: "template_form", // Form for template-based habit
  CUSTOM_FORM: "custom_form", // Form for custom habit
};

export default function CreateHabitScreen({ navigation, route }) {
  const { userProfile } = useAuth();
  const [mode, setMode] = useState(MODES.SELECT);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [groupedTemplates, setGroupedTemplates] = useState({});
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Form state for template-based habit
  const [templateForm, setTemplateForm] = useState({
    name: "",
    description: "",
    category_id: null,
    times_per_day: "1",
  });

  // Form state for custom habit
  const [customForm, setCustomForm] = useState({
    name: "",
    category_id: null,
    times_per_day: "1",
  });

  useEffect(() => {
    if (mode === MODES.SELECT) {
      fetchTemplates();
    }
  }, [mode]);

  const fetchTemplates = async () => {
    try {
      setFetching(true);
      const data = await apiService.getTemplates();
      setTemplates(data);

      // Group templates by category
      // Handle both 'category' and 'Categories' property names (depending on Supabase join syntax)
      // Also sort templates alphabetically within each category
      const grouped = data.reduce((acc, template) => {
        const category = template.Categories || template.category;
        const categoryName = category?.name || "Uncategorized";
        if (!acc[categoryName]) {
          acc[categoryName] = [];
        }
        acc[categoryName].push(template);
        return acc;
      }, {});

      // Sort templates by name within each category
      Object.keys(grouped).forEach((categoryName) => {
        grouped[categoryName].sort((a, b) => {
          const aName = (a.name || "").toLowerCase();
          const bName = (b.name || "").toLowerCase();
          if (aName < bName) return -1;
          if (aName > bName) return 1;
          return 0;
        });
      });

      setGroupedTemplates(grouped);
    } catch (error) {
      console.error("Error fetching templates:", error);
      Alert.alert("Error", "Failed to load templates");
    } finally {
      setFetching(false);
    }
  };

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    // Get category_id from template (could be in category_id field or nested in Categories object)
    const categoryId = template.category_id || template.Categories?.id || null;
    setTemplateForm({
      name: template.name || "",
      description: template.description || "",
      category_id: categoryId,
      times_per_day: "1",
    });
    setMode(MODES.TEMPLATE_FORM);
  };

  const handleCreateCustom = () => {
    setCustomForm({
      name: "",
      category_id: null,
      times_per_day: "1",
    });
    setMode(MODES.CUSTOM_FORM);
  };

  const handleTemplateSubmit = async () => {
    if (!templateForm.name.trim()) {
      Alert.alert("Error", "Name is required");
      return;
    }

    if (!userProfile?.id) {
      Alert.alert("Error", "User not found");
      return;
    }

    try {
      setLoading(true);
      const habitData = {
        template_id: selectedTemplate.id,
        name: templateForm.name.trim(),
        category_id: templateForm.category_id,
        times_per_day: parseInt(templateForm.times_per_day, 10) || 1,
      };

      await apiService.createHabit(userProfile.id, habitData);
      Alert.alert("Success", "Habit created successfully", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error("Error creating habit:", error);
      Alert.alert(
        "Error",
        error.response?.data?.error || error.message || "Failed to create habit"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCustomSubmit = async () => {
    if (!customForm.name.trim()) {
      Alert.alert("Error", "Name is required");
      return;
    }

    if (!customForm.category_id) {
      Alert.alert("Error", "Category is required");
      return;
    }

    if (!userProfile?.id) {
      Alert.alert("Error", "User not found");
      return;
    }

    try {
      setLoading(true);
      const habitData = {
        name: customForm.name.trim(),
        category_id: customForm.category_id,
        times_per_day: parseInt(customForm.times_per_day, 10) || 1,
      };

      await apiService.createHabit(userProfile.id, habitData);
      Alert.alert("Success", "Habit created successfully", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error("Error creating habit:", error);
      Alert.alert(
        "Error",
        error.response?.data?.error || error.message || "Failed to create habit"
      );
    } finally {
      setLoading(false);
    }
  };

  const renderSelectView = () => (
    <View style={styles.content}>
      <Text style={styles.sectionTitle}>Choose a Template</Text>
      {fetching ? (
        <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
      ) : (
        <ScrollView style={styles.templatesList}>
          {Object.keys(groupedTemplates).map((categoryName) => (
            <View key={categoryName} style={styles.categorySection}>
              <Text style={styles.categoryHeader}>{categoryName}</Text>
              {groupedTemplates[categoryName].map((template) => (
                <TouchableOpacity
                  key={template.id}
                  style={styles.templateItem}
                  onPress={() => handleTemplateSelect(template)}
                >
                  <Text style={styles.templateName}>{template.name}</Text>
                  {template.description && (
                    <Text style={styles.templateDescription}>
                      {template.description}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </ScrollView>
      )}

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.dividerLine} />
      </View>

      <TouchableOpacity
        style={styles.customButton}
        onPress={handleCreateCustom}
      >
        <Text style={styles.customButtonText}>Create Custom Habit</Text>
      </TouchableOpacity>
    </View>
  );

  const renderTemplateForm = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Create Habit from Template</Text>

          <View style={styles.section}>
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Habit name"
              value={templateForm.name}
              onChangeText={(text) =>
                setTemplateForm({ ...templateForm, name: text })
              }
              autoCapitalize="words"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optional)"
              value={templateForm.description}
              onChangeText={(text) =>
                setTemplateForm({ ...templateForm, description: text })
              }
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Category *</Text>
            <CategorySelector
              selectedCategoryId={templateForm.category_id}
              onSelect={(categoryId) =>
                setTemplateForm({ ...templateForm, category_id: categoryId })
              }
              userId={userProfile?.id}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Times per Day</Text>
            <TextInput
              style={styles.input}
              placeholder="1"
              value={templateForm.times_per_day}
              onChangeText={(text) =>
                setTemplateForm({ ...templateForm, times_per_day: text })
              }
              keyboardType="numeric"
            />
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => setMode(MODES.SELECT)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.submitButton,
                loading && styles.buttonDisabled,
              ]}
              onPress={handleTemplateSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Create Habit</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  const renderCustomForm = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Create Custom Habit</Text>

          <View style={styles.section}>
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Habit name"
              value={customForm.name}
              onChangeText={(text) =>
                setCustomForm({ ...customForm, name: text })
              }
              autoCapitalize="words"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Category *</Text>
            <CategorySelector
              selectedCategoryId={customForm.category_id}
              onSelect={(categoryId) =>
                setCustomForm({ ...customForm, category_id: categoryId })
              }
              userId={userProfile?.id}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Times per Day</Text>
            <TextInput
              style={styles.input}
              placeholder="1"
              value={customForm.times_per_day}
              onChangeText={(text) =>
                setCustomForm({ ...customForm, times_per_day: text })
              }
              keyboardType="numeric"
            />
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => setMode(MODES.SELECT)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.submitButton,
                loading && styles.buttonDisabled,
              ]}
              onPress={handleCustomSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Create Habit</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (mode === MODES.SELECT) {
              navigation.goBack();
            } else {
              setMode(MODES.SELECT);
            }
          }}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>
          {mode === MODES.SELECT
            ? "Create Habit"
            : mode === MODES.TEMPLATE_FORM
            ? "From Template"
            : "Custom Habit"}
        </Text>
      </View>

      {mode === MODES.SELECT && renderSelectView()}
      {mode === MODES.TEMPLATE_FORM && renderTemplateForm()}
      {mode === MODES.CUSTOM_FORM && renderCustomForm()}
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
  loader: {
    marginVertical: 40,
  },
  templatesList: {
    flex: 1,
  },
  categorySection: {
    marginBottom: 30,
  },
  categoryHeader: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#333",
  },
  templateItem: {
    backgroundColor: "#f5f5f5",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  templateName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  templateDescription: {
    fontSize: 14,
    color: "#666",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#ddd",
  },
  dividerText: {
    marginHorizontal: 15,
    color: "#666",
    fontSize: 14,
  },
  customButton: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  customButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
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
});

import { createClient } from "@supabase/supabase-js";
import { config } from "../config.js";
export default class SupabaseDAO {
  constructor(db) {
    this.db = db;
    this.adminClient = createClient(config.db.url, config.db.serviceRoleKey);
    this.config = config; // Store config for use in methods
  }
  async createUser(email, password, username, phone, preferred_contact_method) {
    const { authData, authError } = await this.createUserAuthData(
      email,
      password
    );
    if (authError) {
      throw authError;
    }
    const { profileData, profileError } = await this.createUserProfileData(
      authData.user?.id || authData.id,
      email,
      username,
      phone,
      preferred_contact_method
    );
    if (profileError) {
      await this.adminClient.auth.admin.deleteUser(
        authData.user?.id || authData.id
      );
      throw profileError;
    }
    return { authData };
  }

  async createUserAuthData(email, password) {
    const { data, error } = await this.adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Bypass email verification - user is automatically confirmed
      user_metadata: {},
    });
    return { authData: data, authError: error };
  }

  async createUserProfileData(
    authUserId,
    email,
    username,
    phone,
    preferred_contact_method
  ) {
    // Store the auth_user_id to link UserData record to Supabase Auth user
    // Email is stored in Supabase Auth (auth.users), not in UserData table
    const { data, error } = await this.adminClient.from("UserData").insert({
      auth_user_id: authUserId,
      username: username,
      phone: phone,
      preferred_contact_method: preferred_contact_method,
    });

    return { profileData: data, profileError: error };
  }

  async login(email, password) {
    const { data, error } = await this.db.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      throw error;
    }

    return data;
  }

  /**
   * Logout user (revoke refresh token and session)
   * @param {string} refreshToken - Refresh token to revoke
   */
  async logout(refreshToken) {
    try {
      // First, get the session information from the refresh token
      // This allows us to get the user ID and session ID for proper revocation
      const { data: sessionData, error: refreshError } =
        await this.db.auth.refreshSession({
          refresh_token: refreshToken,
        });

      if (refreshError) {
        // If refresh fails, the token might already be invalid/revoked
        // This is acceptable - we'll still return success since the goal is logout
        console.log(
          "Refresh token already invalid or expired:",
          refreshError.message
        );
        return {
          success: true,
          message: "Logged out successfully",
        };
      }

      // If we have session data, revoke it using Supabase REST API
      if (sessionData?.session) {
        const userId = sessionData.session.user.id;

        try {
          // Use Supabase REST API to revoke the refresh token
          // This is the most reliable method to ensure the token is revoked
          // We'll make a direct HTTP request to Supabase's logout endpoint
          const supabaseUrl = this.config.db.url;
          const serviceRoleKey = this.config.db.serviceRoleKey;

          // Call Supabase's logout endpoint to revoke the refresh token
          const response = await fetch(`${supabaseUrl}/auth/v1/logout`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: serviceRoleKey,
              Authorization: `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              refresh_token: refreshToken,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("Error revoking refresh token:", errorData);
            // Don't throw - we'll still consider logout successful
            // The token refresh will fail on next attempt anyway
          }
        } catch (apiError) {
          console.error("Error calling Supabase logout API:", apiError);
          // Don't throw - we'll still consider logout successful
          // The token refresh will fail on next attempt anyway since frontend clears storage
        }
      }

      return {
        success: true,
        message: "Logged out successfully",
      };
    } catch (error) {
      // Even if there's an error, we consider logout successful
      // The refresh token will be invalid on next refresh attempt
      console.error("Logout error:", error);
      return {
        success: true,
        message: "Logged out successfully",
      };
    }
  }

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - Refresh token from previous session
   * @returns {object} New session with new tokens
   */
  async refreshToken(refreshToken) {
    try {
      const { data, error } = await this.db.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (error) {
        throw error;
      }

      return {
        success: true,
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at,
        user: data.user,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Verify and get user from access token
   * @param {string} accessToken - JWT access token
   * @returns {object} User data
   */
  async verifyToken(accessToken) {
    try {
      // Set the session to verify the token
      const { data, error } = await this.db.auth.getUser(accessToken);

      if (error) {
        throw error;
      }

      return {
        success: true,
        user: data.user,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Get current user session
   * @param {string} accessToken - Current access token
   * @returns {object} Current session
   */
  async getSession(accessToken) {
    try {
      const { data, error } = await this.db.auth.getSession();

      if (error) {
        throw error;
      }

      return {
        success: true,
        session: data.session,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // ========== UserData Methods ==========

  /**
   * Create a new user profile in UserData table
   * @param {object} userData - User data (username, phone, preferred_contact_method, auth_user_id)
   * @returns {object} Created user data
   */
  async createUserProfile(userData) {
    const { data, error } = await this.adminClient
      .from("UserData")
      .insert(userData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get user by ID
   * @param {number} id - User ID
   * @returns {object} User data
   */
  async getUserById(id) {
    const { data, error } = await this.adminClient
      .from("UserData")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get user by auth_user_id (UUID)
   * @param {string} authUserId - Auth user ID (UUID)
   * @returns {object} User data
   */
  async getUserByAuthId(authUserId) {
    console.log("Searching for user with auth_user_id:", authUserId);
    console.log("Type of authUserId:", typeof authUserId); // Should be "string"
    console.log(
      "UUID format check:",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        authUserId
      )
    ); // Should be true

    const { data, error } = await this.adminClient
      .from("UserData")
      .select("*")
      .eq("auth_user_id", authUserId)
      .is("deleted_at", null)
      .maybeSingle(); // Use maybeSingle() instead of single() to handle no results gracefully

    if (error) {
      console.error("Database error in getUserByAuthId:", error);
      throw error;
    }

    if (!data) {
      console.log("No UserData record found for auth_user_id:", authUserId);
      // Check if there are any UserData records at all (for debugging)
      const { count } = await this.adminClient
        .from("UserData")
        .select("*", { count: "exact", head: true });
      console.log("Total UserData records in database:", count);
      throw new Error(
        "User profile not found. Please ensure your account has a profile record."
      );
    }

    console.log("Found user data:", data);
    return data;
  }

  /**
   * Update user by ID
   * @param {number} id - User ID
   * @param {object} updates - Fields to update
   * @returns {object} Updated user data
   */
  async updateUser(id, updates) {
    const { data, error } = await this.adminClient
      .from("UserData")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Soft delete user by ID
   * @param {number} id - User ID
   * @returns {object} Success message
   */
  async deleteUser(id) {
    const { data, error } = await this.adminClient
      .from("UserData")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return { message: "User deleted" };
  }

  // ========== HabitTemplate Methods ==========

  /**
   * Get all habit templates
   * @returns {array} Array of templates
   */
  async getAllTemplates() {
    const { data, error } = await this.adminClient
      .from("HabitTemplate")
      .select("*, Categories!category_id(id, name)")
      .is("deleted_at", null);

    if (error) throw error;
    return data;
  }

  /**
   * Get template by ID
   * @param {number} id - Template ID
   * @returns {object} Template data
   */
  async getTemplateById(id) {
    const { data, error } = await this.adminClient
      .from("HabitTemplate")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Create a new habit template
   * @param {object} templateData - Template data
   * @returns {object} Created template
   */
  async createTemplate(templateData) {
    const { data, error } = await this.adminClient
      .from("HabitTemplate")
      .insert(templateData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update template by ID
   * @param {number} id - Template ID
   * @param {object} updates - Fields to update
   * @returns {object} Updated template
   */
  async updateTemplate(id, updates) {
    const { data, error } = await this.adminClient
      .from("HabitTemplate")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Soft delete template by ID
   * @param {number} id - Template ID
   * @returns {object} Success message
   */
  async deleteTemplate(id) {
    const { data, error } = await this.adminClient
      .from("HabitTemplate")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return { message: "Template deleted" };
  }

  // ========== UserHabit Methods ==========

  /**
   * Get all habits for a user
   * @param {number} userId - User ID
   * @returns {array} Array of user habits
   */
  async getUserHabits(userId) {
    const { data, error } = await this.adminClient
      .from("UserHabit")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .is("deleted_at", null);

    if (error) throw error;
    return data;
  }

  /**
   * Get habit by ID
   * @param {number} habitId - Habit ID
   * @returns {object} Habit data
   */
  async getHabitById(habitId) {
    const { data, error } = await this.adminClient
      .from("UserHabit")
      .select("*")
      .eq("id", habitId)
      .is("deleted_at", null)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Create a new user habit
   * @param {object} habitData - Habit data
   * @returns {object} Created habit
   */
  async createUserHabit(habitData) {
    const { data, error } = await this.adminClient
      .from("UserHabit")
      .insert(habitData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update habit by ID
   * @param {number} habitId - Habit ID
   * @param {object} updates - Fields to update
   * @returns {object} Updated habit
   */
  async updateHabit(habitId, updates) {
    const { data, error } = await this.adminClient
      .from("UserHabit")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", habitId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Archive habit (set is_active to false)
   * @param {number} habitId - Habit ID
   * @returns {object} Updated habit
   */
  async archiveHabit(habitId) {
    const { data, error } = await this.adminClient
      .from("UserHabit")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", habitId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Soft delete habit by ID
   * @param {number} habitId - Habit ID
   * @returns {object} Success message
   */
  async deleteHabit(habitId) {
    const { data, error } = await this.adminClient
      .from("UserHabit")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", habitId)
      .select()
      .single();

    if (error) throw error;
    return { message: "Habit deleted" };
  }

  // ========== HabitLogs Methods ==========

  /**
   * Get all logs for a habit
   * @param {number} habitId - Habit ID
   * @returns {array} Array of habit logs
   */
  async getHabitLogs(habitId) {
    const { data, error } = await this.adminClient
      .from("HabitLogs")
      .select("*")
      .eq("user_habit_id", habitId)
      .order("date", { ascending: false });

    if (error) throw error;
    return data;
  }

  /**
   * Get today's logs for a habit
   * @param {number} habitId - Habit ID
   * @param {string} todayDate - Today's date in YYYY-MM-DD format
   * @returns {array} Array of habit logs for today
   */
  async getTodayHabitLogs(habitId, todayDate) {
    // Get logs for today by filtering date field (date-only comparison)
    const { data, error } = await this.adminClient
      .from("HabitLogs")
      .select("*")
      .eq("user_habit_id", habitId)
      .eq("date", todayDate)
      .order("time_completed", { ascending: false });

    if (error) throw error;
    return data;
  }

  /**
   * Create a new habit log
   * @param {object} logData - Log data
   * @returns {object} Created log
   */
  async createHabitLog(logData) {
    const { data, error } = await this.adminClient
      .from("HabitLogs")
      .insert(logData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update log by ID
   * @param {number} logId - Log ID
   * @param {object} updates - Fields to update
   * @returns {object} Updated log
   */
  async updateHabitLog(logId, updates) {
    const { data, error } = await this.adminClient
      .from("HabitLogs")
      .update(updates)
      .eq("id", logId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete log by ID (hard delete)
   * @param {number} logId - Log ID
   * @returns {object} Success message
   */
  async deleteHabitLog(logId) {
    const { error } = await this.adminClient
      .from("HabitLogs")
      .delete()
      .eq("id", logId);

    if (error) throw error;
    return { message: "Habit log deleted" };
  }

  /**
   * Get logs for all user's habits within a date range
   * @param {number} userId - User ID
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {string} endDate - End date in YYYY-MM-DD format
   * @returns {array} Array of logs with user_habit_id and date
   */
  async getUserLogsForDateRange(userId, startDate, endDate) {
    // First get all active habits for the user
    const { data: habits, error: habitsError } = await this.adminClient
      .from("UserHabit")
      .select("id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .is("deleted_at", null);

    if (habitsError) throw habitsError;

    if (!habits || habits.length === 0) {
      return [];
    }

    const habitIds = habits.map((h) => h.id);

    // Get logs for all habits in the date range
    // Note: HabitLogs table doesn't have deleted_at column, so we don't filter by it
    const { data, error } = await this.adminClient
      .from("HabitLogs")
      .select("*")
      .in("user_habit_id", habitIds)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true })
      .order("time_completed", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // ========== Categories Methods ==========

  /**
   * Get all categories
   * @returns {array} Array of categories
   */
  async getAllCategories() {
    const { data, error } = await this.adminClient
      .from("Categories")
      .select("*");

    if (error) throw error;
    return data;
  }

  /**
   * Get categories for a user (global + user's custom categories)
   * @param {number} userId - User ID
   * @returns {array} Array of categories (global first, then user's)
   */
  async getCategoriesForUser(userId) {
    const { data, error } = await this.adminClient
      .from("Categories")
      .select("*")
      .or(`user_id.is.null,user_id.eq.${userId}`)
      .order("user_id", { ascending: true, nullsFirst: true })
      .order("name", { ascending: true });

    if (error) throw error;
    return data;
  }

  /**
   * Get category by ID
   * @param {number} id - Category ID
   * @returns {object} Category data
   */
  async getCategoryById(id) {
    const { data, error } = await this.adminClient
      .from("Categories")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Create a new category
   * @param {object} categoryData - Category data
   * @returns {object} Created category
   */
  async createCategory(categoryData) {
    const { data, error } = await this.adminClient
      .from("Categories")
      .insert(categoryData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update category by ID
   * @param {number} id - Category ID
   * @param {object} updates - Fields to update
   * @returns {object} Updated category
   */
  async updateCategory(id, updates) {
    const { data, error } = await this.adminClient
      .from("Categories")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete category by ID (hard delete)
   * @param {number} id - Category ID
   * @returns {object} Success message
   */
  async deleteCategory(id) {
    const { error } = await this.adminClient
      .from("Categories")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return { message: "Category deleted" };
  }
}

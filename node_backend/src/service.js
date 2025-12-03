// node_backend/src/service.js
import SupabaseDAO from "./db/SupabaseDAO.js";

class Service {
  constructor(db) {
    this.dao = new SupabaseDAO(db); // This is your Supabase dao
  }

  /**
   * Register a new user using Supabase Auth
   * Supabase automatically handles password hashing and user creation
   * @param {string} email - User email
   * @param {string} password - Plain text password
   * @param {object} metadata - Additional user metadata (username, phone, etc.)
   * @returns {object} User data and session with tokens
   */
  async createUser(email, password, metadata) {
    try {
      // Use Supabase Auth to create user
      // This automatically hashes the password and creates the user in auth.users
      const { authData } = await this.dao.createUser(
        email,
        password,
        metadata.username,
        metadata.phone,
        metadata.preferred_contact_method
      );

      // Admin API creates user but doesn't return a session
      // Auto-login the user to get tokens
      const loginResult = await this.login(email, password);

      if (loginResult.success) {
        return {
          success: true,
          message: "User created successfully",
          accessToken: loginResult.accessToken,
          refreshToken: loginResult.refreshToken,
          expiresAt: loginResult.expiresAt,
          user: loginResult.user,
        };
      } else {
        // User created but login failed - return user without tokens
        return {
          success: true,
          message: "User created successfully. Please login.",
          user: authData.user || authData,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Login user and get tokens from Supabase
   * @param {string} email - User email
   * @param {string} password - Plain text password
   * @returns {object} Session with access_token and refresh_token
   */
  async login(email, password) {
    try {
      const data = await this.dao.login(email, password);

      // Supabase automatically provides:
      // - access_token (short-term, ~1 hour)
      // - refresh_token (long-term, ~7 days)
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
   * Refresh access token using refresh token
   * @param {string} refreshToken - Refresh token from previous session
   * @returns {object} New session with new tokens
   */
  async refreshToken(refreshToken) {
    return await this.dao.refreshToken(refreshToken);
  }

  /**
   * Verify and get user from access token
   * @param {string} accessToken - JWT access token
   * @returns {object} User data
   */
  async verifyToken(accessToken) {
    return await this.dao.verifyToken(accessToken);
  }

  /**
   * Logout user (revoke refresh token)
   * @param {string} refreshToken - Refresh token to revoke
   */
  async logout(refreshToken) {
    return await this.dao.logout(refreshToken);
  }

  /**
   * Get current user session
   * @param {string} accessToken - Current access token
   * @returns {object} Current session
   */
  async getSession(accessToken) {
    return await this.dao.getSession(accessToken);
  }

  /**
   * Get user by auth_user_id (UUID)
   * @param {string} authUserId - Auth user ID (UUID)
   * @returns {object} User data
   */
  async getUserByAuthId(authUserId) {
    try {
      const user = await this.dao.getUserByAuthId(authUserId);
      return user;
    } catch (error) {
      // Provide a more helpful error message
      if (
        error.message.includes("not found") ||
        error.message.includes("User profile not found")
      ) {
        throw new Error(
          "User profile not found. Your account exists but your profile data is missing. " +
            "This may happen if your account was created before the profile system was added. " +
            "Please contact support."
        );
      }
      throw new Error(error.message || "Failed to fetch user");
    }
  }

  /**
   * Get user by ID
   * @param {number} id - User ID
   * @returns {object} User data
   */
  async getUserById(id) {
    try {
      return await this.dao.getUserById(id);
    } catch (error) {
      throw new Error(error.message || "Failed to fetch user");
    }
  }

  /**
   * Update user by ID
   * @param {number} id - User ID
   * @param {object} updates - Fields to update
   * @returns {object} Updated user
   */
  async updateUser(id, updates) {
    try {
      return await this.dao.updateUser(id, updates);
    } catch (error) {
      throw new Error(error.message || "Failed to update user");
    }
  }

  /**
   * Delete user by ID
   * @param {number} id - User ID
   * @returns {object} Success message
   */
  async deleteUser(id) {
    try {
      return await this.dao.deleteUser(id);
    } catch (error) {
      throw new Error(error.message || "Failed to delete user");
    }
  }

  // ========== HabitTemplate Service Methods ==========

  /**
   * Get all habit templates
   * @returns {array} Array of templates
   */
  async getAllTemplates() {
    try {
      return await this.dao.getAllTemplates();
    } catch (error) {
      throw new Error(error.message || "Failed to fetch templates");
    }
  }

  /**
   * Get template by ID
   * @param {number} id - Template ID
   * @returns {object} Template data
   */
  async getTemplateById(id) {
    try {
      return await this.dao.getTemplateById(id);
    } catch (error) {
      throw new Error(error.message || "Failed to fetch template");
    }
  }

  /**
   * Create a new habit template
   * @param {object} templateData - Template data
   * @returns {object} Created template
   */
  async createTemplate(templateData) {
    try {
      return await this.dao.createTemplate(templateData);
    } catch (error) {
      throw new Error(error.message || "Failed to create template");
    }
  }

  /**
   * Update template by ID
   * @param {number} id - Template ID
   * @param {object} updates - Fields to update
   * @returns {object} Updated template
   */
  async updateTemplate(id, updates) {
    try {
      return await this.dao.updateTemplate(id, updates);
    } catch (error) {
      throw new Error(error.message || "Failed to update template");
    }
  }

  /**
   * Delete template by ID
   * @param {number} id - Template ID
   * @returns {object} Success message
   */
  async deleteTemplate(id) {
    try {
      return await this.dao.deleteTemplate(id);
    } catch (error) {
      throw new Error(error.message || "Failed to delete template");
    }
  }

  // ========== UserHabit Service Methods ==========

  /**
   * Get all habits for a user
   * @param {number} userId - User ID
   * @returns {array} Array of user habits
   */
  async getUserHabits(userId) {
    try {
      return await this.dao.getUserHabits(userId);
    } catch (error) {
      throw new Error(error.message || "Failed to fetch user habits");
    }
  }

  /**
   * Get habit by ID
   * @param {number} habitId - Habit ID
   * @returns {object} Habit data
   */
  async getHabitById(habitId) {
    try {
      return await this.dao.getHabitById(habitId);
    } catch (error) {
      throw new Error(error.message || "Failed to fetch habit");
    }
  }

  /**
   * Create a new user habit
   * @param {object} habitData - Habit data
   * @returns {object} Created habit
   */
  async createUserHabit(habitData) {
    try {
      return await this.dao.createUserHabit(habitData);
    } catch (error) {
      throw new Error(error.message || "Failed to create user habit");
    }
  }

  /**
   * Update habit by ID
   * @param {number} habitId - Habit ID
   * @param {object} updates - Fields to update
   * @returns {object} Updated habit
   */
  async updateHabit(habitId, updates) {
    try {
      return await this.dao.updateHabit(habitId, updates);
    } catch (error) {
      throw new Error(error.message || "Failed to update habit");
    }
  }

  /**
   * Archive habit (set is_active to false)
   * @param {number} habitId - Habit ID
   * @returns {object} Updated habit
   */
  async archiveHabit(habitId) {
    try {
      return await this.dao.archiveHabit(habitId);
    } catch (error) {
      throw new Error(error.message || "Failed to archive habit");
    }
  }

  /**
   * Delete habit by ID
   * @param {number} habitId - Habit ID
   * @returns {object} Success message
   */
  async deleteHabit(habitId) {
    try {
      return await this.dao.deleteHabit(habitId);
    } catch (error) {
      throw new Error(error.message || "Failed to delete habit");
    }
  }

  // ========== HabitLogs Service Methods ==========

  /**
   * Get all logs for a habit
   * @param {number} habitId - Habit ID
   * @returns {array} Array of habit logs
   */
  async getHabitLogs(habitId) {
    try {
      return await this.dao.getHabitLogs(habitId);
    } catch (error) {
      throw new Error(error.message || "Failed to fetch habit logs");
    }
  }

  /**
   * Get today's logs for a habit
   * @param {number} habitId - Habit ID
   * @param {string} todayDate - Today's date in YYYY-MM-DD format (optional, defaults to today)
   * @returns {array} Array of habit logs for today
   */
  async getTodayHabitLogs(habitId, todayDate = null) {
    try {
      // If no date provided, use today's date
      if (!todayDate) {
        const today = new Date();
        todayDate = today.toISOString().split("T")[0]; // YYYY-MM-DD format
      }
      return await this.dao.getTodayHabitLogs(habitId, todayDate);
    } catch (error) {
      throw new Error(error.message || "Failed to fetch today's habit logs");
    }
  }

  /**
   * Create a new habit log
   * @param {object} logData - Log data
   * @returns {object} Created log
   */
  async createHabitLog(logData) {
    try {
      return await this.dao.createHabitLog(logData);
    } catch (error) {
      throw new Error(error.message || "Failed to create log");
    }
  }

  /**
   * Update log by ID
   * @param {number} logId - Log ID
   * @param {object} updates - Fields to update
   * @returns {object} Updated log
   */
  async updateHabitLog(logId, updates) {
    try {
      return await this.dao.updateHabitLog(logId, updates);
    } catch (error) {
      throw new Error(error.message || "Failed to update log");
    }
  }

  /**
   * Delete log by ID
   * @param {number} logId - Log ID
   * @returns {object} Success message
   */
  async deleteHabitLog(logId) {
    try {
      return await this.dao.deleteHabitLog(logId);
    } catch (error) {
      throw new Error(error.message || "Failed to delete log");
    }
  }

  /**
   * Get logs for all user's habits within a date range
   * @param {number} userId - User ID
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {string} endDate - End date in YYYY-MM-DD format
   * @returns {array} Array of logs grouped by habit and date
   */
  async getUserLogsForDateRange(userId, startDate, endDate) {
    try {
      return await this.dao.getUserLogsForDateRange(userId, startDate, endDate);
    } catch (error) {
      throw new Error(error.message || "Failed to fetch logs for date range");
    }
  }

  // ========== Categories Service Methods ==========

  /**
   * Get all categories
   * @returns {array} Array of categories
   */
  async getAllCategories() {
    try {
      return await this.dao.getAllCategories();
    } catch (error) {
      throw new Error(error.message || "Failed to fetch categories");
    }
  }

  /**
   * Get categories for a user (global + user's custom categories)
   * @param {number} userId - User ID
   * @returns {array} Array of categories (global first, then user's)
   */
  async getCategoriesForUser(userId) {
    try {
      return await this.dao.getCategoriesForUser(userId);
    } catch (error) {
      throw new Error(error.message || "Failed to fetch user categories");
    }
  }

  /**
   * Get category by ID
   * @param {number} id - Category ID
   * @returns {object} Category data
   */
  async getCategoryById(id) {
    try {
      return await this.dao.getCategoryById(id);
    } catch (error) {
      throw new Error(error.message || "Failed to fetch category");
    }
  }

  /**
   * Create a new category
   * @param {object} categoryData - Category data
   * @returns {object} Created category
   */
  async createCategory(categoryData) {
    try {
      return await this.dao.createCategory(categoryData);
    } catch (error) {
      throw new Error(error.message || "Failed to create category");
    }
  }

  /**
   * Update category by ID
   * @param {number} id - Category ID
   * @param {object} updates - Fields to update
   * @returns {object} Updated category
   */
  async updateCategory(id, updates) {
    try {
      return await this.dao.updateCategory(id, updates);
    } catch (error) {
      throw new Error(error.message || "Failed to update category");
    }
  }

  /**
   * Delete category by ID
   * @param {number} id - Category ID
   * @returns {object} Success message
   */
  async deleteCategory(id) {
    try {
      return await this.dao.deleteCategory(id);
    } catch (error) {
      throw new Error(error.message || "Failed to delete category");
    }
  }
}

export default Service;

import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useMemo,
  useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiService } from "../api/api";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  // Ensure boolean values are always proper booleans
  return {
    ...context,
    isAuthenticated:
      typeof context.isAuthenticated === "boolean"
        ? context.isAuthenticated
        : false,
    loading: typeof context.loading === "boolean" ? context.loading : true,
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Ensure boolean values are always booleans (explicit type checking)
  const loadingValue = typeof loading === "boolean" ? loading : true;
  const isAuthenticatedValue =
    typeof isAuthenticated === "boolean" ? isAuthenticated : false;

  // Define fetchUserProfile before it's used in useEffect
  const fetchUserProfile = useCallback(async () => {
    if (!accessToken) return;

    try {
      const profileData = await apiService.getCurrentUser();
      if (profileData) {
        setUserProfile(profileData);
        // Store profile in AsyncStorage for persistence
        await AsyncStorage.setItem("userProfile", JSON.stringify(profileData));
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      // Don't fail authentication if profile fetch fails
      // Profile might not exist for older accounts
    }
  }, [accessToken]);

  const refreshUserProfile = useCallback(async () => {
    await fetchUserProfile();
  }, [fetchUserProfile]);

  // Load tokens from storage on app start
  useEffect(() => {
    loadStoredAuth();
  }, []);

  // Fetch user profile when authenticated
  useEffect(() => {
    if (isAuthenticated && accessToken && user?.id) {
      fetchUserProfile();
    }
  }, [isAuthenticated, accessToken, user?.id, fetchUserProfile]);

  const loadStoredAuth = async () => {
    try {
      const storedAccessToken = await AsyncStorage.getItem("accessToken");
      const storedRefreshToken = await AsyncStorage.getItem("refreshToken");
      const storedUser = await AsyncStorage.getItem("user");
      const storedUserProfile = await AsyncStorage.getItem("userProfile");

      if (
        storedAccessToken &&
        storedRefreshToken &&
        storedAccessToken.length > 0 &&
        storedRefreshToken.length > 0
      ) {
        setAccessToken(storedAccessToken);
        setRefreshToken(storedRefreshToken);
        setUser(storedUser ? JSON.parse(storedUser) : null);
        // Load stored user profile if available
        if (storedUserProfile) {
          setUserProfile(JSON.parse(storedUserProfile));
        }
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("Error loading stored auth:", error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const result = await apiService.login(email, password);

      if (result.accessToken) {
        // Store tokens
        await AsyncStorage.setItem("accessToken", result.accessToken);
        await AsyncStorage.setItem("refreshToken", result.refreshToken);
        await AsyncStorage.setItem("user", JSON.stringify(result.user));

        setAccessToken(result.accessToken);
        setRefreshToken(result.refreshToken);
        setUser(result.user);
        setIsAuthenticated(true);

        // Fetch user profile after login
        // The useEffect will trigger this automatically, but we call it here
        // to ensure it happens immediately
        const profileData = await apiService.getCurrentUser().catch(() => null);
        if (profileData) {
          setUserProfile(profileData);
          await AsyncStorage.setItem("userProfile", JSON.stringify(profileData));
        }

        return { success: true };
      } else {
        return { success: false, message: result.message || "Login failed" };
      }
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message || error.message || "Login failed",
      };
    }
  };

  const register = async (
    username,
    password,
    email,
    phone,
    preferred_contact_method
  ) => {
    try {
      const result = await apiService.register(
        username,
        password,
        email,
        phone,
        preferred_contact_method
      );

      // If registration returns tokens directly, use them
      if (result.accessToken) {
        await AsyncStorage.setItem("accessToken", result.accessToken);
        await AsyncStorage.setItem("refreshToken", result.refreshToken);
        await AsyncStorage.setItem("user", JSON.stringify(result.user));

        setAccessToken(result.accessToken);
        setRefreshToken(result.refreshToken);
        setUser(result.user);
        setIsAuthenticated(true);

        // Fetch user profile after registration
        const profileData = await apiService.getCurrentUser().catch(() => null);
        if (profileData) {
          setUserProfile(profileData);
          await AsyncStorage.setItem("userProfile", JSON.stringify(profileData));
        }

        return { success: true };
      }
      // If registration is successful but no tokens, auto-login
      else if (result.message && result.message.includes("successfully")) {
        // Auto-login after successful registration
        const loginResult = await login(email, password);
        return loginResult;
      } else {
        return {
          success: false,
          message: result.message || "Registration failed",
        };
      }
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Registration failed",
      };
    }
  };

  const logout = async () => {
    try {
      // Call logout endpoint if you have one
      if (refreshToken) {
        await apiService.logout(refreshToken);
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Clear local storage
      await AsyncStorage.multiRemove([
        "accessToken",
        "refreshToken",
        "user",
        "userProfile",
      ]);
      setAccessToken(null);
      setRefreshToken(null);
      setUser(null);
      setUserProfile(null);
      setIsAuthenticated(false);
    }
  };

  const refreshAccessToken = async () => {
    try {
      if (!refreshToken) {
        throw new Error("No refresh token available");
      }

      const result = await apiService.refreshToken(refreshToken);

      if (result.accessToken) {
        await AsyncStorage.setItem("accessToken", result.accessToken);
        await AsyncStorage.setItem("refreshToken", result.refreshToken);
        setAccessToken(result.accessToken);
        setRefreshToken(result.refreshToken);
        return { success: true };
      } else {
        throw new Error("Token refresh failed");
      }
    } catch (error) {
      // If refresh fails, logout user
      await logout();
      return { success: false, message: "Session expired" };
    }
  };

  const value = useMemo(() => {
    // Ensure all values are properly typed
    return {
      user: user || null,
      userProfile: userProfile || null,
      accessToken: accessToken || null,
      refreshToken: refreshToken || null,
      isAuthenticated: Boolean(isAuthenticatedValue),
      loading: Boolean(loadingValue),
      login,
      register,
      logout,
      refreshAccessToken,
      refreshUserProfile,
    };
  }, [
    user,
    userProfile,
    accessToken,
    refreshToken,
    isAuthenticatedValue,
    loadingValue,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

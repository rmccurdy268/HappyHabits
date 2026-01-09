import dotenv from "dotenv";

const env = process.env.APP_ENV || process.env.EXPO_PUBLIC_ENV || "preview";

dotenv.config({
  path: `.env.${env}`,
});

export default ({ config }) => ({
  ...config,
  owner: "rhodric",
  name: "HappyHabits App",
  slug: "happyhabits-app",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  newArchEnabled: true,
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },

  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.rhodric.happyhabits", // must be set for iOS builds
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    edgeToEdgeEnabled: true,
    package: "com.rhodric.happyhabits", // must be set for Android builds
  },
  web: {
    favicon: "./assets/favicon.png",
  },

  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
    env: process.env.EXPO_PUBLIC_ENV,
    eas: {
      projectId: "8e02890a-f8d8-4739-b5d1-15eb30feaea7",
    },
  },
});

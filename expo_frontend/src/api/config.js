import { Platform } from "react-native";

// API Configuration
// For physical devices/emulators, replace 'localhost' with your computer's IP address
// Find your IP: macOS/Linux: `ifconfig` or `ipconfig` on Windows
// Example: 'http://192.168.1.100:3000'
const getBaseURL = () => {
  // Use localhost for web, but for iOS/Android simulators/emulators,
  // you may need to use your computer's IP address
  if (Platform.OS === "web") {
    return "http://localhost:3000";
  }

  // For iOS simulator, localhost works
  // For Android emulator, use 10.0.2.2 instead of localhost
  // For physical devices, use your computer's IP address
  if (Platform.OS === "android") {
    // Uncomment and set your computer's IP address for physical Android devices
    // return 'http://YOUR_COMPUTER_IP:3000';
    return "http://10.0.2.2:3000"; // Android emulator
  }

  // iOS simulator
  return "http://localhost:3000";
};

//export const API_BASE_URL = getBaseURL();

// You can also manually set the base URL here if needed
//export const API_BASE_URL = "https://192.168.1.229:3000";
export const API_BASE_URL = "https://happy-habits-backend.rhodric.com";

# HappyHabits Front End

React Native Expo app for HappyHabits.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm start
   ```

## API Integration

The app is configured to make API calls to the backend using axios.

### Configuration

- **API Config**: `src/api/config.js`
  - Configured to work with different platforms (web, iOS, Android)
  - For physical devices, you may need to update the IP address in `config.js`
  - Android emulator uses `10.0.2.2` instead of `localhost`
  - iOS simulator uses `localhost`

### Usage

Import the API service in your components:

```javascript
import { apiService } from './src/api/api';

// Make API calls
const data = await apiService.getData();
const testResult = await apiService.testConnection();
```

### Adding New API Endpoints

Add new functions to `src/api/api.js`:

```javascript
export const apiService = {
  // Your existing functions...
  
  // Add new endpoint
  getUsers: async () => {
    const response = await api.get('/api/users');
    return response.data;
  },
  
  createUser: async (userData) => {
    const response = await api.post('/api/users', userData);
    return response.data;
  },
};
```

### Backend Connection

Make sure your backend is running on port 3000:
- Web: `http://localhost:3000`
- Android Emulator: `http://10.0.2.2:3000`
- iOS Simulator: `http://localhost:3000`
- Physical Device: Update IP in `src/api/config.js` to your computer's IP address

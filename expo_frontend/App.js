import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import { apiService } from './src/api/api';

export default function App() {
  const [data, setData] = useState(null);
  const [testMessage, setTestMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Example: Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiService.getData();
      setData(result);
    } catch (err) {
      setError(err.message || 'Failed to fetch data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    try {
      setLoading(true);
      setError(null);
      setTestMessage('');
      const result = await apiService.testConnection();
      setTestMessage(result);
    } catch (err) {
      setError(err.message || 'Failed to test connection');
      console.error('Error testing connection:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>HappyHabits</Text>
      <StatusBar style="auto" />
      
      {loading && <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />}
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
          <Text style={styles.errorHint}>
            Make sure your backend is running on port 3000
          </Text>
        </View>
      )}

      <View style={styles.content}>
        <TouchableOpacity 
          style={styles.button} 
          onPress={testConnection}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Test Connection</Text>
        </TouchableOpacity>

        {testMessage && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultLabel}>Connection Test:</Text>
            <Text style={styles.resultText}>{testMessage}</Text>
          </View>
        )}

        <TouchableOpacity 
          style={styles.button} 
          onPress={fetchData}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Fetch Data</Text>
        </TouchableOpacity>

        {data && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultLabel}>API Data:</Text>
            <Text style={styles.resultText}>{JSON.stringify(data, null, 2)}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loader: {
    marginVertical: 20,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
    width: '100%',
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
  },
  errorHint: {
    color: '#c62828',
    fontSize: 12,
  },
  resultContainer: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
    width: '100%',
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
    color: '#333',
  },
  resultText: {
    fontSize: 12,
    color: '#666',
  },
});

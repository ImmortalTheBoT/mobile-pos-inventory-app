import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginUser } from '../api';

export default function LoginScreen({ navigation }) {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!userId || !password) {
      Alert.alert('Error', 'Please enter User ID and Password');
      return;
    }

    setIsLoading(true);
    const response = await loginUser(userId, password);
    setIsLoading(false);

    if (response.status === 'success') {
      // 1. Catch the exact Role sent from your Google Sheet (Column D)
      const userRole = response.user.role || 'Staff'; 

      // 2. Save BOTH the ID and the Role to the phone's memory
      await AsyncStorage.setItem('userRole', String(userRole));
      await AsyncStorage.setItem('userId', userId); 
      await AsyncStorage.setItem('userData', JSON.stringify({ userId, role: userRole }));
      
      // 3. Show welcome message 
      Alert.alert('Success', `Welcome ${response.user.name}!`, [
        { text: 'OK', onPress: () => navigation.replace('Main') }
      ]);
    } else {
      Alert.alert('Login Failed', 'Invalid credentials. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mata Di Fireworks</Text>
      <View style={styles.card}>
        <TextInput
          style={styles.input}
          placeholder="User ID"
          placeholderTextColor="#999"
          value={userId}
          onChangeText={setUserId}
          color="#000" // Forces text to be black
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#999"
          secureTextEntry={true}
          value={password}
          onChangeText={setPassword}
          color="#000" // Forces password dots to be black
        />
        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={isLoading}>
          {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', backgroundColor: '#f5f5f5', padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#d32f2f', textAlign: 'center', marginBottom: 30 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 10, elevation: 5 },
  input: { 
    borderWidth: 1, 
    borderColor: '#ccc', 
    borderRadius: 8, 
    padding: 12, 
    marginBottom: 15, 
    backgroundColor: '#fff',
    fontSize: 16
  },
  button: { backgroundColor: '#d32f2f', padding: 15, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});
import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Navigators
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import InventoryScreen from './src/screens/InventoryScreen';
import CartScreen from './src/screens/CartScreen';
import AdminScreen from './src/screens/AdminScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import FAQScreen from './src/screens/FAQScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// --- NEW BOTTOM TAB STRUCTURE ---
function MainTabs() {
  return (
    <Tab.Navigator 
      screenOptions={{ 
        headerStyle: { backgroundColor: '#d32f2f' }, 
        headerTintColor: '#fff',
        tabBarActiveTintColor: '#d32f2f',
        tabBarInactiveTintColor: 'gray',
        tabBarLabelStyle: { fontSize: 14, fontWeight: 'bold', paddingBottom: 5 },
        tabBarStyle: { height: 85, paddingBottom: 35, paddingTop: 5 } // Solves the overlap
      }}
    >
      <Tab.Screen 
        name="Inventory" 
        component={InventoryScreen} 
        options={{ title: 'Billing & Stock', tabBarIcon: () => <Text style={{fontSize: 20}}>🛒</Text> }} 
      />
      <Tab.Screen 
        name="Admin" 
        component={AdminScreen} 
        options={{ title: 'Management', tabBarIcon: () => <Text style={{fontSize: 20}}>⚙️</Text> }} 
      />
      {/* THE NEW DASHBOARD TAB */}
      <Tab.Screen 
        name="Reports" 
        component={ReportsScreen} 
        options={{ title: 'Analytics', tabBarIcon: () => <Text style={{fontSize: 20}}>📊</Text> }} 
      />
      <Tab.Screen 
        name="FAQ" 
        component={FAQScreen} 
        options={{ title: 'Help', tabBarIcon: () => <Text style={{fontSize: 20}}>ℹ️</Text> }} 
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState('Login');

  useEffect(() => {
    const checkLogin = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('userData');
        if (storedUser) {
          setInitialRoute('Main'); // Jumps straight to the Tabs if logged in
        }
      } catch (e) {
        console.error("Failed to fetch token");
      } finally {
        setIsLoading(false);
      }
    };
    checkLogin();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#d32f2f" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute}>
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        
        {/* The Tabs replace the standalone Inventory screen */}
        <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
        
        <Stack.Screen name="Cart" component={CartScreen} options={{ title: 'Checkout & Bill', headerStyle: { backgroundColor: '#d32f2f' }, headerTintColor: '#fff' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
import React, { useState } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import WelcomeScreen from './screens/WelcomeScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import AddMaterialScreen from './screens/AddMaterialScreen';
import CostCalculatorScreen from './screens/CostCalculatorScreen';
import InventoryScreen from './screens/InventoryScreen';
import PrintScreen from './screens/PrintScreen';
import MenuScreen from './screens/MenuScreen';
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { ActivityIndicator, View } from 'react-native';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const MyDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0d0d0d',
    card: '#181818',
    text: '#fff',
    border: '#222',
    primary: '#00e676',
  },
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#181818', borderTopColor: '#222', height: 70, paddingBottom: 8, marginBottom: 60 },
        tabBarActiveTintColor: '#00e676',
        tabBarInactiveTintColor: '#a0a0a0',
        tabBarLabelStyle: { fontWeight: 'bold', fontSize: 14, paddingVertical: 4 },
      }}
    >
      <Tab.Screen 
        name="Inicio"
        component={HomeScreen} 
        options={{
          tabBarIcon: ({ color }) => <FontAwesome name="home" size={28} color={color} />,
        }}
      />
      <Tab.Screen 
        name="Agregar"
        component={AddMaterialScreen} 
        options={{
          tabBarIcon: ({ color }) => <FontAwesome name="plus" size={28} color={color} />,
        }}
      />
      <Tab.Screen 
        name="Costos"
        component={CostCalculatorScreen} 
        options={{
          tabBarIcon: ({ color }) => <FontAwesome name="calculator" size={28} color={color} />,
        }}
      />
      <Tab.Screen 
        name="Inventario"
        component={InventoryScreen} 
        options={{
          tabBarIcon: ({ color }) => <FontAwesome name="archive" size={28} color={color} />,
        }}
      />
      <Tab.Screen 
        name="Historial"
        component={PrintScreen} 
        options={{
          tabBarIcon: ({ color }) => <FontAwesome name="print" size={28} color={color} />,
        }}
      />
      <Tab.Screen 
        name="Menú"
        component={MenuScreen} 
        options={{
          tabBarIcon: ({ color }) => <FontAwesome name="bars" size={28} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  // Carga explícita de las fuentes Ionicons, MaterialIcons y FontAwesome
  const [fontsLoaded] = useFonts({
    Ionicons: require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'),
    MaterialIcons: require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.ttf'),
    FontAwesome: require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome.ttf'),
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0d0d0d' }}>
        <ActivityIndicator size="large" color="#00e676" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={MyDarkTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0d0d0d' } }}>
        {!isLoggedIn ? (
          <>
            <Stack.Screen name="Welcome">
              {props => <WelcomeScreen {...props} goToLogin={() => props.navigation.navigate('Login')} />}
            </Stack.Screen>
            <Stack.Screen name="Login">
              {props => <LoginScreen {...props} onLogin={() => setIsLoggedIn(true)} goToRegister={() => props.navigation.navigate('Register')} />}
            </Stack.Screen>
            <Stack.Screen name="Register">
              {props => <RegisterScreen {...props} goToLogin={() => props.navigation.navigate('Login')} />}
            </Stack.Screen>
          </>
        ) : (
          <Stack.Screen name="MainTabs" component={MainTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

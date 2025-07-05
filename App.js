import React, { useState, useEffect } from 'react';
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
import { ActivityIndicator, View, Dimensions, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Obtener dimensiones de la pantalla
const { width, height } = Dimensions.get('window');
const isTablet = width >= 768 || height >= 1024;

// Función para detectar características del dispositivo Android
const getDeviceInfo = () => {
  const { width, height } = Dimensions.get('window');
  const isTablet = width >= 768 || height >= 1024;
  
  return {
    isTablet,
    hasGestureBar: height >= 800, // Dispositivos Android con gestos
  };
};

// Hook personalizado para manejar la experiencia de pantalla completa
const useFullScreenMode = () => {
  useEffect(() => {
    if (Platform.OS === 'android') {
      // La configuración de pantalla completa se maneja principalmente en app.json
      // No necesitamos configuraciones adicionales aquí
    }
  }, []);
};

// Componente personalizado para iconos de tabs
const TabIcon = ({ focusedName, unfocusedName, focused, size, color, useIonicons = false }) => {
  if (useIonicons) {
    return (
      <Ionicons 
        name={focused ? focusedName : unfocusedName} 
        size={size} 
        color={color} 
      />
    );
  }
  return (
    <MaterialIcons 
      name={focused ? focusedName : unfocusedName} 
      size={size} 
      color={color} 
    />
  );
};

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

function MainTabs({ setIsLoggedIn }) {
  const insets = useSafeAreaInsets();
  const deviceInfo = getDeviceInfo();
  
  // Configuración responsiva para las tabs
  const tabBarHeight = deviceInfo.isTablet ? 80 : 60;
  const iconSize = deviceInfo.isTablet ? 26 : 24; // Reducido de 32 a 26 para tablets
  const labelSize = deviceInfo.isTablet ? 13 : 12; // Reducido de 14 a 13 para tablets
  
  // Ajustar altura según el área segura y características del dispositivo
  const bottomInset = insets.bottom > 0 ? insets.bottom : 0;
  const adjustedTabBarHeight = tabBarHeight + bottomInset;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { 
          height: adjustedTabBarHeight,
          paddingTop: deviceInfo.isTablet ? 8 : 5, // Reducido de 10 a 8 para tablets
          backgroundColor: '#181818',
          borderTopColor: '#222',
          borderTopWidth: 1,
          // Configuración para Android con experiencia edge-to-edge
          elevation: 0,
          shadowOpacity: 0,
          // Para dispositivos Android con gestos, agregar padding extra
          paddingBottom: deviceInfo.hasGestureBar ? Math.max(bottomInset, 16) : bottomInset,
        },
        tabBarActiveTintColor: '#00e676',
        tabBarInactiveTintColor: '#888',
        tabBarLabelStyle: {
          fontSize: labelSize,
          fontWeight: '500',
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: deviceInfo.isTablet ? 3 : 2, // Reducido de 5 a 3 para tablets
        },
        // Mejorar la apariencia de las tabs
        tabBarItemStyle: {
          paddingVertical: deviceInfo.isTablet ? 2 : 4, // Reducido para tablets
        },
        tabBarPressColor: 'transparent',
        tabBarPressOpacity: 0.7,
      }}
    >
      <Tab.Screen 
        name="Inicio"
        component={HomeScreen} 
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon 
              focusedName="home" 
              unfocusedName="home-outline" 
              focused={focused} 
              size={iconSize} 
              color={color} 
              useIonicons={true}
            />
          ),
        }}
      />
      <Tab.Screen 
        name="Agregar"
        component={AddMaterialScreen} 
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon 
              focusedName="add-circle" 
              unfocusedName="add-circle-outline" 
              focused={focused} 
              size={iconSize} 
              color={color} 
              useIonicons={true}
            />
          ),
        }}
      />
      <Tab.Screen 
        name="Costos"
        component={CostCalculatorScreen} 
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon 
              focusedName="calculator" 
              unfocusedName="calculator-outline" 
              focused={focused} 
              size={iconSize} 
              color={color} 
              useIonicons={true}
            />
          ),
        }}
      />
      <Tab.Screen 
        name="Inventario"
        component={InventoryScreen} 
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon 
              focusedName="archive" 
              unfocusedName="archive-outline" 
              focused={focused} 
              size={iconSize} 
              color={color} 
              useIonicons={true}
            />
          ),
        }}
      />
      <Tab.Screen 
        name="Historial"
        component={PrintScreen} 
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon 
              focusedName="time" 
              unfocusedName="time-outline" 
              focused={focused} 
              size={iconSize} 
              color={color} 
              useIonicons={true}
            />
          ),
        }}
      />
      <Tab.Screen 
        name="Menú"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon 
              focusedName="menu" 
              unfocusedName="menu-outline" 
              focused={focused} 
              size={iconSize} 
              color={color} 
              useIonicons={true}
            />
          ),
        }}
      >
        {props => <MenuScreen {...props} setIsLoggedIn={setIsLoggedIn} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // Usar el hook de pantalla completa
  useFullScreenMode();
  
  // Carga explícita de las fuentes Ionicons, MaterialIcons y FontAwesome
  const [fontsLoaded] = useFonts({
    Ionicons: require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'),
    MaterialIcons: require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.ttf'),
    FontAwesome: require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome.ttf'),
  });

  if (!fontsLoaded) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0d0d0d' }}>
          <ActivityIndicator size="large" color="#00e676" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      {/* View para el fondo de la barra de estado */}
      <View style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        right: 0, 
        height: 50, 
        backgroundColor: '#0d0d0d',
        zIndex: 1000 
      }} />
      <StatusBar 
        style="light" 
        translucent={true}
        hidden={false}
      />
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
            <Stack.Screen name="MainTabs">
              {props => <MainTabs {...props} setIsLoggedIn={setIsLoggedIn} />}
            </Stack.Screen>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

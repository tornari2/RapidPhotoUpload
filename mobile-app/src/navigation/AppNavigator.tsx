import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

// Import screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

// Placeholder screens for Main tabs - will be implemented in subsequent tasks
import { View, Text, StyleSheet } from 'react-native';

const PlaceholderScreen = ({ title }: { title: string }) => (
  <View style={styles.placeholderContainer}>
    <Text style={styles.placeholderText}>{title}</Text>
    <Text style={styles.placeholderSubtext}>Coming soon in next tasks</Text>
  </View>
);

const HomeScreen = () => <PlaceholderScreen title="Home" />;
const GalleryScreen = () => <PlaceholderScreen title="Gallery" />;
const UploadScreen = () => <PlaceholderScreen title="Upload" />;
const ProfileScreen = () => <PlaceholderScreen title="Profile" />;

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Gallery: undefined;
  Upload: undefined;
  Profile: undefined;
};

const RootStack = createStackNavigator<RootStackParamList>();
const AuthStack = createStackNavigator<AuthStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();

const HEADER_SHOWN = false;

// Auth Navigator (Login, Register)
function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: HEADER_SHOWN,
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

// Main Navigator (Home, Gallery, Upload, Profile)
function MainNavigator() {
  return (
    <MainTab.Navigator
      screenOptions={{
        headerShown: HEADER_SHOWN,
        tabBarStyle: {
          backgroundColor: '#000',
          borderTopColor: '#333',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#8B5CF6',
        tabBarInactiveTintColor: '#666',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <MainTab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => {
            const iconSize = typeof size === 'number' ? size : 24;
            return <Ionicons name="home-outline" size={iconSize} color={color} />;
          },
        }}
      />
      <MainTab.Screen
        name="Gallery"
        component={GalleryScreen}
        options={{
          tabBarLabel: 'Gallery',
          tabBarIcon: ({ color, size }) => {
            const iconSize = typeof size === 'number' ? size : 24;
            return <Ionicons name="images-outline" size={iconSize} color={color} />;
          },
        }}
      />
      <MainTab.Screen
        name="Upload"
        component={UploadScreen}
        options={{
          tabBarLabel: 'Upload',
          tabBarIcon: ({ color, size }) => {
            const iconSize = typeof size === 'number' ? size : 24;
            return <Ionicons name="cloud-upload-outline" size={iconSize} color={color} />;
          },
        }}
      />
      <MainTab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => {
            const iconSize = typeof size === 'number' ? size : 24;
            return <Ionicons name="person-outline" size={iconSize} color={color} />;
          },
        }}
      />
    </MainTab.Navigator>
  );
}

// Root Navigator
export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  
  // Ensure boolean values
  const isAuth = Boolean(isAuthenticated);
  const isLoad = Boolean(isLoading);

  if (isLoad === true) {
    // Show loading screen
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: HEADER_SHOWN }}>
        {isAuth === true ? (
          <RootStack.Screen name="Main" component={MainNavigator} />
        ) : (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#F3F4F6',
  },
  placeholderContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  placeholderText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F3F4F6',
    marginBottom: 8,
  },
  placeholderSubtext: {
    fontSize: 16,
    color: '#9CA3AF',
  },
});

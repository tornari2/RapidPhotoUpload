import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { TextInput } from '../components/TextInput';
import { Button } from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';
import { AuthStackParamList } from '../navigation/AppNavigator';

type LoginScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const { login } = useAuth(); // Removed checkAuth - not needed

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: { username?: string; password?: string } = {};

    if (!username) {
      newErrors.username = 'Username is required';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.login({ username, password });
      
      // Update auth context - this sets the user and triggers navigation
      login(response.user);
      
      // No need to call checkAuth() - login() already set the user
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Provide more helpful error messages for network issues
      let errorMessage = error.message || 'Unable to login. Please check your credentials and try again.';
      
      if (error.message === 'Network Error' || error.code === 'ECONNABORTED') {
        errorMessage = 'Cannot connect to server. Please ensure:\n\n' +
          '1. The backend server is running\n' +
          '2. Your device/emulator can reach the server\n' +
          '3. Check the console for the API URL being used';
      }
      
      Alert.alert(
        'Login Failed',
        errorMessage
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Login to continue uploading photos</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <TextInput
              label="Username"
              placeholder="Enter your username"
              value={username}
              onChangeText={setUsername}
              error={errors.username}
              autoCapitalize="none"
              editable={!isLoading}
            />

            <TextInput
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              error={errors.password}
              secureTextEntry={true}
              editable={!isLoading}
            />

            <Button
              title={isLoading ? 'Logging in...' : 'Login'}
              onPress={handleLogin}
              variant="primary"
              size="large"
              loading={isLoading}
              disabled={isLoading}
              style={styles.loginButton}
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Register')}
              disabled={isLoading}
            >
              <Text style={styles.link}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  header: {
    marginBottom: 48,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F3F4F6',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  form: {
    marginBottom: 24,
  },
  loginButton: {
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  link: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '600',
  },
});


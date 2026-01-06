import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/lib/auth-store';
import type { User, Warehouse } from '@/lib/types';
import { API_ENDPOINTS } from '@/lib/api-config';

type RoleTab = 'attendant' | 'owner' | 'field_agent';

export default function LoginScreen() {
  const [selectedRole, setSelectedRole] = useState<RoleTab>('attendant');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const pinInputRef = useRef<TextInput>(null);
  const login = useAuthStore((s) => s.login);
  const router = useRouter();

  const handleSubmit = async () => {
    setError(null);
    setIsLoading(true);

    try {
      console.log('Attempting login to:', API_ENDPOINTS.LOGIN);
      console.log('Request body:', { phone, pin: '****', role: selectedRole === 'owner' ? 'OWNER' : selectedRole === 'field_agent' ? 'FIELD_AGENT' : 'ATTENDANT' });
      
      // Call real backend login API with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(API_ENDPOINTS.LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone,
          pin,
          role: selectedRole === 'owner' ? 'OWNER' : selectedRole === 'field_agent' ? 'FIELD_AGENT' : 'ATTENDANT',
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      console.log('Response status:', response.status);

      const data = await response.json();
      console.log('Response data:', { success: data.success, hasUser: !!data.data?.user });

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Login failed');
      }

      // Extract user, warehouse, and tokens from response
      const { user, warehouse, accessToken, refreshToken } = data.data;

      // Save to auth store
      login(user, warehouse, accessToken, refreshToken);

      // Navigate based on role
      if (user.role === 'OWNER') {
        router.replace('/owner');
      } else if (user.role === 'ATTENDANT') {
        router.replace('/attendant');
      } else if (user.role === 'FIELD_AGENT') {
        router.replace('/field-agent');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.name === 'AbortError') {
        setError('Request timeout. Please check your network connection.');
      } else if (err.message.includes('Network request failed')) {
        // Network error - unable to reach server
        setError('Cannot connect to server. Make sure you\'re on the same network and the backend is running at http://172.20.10.3:4000');
      } else if (err.message.includes('Invalid credentials')) {
        // Clear error from backend - wrong phone or PIN
        setError('Invalid phone number or PIN. Please check your credentials.');
      } else {
        // Other backend error
        setError(err.message || 'Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isValid = phone.length >= 10 && pin.length >= 4;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#e8f3ea" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
      
      {/* Logo Section */}
      <View style={styles.logoSection}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoIcon}>🏛️</Text>
        </View>
        <Text style={styles.appName}>GrainVault</Text>
        <Text style={styles.appTagline}>Warehouse Inventory</Text>
      </View>

      {/* Login Card */}
      <View style={styles.card}>
        {/* Role Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              selectedRole === 'attendant' && styles.tabActive,
            ]}
            onPress={() => setSelectedRole('attendant')}
            activeOpacity={0.7}
          >
            <View style={[
              styles.tabIconContainer,
              selectedRole === 'attendant' && styles.tabIconActive,
            ]}>
              <Text style={styles.tabIcon}>👤</Text>
            </View>
            <Text style={[
              styles.tabText,
              selectedRole === 'attendant' && styles.tabTextActive,
            ]}>
              Attendant
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              selectedRole === 'field_agent' && styles.tabActive,
            ]}
            onPress={() => setSelectedRole('field_agent')}
            activeOpacity={0.7}
          >
            <View style={[
              styles.tabIconContainer,
              selectedRole === 'field_agent' && styles.tabIconActive,
            ]}>
              <Text style={styles.tabIcon}>🌾</Text>
            </View>
            <Text style={[
              styles.tabText,
              selectedRole === 'field_agent' && styles.tabTextActive,
            ]}>
              Field Agent
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              selectedRole === 'owner' && styles.tabActive,
            ]}
            onPress={() => setSelectedRole('owner')}
            activeOpacity={0.7}
          >
            <View style={[
              styles.tabIconContainer,
              selectedRole === 'owner' && styles.tabIconActive,
            ]}>
              <Text style={styles.tabIcon}>👑</Text>
            </View>
            <Text style={[
              styles.tabText,
              selectedRole === 'owner' && styles.tabTextActive,
            ]}>
              Owner
            </Text>
          </TouchableOpacity>
        </View>

        {/* Phone Number Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            value={phone}
            onChangeText={(text) => {
              // Keep only digits and ensure leading zero is preserved
              const cleaned = text.replace(/[^0-9]/g, '');
              setPhone(cleaned);
            }}
            placeholder="0241234567 or 0201234567"
            placeholderTextColor="#c4c4c4"
            keyboardType="phone-pad"
            maxLength={15}
            style={styles.input}
            returnKeyType="next"
            onSubmitEditing={() => pinInputRef.current?.focus()}
            blurOnSubmit={false}
          />
        </View>
        
        {/* PIN Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>PIN</Text>
          <TextInput
            ref={pinInputRef}
            value={pin}
            onChangeText={(text) => {
              const numericOnly = text.replace(/[^0-9]/g, '');
              if (numericOnly.length <= 6) {
                setPin(numericOnly);
                setError(null);
              }
            }}
            placeholder="Enter 4-6 digit PIN"
            placeholderTextColor="#c4c4c4"
            keyboardType="number-pad"
            secureTextEntry
            maxLength={6}
            style={styles.input}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
        </View>

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Sign In Button */}
        <TouchableOpacity
          style={[styles.signInButton, !isValid && styles.signInButtonDisabled]}
          onPress={handleSubmit}
          disabled={!isValid}
          activeOpacity={0.8}
        >
          <Text style={styles.signInButtonText}>Sign In</Text>
        </TouchableOpacity>

        {/* Offline Notice */}
        <Text style={styles.offlineNotice}>
          Works offline - Syncs when connected
        </Text>
        
        {/* Test Credentials Hint */}
        <View style={styles.testCredsContainer}>
          <Text style={styles.testCredsTitle}>Test Accounts:</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            <View>
              <Text style={styles.testCredsLabel}>Attendant</Text>
              <Text style={styles.testCreds}>0241234567 / 1234</Text>
            </View>
            <View>
              <Text style={styles.testCredsLabel}>Field Agent</Text>
              <Text style={styles.testCreds}>0260006666 / 3333</Text>
            </View>
            <View>
              <Text style={styles.testCredsLabel}>Owner</Text>
              <Text style={styles.testCreds}>0201234567 / 5678</Text>
            </View>
          </View>
        </View>
      </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e8f3ea',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  logoSection: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 28,
    backgroundColor: '#d4e8d7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoIcon: {
    fontSize: 50,
  },
  appName: {
    fontSize: 36,
    fontWeight: '700',
    color: '#1a3a1f',
    marginBottom: 4,
  },
  appTagline: {
    fontSize: 17,
    color: '#6b8270',
  },
  card: {
    marginHorizontal: 24,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tabActive: {
    backgroundColor: '#e8f3ea',
    borderColor: '#d4e8d7',
  },
  tabIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#e8e8e8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  tabIconActive: {
    backgroundColor: '#d4e8d7',
  },
  tabIcon: {
    fontSize: 24,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666666',
    textAlign: 'center',
  },
  tabTextActive: {
    color: '#3d9448',
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    color: '#2d2d2d',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#fafafa',
    borderWidth: 1.5,
    borderColor: '#e8e8e8',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1a1a1a',
  },
  signInButton: {
    backgroundColor: '#3d9448',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#3d9448',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  signInButtonDisabled: {
    backgroundColor: '#c4c4c4',
    shadowOpacity: 0,
    elevation: 0,
  },
  signInButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
  offlineNotice: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 20,
  },
  testCredsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  testCredsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78716c',
    marginBottom: 6,
    textAlign: 'center',
  },
  testCreds: {
    fontSize: 10,
    color: '#a8a29e',
    textAlign: 'center',
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  testCredsLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#78716c',
    textAlign: 'center',
    marginBottom: 2,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorIcon: {
    fontSize: 16,
    marginRight: 8,
    marginTop: 2,
  },
  errorText: {
    flex: 1,
    color: '#b91c1c',
    fontSize: 13,
    lineHeight: 18,
  },
});

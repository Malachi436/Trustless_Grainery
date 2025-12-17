import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/lib/auth-store';

type UserRole = 'OWNER' | 'ATTENDANT';

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'warehouse' | 'user'>('warehouse');

  // Warehouse form
  const [warehouseName, setWarehouseName] = useState('');
  const [location, setLocation] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerPin, setOwnerPin] = useState('');

  // User form
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userPin, setUserPin] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('ATTENDANT');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            logout();
            router.replace('/login');
          },
        },
      ]
    );
  };

  const handleCreateWarehouse = async () => {
    if (!warehouseName || !location || !ownerName || !ownerPhone || !ownerPin) {
      Alert.alert('Missing Information', 'Please fill in all fields');
      return;
    }

    setIsSubmitting(true);

    try {
      // TODO: Replace with actual API call
      const response = await fetch('http://localhost:4000/api/admin/warehouses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.id}`, // TODO: Use actual JWT token
        },
        body: JSON.stringify({
          name: warehouseName,
          location,
          ownerName,
          ownerPhone,
          ownerPin,
        }),
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert(
          'Warehouse Created!',
          `Warehouse "${warehouseName}" has been created successfully.\n\nOwner: ${ownerName}\nPhone: ${ownerPhone}`,
          [{ text: 'OK' }]
        );
        
        // Clear form
        setWarehouseName('');
        setLocation('');
        setOwnerName('');
        setOwnerPhone('');
        setOwnerPin('');
      } else {
        throw new Error(data.error || 'Failed to create warehouse');
      }
    } catch (error) {
      console.error('Create warehouse failed:', error);
      Alert.alert(
        'Error',
        'Failed to create warehouse. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateUser = async () => {
    if (!userName || !userPhone || !userPin) {
      Alert.alert('Missing Information', 'Please fill in all fields');
      return;
    }

    if (userRole === 'ATTENDANT' && !selectedWarehouseId) {
      Alert.alert('Missing Information', 'Please select a warehouse for the attendant');
      return;
    }

    setIsSubmitting(true);

    try {
      // TODO: Replace with actual API call
      const response = await fetch('http://localhost:4000/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.id}`, // TODO: Use actual JWT token
        },
        body: JSON.stringify({
          name: userName,
          phone: userPhone,
          pin: userPin,
          role: userRole,
          warehouseId: userRole === 'ATTENDANT' ? selectedWarehouseId : null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert(
          'User Created!',
          `${userRole} "${userName}" has been created successfully.\n\nPhone: ${userPhone}`,
          [{ text: 'OK' }]
        );
        
        // Clear form
        setUserName('');
        setUserPhone('');
        setUserPin('');
      } else {
        throw new Error(data.error || 'Failed to create user');
      }
    } catch (error) {
      console.error('Create user failed:', error);
      Alert.alert(
        'Error',
        'Failed to create user. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerGreeting}>Admin Panel</Text>
            <Text style={styles.headerName}>Platform Administrator</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'warehouse' && styles.tabActive]}
            onPress={() => setActiveTab('warehouse')}
          >
            <Text style={[styles.tabText, activeTab === 'warehouse' && styles.tabTextActive]}>
              Create Warehouse
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'user' && styles.tabActive]}
            onPress={() => setActiveTab('user')}
          >
            <Text style={[styles.tabText, activeTab === 'user' && styles.tabTextActive]}>
              Add User
            </Text>
          </TouchableOpacity>
        </View>

        {/* Warehouse Form */}
        {activeTab === 'warehouse' && (
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Create New Warehouse</Text>
            <Text style={styles.formSubtitle}>
              Create a warehouse and onboard its owner
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Warehouse Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Main Warehouse"
                placeholderTextColor="#a8a29e"
                value={warehouseName}
                onChangeText={setWarehouseName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Location</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Accra, Ghana"
                placeholderTextColor="#a8a29e"
                value={location}
                onChangeText={setLocation}
              />
            </View>

            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>Owner Information</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Owner Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Sarah Mensah"
                placeholderTextColor="#a8a29e"
                value={ownerName}
                onChangeText={setOwnerName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Owner Phone</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 0201234567"
                placeholderTextColor="#a8a29e"
                keyboardType="phone-pad"
                value={ownerPhone}
                onChangeText={setOwnerPhone}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Owner PIN</Text>
              <TextInput
                style={styles.input}
                placeholder="4-digit PIN"
                placeholderTextColor="#a8a29e"
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
                value={ownerPin}
                onChangeText={setOwnerPin}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleCreateWarehouse}
              disabled={isSubmitting}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting ? 'Creating...' : 'Create Warehouse'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* User Form */}
        {activeTab === 'user' && (
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Add New User</Text>
            <Text style={styles.formSubtitle}>
              Onboard an owner or attendant
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Role</Text>
              <View style={styles.roleSelector}>
                <TouchableOpacity
                  style={[styles.roleOption, userRole === 'OWNER' && styles.roleOptionActive]}
                  onPress={() => setUserRole('OWNER')}
                >
                  <Text style={[styles.roleText, userRole === 'OWNER' && styles.roleTextActive]}>
                    Owner
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleOption, userRole === 'ATTENDANT' && styles.roleOptionActive]}
                  onPress={() => setUserRole('ATTENDANT')}
                >
                  <Text style={[styles.roleText, userRole === 'ATTENDANT' && styles.roleTextActive]}>
                    Attendant
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., James Okonkwo"
                placeholderTextColor="#a8a29e"
                value={userName}
                onChangeText={setUserName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 0241234567"
                placeholderTextColor="#a8a29e"
                keyboardType="phone-pad"
                value={userPhone}
                onChangeText={setUserPhone}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PIN</Text>
              <TextInput
                style={styles.input}
                placeholder="4-digit PIN"
                placeholderTextColor="#a8a29e"
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
                value={userPin}
                onChangeText={setUserPin}
              />
            </View>

            {userRole === 'ATTENDANT' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Warehouse</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Warehouse ID (from warehouse creation)"
                  placeholderTextColor="#a8a29e"
                  value={selectedWarehouseId}
                  onChangeText={setSelectedWarehouseId}
                />
              </View>
            )}

            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleCreateUser}
              disabled={isSubmitting}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting ? 'Creating...' : `Create ${userRole}`}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f4',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerGreeting: {
    fontSize: 14,
    color: '#78716c',
    marginBottom: 4,
  },
  headerName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1c1917',
  },
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderRadius: 10,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#dc2626',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginRight: 12,
    borderRadius: 12,
  },
  tabActive: {
    backgroundColor: '#3d9448',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#78716c',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  formContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 40,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1c1917',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 14,
    color: '#78716c',
    marginBottom: 24,
  },
  divider: {
    height: 1,
    backgroundColor: '#e7e5e4',
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1917',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#44403c',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f4',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1c1917',
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  roleOption: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#f5f5f4',
    borderRadius: 12,
  },
  roleOptionActive: {
    backgroundColor: '#3d9448',
  },
  roleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#78716c',
  },
  roleTextActive: {
    color: '#ffffff',
  },
  submitButton: {
    backgroundColor: '#3d9448',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#d6d3d1',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

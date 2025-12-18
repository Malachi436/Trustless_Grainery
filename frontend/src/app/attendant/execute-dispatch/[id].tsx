import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '@/lib/auth-store';
import { API_ENDPOINTS } from '@/lib/api-config';

export default function ExecuteDispatchScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { accessToken } = useAuthStore();
  const [request, setRequest] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  useEffect(() => {
    fetchRequest();
  }, [id]);

  const fetchRequest = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(API_ENDPOINTS.ATTENDANT_MY_REQUESTS, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        const foundRequest = data.data.find((r: any) => r.id === id);
        if (foundRequest) {
          setRequest(foundRequest);
        } else {
          Alert.alert('Error', 'Request not found');
          router.back();
        }
      } else {
        throw new Error(data.error || 'Failed to fetch request');
      }
    } catch (error) {
      console.error('Fetch request error:', error);
      Alert.alert('Error', 'Failed to load request details');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera access is needed to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleExecute = () => {
    if (!photoUri) {
      Alert.alert('Photo Required', 'Please take a photo for verification before executing dispatch.');
      return;
    }

    Alert.alert(
      'Confirm Dispatch',
      `Execute dispatch?
      
Crop: ${request?.cropType}
Quantity: ${request?.bags} bags
Buyer: ${request?.buyerName}
Photo: Attached`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Execute',
          style: 'default',
          onPress: executeDispatch,
        },
      ]
    );
  };

  const executeDispatch = async () => {
    try {
      setIsExecuting(true);

      const response = await fetch(API_ENDPOINTS.ATTENDANT_EXECUTE(id as string), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          photoProof: photoUri,
        }),
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert(
          'Dispatch Completed',
          'Stock has been dispatched successfully!',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/attendant'),
            },
          ]
        );
      } else {
        throw new Error(data.error || 'Failed to execute dispatch');
      }
    } catch (error: any) {
      console.error('Execute dispatch error:', error);
      Alert.alert('Error', error.message || 'Failed to execute dispatch');
    } finally {
      setIsExecuting(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3d9448" />
          <Text style={styles.loadingText}>Loading request...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!request) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Request not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f4" />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Execute Dispatch</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Request Details Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Request Details</Text>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Crop Type:</Text>
              <Text style={styles.detailValue}>{request.cropType}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Quantity:</Text>
              <Text style={styles.detailValue}>{request.bags} bags</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Buyer:</Text>
              <Text style={styles.detailValue}>{request.buyerName}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Phone:</Text>
              <Text style={styles.detailValue}>{request.buyerPhone}</Text>
            </View>

            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>Approved by Owner</Text>
            </View>
          </View>

          {/* Photo Verification */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Photo Verification</Text>
            <Text style={styles.photoHint}>Take a photo of the dispatch for verification</Text>

            {photoUri ? (
              <View style={styles.photoPreview}>
                <Image source={{ uri: photoUri }} style={styles.photoImage} />
                <TouchableOpacity
                  style={styles.retakeButton}
                  onPress={handleTakePhoto}
                  activeOpacity={0.7}
                >
                  <Text style={styles.retakeButtonText}>Retake Photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.photoButton}
                onPress={handleTakePhoto}
                activeOpacity={0.7}
              >
                <Text style={styles.photoButtonIcon}>📷</Text>
                <Text style={styles.photoButtonText}>Take Photo</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Bottom Action Button */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.executeButton, (!photoUri || isExecuting) && styles.executeButtonDisabled]}
            onPress={handleExecute}
            disabled={!photoUri || isExecuting}
            activeOpacity={0.7}
          >
            <Text style={styles.executeButtonText}>
              {isExecuting ? 'Executing...' : 'Complete Dispatch'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f4',
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#78716c',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#dc2626',
    marginBottom: 16,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3d9448',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e7e5e4',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: '#1c1917',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1c1917',
  },
  scrollView: {
    flex: 1,
  },
  card: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1c1917',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f4',
  },
  detailLabel: {
    fontSize: 15,
    color: '#78716c',
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1c1917',
  },
  statusBadge: {
    marginTop: 16,
    backgroundColor: '#dcfce7',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#16a34a',
  },
  photoHint: {
    fontSize: 14,
    color: '#78716c',
    marginBottom: 16,
  },
  photoButton: {
    backgroundColor: '#f5f5f4',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e7e5e4',
    borderStyle: 'dashed',
  },
  photoButtonIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  photoButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3d9448',
  },
  photoPreview: {
    alignItems: 'center',
  },
  photoImage: {
    width: '100%',
    height: 240,
    borderRadius: 12,
    marginBottom: 12,
  },
  retakeButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#f5f5f4',
    borderRadius: 8,
  },
  retakeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3d9448',
  },
  bottomBar: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e7e5e4',
  },
  executeButton: {
    backgroundColor: '#3d9448',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  executeButtonDisabled: {
    backgroundColor: '#d6d3d1',
  },
  executeButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
});

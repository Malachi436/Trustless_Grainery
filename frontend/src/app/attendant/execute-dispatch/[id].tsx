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
import { CameraView, useCameraPermissions } from 'expo-camera';
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
  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedBatches, setScannedBatches] = useState<string[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);

  useEffect(() => {
    fetchRequest();
    fetchAllocations();
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
        const foundRequest = data.data.find((r: any) => r.request_id === id);
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

  const fetchAllocations = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.ATTENDANT_BATCH_ALLOCATIONS(id as string), {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();
      if (data.success && data.data) {
        setAllocations(data.data);
      }
    } catch (error) {
      console.error('Fetch allocations error:', error);
      // Don't block if allocations fail - might be FIFO mode
    }
  };

  const handleScanQR = async () => {
    if (!permission) {
      Alert.alert('Loading', 'Camera permission is being loaded...');
      return;
    }
    if (!permission.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert('No Permission', 'Camera access is required to scan QR codes.');
        return;
      }
    }
    setShowScanner(true);
  };

  const handleBarCodeScanned = async (result: { data: string }) => {
    const data = result.data;
    setShowScanner(false);
    
    // Parse QR code data (it's JSON)
    let batchCode: string;
    try {
      const qrData = JSON.parse(data);
      batchCode = qrData.batch_code;
      if (!batchCode) {
        Alert.alert('Invalid QR', 'QR code does not contain batch information.');
        return;
      }
    } catch (error) {
      // If not JSON, assume it's just the batch code string
      batchCode = data;
    }
    
    // Check if already scanned
    if (scannedBatches.includes(batchCode)) {
      Alert.alert('Already Scanned', `Batch ${batchCode} has already been scanned.`);
      return;
    }

    // Verify QR code against allocations
    try {
      const response = await fetch(API_ENDPOINTS.ATTENDANT_BATCH_VERIFY(batchCode), {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const apiResult = await response.json();

      if (apiResult.success && apiResult.data) {
        const batch = apiResult.data;
        
        // Check if this batch is allocated to this request
        const isAllocated = allocations.some(a => a.batch_code === batchCode);
        
        if (allocations.length > 0 && !isAllocated) {
          Alert.alert('Wrong Batch', `Batch ${batchCode} is not allocated to this dispatch.`);
          return;
        }

        // Add to scanned batches
        setScannedBatches([...scannedBatches, batchCode]);
        Alert.alert('QR Verified', `Batch ${batchCode} verified successfully!`);
      } else {
        Alert.alert('Invalid QR', 'QR code not found in system.');
      }
    } catch (error) {
      console.error('QR verification error:', error);
      Alert.alert('Error', 'Failed to verify QR code.');
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
    // Check if QR scanning is required
    const requiredScans = allocations.length > 0 ? allocations.length : 1;
    if (scannedBatches.length < requiredScans) {
      Alert.alert(
        'QR Scan Required', 
        `Please scan QR codes for all batches (${scannedBatches.length}/${requiredScans} scanned).`
      );
      return;
    }

    if (!photoUri) {
      Alert.alert('Photo Required', 'Please take a photo for verification before executing dispatch.');
      return;
    }

    Alert.alert(
      'Confirm Dispatch',
      `Execute dispatch?
      
Crop: ${request?.crop}  
Quantity: ${request?.bag_quantity} bags
Buyer: ${request?.buyer_name || 'TBD'}  
Batches Scanned: ${scannedBatches.length}
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

      // Convert photo URI to base64
      const response = await fetch(photoUri!);
      const blob = await response.blob();
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        // Remove data URL prefix
        const base64String = base64data.split(',')[1];

        const apiResponse = await fetch(API_ENDPOINTS.ATTENDANT_EXECUTE(id as string), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            photoBase64: base64String,
          }),
        });

        const data = await apiResponse.json();

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
        setIsExecuting(false);
      };
      
      reader.onerror = () => {
        setIsExecuting(false);
        Alert.alert('Error', 'Failed to process photo');
      };
      
      reader.readAsDataURL(blob);
    } catch (error: any) {
      console.error('Execute dispatch error:', error);
      Alert.alert('Error', error.message || 'Failed to execute dispatch');
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
              <Text style={styles.detailValue}>{request.crop}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Quantity:</Text>
              <Text style={styles.detailValue}>{request.bag_quantity} bags</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Buyer:</Text>
              <Text style={styles.detailValue}>{request.buyer_name || 'TBD'}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Phone:</Text>
              <Text style={styles.detailValue}>{request.buyer_phone_updated || 'N/A'}</Text>
            </View>

            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>Approved by Owner</Text>
            </View>
          </View>

          {/* QR Code Scanning */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>QR Code Verification</Text>
            <Text style={styles.photoHint}>
              Scan {allocations.length > 0 ? allocations.length : 1} batch QR code(s)
            </Text>

            {scannedBatches.length > 0 && (
              <View style={styles.scannedList}>
                {scannedBatches.map((batch, index) => (
                  <View key={index} style={styles.scannedItem}>
                    <Text style={styles.scannedIcon}>✓</Text>
                    <Text style={styles.scannedText}>{batch}</Text>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={styles.scanButton}
              onPress={handleScanQR}
              activeOpacity={0.7}
            >
              <Text style={styles.scanButtonIcon}>📷</Text>
              <Text style={styles.scanButtonText}>
                {scannedBatches.length > 0 ? 'Scan Another' : 'Scan QR Code'}
              </Text>
            </TouchableOpacity>

            <View style={styles.scanProgress}>
              <Text style={styles.scanProgressText}>
                {scannedBatches.length}/{allocations.length > 0 ? allocations.length : 1} scanned
              </Text>
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

      {/* QR Scanner Modal */}
      {showScanner && (
        <View style={styles.scannerContainer}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            onBarcodeScanned={handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
          />
          <View style={styles.scannerOverlay}>
            <Text style={styles.scannerTitle}>Scan Batch QR Code</Text>
            <TouchableOpacity
              style={styles.scannerClose}
              onPress={() => setShowScanner(false)}
            >
              <Text style={styles.scannerCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
  scannedList: {
    marginBottom: 16,
  },
  scannedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  scannedIcon: {
    fontSize: 18,
    color: '#16a34a',
    marginRight: 8,
    fontWeight: '700',
  },
  scannedText: {
    fontSize: 15,
    color: '#166534',
    fontWeight: '600',
  },
  scanButton: {
    backgroundColor: '#3d9448',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  scanButtonIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  scanButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  scanProgress: {
    marginTop: 12,
    alignItems: 'center',
  },
  scanProgressText: {
    fontSize: 14,
    color: '#78716c',
  },
  scannerContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  scannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
  },
  scannerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
  },
  scannerClose: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  scannerCloseText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

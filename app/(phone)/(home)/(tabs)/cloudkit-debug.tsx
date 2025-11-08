import React, { useState } from 'react';
import { View, Text, Alert, ScrollView, TouchableOpacity } from 'react-native';
import CloudKitSyncService from '@/services/CloudKitSyncService';
import WatchConnectivityService from '@/services/WatchConnectivityService';
import { useAppContext } from '@/contexts/AppContext';
import { useCleanup } from '@/hooks/useCleanup';

export default function CloudKitDebugScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const { userId } = useAppContext();
  const { cleanup } = useCleanup();

  const Button = ({ onPress, disabled, style, children, backgroundColor = '#007AFF' }: {
    onPress: () => void;
    disabled?: boolean;
    style?: any;
    children: React.ReactNode;
    backgroundColor?: string;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={{
        backgroundColor: disabled ? '#cccccc' : backgroundColor,
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        ...style,
      }}
    >
      <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
        {children}
      </Text>
    </TouchableOpacity>
  );

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    setLogs(prev => [logMessage, ...prev].slice(0, 20)); // Keep last 20 logs
  };

  const handleSyncBuckets = async () => {
    setIsLoading(true);
    try {
      addLog('🪣 Starting bucket sync to CloudKit...');
      const result = await CloudKitSyncService.syncBucketsToCloudKit();
      addLog(`🪣 Bucket sync result: success=${result.success}, count=${result.count}`);
      
      if (result.success) {
        Alert.alert('Success', `Synced ${result.count} buckets to CloudKit`);
      } else {
        Alert.alert('Error', 'Failed to sync buckets to CloudKit');
      }
    } catch (error) {
      addLog(`🪣 ❌ Bucket sync error: ${error}`);
      Alert.alert('Error', `Bucket sync failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncNotifications = async () => {
    setIsLoading(true);
    try {
      addLog('📱 Starting notification sync to CloudKit...');
      const result = await CloudKitSyncService.syncNotificationsToCloudKit();
      addLog(`📱 Notification sync result: success=${result.success}, count=${result.count}`);
      
      if (result.success) {
        Alert.alert('Success', `Synced ${result.count} notifications to CloudKit`);
      } else {
        Alert.alert('Error', 'Failed to sync notifications to CloudKit');
      }
    } catch (error) {
      addLog(`📱 ❌ Notification sync error: ${error}`);
      Alert.alert('Error', `Notification sync failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFullSync = async () => {
    setIsLoading(true);
    try {
      addLog('☁️ Starting full sync to CloudKit...');
      const result = await CloudKitSyncService.syncAllToCloudKit();
      addLog(`☁️ Full sync result: success=${result.success}, buckets=${result.bucketsCount}, notifications=${result.notificationsCount}`);
      
      if (result.success) {
        Alert.alert('Success', `Synced ${result.bucketsCount} buckets and ${result.notificationsCount} notifications to CloudKit`);
        
        // Notify Watch of update
        try {
          addLog('⌚ Notifying Apple Watch of update...');
          await WatchConnectivityService.notifyWatchOfUpdate();
          addLog('⌚ ✅ Successfully notified Apple Watch');
        } catch (watchError) {
          addLog(`⌚ ⚠️ Failed to notify Watch: ${watchError}`);
        }
      } else {
        Alert.alert('Error', 'Failed to sync to CloudKit');
      }
    } catch (error) {
      addLog(`☁️ ❌ Full sync error: ${error}`);
      Alert.alert('Error', `Full sync failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupSubscriptions = async () => {
    setIsLoading(true);
    try {
      addLog('🔔 Setting up CloudKit subscriptions...');
      const success = await CloudKitSyncService.setupSubscriptions();
      addLog(`🔔 Subscription setup result: ${success}`);
      
      if (success) {
        Alert.alert('Success', 'CloudKit subscriptions set up successfully');
      } else {
        Alert.alert('Error', 'Failed to set up CloudKit subscriptions');
      }
    } catch (error) {
      addLog(`🔔 ❌ Subscription setup error: ${error}`);
      Alert.alert('Error', `Subscription setup failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCleanup = async () => {
    setIsLoading(true);
    try {
      addLog('🧹 Starting cleanup (includes CloudKit sync)...');
      await cleanup({ immediate: true });
      addLog('🧹 ✅ Cleanup completed');
      Alert.alert('Success', 'Cleanup completed successfully');
    } catch (error) {
      addLog(`🧹 ❌ Cleanup error: ${error}`);
      Alert.alert('Error', `Cleanup failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  if (!userId) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 18, textAlign: 'center' }}>
          Please log in to access CloudKit debugging tools
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' }}>
        CloudKit Debug Tools
      </Text>
      
      <Text style={{ fontSize: 16, marginBottom: 20, textAlign: 'center', opacity: 0.7 }}>
        Use these tools to manually trigger CloudKit operations and diagnose sync issues.
      </Text>

      <View style={{ gap: 16, marginBottom: 30 }}>
        <Button
          onPress={handleSetupSubscriptions}
          disabled={isLoading}
        >
          🔔 Setup CloudKit Subscriptions
        </Button>

        <Button
          onPress={handleSyncBuckets}
          disabled={isLoading}
        >
          🪣 Sync Buckets to CloudKit
        </Button>

        <Button
          onPress={handleSyncNotifications}
          disabled={isLoading}
        >
          📱 Sync Notifications to CloudKit
        </Button>

        <Button
          onPress={handleFullSync}
          disabled={isLoading}
          backgroundColor="#34C759"
        >
          ☁️ Full Sync to CloudKit + Notify Watch
        </Button>

        <Button
          onPress={handleCleanup}
          disabled={isLoading}
          backgroundColor="#FF9500"
        >
          🧹 Run Full Cleanup (Recommended)
        </Button>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Debug Logs</Text>
        <Button 
          onPress={clearLogs} 
          style={{ paddingHorizontal: 12, paddingVertical: 8 }}
          backgroundColor="#FF3B30"
        >
          Clear
        </Button>
      </View>
      
      <View style={{ 
        backgroundColor: '#f5f5f5', 
        padding: 15, 
        borderRadius: 8, 
        minHeight: 200,
        maxHeight: 400 
      }}>
        {logs.length === 0 ? (
          <Text style={{ fontStyle: 'italic', opacity: 0.5 }}>No logs yet...</Text>
        ) : (
          <ScrollView>
            {logs.map((log, index) => (
              <Text key={index} style={{ fontSize: 12, fontFamily: 'monospace', marginBottom: 4 }}>
                {log}
              </Text>
            ))}
          </ScrollView>
        )}
      </View>
      
      <View style={{ marginTop: 20, padding: 15, backgroundColor: '#fff3cd', borderRadius: 8, borderColor: '#ffeaa7', borderWidth: 1 }}>
        <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>💡 Troubleshooting Tips:</Text>
        <Text style={{ fontSize: 14, lineHeight: 20 }}>
          1. First, run "Setup CloudKit Subscriptions"{'\n'}
          2. Then run "Full Sync to CloudKit + Notify Watch"{'\n'}
          3. Check your Watch app - it should now see the data{'\n'}
          4. If still not working, run "Run Full Cleanup" and wait 30 seconds{'\n'}
          5. Make sure you have notifications and buckets in your iOS app first
        </Text>
      </View>
    </ScrollView>
  );
}
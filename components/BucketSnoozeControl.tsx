import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useBucketSnooze } from '../hooks/useUserBuckets';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { Button } from './ui/Button';

interface BucketSnoozeControlProps {
  bucketId: string;
  bucketName: string;
}

export const BucketSnoozeControl: React.FC<BucketSnoozeControlProps> = ({ 
  bucketId, 
  bucketName 
}) => {
  const { isSnoozed, loading, setSnooze, settingSnooze } = useBucketSnooze(bucketId);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const handleSetSnooze = async (date: Date) => {
    try {
      await setSnooze(date.toISOString());
      setShowDatePicker(false);
      Alert.alert('Success', `Bucket "${bucketName}" snoozed until ${date.toLocaleString()}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to set bucket snooze');
    }
  };

  const handleRemoveSnooze = async () => {
    try {
      await setSnooze(null);
      Alert.alert('Success', `Snooze removed from bucket "${bucketName}"`);
    } catch (error) {
      Alert.alert('Error', 'Failed to remove bucket snooze');
    }
  };

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
      handleSetSnooze(date);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Loading snooze status...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>Snooze Control for "{bucketName}"</ThemedText>
      
      <View style={styles.statusContainer}>
        <ThemedText style={styles.statusLabel}>Status:</ThemedText>
        <ThemedText style={[styles.status, isSnoozed ? styles.snoozed : styles.active]}>
          {isSnoozed ? 'Snoozed' : 'Active'}
        </ThemedText>
      </View>

      <View style={styles.buttonContainer}>
        {!isSnoozed ? (
          <Button
            title="Set Snooze"
            onPress={() => setShowDatePicker(true)}
            disabled={settingSnooze}
            loading={settingSnooze}
          />
        ) : (
          <Button
            title="Remove Snooze"
            onPress={handleRemoveSnooze}
            disabled={settingSnooze}
            loading={settingSnooze}
            variant="destructive"
          />
        )}
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="datetime"
          display="default"
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 8,
    marginVertical: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 16,
    marginRight: 8,
  },
  status: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  snoozed: {
    color: '#FF6B6B',
  },
  active: {
    color: '#4ECDC4',
  },
  buttonContainer: {
    alignItems: 'center',
  },
});

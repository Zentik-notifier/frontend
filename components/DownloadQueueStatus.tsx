import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { useDownloadQueue } from '../hooks/useDownloadQueue';

export const DownloadQueueStatus: React.FC = () => {
    const { queueState, clearQueue } = useDownloadQueue();

    if (queueState.totalItems === 0 && !queueState.isProcessing) {
        return null;
    }

    return (
        <View style={styles.container}>
            <View style={styles.statusContainer}>
                <Text style={styles.title}>Download Queue</Text>
                <View style={styles.statsContainer}>
                    <Text style={styles.stat}>
                        In coda: {queueState.totalItems}
                    </Text>
                    <Text style={styles.stat}>
                        Completati: {queueState.completedItems}
                    </Text>
                    <Text style={styles.stat}>
                        Falliti: {queueState.failedItems}
                    </Text>
                </View>
                {queueState.isProcessing && (
                    <Text style={styles.processing}>Elaborazione in corso...</Text>
                )}
            </View>
            {queueState.totalItems > 0 && (
                <TouchableOpacity style={styles.clearButton} onPress={clearQueue}>
                    <Text style={styles.clearButtonText}>Cancella coda</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.background,
        padding: 16,
        borderRadius: 8,
        margin: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    statusContainer: {
        marginBottom: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: 8,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    stat: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    processing: {
        fontSize: 14,
        color: Colors.primary,
        fontStyle: 'italic',
    },
    clearButton: {
        backgroundColor: Colors.error,
        padding: 8,
        borderRadius: 4,
        alignItems: 'center',
    },
    clearButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '500',
    },
});

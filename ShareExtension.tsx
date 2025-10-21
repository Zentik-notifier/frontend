import { getAccessToken, getStoredApiEndpoint, getStoredLocale } from '@/services/auth-storage';
import { getAllBuckets, saveBuckets, BucketData } from '@/db/repositories/buckets-repository';
import { Locale, useI18n } from '@/hooks/useI18n';
import { i18nService } from '@/services/i18n';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useState } from "react";
import { 
  ActivityIndicator, 
  Alert, 
  Dimensions,
  ScrollView,
  StyleSheet, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  View 
} from "react-native";

interface Bucket extends BucketData {
  color?: string | null;
  iconAttachmentUuid?: string | null;
}

const BUCKET_SIZE = 80;
const BUCKETS_PER_ROW = 3;
const SCREEN_WIDTH = Dimensions.get('window').width;

interface ShareExtensionProps {
  url: string;
}

export default function ShareExtension({ url }: ShareExtensionProps) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<Bucket | null>(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState(url || '');
  const [error, setError] = useState<string | null>(null);
  const [localeInitialized, setLocaleInitialized] = useState(false);

  // Initialize locale from keychain (shared via App Groups)
  useEffect(() => {
    const initializeLocale = async () => {
      try {
        // getStoredLocale reads from keychain with accessGroup, allowing cross-app data sharing
        const storedLocale = await getStoredLocale();
        
        // Validate and fallback to default locale
        const isValidLocale = (locale: string): locale is Locale => {
          return locale === 'en-EN' || locale === 'it-IT';
        };
        
        const locale: Locale = (storedLocale && isValidLocale(storedLocale)) ? storedLocale : 'en-EN';
        
        await i18nService.setLocale(locale);
        setLocaleInitialized(true);
      } catch (error) {
        console.error('[ShareExtension] Failed to initialize locale:', error);
        setLocaleInitialized(true);
      }
    };

    initializeLocale();
  }, []);

  const loadBuckets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await getAccessToken();
      const api = await getStoredApiEndpoint();

      if (!token || !api) {
        setError(t('shareExtension.notAuthenticated'));
        setLoading(false);
        return;
      }

      setApiUrl(api);

      // Prima carica dalla cache locale (SQLite/IndexedDB) per un'esperienza più veloce
      const cachedBuckets = await getAllBuckets();
      if (cachedBuckets && cachedBuckets.length > 0) {
        console.log('[ShareExtension] Loading buckets from local DB cache');
        setBuckets(cachedBuckets as Bucket[]);
        setSelectedBucket(cachedBuckets[0] as Bucket);
        setLoading(false);
      }

      // Poi carica dal server in background per aggiornare la cache
      console.log('[ShareExtension] Fetching fresh buckets from server');
      setRefreshing(true);
      
      try {
        const response = await fetch(`${api}/api/v1/buckets`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to load buckets: ${response.status}`);
        }

        const freshBuckets: Bucket[] = await response.json();
        
        // Salva nella cache locale (SQLite/IndexedDB)
        await saveBuckets(freshBuckets);
        
        // Aggiorna l'UI solo se non avevamo cache o se i bucket sono diversi
        if (!cachedBuckets || cachedBuckets.length === 0 || 
            JSON.stringify(cachedBuckets) !== JSON.stringify(freshBuckets)) {
          console.log('[ShareExtension] Updating UI with fresh buckets');
          setBuckets(freshBuckets);
          
          if (freshBuckets.length > 0) {
            // Mantieni la selezione se il bucket esiste ancora, altrimenti seleziona il primo
            const currentSelected = selectedBucket;
            const stillExists = currentSelected && freshBuckets.find((b: Bucket) => b.id === currentSelected.id);
            setSelectedBucket(stillExists ? currentSelected : freshBuckets[0]);
          }
        }
      } finally {
        setRefreshing(false);
      }

    } catch (err: any) {
      console.error('[ShareExtension] Error loading buckets:', err);
      
      // Se abbiamo cache e c'è un errore di rete, usa la cache
      const cachedBuckets = await getAllBuckets();
      if (cachedBuckets && cachedBuckets.length > 0) {
        console.log('[ShareExtension] Using cached buckets from local DB due to network error');
        setBuckets(cachedBuckets as Bucket[]);
        setSelectedBucket(cachedBuckets[0] as Bucket);
        setError(null);
      } else {
        setError(err.message || 'Failed to load buckets');
      }
    } finally {
      setLoading(false);
    }
  }, [t]);

  // Load buckets after locale is initialized
  useEffect(() => {
    if (localeInitialized) {
      loadBuckets();
    }
  }, [localeInitialized, loadBuckets]);

  const sendMessage = async () => {
    if (!title.trim()) {
      Alert.alert(t('common.error'), t('shareExtension.errors.titleRequired'));
      return;
    }

    if (!selectedBucket) {
      Alert.alert(t('common.error'), t('shareExtension.errors.bucketRequired'));
      return;
    }

    try {
      setSending(true);
      setError(null);

      const token = await getAccessToken();
      const apiUrl = await getStoredApiEndpoint();

      if (!token || !apiUrl) {
        Alert.alert(t('common.error'), t('shareExtension.errors.notAuthenticated'));
        return;
      }

      const payload = {
        title: title.trim(),
        body: message.trim() || undefined,
        bucketId: selectedBucket.id,
        deliveryType: 'normal',
      };

      const response = await fetch(`${apiUrl}/api/v1/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to send message: ${response.status}`);
      }

      Alert.alert(t('shareExtension.success.title'), t('shareExtension.success.message'), [
        { text: t('common.ok'), onPress: () => {} }
      ]);

      setTitle('');
      setMessage('');
    } catch (err: any) {
      console.error('[ShareExtension] Error sending message:', err);
      Alert.alert(t('common.error'), err.message || t('shareExtension.errors.sendFailed'));
    } finally {
      setSending(false);
    }
  };

  const renderBucketIcon = (bucket: Bucket) => {
    const backgroundColor = bucket.color || '#6200EE';
    const initials = bucket.name.substring(0, 2).toUpperCase();

    // Priority: iconAttachmentUuid > icon URL > color + initials
    if (bucket.iconAttachmentUuid && apiUrl) {
      const iconUrl = `${apiUrl}/api/v1/attachments/${bucket.iconAttachmentUuid}/download/public`;
      return (
        <Image
          source={{ uri: iconUrl }}
          style={styles.bucketIcon}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      );
    } else if (bucket.icon && bucket.icon.startsWith('http')) {
      return (
        <Image
          source={{ uri: bucket.icon }}
          style={styles.bucketIcon}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      );
    } else {
      // Fallback: colored circle with initials
      return (
        <View style={[styles.bucketIcon, { backgroundColor }]}>
          <Text style={styles.bucketInitial}>{initials}</Text>
        </View>
      );
    }
  };

  const renderBucket = (bucket: Bucket, index: number) => {
    const isSelected = selectedBucket?.id === bucket.id;

    return (
      <TouchableOpacity
        key={bucket.id}
        style={[
          styles.bucketItem,
          isSelected && styles.bucketItemSelected
        ]}
        onPress={() => setSelectedBucket(bucket)}
      >
        {renderBucketIcon(bucket)}
        <Text 
          style={styles.bucketName} 
          numberOfLines={1}
        >
          {bucket.name}
        </Text>
      </TouchableOpacity>
    );
  };

  const [apiUrl, setApiUrl] = useState<string | null>(null);

  // Wait for locale to be initialized before showing any translated content
  if (!localeInitialized) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6200EE" />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6200EE" />
        <Text style={styles.loadingText}>{t('shareExtension.loading')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadBuckets}>
          <Text style={styles.retryButtonText}>{t('shareExtension.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (buckets.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{t('shareExtension.noBuckets')}</Text>
        <Text style={styles.helperText}>
          {t('shareExtension.noBucketsHelper')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentContainer}
      >
        <View style={styles.headerContainer}>
          <Text style={styles.header}>{t('shareExtension.header')}</Text>
          {refreshing && (
            <View style={styles.refreshIndicator}>
              <ActivityIndicator size="small" color="#6200EE" />
              <Text style={styles.refreshText}>{t('shareExtension.updating')}</Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionLabel}>{t('shareExtension.selectBucket')}</Text>
        
        <View style={styles.bucketsGrid}>
          {buckets.map((bucket, index) => renderBucket(bucket, index))}
        </View>
      </ScrollView>

      <View style={styles.stickyForm}>
        <View style={styles.formSection}>
          <Text style={styles.formLabel}>{t('shareExtension.titleRequired')}</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder={t('shareExtension.titlePlaceholder')}
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.formSection}>
          <Text style={styles.formLabel}>{t('shareExtension.messageLabel')}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={message}
            onChangeText={setMessage}
            placeholder={t('shareExtension.messagePlaceholder')}
            placeholderTextColor="#999"
            multiline
            numberOfLines={3}
          />
        </View>

        <TouchableOpacity
          style={[styles.sendButton, sending && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendButtonText}>{t('shareExtension.sendButton')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 16,
    paddingBottom: 320,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
  },
  refreshIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  refreshText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#6200EE',
    fontWeight: '500',
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#000',
  },
  bucketsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 16,
  },
  bucketItem: {
    width: (SCREEN_WIDTH - 64) / BUCKETS_PER_ROW,
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 3,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bucketItemSelected: {
    borderColor: '#6200EE',
    backgroundColor: '#F3E5F5',
    shadowOpacity: 0.2,
    elevation: 5,
  },
  bucketIcon: {
    width: BUCKET_SIZE,
    height: BUCKET_SIZE,
    borderRadius: BUCKET_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  bucketInitial: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  bucketName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  stickyForm: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  formSection: {
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: '#000',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#000',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  sendButton: {
    backgroundColor: '#6200EE',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 16,
  },
  helperText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#6200EE',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
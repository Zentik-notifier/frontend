import { Colors } from '@/constants/Colors';
import { useI18n } from '@/hooks/useI18n';
import { useColorScheme } from '@/hooks/useTheme';
import { getLegalDocumentContent, type LegalDocument } from '@/services/legal-documents';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Markdown from 'react-native-markdown-display';
import { ThemedText } from './ThemedText';
import { Button } from './ui';

interface LegalDocumentViewerProps {
  document: LegalDocument;
  visible: boolean;
  onClose: () => void;
}

export const LegalDocumentViewer: React.FC<LegalDocumentViewerProps> = ({
  document,
  visible,
  onClose,
}) => {
  const { t } = useI18n();
  const colorScheme = useColorScheme();
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (visible && document) {
      loadDocument();
    }
  }, [visible, document]);

  const loadDocument = async () => {
    setLoading(true);
    try {
      const documentContent = await getLegalDocumentContent(document.fileName);
      setContent(documentContent);
    } catch (error) {
      console.error('Error loading document:', error);
      setContent(`# Error\n\nCould not load ${document.title}`);
    } finally {
      setLoading(false);
    }
  };

  const markdownStyles = {
    body: {
      color: Colors[colorScheme].text,
      fontSize: 16,
      lineHeight: 24,
    },
    heading1: {
      color: Colors[colorScheme].text,
      fontSize: 24,
      fontWeight: 'bold' as const,
      marginBottom: 16,
    },
    heading2: {
      color: Colors[colorScheme].text,
      fontSize: 20,
      fontWeight: 'bold' as const,
      marginBottom: 12,
      marginTop: 24,
    },
    paragraph: {
      color: Colors[colorScheme].text,
      marginBottom: 12,
    },
    strong: {
      color: Colors[colorScheme].text,
      fontWeight: 'bold' as const,
    },
    list_item: {
      color: Colors[colorScheme].text,
      marginBottom: 4,
    },
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
    >
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: Colors[colorScheme].background },
        ]}
      >
        <View
          style={[
            styles.header,
            { borderBottomColor: Colors[colorScheme].border },
          ]}
        >
          <ThemedText style={styles.title}>{document.title}</ThemedText>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Ionicons
              name="close"
              size={24}
              color={Colors[colorScheme].text}
            />
          </Pressable>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={true}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ThemedText>{t('common.loading')}</ThemedText>
            </View>
          ) : (
            <Markdown style={markdownStyles}>{content}</Markdown>
          )}
        </ScrollView>

        <View
          style={[
            styles.footer,
            { borderTopColor: Colors[colorScheme].border },
          ]}
        >
          <Button
            title={t('common.close')}
            onPress={onClose}
            variant="outline"
            size="large"
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
});

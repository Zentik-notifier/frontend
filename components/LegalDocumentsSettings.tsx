import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Colors } from '../constants/Colors';
import { useI18n } from '../hooks/useI18n';
import { useColorScheme } from '../hooks/useTheme';
import { LEGAL_DOCUMENTS } from '../services/legal-documents';
import { LegalDocumentViewer } from './LegalDocumentViewer';

export const LegalDocumentsSettings: React.FC = () => {
  const { t } = useI18n();
  const colorScheme = useColorScheme();
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [viewerVisible, setViewerVisible] = useState(false);

  const openDocument = (document: any) => {
    setSelectedDocument(document);
    setViewerVisible(true);
  };

  const closeViewer = () => {
    setViewerVisible(false);
    setSelectedDocument(null);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: Colors[colorScheme].text }]}>
        {t('legal.allDocuments')}
      </Text>
      
      {LEGAL_DOCUMENTS.map((document) => (
        <TouchableOpacity
          key={document.id}
          style={[
            styles.documentItem,
            {
              backgroundColor: Colors[colorScheme].backgroundSecondary,
              borderColor: Colors[colorScheme].border,
            },
          ]}
          onPress={() => openDocument(document)}
        >
          <View style={styles.documentInfo}>
            <Ionicons
              name={document.icon}
              size={20}
              color={Colors[colorScheme].tint}
              style={styles.documentIcon}
            />
            <Text style={[styles.documentTitle, { color: Colors[colorScheme].text }]}>
              {document.title}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={Colors[colorScheme].textSecondary}
          />
        </TouchableOpacity>
      ))}

      {selectedDocument && (
        <LegalDocumentViewer
          document={selectedDocument}
          visible={viewerVisible}
          onClose={closeViewer}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  documentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  documentIcon: {
    marginRight: 12,
  },
  documentTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
});

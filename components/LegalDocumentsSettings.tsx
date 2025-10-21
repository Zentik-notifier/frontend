import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  Dialog,
  Icon,
  List,
  Portal,
  Text,
  useTheme,
} from "react-native-paper";
import { useI18n } from "../hooks/useI18n";
import { LEGAL_DOCUMENTS } from "../services/legal-documents";
import { LegalDocumentViewer } from "./LegalDocumentViewer";
import { useSettings } from "@/hooks/useSettings";
import { settingsService } from "@/services/settings-service";

export const LegalDocumentsSettings: React.FC = () => {
  const { t } = useI18n();
  const theme = useTheme();
  const { clearTermsAcceptance } = useSettings();
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);

  const openDocument = (document: any) => {
    setSelectedDocument(document);
    setViewerVisible(true);
  };

  const closeViewer = () => {
    setViewerVisible(false);
    setSelectedDocument(null);
  };

  const handleRevokeTerms = () => {
    setShowRevokeDialog(true);
  };

  const confirmRevokeTerms = async () => {
    try {
      await clearTermsAcceptance();
      setShowRevokeDialog(false);
      // L'utente verrà automaticamente reindirizzato alla schermata di accettazione termini
      // grazie al TermsGuard che monitora lo stato
    } catch (error) {
      console.error("Error revoking terms:", error);
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={styles.sectionTitle}>
        {t("legal.allDocuments")}
      </Text>

      {LEGAL_DOCUMENTS.map((document) => (
        <Card key={document.id} style={styles.documentCard} elevation={0}>
          <List.Item
            title={document.title}
            left={(props) => (
              <List.Icon
                {...props}
                icon={document.icon}
                color={theme.colors.primary}
              />
            )}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => openDocument(document)}
          />
        </Card>
      ))}

      {/* Revoke Terms */}
      <Card elevation={0}>
        <List.Item
          title={t("appSettings.revokeTerms")}
          description={t("appSettings.revokeTermsDescription")}
          left={(props) => (
            <List.Icon
              {...props}
              icon="file-document-remove"
              color={theme.colors.error}
            />
          )}
          titleStyle={{ color: theme.colors.error }}
          onPress={handleRevokeTerms}
        />
      </Card>

      {selectedDocument && (
        <LegalDocumentViewer
          document={selectedDocument}
          visible={viewerVisible}
          onClose={closeViewer}
        />
      )}

      {/* Revoke Terms Dialog */}
      <Portal>
        <Dialog
          visible={showRevokeDialog}
          onDismiss={() => setShowRevokeDialog(false)}
        >
          <Dialog.Title>{t("appSettings.revokeTerms")}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              {t("appSettings.revokeTermsConfirm")}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowRevokeDialog(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              mode="contained"
              buttonColor={theme.colors.error}
              onPress={confirmRevokeTerms}
            >
              {t("appSettings.revokeTerms")}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  documentCard: {
    marginBottom: 8,
  },
});

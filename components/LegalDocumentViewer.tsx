import { useI18n } from "@/hooks/useI18n";
import {
  getLegalDocumentContent,
  type LegalDocument,
} from "@/services/legal-documents";
import React, { useState } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  View
} from "react-native";
import Markdown from "react-native-markdown-display";
import {
  ActivityIndicator,
  Button,
  Icon,
  Modal,
  Portal,
  Text,
  TouchableRipple,
  useTheme,
} from "react-native-paper";

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
  const theme = useTheme();
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const deviceHeight = Dimensions.get("window").height;
  const containerStyle = {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 24,
    maxHeight: deviceHeight * 0.8,
  } as const;

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
      console.error("Error loading document:", error);
      setContent(`# Error\n\nCould not load ${document.title}`);
    } finally {
      setLoading(false);
    }
  };

  const markdownStyles = {
    body: {
      color: theme.colors.onSurface,
      fontSize: 16,
      lineHeight: 24,
    },
    heading1: {
      color: theme.colors.onSurface,
      fontSize: 24,
      fontWeight: "bold" as const,
      marginBottom: 16,
    },
    heading2: {
      color: theme.colors.onSurface,
      fontSize: 20,
      fontWeight: "bold" as const,
      marginBottom: 12,
      marginTop: 24,
    },
    paragraph: {
      color: theme.colors.onSurface,
      marginBottom: 12,
    },
    strong: {
      color: theme.colors.onSurface,
      fontWeight: "bold" as const,
    },
    list_item: {
      color: theme.colors.onSurface,
      marginBottom: 4,
    },
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onClose}
        contentContainerStyle={containerStyle}
        dismissableBackButton
      >
        <View style={[styles.header, { borderBottomColor: theme.colors.outline }]}>
          <View style={styles.headerLeft}>
            <Icon source="file-document" size={24} color={theme.colors.primary} />
            <Text variant="titleLarge" style={styles.headerTitle}>
              {document.title}
            </Text>
          </View>
          <TouchableRipple
            style={styles.closeButton}
            onPress={onClose}
            borderless
          >
            <Icon source="close" size={20} color={theme.colors.onSurface} />
          </TouchableRipple>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={true}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text variant="bodyLarge" style={styles.loadingText}>
                {t("common.loading")}
              </Text>
            </View>
          ) : (
            <Markdown style={markdownStyles}>{content}</Markdown>
          )}
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: theme.colors.outline }]}>
          <Button
            mode="outlined"
            onPress={onClose}
            style={styles.closeButton}
          >
            {t("common.close")}
          </Button>
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerTitle: {
    flex: 1,
    fontWeight: "600",
  },
  closeButton: {
    borderRadius: 20,
    minWidth: 100,
  },
  content: {
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    gap: 16,
  },
  loadingText: {
    marginTop: 8,
    opacity: 0.7,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    alignItems: "center",
  },
});

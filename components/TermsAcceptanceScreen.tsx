import { useNavigationUtils } from "@/utils/navigation";
import React, { useEffect, useState } from "react";
import {
  Alert,
  BackHandler,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import Markdown from "react-native-markdown-display";
import {
  ActivityIndicator,
  Button,
  Icon,
  Text,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import {
  useSafeAreaInsets
} from "react-native-safe-area-context";
import { useI18n } from "../hooks/useI18n";
import { acceptTerms, getCurrentTermsVersion } from "../services/auth-storage";
import {
  getLegalDocumentContent,
  LEGAL_DOCUMENTS,
  LegalDocument,
} from "../services/legal-documents";

export const TermsAcceptanceScreen: React.FC = () => {
  const { t } = useI18n();
  const theme = useTheme();
  const [currentDocument, setCurrentDocument] = useState<LegalDocument | null>(
    null
  );
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const { navigateToHome } = useNavigationUtils();
  const insets = useSafeAreaInsets();
  const [footerHeight, setFooterHeight] = useState(0);

  const currentVersion = getCurrentTermsVersion();

  useEffect(() => {
    loadInitialDocument();
  }, []);

  const loadInitialDocument = async () => {
    const termsDocument = LEGAL_DOCUMENTS.find(
      (doc) => doc.fileName === "terms-of-service"
    );
    if (termsDocument) {
      setCurrentDocument(termsDocument);
      await loadDocumentContent(termsDocument);
    }
    setLoading(false);
  };

  const loadDocumentContent = async (document: LegalDocument) => {
    try {
      const documentContent = await getLegalDocumentContent(document.fileName);
      setContent(documentContent);
    } catch (error) {
      console.error("Error loading document:", error);
      setContent(
        `# ${t("legal.errorLoading")}\n\n${t("legal.errorLoadingDescription")}`
      );
    }
  };

  const handleAccept = async () => {
    try {
      setAccepting(true);
      await acceptTerms();
    } catch (error) {
      console.error("Error accepting terms:", error);
      Alert.alert(t("legal.errorTitle"), t("legal.errorAcceptingTerms"), [
        { text: t("common.ok") },
      ]);
    } finally {
      setAccepting(false);
      navigateToHome();
    }
  };

  const handleDeclined = () => {
    if (Platform.OS === "android") {
      BackHandler.exitApp();
    }
  };

  const handleDecline = () => {
    Alert.alert(t("legal.declineTermsTitle"), t("legal.declineTermsMessage"), [
      {
        text: t("legal.reviewAgain"),
        style: "default",
      },
      {
        text: t("legal.exitApp"),
        style: "destructive",
        onPress: handleDeclined,
      },
    ]);
  };

  const viewOtherDocument = (document: LegalDocument) => {
    setCurrentDocument(document);
    loadDocumentContent(document);
  };

  const markdownStyle = {
    body: {
      color: theme.colors.onSurface,
      fontSize: 14,
      lineHeight: 20,
    },
    heading1: {
      color: theme.colors.onSurface,
      fontSize: 24,
      fontWeight: "bold" as const,
      marginBottom: 16,
      marginTop: 20,
    },
    heading2: {
      color: theme.colors.onSurface,
      fontSize: 20,
      fontWeight: "bold" as const,
      marginBottom: 12,
      marginTop: 16,
    },
    heading3: {
      color: theme.colors.onSurface,
      fontSize: 16,
      fontWeight: "bold" as const,
      marginBottom: 8,
      marginTop: 12,
    },
    paragraph: {
      color: theme.colors.onSurface,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 8,
    },
    strong: {
      color: theme.colors.onSurface,
      fontWeight: "bold" as const,
    },
    em: {
      color: theme.colors.onSurface,
      fontStyle: "italic" as const,
    },
    list: {
      marginBottom: 8,
    },
    listItem: {
      color: theme.colors.onSurface,
      fontSize: 14,
      lineHeight: 20,
    },
    code: {
      backgroundColor: theme.colors.surfaceVariant,
      color: theme.colors.primary,
      fontSize: 12,
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 4,
    },
    blockquote: {
      backgroundColor: theme.colors.surfaceVariant,
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.primary,
      paddingLeft: 12,
      paddingVertical: 8,
      marginVertical: 8,
    },
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text variant="bodyLarge" style={styles.loadingText}>
          {t("legal.loading")}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
          paddingBottom: footerHeight + insets.bottom,
        },
      ]}
    >
      {/* Header (fixed) */}
      <View
        style={[
          styles.header,
          {
            borderBottomColor: theme.colors.outline,
            backgroundColor: theme.colors.background,
          },
        ]}
      >
        <View style={styles.headerContent}>
          <Text variant="headlineSmall" style={styles.headerTitle}>
            {t("legal.acceptanceRequired")}
          </Text>
          <Text variant="bodyMedium" style={styles.headerSubtitle}>
            {t("legal.acceptanceDescription")}
          </Text>
        </View>
      </View>

      {/* Document Navigation (fixed) */}
      {LEGAL_DOCUMENTS.length > 1 && (
        <View
          style={[
            styles.navigationContainer,
            {
              borderBottomColor: theme.colors.outline,
              backgroundColor: theme.colors.background,
            },
          ]}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.navigationContent}
          >
            {LEGAL_DOCUMENTS.map((document) => (
              <TouchableRipple
                key={document.fileName}
                style={[
                  styles.navigationButton,
                  currentDocument?.fileName === document.fileName && {
                    backgroundColor: theme.colors.primary,
                  },
                  { borderColor: theme.colors.outline },
                ]}
                onPress={() => viewOtherDocument(document)}
              >
                <View style={styles.navigationButtonContent}>
                  <Icon
                    source={document.icon}
                    size={16}
                    color={
                      currentDocument?.fileName === document.fileName
                        ? theme.colors.onPrimary
                        : theme.colors.primary
                    }
                  />
                  <Text
                    variant="bodySmall"
                    style={[
                      styles.navigationButtonText,
                      {
                        color:
                          currentDocument?.fileName === document.fileName
                            ? theme.colors.onPrimary
                            : theme.colors.onSurface,
                      },
                    ]}
                  >
                    {document.title}
                  </Text>
                </View>
              </TouchableRipple>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Scrollable document content ONLY */}
      <ScrollView
        contentContainerStyle={{
          paddingBottom: (footerHeight || 80) + insets.bottom + 24,
        }}
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled"
      >
        {currentDocument && (
          <View
            style={[
              styles.documentHeader,
              { borderBottomColor: theme.colors.outline },
            ]}
          >
            <View style={styles.documentInfo}>
              <Icon
                source={currentDocument.icon}
                size={20}
                color={theme.colors.primary}
              />
              <Text variant="titleMedium" style={styles.documentTitle}>
                {currentDocument.title}
              </Text>
            </View>
            <Text variant="bodySmall" style={styles.documentVersion}>
              {t("legal.version", { version: currentVersion })}
            </Text>
          </View>
        )}

        <View style={styles.contentContainer}>
          <Markdown style={markdownStyle}>{content}</Markdown>
        </View>
      </ScrollView>

      {/* Footer (fixed) */}
      <View
        onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}
        style={[
          styles.footer,
          {
            borderTopColor: theme.colors.outline,
            backgroundColor: theme.colors.background,
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            paddingBottom: insets.bottom + 12,
          },
        ]}
      >
        <Text variant="bodySmall" style={styles.footerText}>
          {t("legal.acceptanceFooterText")}
        </Text>

        <View style={styles.buttonsContainer}>
          <Button
            mode="outlined"
            onPress={handleDecline}
            disabled={accepting}
            style={styles.declineButton}
            textColor={theme.colors.onSurfaceVariant}
          >
            {t("legal.declineTerms")}
          </Button>

          <Button
            mode="contained"
            onPress={handleAccept}
            disabled={accepting}
            style={styles.acceptButton}
            loading={accepting}
          >
            {t("legal.acceptTerms")}
          </Button>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    opacity: 0.7,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerContent: {
    alignItems: "center",
  },
  headerTitle: {
    fontWeight: "600",
    marginBottom: 4,
    textAlign: "center",
  },
  headerSubtitle: {
    textAlign: "center",
    lineHeight: 18,
    opacity: 0.8,
  },
  navigationContainer: {
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  navigationContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  navigationButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 16,
  },
  navigationButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  navigationButtonText: {
    fontWeight: "500",
  },
  documentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  documentInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  documentVersion: {
    fontSize: 12,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  footer: {
    borderTopWidth: 1,
    padding: 20,
  },
  footerText: {
    fontSize: 12,
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 16,
  },
  buttonsContainer: {
    flexDirection: "row",
    gap: 12,
  },
  declineButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  declineButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  acceptButton: {
    flex: 2,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});

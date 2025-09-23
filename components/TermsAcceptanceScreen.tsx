import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Markdown from "react-native-markdown-display";
import { Colors } from "../constants/Colors";
import { useI18n } from "../hooks/useI18n";
import { useColorScheme } from "../hooks/useTheme";
import {
  acceptTerms,
  getCurrentTermsVersion,
  hasAcceptedTerms,
} from "../services/auth-storage";
import {
  getLegalDocumentContent,
  LEGAL_DOCUMENTS,
  LegalDocument,
} from "../services/legal-documents";

interface TermsAcceptanceScreenProps {
  onAccepted: () => void;
  onDeclined: () => void;
}

export const TermsAcceptanceScreen: React.FC<TermsAcceptanceScreenProps> = ({
  onAccepted,
  onDeclined,
}) => {
  const { t } = useI18n();
  const colorScheme = useColorScheme();
  const [currentDocument, setCurrentDocument] = useState<LegalDocument | null>(
    null
  );
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [documentsAccepted, setDocumentsAccepted] = useState<Set<string>>(
    new Set()
  );

  const currentVersion = getCurrentTermsVersion();
  const requiredDocuments = LEGAL_DOCUMENTS.filter(
    (doc) => doc.fileName === "terms-of-service"
  );

  useEffect(() => {
    checkExistingAcceptance();
    loadInitialDocument();
  }, []);

  const checkExistingAcceptance = async () => {
    try {
      const accepted = await hasAcceptedTerms();
      if (accepted) {
        onAccepted();
      }
    } catch (error) {
      console.error("Error checking terms acceptance:", error);
    }
  };

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
      onAccepted();
    } catch (error) {
      console.error("Error accepting terms:", error);
      Alert.alert(t("legal.errorTitle"), t("legal.errorAcceptingTerms"), [
        { text: t("common.ok") },
      ]);
    } finally {
      setAccepting(false);
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
        onPress: onDeclined,
      },
    ]);
  };

  const viewOtherDocument = (document: LegalDocument) => {
    setCurrentDocument(document);
    loadDocumentContent(document);
  };

  const markdownStyle = {
    body: {
      color: Colors[colorScheme].text,
      fontSize: 14,
      lineHeight: 20,
    },
    heading1: {
      color: Colors[colorScheme].text,
      fontSize: 24,
      fontWeight: "bold" as const,
      marginBottom: 16,
      marginTop: 20,
    },
    heading2: {
      color: Colors[colorScheme].text,
      fontSize: 20,
      fontWeight: "bold" as const,
      marginBottom: 12,
      marginTop: 16,
    },
    heading3: {
      color: Colors[colorScheme].text,
      fontSize: 16,
      fontWeight: "bold" as const,
      marginBottom: 8,
      marginTop: 12,
    },
    paragraph: {
      color: Colors[colorScheme].text,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 8,
    },
    strong: {
      color: Colors[colorScheme].text,
      fontWeight: "bold" as const,
    },
    em: {
      color: Colors[colorScheme].text,
      fontStyle: "italic" as const,
    },
    list: {
      marginBottom: 8,
    },
    listItem: {
      color: Colors[colorScheme].text,
      fontSize: 14,
      lineHeight: 20,
    },
    code: {
      backgroundColor: Colors[colorScheme].backgroundSecondary,
      color: Colors[colorScheme].tint,
      fontSize: 12,
      fontFamily:
        Platform.OS === "ios" || Platform.OS === "macos"
          ? "Menlo"
          : "monospace",
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 4,
    },
    blockquote: {
      backgroundColor: Colors[colorScheme].backgroundSecondary,
      borderLeftWidth: 4,
      borderLeftColor: Colors[colorScheme].tint,
      paddingLeft: 12,
      paddingVertical: 8,
      marginVertical: 8,
    },
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: Colors[colorScheme].background },
        ]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors[colorScheme].tint} />
          <Text
            style={[
              styles.loadingText,
              { color: Colors[colorScheme].textSecondary },
            ]}
          >
            {t("legal.loading")}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: Colors[colorScheme].background },
      ]}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { borderBottomColor: Colors[colorScheme].border },
        ]}
      >
        <View style={styles.headerContent}>
          <Text
            style={[styles.headerTitle, { color: Colors[colorScheme].text }]}
          >
            {t("legal.acceptanceRequired")}
          </Text>
          <Text
            style={[
              styles.headerSubtitle,
              { color: Colors[colorScheme].textSecondary },
            ]}
          >
            {t("legal.acceptanceDescription")}
          </Text>
        </View>
      </View>

      {/* Document Navigation */}
      {LEGAL_DOCUMENTS.length > 1 && (
        <View
          style={[
            styles.navigationContainer,
            { borderBottomColor: Colors[colorScheme].border },
          ]}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.navigationContent}
          >
            {LEGAL_DOCUMENTS.map((document) => (
              <TouchableOpacity
                key={document.fileName}
                style={[
                  styles.navigationButton,
                  currentDocument?.fileName === document.fileName && {
                    backgroundColor: Colors[colorScheme].tint,
                  },
                  { borderColor: Colors[colorScheme].border },
                ]}
                onPress={() => viewOtherDocument(document)}
              >
                <Ionicons
                  name={document.icon}
                  size={16}
                  color={
                    currentDocument?.fileName === document.fileName
                      ? Colors[colorScheme].background
                      : Colors[colorScheme].tint
                  }
                />
                <Text
                  style={[
                    styles.navigationButtonText,
                    {
                      color:
                        currentDocument?.fileName === document.fileName
                          ? Colors[colorScheme].background
                          : Colors[colorScheme].text,
                    },
                  ]}
                >
                  {document.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Current Document */}
      {currentDocument && (
        <View
          style={[
            styles.documentHeader,
            { borderBottomColor: Colors[colorScheme].border },
          ]}
        >
          <View style={styles.documentInfo}>
            <Ionicons
              name={currentDocument.icon}
              size={20}
              color={Colors[colorScheme].tint}
            />
            <Text
              style={[
                styles.documentTitle,
                { color: Colors[colorScheme].text },
              ]}
            >
              {currentDocument.title}
            </Text>
          </View>
          <Text
            style={[
              styles.documentVersion,
              { color: Colors[colorScheme].textSecondary },
            ]}
          >
            {t("legal.version", { version: currentVersion })}
          </Text>
        </View>
      )}

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={true}
      >
        <Markdown style={markdownStyle}>{content}</Markdown>
      </ScrollView>

      {/* Acceptance Footer */}
      <View
        style={[styles.footer, { borderTopColor: Colors[colorScheme].border }]}
      >
        <Text
          style={[
            styles.footerText,
            { color: Colors[colorScheme].textSecondary },
          ]}
        >
          {t("legal.acceptanceFooterText")}
        </Text>

        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[
              styles.declineButton,
              { borderColor: Colors[colorScheme].border },
            ]}
            onPress={handleDecline}
            disabled={accepting}
          >
            <Text
              style={[
                styles.declineButtonText,
                { color: Colors[colorScheme].textSecondary },
              ]}
            >
              {t("legal.declineTerms")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.acceptButton,
              { backgroundColor: Colors[colorScheme].tint },
            ]}
            onPress={handleAccept}
            disabled={accepting}
          >
            {accepting ? (
              <ActivityIndicator
                size="small"
                color={Colors[colorScheme].background}
              />
            ) : (
              <Text
                style={[
                  styles.acceptButtonText,
                  { color: Colors[colorScheme].background },
                ]}
              >
                {t("legal.acceptTerms")}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
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
    fontSize: 16,
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
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 18,
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 16,
    gap: 6,
  },
  navigationButtonText: {
    fontSize: 12,
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
    paddingBottom: 40,
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

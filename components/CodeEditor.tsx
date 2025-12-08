import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Text, TextInput } from "react-native-paper";
import MonacoEditor from "@monaco-editor/react";

// TypeScript definitions for Monaco Editor IntelliSense
const typescriptDefinitions = `
declare global {
  /**
   * Interface for notification message data
   */
  interface CreateMessageDto {
    /** The main title of the notification */
    title: string;
    /** Optional subtitle for the notification */
    subtitle?: string;
    /** Optional body content for the notification */
    body?: string;
    /** The bucket ID where the notification should be sent */
    bucketId: string;
    /** Delivery type for the notification */
    deliveryType: 'NORMAL' | 'CRITICAL' | 'SILENT';
    /** Optional array of actions (buttons) for the notification */
    actions?: NotificationActionDto[];
    /** Optional array of attachments for the notification */
    attachments?: NotificationAttachmentDto[];
    /** Optional tap action when user taps the notification */
    tapAction?: NotificationActionDto;
    /** Optional sound to play with the notification */
    sound?: string;
    /** Whether to add a mark as read action */
    addMarkAsReadAction?: boolean;
    /** Whether to add an open notification action */
    addOpenNotificationAction?: boolean;
    /** Whether to add a delete action */
    addDeleteAction?: boolean;
    /** Optional snooze times in minutes */
    snoozes?: number[];
    /** Optional locale for the notification */
    locale?: string;
    /** Optional group ID for grouping notifications */
    groupId?: string;
    /** Optional collapse ID for APNS collapse */
    collapseId?: string;
    /** Optional array of user IDs to target */
    userIds?: string[];
    /** Optional image URL for the notification */
    imageUrl?: string;
    /** Optional video URL for the notification */
    videoUrl?: string;
    /** Optional GIF URL for the notification */
    gifUrl?: string;
    /** Optional tap URL for navigation */
    tapUrl?: string;
  }

  /**
   * Interface for notification actions (buttons)
   */
  interface NotificationActionDto {
    /** The type of action to perform */
    type: 'BACKGROUND_CALL' | 'CLEAR' | 'DELETE' | 'NAVIGATE' | 'OPEN_NOTIFICATION' | 'SNOOZE' | 'WEBHOOK';
    /** Optional value/data for the action */
    value?: string;
    /** Whether this is a destructive action */
    destructive?: boolean;
    /** Optional icon for the action */
    icon?: string;
    /** Optional title for the action */
    title?: string;
  }

  /**
   * Interface for notification attachments
   */
  interface NotificationAttachmentDto {
    /** The media type of the attachment */
    mediaType: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'GIF' | 'ICON';
    /** Optional name for the attachment */
    name?: string;
    /** Optional URL for the attachment */
    url?: string;
    /** Optional attachment UUID if already uploaded */
    attachmentUuid?: string;
    /** Whether to save the attachment on the server */
    saveOnServer?: boolean;
  }
}

/**
 * Helper function type for payload transformation
 */
declare type PayloadTransformer = (payload: any, headers?: Record<string, string>) => CreateMessageDto;

/**
 * Global any type is allowed for webhook payload flexibility
 * This represents any incoming webhook payload structure
 */
declare const payload: any;

/**
 * Global headers object for webhook headers
 * This represents the HTTP headers from the incoming webhook request
 */
declare const headers: Record<string, string>;
`;

// Code Editor Component that uses Monaco Editor on web and TextInput on mobile
interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  errorText?: string;
  placeholder?: string;
  label?: string;
  language?: string;
  readOnly?: boolean;
  height?: string | number;
  numberOfLines?: number;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  error,
  errorText,
  placeholder,
  label,
  language = "typescript",
  readOnly = false,
  height = "300px",
  numberOfLines,
}) => {
  // Use Monaco Editor on web
  if (Platform.OS === "web" && MonacoEditor) {
    return (
      <View style={styles.codeEditor}>
        <MonacoEditor
          height={height}
          language={language}
          value={value}
          onChange={
            readOnly
              ? undefined
              : (newValue: string | undefined) => onChange(newValue || "")
          }
          theme="vs-dark"
          beforeMount={(monaco) => {
            // Configure TypeScript compiler options for better IntelliSense
            monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
              target: monaco.languages.typescript.ScriptTarget.Latest,
              allowNonTsExtensions: true,
              moduleResolution:
                monaco.languages.typescript.ModuleResolutionKind.NodeJs,
              module: monaco.languages.typescript.ModuleKind.CommonJS,
              noEmit: true,
              esModuleInterop: true,
              jsx: monaco.languages.typescript.JsxEmit.React,
              reactNamespace: "React",
              allowJs: true,
              typeRoots: ["node_modules/@types"],
            });

            // Add our custom TypeScript definitions
            monaco.languages.typescript.typescriptDefaults.addExtraLib(
              typescriptDefinitions,
              "file:///node_modules/@types/payload-mapper.d.ts"
            );

            // Configure TypeScript language service with completion provider
            monaco.languages.registerCompletionItemProvider("typescript", {
              provideCompletionItems: () => {
                const suggestions = [];

                // Add suggestions for our custom types
                suggestions.push({
                  range: {
                    startLineNumber: 1,
                    startColumn: 1,
                    endLineNumber: 1,
                    endColumn: 1,
                  },
                  label: "CreateMessageDto",
                  kind: monaco.languages.CompletionItemKind.Interface,
                  insertText: "CreateMessageDto",
                  documentation: "Interface for notification message data",
                });

                suggestions.push({
                  range: {
                    startLineNumber: 1,
                    startColumn: 1,
                    endLineNumber: 1,
                    endColumn: 1,
                  },
                  label: "NotificationActionDto",
                  kind: monaco.languages.CompletionItemKind.Interface,
                  insertText: "NotificationActionDto",
                  documentation: "Interface for notification actions",
                });

                suggestions.push({
                  range: {
                    startLineNumber: 1,
                    startColumn: 1,
                    endLineNumber: 1,
                    endColumn: 1,
                  },
                  label: "NotificationAttachmentDto",
                  kind: monaco.languages.CompletionItemKind.Interface,
                  insertText: "NotificationAttachmentDto",
                  documentation: "Interface for notification attachments",
                });

                return { suggestions };
              },
            });

            // Configure diagnostics options
            monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions(
              {
                noSemanticValidation: false,
                noSyntaxValidation: false,
              }
            );

            // Set up IntelliSense for better suggestions
            monaco.languages.typescript.typescriptDefaults.setEagerModelSync(
              true
            );
          }}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: "on",
            roundedSelection: false,
            scrollBeyondLastLine: false,
            readOnly: readOnly,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: "on",
            wrappingStrategy: "advanced",
            suggestOnTriggerCharacters: !readOnly,
            quickSuggestions: !readOnly,
            parameterHints: { enabled: !readOnly },
            hover: { enabled: !readOnly },
            contextmenu: !readOnly,
            mouseWheelZoom: true,
            smoothScrolling: true,
            cursorBlinking: "blink",
            renderWhitespace: "selection",
            bracketPairColorization: { enabled: true },
          }}
        />
        {error && errorText && (
          <Text style={[styles.errorText, { marginTop: 8 }]}>{errorText}</Text>
        )}
      </View>
    );
  }

  // Fallback to TextInput on mobile
  return (
    <View style={styles.codeEditor}>
      <TextInput
        label={label}
        value={value}
        onChangeText={readOnly ? undefined : onChange}
        placeholder={placeholder}
        error={!!error}
        multiline
        numberOfLines={numberOfLines || 12}
        style={[styles.codeInput, { height: typeof height === 'number' ? height : parseInt(height) || 300 }]}
        mode="outlined"
        editable={!readOnly}
      />
      {error && errorText && <Text style={styles.errorText}>{errorText}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  codeEditor: {
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
  },
  codeInput: {
    fontFamily: "monospace",
    fontSize: 14,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 12,
    marginBottom: 8,
    marginTop: -4,
  },
});

export default CodeEditor;
export { CodeEditor };
export type { CodeEditorProps };

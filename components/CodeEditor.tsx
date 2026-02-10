import React, { Suspense, useCallback } from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import { Text, TextInput } from "react-native-paper";

const CodeEditorNative = React.lazy(() => import("@rivascva/react-native-code-editor"));

let CodeEditorSyntaxStyles: any;
let CodeEditorStyleType: any;
try {
  const mod = require("@rivascva/react-native-code-editor");
  CodeEditorSyntaxStyles = mod.CodeEditorSyntaxStyles;
} catch {}

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
}

const languageToHljs = (
  lang: string
): React.ComponentProps<typeof CodeEditorNative>["language"] => {
  if (lang === "typescript" || lang === "ts" || lang === "tsx") return "javascript";
  if (lang === "handlebars") return "handlebars";
  return "javascript";
};

const useCodeEditorNative =
  Platform.OS === "web" ||
  Platform.OS === "ios" ||
  Platform.OS === "android";

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
}) => {
  const handleChange = useCallback(
    (newValue: string) => {
      onChange(newValue || "");
    },
    [onChange]
  );

  if (useCodeEditorNative) {
    const calculatedHeight =
      typeof height === "number" ? height : parseInt(String(height), 10) || 300;
    const editorStyle = {
      height: calculatedHeight,
      fontSize: 14,
      backgroundColor: "#1e1e1e",
      padding: 12,
    };
    return (
      <View style={[styles.codeEditor, { borderWidth: 0 }]}>
        <Suspense fallback={<ActivityIndicator size="small" />}>
          <CodeEditorNative
            style={editorStyle}
            language={languageToHljs(language)}
            syntaxStyle={CodeEditorSyntaxStyles?.vs2015}
            initialValue={value}
            onChange={readOnly ? undefined : handleChange}
            showLineNumbers
            readOnly={readOnly}
          />
        </Suspense>
        {error && errorText && <Text style={styles.errorText}>{errorText}</Text>}
      </View>
    );
  }

  const calculatedHeight =
    typeof height === "number" ? height : parseInt(String(height), 10) || 300;

  return (
    <View style={[styles.codeEditor, { borderWidth: 0 }]}>
      <TextInput
        label={label}
        value={value}
        onChangeText={readOnly ? undefined : onChange}
        placeholder={placeholder}
        error={!!error}
        multiline
        style={[styles.codeInput, { height: calculatedHeight }]}
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

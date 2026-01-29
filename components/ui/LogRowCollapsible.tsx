import React, { ReactNode } from "react";
import {
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Icon, Text, useTheme } from "react-native-paper";
import CopyButton from "./CopyButton";

export interface LogRowCollapsibleProps {
  id: string;
  isExpanded: boolean;
  onToggle: () => void;
  summaryContent: ReactNode;
  headerLine: string;
  jsonObject: unknown;
  expandOpensDown?: boolean;
}

const defaultExpandOpensDown = true;

export default function LogRowCollapsible({
  id: _id,
  isExpanded,
  onToggle,
  summaryContent,
  headerLine,
  jsonObject,
  expandOpensDown = defaultExpandOpensDown,
}: LogRowCollapsibleProps) {
  const theme = useTheme();
  const jsonString =
    typeof jsonObject === "string"
      ? jsonObject
      : JSON.stringify(jsonObject, null, 2);

  const detailBlock = (
    <View
      style={[
        styles.detailBlock,
        {
          backgroundColor: theme.colors.surfaceVariant,
          borderColor: theme.colors.outline,
        },
      ]}
    >
      <View style={styles.detailBlockHeader}>
        <Text
          selectable
          style={[styles.detailHeaderLine, { color: theme.colors.onSurfaceVariant }]}
          numberOfLines={1}
        >
          {headerLine}
        </Text>
        <CopyButton
          text={jsonString}
          size={18}
          compact
          style={styles.detailCopyBtn}
        />
      </View>
      <TextInput
        value={jsonString}
        multiline
        editable={false}
        scrollEnabled
        style={[
          styles.jsonInput,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outline,
            color: theme.colors.onSurface,
          },
        ]}
      />
    </View>
  );

  return (
    <View style={[styles.container, styles.containerColumn]}>
      {expandOpensDown && isExpanded && detailBlock}
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.7}
        style={styles.touchable}
      >
        <View style={styles.summaryContentWrap}>{summaryContent}</View>
        <Icon
          source={isExpanded ? "chevron-up" : "chevron-down"}
          size={20}
          color={theme.colors.onSurfaceVariant}
        />
      </TouchableOpacity>
      {!expandOpensDown && isExpanded && detailBlock}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  containerColumn: {
    flexDirection: "column-reverse",
  },
  touchable: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: -6,
    marginVertical: -2,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  summaryContentWrap: {
    flex: 1,
  },
  detailBlock: {
    marginTop: 2,
    padding: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  detailBlockHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
    paddingVertical: 0,
  },
  detailHeaderLine: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 14,
    flex: 1,
    marginRight: 4,
  },
  detailCopyBtn: {
    marginLeft: "auto",
  },
  jsonInput: {
    borderRadius: 4,
    borderWidth: 1,
    maxHeight: 180,
    minHeight: 48,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 11,
    lineHeight: 16,
    padding: 4,
    textAlignVertical: "top",
  },
});

import {
  AdminChangelogsDocument,
  useChangelogQuery,
  useCreateChangelogMutation,
  useUpdateChangelogMutation,
} from "@/generated/gql-operations-generated";
import { useGetVersionsInfo } from "@/hooks/useGetVersionsInfo";
import { useI18n } from "@/hooks/useI18n";
import { useNavigationUtils } from "@/utils/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  IconButton,
  Switch,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import PaperScrollView from "./ui/PaperScrollView";
import Selector, { SelectorOption } from "./ui/Selector";

interface ChangelogFormProps {
  id?: string;
}

interface ChangelogEntryEdit {
  type: string;
  text: string;
}

interface EditState {
  iosVersion: string;
  androidVersion: string;
  uiVersion: string;
  backendVersion: string;
  description: string;
  enabled: boolean;
  entries: ChangelogEntryEdit[];
}

const emptyEditState: EditState = {
  iosVersion: "",
  androidVersion: "",
  uiVersion: "",
  backendVersion: "",
  description: "",
  enabled: true,
  entries: [],
};

export default function ChangelogForm({ id }: ChangelogFormProps) {
  const { t } = useI18n();
  const { navigateBack } = useNavigationUtils();
  const theme = useTheme();
  const [editState, setEditState] = useState<EditState>(emptyEditState);
  const [saving, setSaving] = useState(false);
  const { versions, loading: versionsLoading } = useGetVersionsInfo();

  const isEdit = !!id;

  const { data, loading, error, refetch } = useChangelogQuery({
    variables: { id: id as string },
    skip: !isEdit || !id,
  });

  const [createChangelog] = useCreateChangelogMutation({
    refetchQueries: [{ query: AdminChangelogsDocument }],
  });
  const [updateChangelog] = useUpdateChangelogMutation({
    refetchQueries: [{ query: AdminChangelogsDocument }],
  });

  const entryTypeOptions: SelectorOption[] = useMemo(
    () => [
      {
        id: "feature",
        name: t("changelog.entryTypes.feature"),
        iconName: "star-circle",
        iconColor: theme.colors.primary,
      },
      {
        id: "bug",
        name: t("changelog.entryTypes.bug"),
        iconName: "bug",
        iconColor: theme.colors.error,
      },
      {
        id: "improvement",
        name: t("changelog.entryTypes.improvement"),
        iconName: "wrench",
        iconColor: theme.colors.tertiary,
      },
      {
        id: "other",
        name: t("changelog.entryTypes.other"),
        iconName: "dots-horizontal",
        iconColor: theme.colors.outline,
      },
    ],
    [
      t,
      theme.colors.primary,
      theme.colors.error,
      theme.colors.tertiary,
      theme.colors.outline,
    ]
  );

  useEffect(() => {
    if (isEdit && data?.changelog) {
      const changelogAny = data.changelog as any;
      const rawEntries = (changelogAny.entries || []) as
        | { type?: string; text?: string }[]
        | undefined;

      setEditState({
        iosVersion: data.changelog.iosVersion,
        androidVersion: data.changelog.androidVersion,
        uiVersion: data.changelog.uiVersion,
        backendVersion: data.changelog.backendVersion,
        description: data.changelog.description,
        enabled:
          typeof changelogAny.active === "boolean" ? changelogAny.active : true,
        entries:
          rawEntries?.map((e) => ({
            type: e.type || "feature",
            text: e.text || "",
          })) ?? [],
      });
    } else if (!isEdit && versions) {
      setEditState((prev) => {
        const isPristine =
          prev.iosVersion === "" &&
          prev.androidVersion === "" &&
          prev.uiVersion === "" &&
          prev.backendVersion === "" &&
          prev.description === "";

        if (!isPristine) {
          return prev;
        }

        const shouldPrefillIos = Platform.OS === "ios";
        const shouldPrefillAndroid = Platform.OS === "android";

        return {
          ...prev,
          iosVersion: shouldPrefillIos ? versions.nativeVersion ?? "" : "",
          androidVersion: shouldPrefillAndroid
            ? versions.nativeVersion ?? ""
            : "",
          uiVersion: versions.appVersion ?? "",
          backendVersion: versions.backendVersion ?? "",
        };
      });
    }
  }, [isEdit, data, versions]);

  const isFormValid = editState.description.trim().length > 0;
  const [isEntryFormOpen, setIsEntryFormOpen] = useState(false);
  const [entryDraft, setEntryDraft] = useState<ChangelogEntryEdit | null>(null);

  const addEntry = () => {
    setEntryDraft({ type: "feature", text: "" });
    setIsEntryFormOpen(true);
  };

  const updateEntry = (
    index: number,
    field: "type" | "text",
    value: string
  ) => {
    setEditState((prev) => {
      const entries = [...prev.entries];
      entries[index] = {
        ...entries[index],
        [field]: value,
      };
      return {
        ...prev,
        entries,
      };
    });
  };

  const removeEntry = (index: number) => {
    setEditState((prev) => ({
      ...prev,
      entries: prev.entries.filter((_, i) => i !== index),
    }));
  };

  const saveEntryDraft = () => {
    if (!entryDraft || !entryDraft.text.trim()) {
      return;
    }

    setEditState((prev) => ({
      ...prev,
      entries: [
        ...prev.entries,
        { type: entryDraft.type, text: entryDraft.text.trim() },
      ],
    }));

    setIsEntryFormOpen(false);
    setEntryDraft(null);
  };

  const cancelEntryDraft = () => {
    setIsEntryFormOpen(false);
    setEntryDraft(null);
  };

  const handleSave = async () => {
    if (!isFormValid) {
      return;
    }

    setSaving(true);
    try {
      const payloadEntries = editState.entries
        .filter((e) => e.text.trim().length > 0)
        .map((e) => ({ type: e.type, text: e.text.trim() }));

      const baseInput = {
        iosVersion: editState.iosVersion,
        androidVersion: editState.androidVersion,
        uiVersion: editState.uiVersion,
        backendVersion: editState.backendVersion,
        description: editState.description,
        active: editState.enabled,
        entries: payloadEntries.length > 0 ? payloadEntries : undefined,
      };

      if (isEdit && id) {
        await updateChangelog({
          variables: {
            input: {
              id,
              ...(baseInput as any),
            } as any,
          },
        });
      } else {
        await createChangelog({
          variables: {
            input: baseInput as any,
          },
        });
      }

      navigateBack();
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = async () => {
    if (isEdit) {
      await refetch();
    }
  };

  const styles = StyleSheet.create({
    card: {
      marginBottom: 16,
    },
    inputGroup: {
      marginBottom: 24,
    },
    inputLabel: {
      marginBottom: 8,
      color: theme.colors.onSurface,
    },
    input: {
      marginTop: 0,
    },
    validationError: {
      color: theme.colors.error,
      marginTop: 4,
    },
    descriptionInput: {
      minHeight: 120,
      textAlignVertical: "top",
    },
    toggleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    buttonRow: {
      flexDirection: "row",
      gap: 12,
      marginTop: 16,
    },
    primaryButton: {
      flex: 1,
    },
    secondaryButton: {
      flex: 1,
    },
    entriesHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    entriesDescription: {
      marginBottom: 8,
      opacity: 0.7,
    },
    entriesEmpty: {
      opacity: 0.7,
      fontStyle: "italic",
    },
    entryRow: {
      marginBottom: 12,
    },
    entryHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 4,
      gap: 8,
    },
    entryTypeContainer: {
      flex: 1,
    },
    entryTextContainer: {
      marginTop: 4,
    },
    entryLabel: {
      marginBottom: 4,
    },
    entryTextInput: {
      minHeight: 80,
      textAlignVertical: "top",
    },
    entryListItem: {
      marginBottom: 8,
      padding: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      backgroundColor: theme.colors.surfaceVariant,
    },
    entryListRow: {
      flexDirection: "row",
      alignItems: "stretch",
      gap: 8,
    },
    entryListContent: {
      flex: 1,
    },
    entryListActions: {
      justifyContent: "center",
      alignItems: "center",
    },
    entryListType: {
      fontWeight: "500",
    },
    entryListText: {
      opacity: 0.9,
    },
    entryForm: {
      marginTop: 12,
      gap: 8,
    },
    entryFormButtons: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 8,
    },
  });

  return (
    <PaperScrollView
      loading={loading || (!isEdit && versionsLoading)}
      error={isEdit && !!error}
      onRefresh={handleRefresh}
    >
      <Card style={styles.card} mode="outlined">
        <Card.Content>
          <View style={styles.inputGroup}>
            <Text variant="titleMedium" style={styles.inputLabel}>
              {t("changelog.iosVersion")}
            </Text>
            <TextInput
              mode="outlined"
              value={editState.iosVersion}
              onChangeText={(text) =>
                setEditState((prev) => ({ ...prev, iosVersion: text }))
              }
              style={styles.input}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text variant="titleMedium" style={styles.inputLabel}>
              {t("changelog.androidVersion")}
            </Text>
            <TextInput
              mode="outlined"
              value={editState.androidVersion}
              onChangeText={(text) =>
                setEditState((prev) => ({ ...prev, androidVersion: text }))
              }
              style={styles.input}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text variant="titleMedium" style={styles.inputLabel}>
              {t("changelog.uiVersion")}
            </Text>
            <TextInput
              mode="outlined"
              value={editState.uiVersion}
              onChangeText={(text) =>
                setEditState((prev) => ({ ...prev, uiVersion: text }))
              }
              style={styles.input}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text variant="titleMedium" style={styles.inputLabel}>
              {t("changelog.backendVersion")}
            </Text>
            <TextInput
              mode="outlined"
              value={editState.backendVersion}
              onChangeText={(text) =>
                setEditState((prev) => ({ ...prev, backendVersion: text }))
              }
              style={styles.input}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text variant="titleMedium" style={styles.inputLabel}>
              {t("changelog.description")} *
            </Text>
            <TextInput
              mode="outlined"
              value={editState.description}
              onChangeText={(text) =>
                setEditState((prev) => ({ ...prev, description: text }))
              }
              style={[styles.input, styles.descriptionInput]}
              multiline
              numberOfLines={6}
            />
            {editState.description.trim().length === 0 && (
              <Text variant="bodySmall" style={styles.validationError}>
                {t("changelog.descriptionRequired")}
              </Text>
            )}
          </View>
          <View style={styles.toggleRow}>
            <Text variant="titleMedium" style={styles.inputLabel}>
              {t("changelog.enabled")}
            </Text>
            <Switch
              value={editState.enabled}
              onValueChange={(value) =>
                setEditState((prev) => ({ ...prev, enabled: value }))
              }
            />
          </View>
          <View style={styles.inputGroup}>
            <View style={styles.entriesHeaderRow}>
              <Text variant="titleMedium" style={styles.inputLabel}>
                {t("changelog.entriesTitle")}
              </Text>
              <Button mode="text" compact onPress={addEntry}>
                {t("common.add")}
              </Button>
            </View>
            <Text variant="bodySmall" style={styles.entriesDescription}>
              {t("changelog.entriesDescription")}
            </Text>
            {editState.entries.length === 0 && (
              <Text variant="bodySmall" style={styles.entriesEmpty}>
                {t("changelog.entriesEmpty")}
              </Text>
            )}
            {editState.entries.map((entry, index) => (
              <View key={index} style={styles.entryListItem}>
                <View style={styles.entryListRow}>
                  <View style={styles.entryListContent}>
                    <Text variant="bodySmall" style={styles.entryListType}>
                      {t(`changelog.entryTypes.${entry.type}` as any)}
                    </Text>
                    <Text variant="bodyMedium" style={styles.entryListText}>
                      {entry.text}
                    </Text>
                  </View>
                  <View style={styles.entryListActions}>
                    <IconButton
                      icon="delete"
                      size={20}
                      iconColor={theme.colors.error}
                      onPress={() => removeEntry(index)}
                    />
                  </View>
                </View>
              </View>
            ))}
            {isEntryFormOpen && entryDraft && (
              <View style={styles.entryForm}>
                <View>
                  <Text variant="bodySmall" style={styles.entryLabel}>
                    {t("changelog.entryType")}
                  </Text>
                  <Selector
                    placeholder={t("changelog.entryType")}
                    options={entryTypeOptions}
                    selectedValue={entryDraft.type}
                    onValueChange={(value) =>
                      setEntryDraft((prev) =>
                        prev ? { ...prev, type: value as string } : prev
                      )
                    }
                    isSearchable={false}
                    mode="inline"
                  />
                </View>
                <View>
                  <Text variant="bodySmall" style={styles.entryLabel}>
                    {t("changelog.entryText")}
                  </Text>
                  <TextInput
                    mode="outlined"
                    value={entryDraft.text}
                    onChangeText={(text) =>
                      setEntryDraft((prev) => (prev ? { ...prev, text } : prev))
                    }
                    multiline
                    numberOfLines={3}
                    style={[styles.input, styles.entryTextInput]}
                  />
                </View>
                <View style={styles.entryFormButtons}>
                  <Button mode="text" onPress={cancelEntryDraft}>
                    {t("common.cancel")}
                  </Button>
                  <Button
                    mode="contained"
                    onPress={saveEntryDraft}
                    disabled={!entryDraft.text.trim()}
                  >
                    {t("common.save")}
                  </Button>
                </View>
              </View>
            )}
          </View>
          <View style={styles.buttonRow}>
            <Button
              mode="contained"
              onPress={handleSave}
              loading={saving}
              disabled={saving || !isFormValid}
              style={styles.primaryButton}
            >
              {t("common.save")}
            </Button>
            <Button
              mode="outlined"
              onPress={navigateBack}
              disabled={saving}
              style={styles.secondaryButton}
            >
              {t("common.cancel")}
            </Button>
          </View>
        </Card.Content>
      </Card>
    </PaperScrollView>
  );
}

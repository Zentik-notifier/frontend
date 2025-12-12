import React, { useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { gql, useMutation, useQuery } from "@apollo/client";
import { Button, Card, Text, TextInput, useTheme } from "react-native-paper";
import PaperScrollView from "./ui/PaperScrollView";
import { useI18n } from "@/hooks/useI18n";
import { useNavigationUtils } from "@/utils/navigation";
import { useGetVersionsInfo } from "@/hooks/useGetVersionsInfo";
import { CHANGELOGS_QUERY, ChangelogItem } from "./ChangelogList";

const CHANGELOG_QUERY = gql`
  query Changelog($id: ID!) {
    changelog(id: $id) {
      id
      iosVersion
      androidVersion
      uiVersion
      backendVersion
      description
      createdAt
    }
  }
`;

const CREATE_CHANGELOG_MUTATION = gql`
  mutation CreateChangelog($input: CreateChangelogInput!) {
    createChangelog(input: $input) {
      id
    }
  }
`;

const UPDATE_CHANGELOG_MUTATION = gql`
  mutation UpdateChangelog($input: UpdateChangelogInput!) {
    updateChangelog(input: $input) {
      id
    }
  }
`;

interface ChangelogFormProps {
  id?: string;
}

interface ChangelogQueryResult {
  changelog: ChangelogItem;
}

interface EditState {
  iosVersion: string;
  androidVersion: string;
  uiVersion: string;
  backendVersion: string;
  description: string;
}

const emptyEditState: EditState = {
  iosVersion: "",
  androidVersion: "",
  uiVersion: "",
  backendVersion: "",
  description: "",
};

export default function ChangelogForm({ id }: ChangelogFormProps) {
  const { t } = useI18n();
  const { navigateBack } = useNavigationUtils();
  const theme = useTheme();
  const [editState, setEditState] = useState<EditState>(emptyEditState);
  const [saving, setSaving] = useState(false);
  const { versions, loading: versionsLoading } = useGetVersionsInfo();

  const isEdit = !!id;

  const { data, loading, error, refetch } = useQuery<ChangelogQueryResult>(
    CHANGELOG_QUERY,
    {
      variables: { id: id as string },
      skip: !isEdit || !id,
    }
  );

  const [createChangelog] = useMutation(CREATE_CHANGELOG_MUTATION, {
    refetchQueries: [CHANGELOGS_QUERY],
  });
  const [updateChangelog] = useMutation(UPDATE_CHANGELOG_MUTATION, {
    refetchQueries: [CHANGELOGS_QUERY],
  });

  useEffect(() => {
    if (isEdit && data?.changelog) {
      setEditState({
        iosVersion: data.changelog.iosVersion,
        androidVersion: data.changelog.androidVersion,
        uiVersion: data.changelog.uiVersion,
        backendVersion: data.changelog.backendVersion,
        description: data.changelog.description,
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

  const handleSave = async () => {
    if (!isFormValid) {
      return;
    }

    setSaving(true);
    try {
      if (isEdit && id) {
        await updateChangelog({
          variables: {
            input: {
              id,
              iosVersion: editState.iosVersion,
              androidVersion: editState.androidVersion,
              uiVersion: editState.uiVersion,
              backendVersion: editState.backendVersion,
              description: editState.description,
            },
          },
        });
      } else {
        await createChangelog({
          variables: {
            input: {
              iosVersion: editState.iosVersion,
              androidVersion: editState.androidVersion,
              uiVersion: editState.uiVersion,
              backendVersion: editState.backendVersion,
              description: editState.description,
            },
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

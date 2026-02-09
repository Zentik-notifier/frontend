import {
  CreateExternalNotifySystemDto,
  ExternalNotifySystemType,
  GetExternalNotifySystemsDocument,
  UpdateExternalNotifySystemDto,
  useCreateExternalNotifySystemMutation,
  useGetExternalNotifySystemQuery,
  useUpdateExternalNotifySystemMutation,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useAppContext } from "@/contexts/AppContext";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import {
  Button,
  Dialog,
  Icon,
  Portal,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import PaperScrollView from "./ui/PaperScrollView";
import Selector, { SelectorOption } from "./ui/Selector";

interface CreateExternalNotifySystemFormProps {
  systemId?: string;
}

export default function CreateExternalNotifySystemForm({
  systemId,
}: CreateExternalNotifySystemFormProps) {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useI18n();
  const {
    connectionStatus: { isOfflineAuth, isBackendUnreachable },
  } = useAppContext();
  const isOffline = isOfflineAuth || isBackendUnreachable;

  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [type, setType] = useState<ExternalNotifySystemType>(ExternalNotifySystemType.Ntfy);
  const [authUser, setAuthUser] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [color, setColor] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; baseUrl?: string }>({});

  const isEditing = !!systemId;

  const { data: systemData } = useGetExternalNotifySystemQuery({
    variables: { id: systemId ?? "" },
    skip: !systemId,
  });

  const system = systemData?.externalNotifySystem;

  useEffect(() => {
    if (system && isEditing) {
      setName(system.name);
      setBaseUrl(system.baseUrl);
      setType(system.type as ExternalNotifySystemType);
      setColor(system.color ?? "");
      setIconUrl(system.iconUrl ?? "");
    }
  }, [system, isEditing]);

  const [createMutation, { loading: creating }] = useCreateExternalNotifySystemMutation({
    update: (cache, { data }) => {
      if (data?.createExternalNotifySystem) {
        const existing = cache.readQuery<{ externalNotifySystems: unknown[] }>({
          query: GetExternalNotifySystemsDocument,
        });
        if (existing?.externalNotifySystems) {
          cache.writeQuery({
            query: GetExternalNotifySystemsDocument,
            data: {
              externalNotifySystems: [
                ...existing.externalNotifySystems,
                data.createExternalNotifySystem,
              ],
            },
          });
        }
      }
    },
    onCompleted: () => router.back(),
    onError: (err) => {
      setErrorMessage(err.message || t("externalServers.createErrorMessage"));
      setShowErrorDialog(true);
    },
  });

  const [updateMutation, { loading: updating }] = useUpdateExternalNotifySystemMutation({
    onCompleted: () => router.back(),
    onError: (err) => {
      setErrorMessage(err.message || t("externalServers.updateErrorMessage"));
      setShowErrorDialog(true);
    },
  });

  const isLoading = creating || updating;

  const typeOptions: SelectorOption[] = [
    {
      id: ExternalNotifySystemType.Ntfy,
      name: t("externalServers.form.typeNtfy"),
      iconUrl: require("@/assets/icons/ntfy.svg"),
    },
    {
      id: ExternalNotifySystemType.Gotify,
      name: t("externalServers.form.typeGotify"),
      iconUrl: require("@/assets/icons/gotify.png"),
    },
  ];

  const validate = (): boolean => {
    const errors: { name?: string; baseUrl?: string } = {};
    if (!name.trim()) errors.name = t("externalServers.form.nameRequired");
    if (!baseUrl.trim()) errors.baseUrl = t("externalServers.form.baseUrlRequired");
    else {
      try {
        new URL(baseUrl.trim());
      } catch {
        errors.baseUrl = t("externalServers.form.baseUrlInvalid");
      }
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const save = async () => {
    if (!validate() || isLoading || isOffline) return;

    const baseInput = {
      name: name.trim(),
      baseUrl: baseUrl.trim().replace(/\/$/, ""),
      type,
      color: color.trim() || undefined,
      iconUrl: iconUrl.trim() || undefined,
      ...(type === ExternalNotifySystemType.Ntfy && {
        authUser: authUser.trim() || undefined,
        authPassword: authPassword ? authPassword : undefined,
      }),
      ...(type === ExternalNotifySystemType.Gotify && {
        authToken: authToken.trim() || undefined,
      }),
    };

    if (isEditing && systemId) {
      await updateMutation({
        variables: {
          id: systemId,
          input: baseInput as UpdateExternalNotifySystemDto,
        },
      });
    } else {
      await createMutation({
        variables: {
          input: baseInput as CreateExternalNotifySystemDto,
        },
      });
    }
  };

  return (
    <PaperScrollView>
      <View style={styles.form}>
        <TextInput
          label={t("externalServers.form.name")}
          value={name}
          onChangeText={setName}
          placeholder={t("externalServers.form.namePlaceholder")}
          mode="outlined"
          error={!!fieldErrors.name}
          style={styles.input}
        />
        {fieldErrors.name ? (
          <Text variant="bodySmall" style={[styles.error, { color: theme.colors.error }]}>
            {fieldErrors.name}
          </Text>
        ) : null}

        <Selector
          label={t("externalServers.form.type")}
          selectedValue={type}
          onValueChange={setType}
          options={typeOptions}
        />

        <TextInput
          label={t("externalServers.form.baseUrl")}
          value={baseUrl}
          onChangeText={setBaseUrl}
          placeholder={t("externalServers.form.baseUrlPlaceholder")}
          mode="outlined"
          autoCapitalize="none"
          autoCorrect={false}
          error={!!fieldErrors.baseUrl}
          style={styles.input}
        />
        {fieldErrors.baseUrl ? (
          <Text variant="bodySmall" style={[styles.error, { color: theme.colors.error }]}>
            {fieldErrors.baseUrl}
          </Text>
        ) : null}

        {type === ExternalNotifySystemType.Ntfy && (
          <>
            <TextInput
              label={t("externalServers.form.authUser")}
              value={authUser}
              onChangeText={setAuthUser}
              mode="outlined"
              autoCapitalize="none"
              style={styles.input}
            />
            <TextInput
              label={t("externalServers.form.authPassword")}
              value={authPassword}
              onChangeText={setAuthPassword}
              mode="outlined"
              secureTextEntry
              style={styles.input}
            />
          </>
        )}
        {type === ExternalNotifySystemType.Gotify && (
          <TextInput
            label={t("externalServers.form.authToken")}
            value={authToken}
            onChangeText={setAuthToken}
            placeholder={t("externalServers.form.authTokenPlaceholder")}
            mode="outlined"
            autoCapitalize="none"
            secureTextEntry
            style={styles.input}
          />
        )}
        <TextInput
          label={t("externalServers.form.color")}
          value={color}
          onChangeText={setColor}
          placeholder="#0a7ea4"
          mode="outlined"
          style={styles.input}
        />
        <TextInput
          label={t("externalServers.form.iconUrl")}
          value={iconUrl}
          onChangeText={setIconUrl}
          placeholder="https://..."
          mode="outlined"
          autoCapitalize="none"
          style={styles.input}
        />

        <Button
          mode="contained"
          onPress={save}
          loading={isLoading}
          disabled={isOffline}
          style={styles.button}
        >
          {isEditing ? t("externalServers.form.save") : t("externalServers.form.create")}
        </Button>
      </View>

      <Portal>
        <Dialog visible={showErrorDialog} onDismiss={() => setShowErrorDialog(false)}>
          <Dialog.Title>{t("common.error")}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">{errorMessage}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Text onPress={() => setShowErrorDialog(false)}>{t("common.ok")}</Text>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </PaperScrollView>
  );
}

const styles = StyleSheet.create({
  form: {
    padding: 16,
  },
  input: {
    marginBottom: 8,
  },
  error: {
    marginBottom: 8,
    marginTop: -4,
  },
  button: {
    marginTop: 16,
  },
});

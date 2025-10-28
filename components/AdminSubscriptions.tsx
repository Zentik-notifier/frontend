import { useI18n } from "@/hooks/useI18n";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Button, Card, Text, useTheme } from "react-native-paper";
import {
  EventType,
  useGetMyAdminSubscriptions,
  useUpsertMyAdminSubscriptions,
} from "../generated/gql-operations-generated";
import Multiselect, { MultiselectOption } from "./ui/Multiselect";

export default function AdminSubscriptions() {
  const { t } = useI18n();
  const theme = useTheme();
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [initialEvents, setInitialEvents] = useState<string[]>([]);

  // Crea le opzioni dinamicamente usando l'enum EventType e le traduzioni
  const eventTypeOptions: MultiselectOption[] = useMemo(() => {
    return Object.values(EventType).map((eventType) => ({
      id: eventType,
      name: t(`eventTypes.${eventType}` as any),
    }));
  }, [t]);

  const { data, loading, refetch } = useGetMyAdminSubscriptions({
    fetchPolicy: "network-only",
  });

  const [upsertMutation, { loading: saving }] = useUpsertMyAdminSubscriptions({
    onCompleted: () => {
      refetch();
    },
    onError: (error) => {
      console.error("Admin subscription update error:", error);
      Alert.alert(
        t("common.error"),
        error.message || t("adminSubscriptions.errorMessage")
      );
    },
  });

  useEffect(() => {
    if (data?.myAdminSubscription) {
      setSelectedEvents(data.myAdminSubscription);
      setInitialEvents(data.myAdminSubscription);
    }
  }, [data]);

  const handleValuesChange = (values: string[]) => {
    setSelectedEvents(values);
  };

  const handleSave = async () => {
    if (saving) return;

    try {
      await upsertMutation({
        variables: {
          eventTypes: selectedEvents,
        },
      });
      setInitialEvents(selectedEvents);
    } catch (error) {
      console.error("Failed to save admin subscriptions:", error);
    }
  };

  const hasChanges =
    JSON.stringify([...selectedEvents].sort()) !==
    JSON.stringify([...initialEvents].sort());

  if (loading) {
    return (
      <Card>
        <Card.Content>
          <Text style={{ color: theme.colors.onSurface }}>
            {t("adminSubscriptions.loading")}
          </Text>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card>
      <Card.Content>
        <View style={styles.header}>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
            {t("adminSubscriptions.title")}
          </Text>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
          >
            {t("adminSubscriptions.description")}
          </Text>
        </View>

        <Multiselect
          options={eventTypeOptions}
          selectedValues={selectedEvents}
          onValuesChange={handleValuesChange}
          placeholder={t("adminSubscriptions.selectPlaceholder")}
          mode="inline"
          showSelectAll={true}
          maxChipsToShow={4}
        />

        {hasChanges && (
          <View style={styles.saveButtonContainer}>
            <Button
              mode="contained"
              onPress={handleSave}
              disabled={saving}
              loading={saving}
              style={styles.saveButton}
            >
              {saving ? t("common.saving") : t("common.save")}
            </Button>
          </View>
        )}

        <View style={styles.info}>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {t("adminSubscriptions.selectedInfo", {
              count: selectedEvents.length,
              total: eventTypeOptions.length,
            })}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 16,
  },
  saveButtonContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  saveButton: {
    width: "100%",
  },
  info: {
    marginTop: 8,
    alignItems: "center",
  },
});

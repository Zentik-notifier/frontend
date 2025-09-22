import CreateAccessTokenForm from "@/components/CreateAccessTokenForm";
import { ThemedView } from "@/components/ThemedView";
import { useI18n } from "@/hooks/useI18n";
import { Stack } from "expo-router";
import React from "react";
import {
    ScrollView,
    StyleSheet,
} from "react-native";

export default function CreateAccessTokenScreen() {
  const { t } = useI18n();
  
  return (
    <>
      <Stack.Screen 
        options={{ 
          title: t('accessTokens.form.title')
        }} 
      />
      <ThemedView style={styles.container}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <CreateAccessTokenForm showTitle={true} />
        </ScrollView>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});

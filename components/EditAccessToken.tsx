import CreateAccessTokenForm from "@/components/CreateAccessTokenForm";
import { useGetUserAccessTokensQuery } from "@/generated/gql-operations-generated";
import React from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { Text, useTheme } from "react-native-paper";

interface EditAccessTokenProps {
  tokenId: string;
}

export default function EditAccessToken({ tokenId }: EditAccessTokenProps) {
  const theme = useTheme();
  const { data, loading } = useGetUserAccessTokensQuery();

  const tokenData = data?.getUserAccessTokens?.find((token) => token.id === tokenId);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!tokenData) {
    return (
      <View style={styles.errorContainer}>
        <Text variant="bodyLarge" style={{ color: theme.colors.error }}>
          Token not found
        </Text>
      </View>
    );
  }

  return <CreateAccessTokenForm editMode={true} tokenData={tokenData} />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
});


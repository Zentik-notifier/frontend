import {
  OAuthProviderFragment,
  OAuthProviderType,
  useAllOAuthProvidersQuery,
} from "@/generated/gql-operations-generated";
import { Image } from "expo-image";
import React from "react";
import { View, ViewStyle } from "react-native";
import { Icon } from "react-native-paper";

type Props = {
  providerType: OAuthProviderType;
  provider?: OAuthProviderFragment;
  size?: number; // outer container size (square)
  iconSize?: number; // inner icon size
  backgroundColor?: string;
  style?: ViewStyle;
  circular?: boolean; // force circular shape
  marginRight?: number; // right spacing
};

export default function OAuthProviderIcon({
  providerType,
  provider: providerParent,
  size = 28,
  iconSize = 18,
  backgroundColor,
  style,
  circular = true,
  marginRight = 12,
}: Props) {
  const { data } = useAllOAuthProvidersQuery({ skip: !!providerParent });
  const providers = data?.allOAuthProviders || [];

  const provider =
    providerParent ?? providers.find((p) => p.type === providerType);

  const containerStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: circular ? size / 2 : Math.max(4, Math.round(size / 6)),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: backgroundColor ?? provider?.color ?? undefined,
    marginRight,
    ...(style || {}),
  };

  if (providerType === OAuthProviderType.AppleSignin) {
    return (
      <View style={{ ...containerStyle, backgroundColor: "#FFFFFF" }}>
        <Image
          source={{
            uri: "https://cdn-icons-png.flaticon.com/128/15/15476.png",
          }}
          style={{ width: iconSize, height: iconSize }}
        />
      </View>
    );
  }

  if (provider?.iconUrl) {
    return (
      <View style={containerStyle}>
        <Image
          source={{ uri: provider.iconUrl }}
          style={{ width: iconSize, height: iconSize }}
        />
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      <Icon source={"key"} size={iconSize} />
    </View>
  );
}

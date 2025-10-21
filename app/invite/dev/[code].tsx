import { Redirect, useLocalSearchParams } from "expo-router";

export default function InviteDevRedirect() {
  const { code } = useLocalSearchParams<{ code: string }>();

  return <Redirect href={`/invite/${code}?env=dev`} />;
}


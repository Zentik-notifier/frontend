import React from "react";
import { View, StyleSheet } from "react-native";
import { useDeviceType } from "@/hooks/useDeviceType";
import CreateBucketForm from "@/components/CreateBucketForm";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CreateBucketScreen() {
  const { isMobile } = useDeviceType();

  if (isMobile) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <CreateBucketForm withHeader />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CreateBucketForm />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

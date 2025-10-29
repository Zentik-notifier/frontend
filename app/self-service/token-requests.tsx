import UserSystemAccessTokenRequests from "@/components/UserSystemAccessTokenRequests";
import PaperScrollView from "@/components/ui/PaperScrollView";
import { usePublicAppConfigQuery } from "@/generated/gql-operations-generated";
import { useNavigationUtils } from "@/utils/navigation";
import { Redirect } from "expo-router";
import React, { useEffect } from "react";

export default function TokenRequestsPage() {
  const { navigateToHome } = useNavigationUtils();
  const { data: appConfigData, loading } = usePublicAppConfigQuery();

  const isEnabled = appConfigData?.publicAppConfig?.systemTokenRequestsEnabled;

  useEffect(() => {
    if (!loading && !isEnabled) {
      navigateToHome();
    }
  }, [loading, isEnabled, navigateToHome]);

  if (loading) {
    return null;
  }

  if (!isEnabled) {
    return <Redirect href="/" />;
  }

  return (
    <PaperScrollView
      showsVerticalScrollIndicator
    >
      <UserSystemAccessTokenRequests />
    </PaperScrollView>
  );
}

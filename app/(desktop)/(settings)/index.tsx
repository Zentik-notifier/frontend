import { useAppContext } from "@/contexts/AppContext";
import { useNavigationUtils } from "@/utils/navigation";
import { useEffect } from "react";

export default function SettingsIndexPage() {
  const { lastUserId } = useAppContext();
  const { navigateToAppSettings, navigateToUserProfile } = useNavigationUtils();

  useEffect(() => {
    if (lastUserId) {
      navigateToUserProfile();
    } else {
      navigateToAppSettings(true);
    }
  }, [lastUserId, navigateToAppSettings, navigateToUserProfile]);

  return null;
}

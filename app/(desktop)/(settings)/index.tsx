import { useNavigationUtils } from "@/utils/navigation";
import { useEffect } from "react";

export default function SettingsIndexPage() {
  const { navigateToSettings } = useNavigationUtils();

  useEffect(() => {
    navigateToSettings();
  }, []);

  return null;
}

import { useNavigationUtils } from "@/utils/navigation";
import { useEffect } from "react";

export default function Index() {
  const { navigateToHome } = useNavigationUtils();

  useEffect(() => {
    navigateToHome();
  }, []);

  return null;
}

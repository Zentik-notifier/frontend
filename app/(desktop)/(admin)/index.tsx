import { useNavigationUtils } from "@/utils/navigation";
import { useEffect } from "react";

export default function AdminIndexPage() {
  const { navigateToAdmin } = useNavigationUtils();

  useEffect(() => {
    navigateToAdmin();
  }, []);

  return null;
}

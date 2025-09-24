import { useNavigationUtils } from "@/utils/navigation";
import { Redirect } from "expo-router";

export default function Index() {
  const { homeRoute } = useNavigationUtils();

  return <Redirect href={homeRoute} />;
}

import { Redirect } from "expo-router";
import { useLocalSearchParams } from "expo-router";

// Questa pagina reindirizza al mobile per mantenere la stessa UX
export default function TabletCreateSystemAccessToken() {
  const params = useLocalSearchParams();
  const queryString = new URLSearchParams(params as Record<string, string>).toString();
  const baseUrl = "/(mobile)/private/create-system-access-token";
  
  return <Redirect href={queryString ? `${baseUrl}?${queryString}` : baseUrl} />;
}
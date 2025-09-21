import { Redirect } from "expo-router";
import { useLocalSearchParams } from "expo-router";

// La pagina di dettaglio notifica rimane uguale al mobile
export default function TabletNotificationDetail() {
  const params = useLocalSearchParams();
  const queryString = new URLSearchParams(params as Record<string, string>).toString();
  
  return <Redirect href={`/(mobile)/private/notification-detail?${queryString}`} />;
}

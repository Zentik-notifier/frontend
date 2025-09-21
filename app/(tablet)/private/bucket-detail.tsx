import { Redirect } from "expo-router";
import { useLocalSearchParams } from "expo-router";

// La pagina di dettaglio bucket rimane uguale al mobile
export default function TabletBucketDetail() {
  const params = useLocalSearchParams();
  const queryString = new URLSearchParams(params as Record<string, string>).toString();
  
  return <Redirect href={`/(mobile)/private/bucket-detail?${queryString}`} />;
}

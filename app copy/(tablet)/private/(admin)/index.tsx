import { Redirect } from "expo-router";

export default function AdminIndex() {
  return <Redirect href="/(tablet)/private/(admin)/user-management" />;
}

import { Redirect } from "expo-router";
import React from "react";

export default function HomeScreen() {
  // La logica tablet è gestita nell'index principale
  // Qui gestiamo solo il redirect alle tabs mobile
  return <Redirect href="/(mobile)/private/(homeTabs)" />;
}

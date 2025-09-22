import React, { useEffect } from "react";
import { router } from "expo-router";

export default function HomePage() {
  useEffect(() => {
    router.replace("/home/notifications");
  }, []);

  return null;
}

import CreateAccessTokenForm from "@/components/CreateAccessTokenForm";
import React from "react";
import PaperScrollView from "./ui/PaperScrollView";

export default function CreateAccessToken() {
  return (
    <PaperScrollView>
      <CreateAccessTokenForm />
    </PaperScrollView>
  );
}

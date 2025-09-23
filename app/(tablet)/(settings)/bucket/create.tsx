import CloseHeader from "@/components/CloseHeader";
import CreateBucketForm from "@/components/CreateBucketForm";
import { useNavigationUtils } from "@/utils/navigation";
import React from "react";

export default function CreateBucketScreen() {
  const { navigateBack } = useNavigationUtils();

  return (
    <>
      <CloseHeader onClose={navigateBack} />
      <CreateBucketForm />
    </>
  );
}

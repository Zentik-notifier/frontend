import CreateBucketForm from "@/components/CreateBucketForm";
import CloseHeader from "@/components/CloseHeader";
import React from "react";
import { useNavigationUtils } from "@/utils/navigation";

export default function CreateBucketScreen() {
  const { navigateToHome } = useNavigationUtils();

  const handleClose = () => {
    navigateToHome();
  };

  return (
    <>
      <CloseHeader onClose={handleClose} />
      <CreateBucketForm />
    </>
  );
}

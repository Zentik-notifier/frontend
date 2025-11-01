import CloseHeader from "@/components/CloseHeader";
import CreateBucket from "@/components/CreateBucket";
import { useNavigationUtils } from "@/utils/navigation";
import React from "react";

export default function CreateBucketScreen() {
  const { navigateBack } = useNavigationUtils();

  return (
    <>
      <CloseHeader onClose={navigateBack} />
      <CreateBucket />
    </>
  );
}

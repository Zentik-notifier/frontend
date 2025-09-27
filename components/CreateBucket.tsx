import CreateBucketForm from "./CreateBucketForm";
import PaperScrollView from "./ui/PaperScrollView";
import React from "react";

interface CreateBucketProps {
  bucketId?: string;
}

export default function CreateBucket({ bucketId }: CreateBucketProps) {
  return (
    <PaperScrollView>
      <CreateBucketForm bucketId={bucketId} />
    </PaperScrollView>
  );
}

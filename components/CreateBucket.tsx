import React from "react";
import CreateBucketForm from "./CreateBucketForm";

interface CreateBucketProps {
  bucketId?: string;
}

export default function CreateBucket({ bucketId }: CreateBucketProps) {
  return <CreateBucketForm bucketId={bucketId} />;
}

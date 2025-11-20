import React from "react";
import { useHelpContent } from "./useHelpContent";
import HelpContent from "./HelpContent";

interface HelpModalProps {
  visible: boolean;
  onDismiss: () => void;
}

export default function HelpModal({
  visible,
  onDismiss,
}: HelpModalProps) {
  const helpConfig = useHelpContent();

  if (!helpConfig || !visible) {
    return null;
  }

  const ContentComponent = helpConfig.component;

  return (
    <HelpContent
      visible={visible}
      onDismiss={onDismiss}
      title={helpConfig.title}
      icon={helpConfig.icon}
    >
      <ContentComponent />
    </HelpContent>
  );
}


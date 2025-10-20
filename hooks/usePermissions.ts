import { useI18n } from "@/hooks/useI18n";
import { Permission } from "@/generated/gql-operations-generated";
import { useMemo } from "react";

export function usePermissions() {
  const { t } = useI18n();

  const availablePermissions = useMemo(
    () => [
      Permission.Read,
      Permission.Write,
      Permission.Delete,
      Permission.Admin,
    ],
    []
  );

  const getPermissionLabel = (permission: Permission): string => {
    switch (permission) {
      case Permission.Read:
        return t("buckets.sharing.permission.READ");
      case Permission.Write:
        return t("buckets.sharing.permission.WRITE");
      case Permission.Delete:
        return t("buckets.sharing.permission.DELETE");
      case Permission.Admin:
        return t("buckets.sharing.permission.ADMIN");
      default:
        return permission;
    }
  };

  const getPermissionsText = (permissions: Permission[]): string => {
    return permissions
      .map((p) => {
        switch (p) {
          case Permission.Read:
            return t("buckets.sharing.permission.READ");
          case Permission.Write:
            return t("buckets.sharing.permission.WRITE");
          case Permission.Delete:
            return t("buckets.sharing.permission.DELETE");
          case Permission.Admin:
            return t("buckets.sharing.permission.ADMIN");
          default:
            return p;
        }
      })
      .join(", ");
  };

  return {
    availablePermissions,
    getPermissionLabel,
    getPermissionsText,
  };
}


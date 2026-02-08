import React, { createContext, ReactNode } from "react";

/**
 * Minimal context for last authenticated user id.
 * Used by notification hooks to avoid circular dependency with AppContext.
 * AppContext provides this value; do not import AppContext here.
 */
export const AuthUserIdContext = createContext<string | null>(null);

export function AuthUserIdProvider({
  value,
  children,
}: {
  value: string | null;
  children: ReactNode;
}) {
  return (
    <AuthUserIdContext.Provider value={value}>
      {children}
    </AuthUserIdContext.Provider>
  );
}

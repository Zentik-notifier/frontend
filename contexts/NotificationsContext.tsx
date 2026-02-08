import { NotificationFragment } from "@/generated/gql-operations-generated";
import { NotificationVisualization } from "@/services/settings-service";
import { useAppContext } from "@/contexts/AppContext";
import React, { createContext, useContext, useReducer, ReactNode, useEffect, useCallback, useMemo } from "react";

// Types
interface NotificationsState {
  allNotificationIds: string[];
  selectionMode: boolean;
  selectedItems: Set<string>;
  markAsReadLoading: boolean;
  markAsUnreadLoading: boolean;
  deleteLoading: boolean;
  showFiltersModal: boolean;
  hideBucketSelector: boolean;
  activeFiltersCount: number;
}

type NotificationsAction =
  | { type: "SET_ALL_NOTIFICATION_IDS"; payload: string[] }
  | { type: "SET_SELECTION_MODE"; payload: boolean }
  | { type: "SET_SELECTED_ITEMS"; payload: Set<string> }
  | { type: "TOGGLE_ITEM_SELECTION"; payload: string }
  | { type: "CLEAR_SELECTION" }
  | { type: "SET_MARK_AS_READ_LOADING"; payload: boolean }
  | { type: "SET_MARK_AS_UNREAD_LOADING"; payload: boolean }
  | { type: "SET_DELETE_LOADING"; payload: boolean }
  | { type: "SET_SHOW_FILTERS_MODAL"; payload: boolean }
  | { type: "SET_HIDE_BUCKET_SELECTOR"; payload: boolean }
  | { type: "SET_ACTIVE_FILTERS_COUNT"; payload: number };

// Initial state
const initialState: NotificationsState = {
  allNotificationIds: [],
  selectionMode: false,
  selectedItems: new Set(),
  markAsReadLoading: false,
  markAsUnreadLoading: false,
  deleteLoading: false,
  showFiltersModal: false,
  hideBucketSelector: false,
  activeFiltersCount: 0,
};

// Reducer
function notificationsReducer(
  state: NotificationsState,
  action: NotificationsAction
): NotificationsState {
  switch (action.type) {
    case "SET_ALL_NOTIFICATION_IDS":
      return { ...state, allNotificationIds: action.payload };
    case "SET_SELECTION_MODE":
      return {
        ...state,
        selectionMode: action.payload,
        selectedItems: action.payload ? state.selectedItems : new Set(),
      };
    case "SET_SELECTED_ITEMS":
      return { ...state, selectedItems: action.payload };
    case "TOGGLE_ITEM_SELECTION":
      const newSelectedItems = new Set(state.selectedItems);
      if (newSelectedItems.has(action.payload)) {
        newSelectedItems.delete(action.payload);
      } else {
        newSelectedItems.add(action.payload);
      }
      return { ...state, selectedItems: newSelectedItems };
    case "CLEAR_SELECTION":
      return { ...state, selectedItems: new Set() };
    case "SET_MARK_AS_READ_LOADING":
      return { ...state, markAsReadLoading: action.payload };
    case "SET_MARK_AS_UNREAD_LOADING":
      return { ...state, markAsUnreadLoading: action.payload };
    case "SET_DELETE_LOADING":
      return { ...state, deleteLoading: action.payload };
    case "SET_SHOW_FILTERS_MODAL":
      return { ...state, showFiltersModal: action.payload };
    case "SET_HIDE_BUCKET_SELECTOR":
      return { ...state, hideBucketSelector: action.payload };
    case "SET_ACTIVE_FILTERS_COUNT":
      return { ...state, activeFiltersCount: action.payload };
    default:
      return state;
  }
}

// Context
interface NotificationsContextType {
  state: NotificationsState;
  dispatch: React.Dispatch<NotificationsAction>;
  // Helper functions
  handleSetAllNotificationIds: (ids: string[]) => void;
  handleToggleMultiSelection: () => void;
  handleToggleItemSelection: (itemId: string) => void;
  handleSelectAll: () => void;
  handleDeselectAll: () => void;
  handleCloseSelectionMode: () => void;
  handleShowFiltersModal: () => void;
  handleHideFiltersModal: () => void;
}

const NotificationsContext = createContext<
  NotificationsContextType | undefined
>(undefined);

// Provider
interface NotificationsProviderProps {
  children: ReactNode;
}

export function NotificationsProvider({
  children,
}: NotificationsProviderProps) {
  const [state, dispatch] = useReducer(notificationsReducer, {
    ...initialState,
  });

  const {
    userSettings: { settings },
  } = useAppContext();

  const handleSetAllNotificationIds = useCallback((ids: string[]) => {
    dispatch({ type: "SET_ALL_NOTIFICATION_IDS", payload: ids });
  }, []);

  const handleToggleMultiSelection = useCallback(() => {
    dispatch({ type: "SET_SELECTION_MODE", payload: !state.selectionMode });
  }, [state.selectionMode]);

  const handleToggleItemSelection = useCallback((itemId: string) => {
    dispatch({ type: "TOGGLE_ITEM_SELECTION", payload: itemId });
  }, []);

  const handleSelectAll = useCallback(() => {
    // Se tutte le notifiche sono già selezionate, deseleziona tutto
    const allSelected = state.allNotificationIds.length > 0 && 
                        state.selectedItems.size === state.allNotificationIds.length &&
                        state.allNotificationIds.every(id => state.selectedItems.has(id));
    
    if (allSelected) {
      console.log("handleSelectAll - All already selected, deselecting all");
      dispatch({ type: "CLEAR_SELECTION" });
    } else {
      console.log("handleSelectAll - Selecting all", state.allNotificationIds.length);
      const allIds = new Set(state.allNotificationIds);
      dispatch({ type: "SET_SELECTED_ITEMS", payload: allIds });
    }
  }, [state.allNotificationIds, state.selectedItems]);

  const handleDeselectAll = useCallback(() => {
    dispatch({ type: "CLEAR_SELECTION" });
  }, []);

  const handleCloseSelectionMode = useCallback(() => {
    dispatch({ type: "SET_SELECTION_MODE", payload: false });
  }, []);

  const handleShowFiltersModal = useCallback(() => {
    dispatch({ type: "SET_SHOW_FILTERS_MODAL", payload: true });
  }, []);

  const handleHideFiltersModal = useCallback(() => {
    dispatch({ type: "SET_SHOW_FILTERS_MODAL", payload: false });
  }, []);

  const updateActiveFiltersCount = (filters: NotificationVisualization): void => {
    let count = 0;
    if (filters.hideRead) count++;
    if (filters.timeRange !== "all") count++;
    if (filters.selectedBucketIds.length > 0) count++;
    if (filters.showOnlyWithAttachments) count++;
    if (filters.sortBy !== "newest") count++;
    dispatch({ type: "SET_ACTIVE_FILTERS_COUNT", payload: count });
  };

  useEffect(() => {
    updateActiveFiltersCount(settings.notificationVisualization);
  }, [settings.notificationVisualization]);

  const value: NotificationsContextType = useMemo(() => ({
    state,
    dispatch,
    handleSetAllNotificationIds,
    handleToggleMultiSelection,
    handleToggleItemSelection,
    handleSelectAll,
    handleDeselectAll,
    handleCloseSelectionMode,
    handleShowFiltersModal,
    handleHideFiltersModal,
  }), [
    state,
    handleSetAllNotificationIds,
    handleToggleMultiSelection,
    handleToggleItemSelection,
    handleSelectAll,
    handleDeselectAll,
    handleCloseSelectionMode,
    handleShowFiltersModal,
    handleHideFiltersModal,
  ]);

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

// Hook
export function useNotificationsContext() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error(
      "useNotifications must be used within a NotificationsProvider"
    );
  }
  return context;
}

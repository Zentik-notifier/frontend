import { NotificationFragment } from "@/generated/gql-operations-generated";
import React, { createContext, useContext, useReducer, ReactNode } from "react";

// Types
interface NotificationsState {
  allNotifications: NotificationFragment[];
  selectionMode: boolean;
  selectedItems: Set<string>;
  markAsReadLoading: boolean;
  markAsUnreadLoading: boolean;
  deleteLoading: boolean;
  showFiltersModal: boolean;
  hideBucketSelector: boolean;
}

type NotificationsAction =
  | { type: "SET_ALL_NOTIFICATIONS"; payload: NotificationFragment[] }
  | { type: "SET_SELECTION_MODE"; payload: boolean }
  | { type: "SET_SELECTED_ITEMS"; payload: Set<string> }
  | { type: "TOGGLE_ITEM_SELECTION"; payload: string }
  | { type: "CLEAR_SELECTION" }
  | { type: "SET_MARK_AS_READ_LOADING"; payload: boolean }
  | { type: "SET_MARK_AS_UNREAD_LOADING"; payload: boolean }
  | { type: "SET_DELETE_LOADING"; payload: boolean }
  | { type: "SET_SHOW_FILTERS_MODAL"; payload: boolean }
  | { type: "SET_HIDE_BUCKET_SELECTOR"; payload: boolean };

// Initial state
const initialState: NotificationsState = {
  allNotifications: [],
  selectionMode: false,
  selectedItems: new Set(),
  markAsReadLoading: false,
  markAsUnreadLoading: false,
  deleteLoading: false,
  showFiltersModal: false,
  hideBucketSelector: false,
};

// Reducer
function notificationsReducer(
  state: NotificationsState,
  action: NotificationsAction
): NotificationsState {
  switch (action.type) {
    case "SET_ALL_NOTIFICATIONS":
      return { ...state, allNotifications: action.payload };
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
    default:
      return state;
  }
}

// Context
interface NotificationsContextType {
  state: NotificationsState;
  dispatch: React.Dispatch<NotificationsAction>;
  // Helper functions
  handleSetAllNotifications: (notifications: NotificationFragment[]) => void;
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

  const handleSetAllNotifications = (notifications: NotificationFragment[]) => {
    dispatch({ type: "SET_ALL_NOTIFICATIONS", payload: notifications });
  };

  const handleToggleMultiSelection = () => {
    dispatch({ type: "SET_SELECTION_MODE", payload: !state.selectionMode });
  };

  const handleToggleItemSelection = (itemId: string) => {
    dispatch({ type: "TOGGLE_ITEM_SELECTION", payload: itemId });
  };

  const handleSelectAll = () => {
    console.log("handleSelectAll", state.allNotifications);
    const allIds = new Set(state.allNotifications.map((n) => n.id));
    dispatch({ type: "SET_SELECTED_ITEMS", payload: allIds });
  };

  const handleDeselectAll = () => {
    dispatch({ type: "CLEAR_SELECTION" });
  };

  const handleCloseSelectionMode = () => {
    dispatch({ type: "SET_SELECTION_MODE", payload: false });
  };

  const handleShowFiltersModal = () => {
    dispatch({ type: "SET_SHOW_FILTERS_MODAL", payload: true });
  };

  const handleHideFiltersModal = () => {
    dispatch({ type: "SET_SHOW_FILTERS_MODAL", payload: false });
  };

  const value: NotificationsContextType = {
    state,
    dispatch,
    handleSetAllNotifications,
    handleToggleMultiSelection,
    handleToggleItemSelection,
    handleSelectAll,
    handleDeselectAll,
    handleCloseSelectionMode,
    handleShowFiltersModal,
    handleHideFiltersModal,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

// Hook
export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error(
      "useNotifications must be used within a NotificationsProvider"
    );
  }
  return context;
}

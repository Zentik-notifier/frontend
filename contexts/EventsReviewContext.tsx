import { EventType } from "@/generated/gql-operations-generated";
import React, {
  createContext,
  useContext,
  useReducer,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
} from "react";

// Types
export interface EventsReviewFilters {
  selectedType?: EventType;
  userId?: string;
  objectId: string;
  targetId: string;
}

interface EventsReviewState {
  filters: EventsReviewFilters;
  showFiltersModal: boolean;
  activeFiltersCount: number;
  fixedUserId?: string;
  fixedObjectIds?: string[];
}

type EventsReviewAction =
  | { type: "SET_FILTERS"; payload: EventsReviewFilters }
  | { type: "SET_SHOW_FILTERS_MODAL"; payload: boolean }
  | { type: "SET_ACTIVE_FILTERS_COUNT"; payload: number }
  | { type: "CLEAR_FILTERS" }
  | { type: "SET_FIXED_OBJECT_IDS"; payload?: string[] };

// Initial state
const initialFilters: EventsReviewFilters = {
  selectedType: undefined,
  userId: undefined,
  objectId: "",
  targetId: "",
};

const initialState: EventsReviewState = {
  filters: initialFilters,
  showFiltersModal: false,
  activeFiltersCount: 0,
  fixedUserId: undefined,
};

// Reducer
function eventsReviewReducer(
  state: EventsReviewState,
  action: EventsReviewAction
): EventsReviewState {
  switch (action.type) {
    case "SET_FILTERS":
      return { ...state, filters: action.payload };
    case "SET_SHOW_FILTERS_MODAL":
      return { ...state, showFiltersModal: action.payload };
    case "SET_ACTIVE_FILTERS_COUNT":
      return { ...state, activeFiltersCount: action.payload };
    case "CLEAR_FILTERS":
      return {
        ...state,
        filters: {
          ...initialFilters,
          userId: state.fixedUserId || initialFilters.userId,
        },
      };
    case "SET_FIXED_OBJECT_IDS":
      return {
        ...state,
        fixedObjectIds: action.payload,
      };
    default:
      return state;
  }
}

// Context
interface EventsReviewContextType {
  state: EventsReviewState;
  dispatch: React.Dispatch<EventsReviewAction>;
  // Helper functions
  handleSetFilters: (filters: EventsReviewFilters) => void;
  handleClearFilters: () => void;
  handleShowFiltersModal: () => void;
  handleHideFiltersModal: () => void;
  updateActiveFiltersCount: (filters: EventsReviewFilters) => void;
}

const EventsReviewContext = createContext<EventsReviewContextType | undefined>(
  undefined
);

// Provider
interface EventsReviewProviderProps {
  children: ReactNode;
  initialFilters?: Partial<EventsReviewFilters>;
  fixedUserId?: string;
  fixedObjectIds?: string[];
}

export function EventsReviewProvider({
  children,
  initialFilters: initialFiltersProp,
  fixedUserId,
  fixedObjectIds,
}: EventsReviewProviderProps) {
  const [state, dispatch] = useReducer(eventsReviewReducer, {
    ...initialState,
    filters: {
      ...initialState.filters,
      ...initialFiltersProp,
      userId: fixedUserId || initialFiltersProp?.userId || initialState.filters.userId,
    },
    fixedUserId,
    fixedObjectIds,
  });

  // Keep fixedObjectIds in sync with provider props (e.g. when switching tabs)
  useEffect(() => {
    if (fixedObjectIds !== state.fixedObjectIds) {
      dispatch({ type: "SET_FIXED_OBJECT_IDS", payload: fixedObjectIds });
    }
  }, [fixedObjectIds, state.fixedObjectIds]);

  const updateActiveFiltersCount = useCallback((filters: EventsReviewFilters): void => {
    let count = 0;
    if (filters.selectedType) count++;
    if (filters.userId && !fixedUserId) count++;
    if (filters.objectId) count++;
    if (filters.targetId) count++;
    dispatch({ type: "SET_ACTIVE_FILTERS_COUNT", payload: count });
  }, [fixedUserId]);

  const handleSetFilters = useCallback((filters: EventsReviewFilters) => {
    dispatch({ type: "SET_FILTERS", payload: filters });
    updateActiveFiltersCount(filters);
  }, [updateActiveFiltersCount]);

  const handleClearFilters = useCallback(() => {
    dispatch({ type: "CLEAR_FILTERS" });
    dispatch({ type: "SET_ACTIVE_FILTERS_COUNT", payload: 0 });
  }, []);

  const handleShowFiltersModal = useCallback(() => {
    dispatch({ type: "SET_SHOW_FILTERS_MODAL", payload: true });
  }, []);

  const handleHideFiltersModal = useCallback(() => {
    dispatch({ type: "SET_SHOW_FILTERS_MODAL", payload: false });
  }, []);

  const value = useMemo<EventsReviewContextType>(() => ({
    state,
    dispatch,
    handleSetFilters,
    handleClearFilters,
    handleShowFiltersModal,
    handleHideFiltersModal,
    updateActiveFiltersCount,
  }), [
    state,
    dispatch,
    handleSetFilters,
    handleClearFilters,
    handleShowFiltersModal,
    handleHideFiltersModal,
    updateActiveFiltersCount,
  ]);

  return (
    <EventsReviewContext.Provider value={value}>
      {children}
    </EventsReviewContext.Provider>
  );
}

// Hook
export function useEventsReviewContext() {
  const context = useContext(EventsReviewContext);
  if (context === undefined) {
    throw new Error(
      "useEventsReviewContext must be used within an EventsReviewProvider"
    );
  }
  return context;
}

import { MediaType } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks";
import { useGetCacheStats } from "@/hooks/useMediaCache";
import { useAppContext } from "@/services/app-context";
import { CacheItem } from "@/services/media-cache";
import React, {
  createContext,
  useContext,
  useReducer,
  ReactNode,
  useMemo,
  useEffect,
} from "react";

// Types
interface GallerySection {
  title: string;
  data: CacheItem[][];
  key: string;
}

interface GalleryState {
  selectionMode: boolean;
  selectedItems: Set<string>;
  selectedMediaTypes: Set<MediaType>;
  deleteLoading: boolean;
  showFiltersModal: boolean;
  filteredMedia: CacheItem[];
  sections: GallerySection[];
  flatOrder: CacheItem[];
}

type GalleryAction =
  | { type: "SET_SELECTION_MODE"; payload: boolean }
  | { type: "SET_SELECTED_ITEMS"; payload: Set<string> }
  | { type: "TOGGLE_ITEM_SELECTION"; payload: string }
  | { type: "CLEAR_SELECTION" }
  | { type: "SET_SELECTED_MEDIA_TYPES"; payload: Set<MediaType> }
  | { type: "SET_DELETE_LOADING"; payload: boolean }
  | { type: "SET_SHOW_FILTERS_MODAL"; payload: boolean }
  | { type: "SET_FILTERED_MEDIA"; payload: CacheItem[] }
  | { type: "SET_SECTIONS"; payload: GallerySection[] }
  | { type: "SET_FLAT_ORDER"; payload: CacheItem[] };

// Initial state
const initialState: GalleryState = {
  selectionMode: false,
  selectedItems: new Set(),
  selectedMediaTypes: new Set(Object.values(MediaType)),
  deleteLoading: false,
  showFiltersModal: false,
  filteredMedia: [],
  sections: [],
  flatOrder: [],
};

// Reducer
function galleryReducer(
  state: GalleryState,
  action: GalleryAction
): GalleryState {
  switch (action.type) {
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
    case "SET_SELECTED_MEDIA_TYPES":
      return { ...state, selectedMediaTypes: action.payload };
    case "SET_DELETE_LOADING":
      return { ...state, deleteLoading: action.payload };
    case "SET_SHOW_FILTERS_MODAL":
      return { ...state, showFiltersModal: action.payload };
    case "SET_FILTERED_MEDIA":
      return { ...state, filteredMedia: action.payload };
    case "SET_SECTIONS":
      return { ...state, sections: action.payload };
    case "SET_FLAT_ORDER":
      return { ...state, flatOrder: action.payload };
    default:
      return state;
  }
}

// Context
interface GalleryContextType {
  state: GalleryState;
  dispatch: React.Dispatch<GalleryAction>;
  // Helper functions
  handleSetFilteredMedia: (media: CacheItem[]) => void;
  handleSetSections: (sections: GallerySection[]) => void;
  handleSetFlatOrder: (flatOrder: CacheItem[]) => void;
  handleToggleMultiSelection: () => void;
  handleToggleItemSelection: (itemId: string) => void;
  handleSelectAll: () => void;
  handleDeselectAll: () => void;
  handleCloseSelectionMode: () => void;
  handleMediaTypesChange: (types: Set<MediaType>) => void;
  handleShowFiltersModal: () => void;
  handleHideFiltersModal: () => void;
  handleDeleteSelected: () => Promise<void>;
}

const GalleryContext = createContext<GalleryContextType | undefined>(undefined);

// Provider
interface GalleryProviderProps {
  children: ReactNode;
}

export function GalleryProvider({ children }: GalleryProviderProps) {
  const [state, dispatch] = useReducer(galleryReducer, initialState);
  const { cachedItems } = useGetCacheStats();
  const { t } = useI18n();
  const { userSettings } = useAppContext();
  const numColumns = userSettings.settings.gallery.gridSize;

  const handleSetFilteredMedia = (media: CacheItem[]) => {
    dispatch({ type: "SET_FILTERED_MEDIA", payload: media });
  };

  const handleSetSections = (sections: GallerySection[]) => {
    dispatch({ type: "SET_SECTIONS", payload: sections });
  };

  const handleSetFlatOrder = (flatOrder: CacheItem[]) => {
    dispatch({ type: "SET_FLAT_ORDER", payload: flatOrder });
  };

  const handleToggleMultiSelection = () => {
    dispatch({ type: "SET_SELECTION_MODE", payload: !state.selectionMode });
  };

  const handleToggleItemSelection = (itemId: string) => {
    dispatch({ type: "TOGGLE_ITEM_SELECTION", payload: itemId });
  };

  const handleSelectAll = () => {
    const allIds = new Set(state.filteredMedia.map((item) => item.key));
    dispatch({ type: "SET_SELECTED_ITEMS", payload: allIds });
  };

  const handleDeselectAll = () => {
    dispatch({ type: "CLEAR_SELECTION" });
  };

  const handleCloseSelectionMode = () => {
    dispatch({ type: "SET_SELECTION_MODE", payload: false });
  };

  const handleMediaTypesChange = (types: Set<MediaType>) => {
    dispatch({ type: "SET_SELECTED_MEDIA_TYPES", payload: types });
  };

  const handleShowFiltersModal = () => {
    dispatch({ type: "SET_SHOW_FILTERS_MODAL", payload: true });
  };

  const handleHideFiltersModal = () => {
    dispatch({ type: "SET_SHOW_FILTERS_MODAL", payload: false });
  };

  const handleDeleteSelected = async () => {
    if (state.selectedItems.size === 0) return;

    dispatch({ type: "SET_DELETE_LOADING", payload: true });

    try {
      // TODO: Implement actual delete logic here
      // This should call the appropriate API to delete the selected media items
      console.log("Deleting selected items:", Array.from(state.selectedItems));

      // For now, just clear the selection
      dispatch({ type: "CLEAR_SELECTION" });
    } catch (error) {
      console.error("Error deleting selected items:", error);
    } finally {
      dispatch({ type: "SET_DELETE_LOADING", payload: false });
    }
  };

  const value: GalleryContextType = {
    state,
    dispatch,
    handleSetFilteredMedia,
    handleSetSections,
    handleSetFlatOrder,
    handleToggleMultiSelection,
    handleToggleItemSelection,
    handleSelectAll,
    handleDeselectAll,
    handleCloseSelectionMode,
    handleMediaTypesChange,
    handleShowFiltersModal,
    handleHideFiltersModal,
    handleDeleteSelected,
  };

  useEffect(() => {
    const allWithIds = cachedItems.map((item) => ({
      ...item,
      notificationDate: item.notificationDate || item.downloadedAt,
    }));

    const filteredMedia = allWithIds.filter((item) => {
      if (!state.selectedMediaTypes.has(item.mediaType)) return false;
      if (!userSettings.settings.gallery.showFaultyMedias) {
        if (item?.isUserDeleted || item?.isPermanentFailure) return false;
      }
      return true;
    });

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const startOfWeek = new Date(startOfToday);
    const day = startOfWeek.getDay();
    const diffToMonday = (day + 6) % 7;
    startOfWeek.setDate(startOfWeek.getDate() - diffToMonday);

    const today: CacheItem[] = [];
    const yesterday: CacheItem[] = [];
    const thisWeek: CacheItem[] = [];
    const older: CacheItem[] = [];

    for (const media of filteredMedia) {
      const ts = media.notificationDate || media.downloadedAt || Date.now();
      if (ts >= startOfToday.getTime()) {
        today.push(media);
      } else if (
        ts >= startOfYesterday.getTime() &&
        ts < startOfToday.getTime()
      ) {
        yesterday.push(media);
      } else if (ts >= startOfWeek.getTime()) {
        thisWeek.push(media);
      } else {
        older.push(media);
      }
    }

    const sortDesc = (a: CacheItem, b: CacheItem) =>
      (b.notificationDate ?? 0) - (a.notificationDate ?? 0);
    today.sort(sortDesc);
    yesterday.sort(sortDesc);
    thisWeek.sort(sortDesc);
    older.sort(sortDesc);

    const buildRows = (items: CacheItem[]) => {
      const rows: CacheItem[][] = [];
      for (let i = 0; i < items.length; i += numColumns) {
        rows.push(items.slice(i, i + numColumns));
      }
      return rows;
    };

    const sections = [
      { title: t("gallery.today"), data: buildRows(today), key: "today" },
      {
        title: t("gallery.yesterday"),
        data: buildRows(yesterday),
        key: "yesterday",
      },
      {
        title: t("gallery.thisWeek"),
        data: buildRows(thisWeek),
        key: "thisWeek",
      },
      { title: t("gallery.older"), data: buildRows(older), key: "older" },
    ].filter((s) => s.data.length > 0);

    // Flat order for fullscreen index mapping
    const flatOrder: CacheItem[] = [
      ...today,
      ...yesterday,
      ...thisWeek,
      ...older,
    ];

    handleSetFilteredMedia(filteredMedia);
    handleSetSections(sections);
    handleSetFlatOrder(flatOrder);
  }, [
    cachedItems,
    state.selectedMediaTypes,
    userSettings.settings.gallery.showFaultyMedias,
    numColumns,
    t,
  ]);

  return (
    <GalleryContext.Provider value={value}>{children}</GalleryContext.Provider>
  );
}

// Hook
export function useGallery() {
  const context = useContext(GalleryContext);
  if (context === undefined) {
    throw new Error("useGallery must be used within a GalleryProvider");
  }
  return context;
}

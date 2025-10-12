import { MediaType } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks";
import { useGetCacheStats } from "@/hooks/useMediaCache";
import { useAppContext } from "@/contexts/AppContext";
import { CacheItem, mediaCache } from "@/services/media-cache-service";
import { DEFAULT_MEDIA_TYPES } from "@/services/user-settings";
import React, {
  createContext,
  useContext,
  useReducer,
  ReactNode,
  useMemo,
  useEffect,
} from "react";
import { Alert } from "react-native";

// Types
interface GallerySection {
  title: string;
  data: CacheItem[][];
  key: string;
}

interface GalleryState {
  selectionMode: boolean;
  selectedItems: Set<string>;
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
  | { type: "SET_DELETE_LOADING"; payload: boolean }
  | { type: "SET_SHOW_FILTERS_MODAL"; payload: boolean }
  | { type: "SET_FILTERED_MEDIA"; payload: CacheItem[] }
  | { type: "SET_SECTIONS"; payload: GallerySection[] }
  | { type: "SET_FLAT_ORDER"; payload: CacheItem[] };

// Initial state
const initialState: GalleryState = {
  selectionMode: false,
  selectedItems: new Set(),
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

  const handleShowFiltersModal = () => {
    dispatch({ type: "SET_SHOW_FILTERS_MODAL", payload: true });
  };

  const handleHideFiltersModal = () => {
    dispatch({ type: "SET_SHOW_FILTERS_MODAL", payload: false });
  };

  const handleDeleteSelected = async () => {
    if (state.selectedItems.size === 0) return;

    const count = state.selectedItems.size;

    // Confirm deletion
    return new Promise<void>((resolve) => {
      Alert.alert(
        t("common.delete"),
        `Delete ${count} ${count === 1 ? "item" : "items"}?`,
        [
          {
            text: t("common.cancel"),
            style: "cancel",
            onPress: () => resolve(),
          },
          {
            text: t("common.delete"),
            style: "destructive",
            onPress: async () => {
              dispatch({ type: "SET_DELETE_LOADING", payload: true });

              try {
                const selectedKeys = Array.from(state.selectedItems);
                let successCount = 0;
                let failCount = 0;

                // Delete each selected item
                for (const key of selectedKeys) {
                  const item = state.filteredMedia.find((item) => item.key === key);
                  if (item) {
                    const success = await mediaCache.deleteCachedMedia(
                      item.url,
                      item.mediaType,
                      false // soft delete - marks as deleted but keeps metadata
                    );
                    if (success) {
                      successCount++;
                    } else {
                      failCount++;
                    }
                  }
                }

                console.log(
                  `[Gallery] Deleted ${successCount} items, ${failCount} failed`
                );

                // Show result message
                if (failCount === 0) {
                  Alert.alert(
                    t("common.success"),
                    `${successCount} ${successCount === 1 ? "item" : "items"} deleted successfully`
                  );
                } else {
                  Alert.alert(
                    t("common.success"),
                    `${successCount} ${successCount === 1 ? "item" : "items"} deleted, ${failCount} failed`
                  );
                }

                // Clear selection and exit selection mode
                dispatch({ type: "CLEAR_SELECTION" });
                dispatch({ type: "SET_SELECTION_MODE", payload: false });
              } catch (error) {
                console.error("Error deleting selected items:", error);
                Alert.alert(
                  t("common.error"),
                  t("common.errorOccurred")
                );
              } finally {
                dispatch({ type: "SET_DELETE_LOADING", payload: false });
                resolve();
              }
            },
          },
        ]
      );
    });
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
    handleShowFiltersModal,
    handleHideFiltersModal,
    handleDeleteSelected,
  };

  useEffect(() => {
    const allWithIds = cachedItems.map((item) => ({
      ...item,
      notificationDate: item.notificationDate || item.downloadedAt,
    }));

    // Get selected media types from settings (or use defaults if empty)
    const savedSelectedTypes = userSettings.settings.gallery.selectedMediaTypes;
    const selectedMediaTypes = savedSelectedTypes.length > 0 
      ? new Set(savedSelectedTypes) 
      : new Set(DEFAULT_MEDIA_TYPES);

    const filteredMedia = allWithIds.filter((item) => {
      if (!selectedMediaTypes.has(item.mediaType)) return false;
      if (!userSettings.settings.gallery.showFaultyMedias) {
        if (item?.isUserDeleted || item?.isPermanentFailure) return false;
      }
      return true;
    });

    // Group media by day
    const mediaByDay = new Map<string, CacheItem[]>();
    
    for (const media of filteredMedia) {
      const ts = media.notificationDate || media.downloadedAt || Date.now();
      const date = new Date(ts);
      // Get start of day (midnight) as key
      const dayKey = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
      
      if (!mediaByDay.has(dayKey.toString())) {
        mediaByDay.set(dayKey.toString(), []);
      }
      mediaByDay.get(dayKey.toString())!.push(media);
    }

    // Sort media within each day (newest first)
    const sortDesc = (a: CacheItem, b: CacheItem) =>
      (b.notificationDate ?? 0) - (a.notificationDate ?? 0);
    
    mediaByDay.forEach((items) => items.sort(sortDesc));

    // Sort days (newest first)
    const sortedDays = Array.from(mediaByDay.keys()).sort((a, b) => Number(b) - Number(a));

    const buildRows = (items: CacheItem[]) => {
      const rows: CacheItem[][] = [];
      for (let i = 0; i < items.length; i += numColumns) {
        rows.push(items.slice(i, i + numColumns));
      }
      return rows;
    };

    // Get user's locale from settings or device
    const userLocale = userSettings.settings.locale || 'en-EN';
    const locale = userLocale.replace('-', '-'); // e.g., 'en-EN' -> 'en-EN', 'it-IT' -> 'it-IT'

    // Create sections with localized long date format
    const sections = sortedDays.map((dayKey) => {
      const items = mediaByDay.get(dayKey)!;
      const date = new Date(Number(dayKey));
      
      // Format date using Intl.DateTimeFormat with long format
      const formattedDate = new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(date);
      
      // Capitalize first letter
      const title = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
      
      return {
        title,
        data: buildRows(items),
        key: dayKey,
      };
    });

    // Flat order for fullscreen index mapping
    const flatOrder: CacheItem[] = sortedDays.flatMap(
      (dayKey) => mediaByDay.get(dayKey)!
    );

    handleSetFilteredMedia(filteredMedia);
    handleSetSections(sections);
    handleSetFlatOrder(flatOrder);
  }, [
    cachedItems,
    userSettings.settings.gallery.selectedMediaTypes,
    userSettings.settings.gallery.showFaultyMedias,
    numColumns,
    t,
  ]);

  return (
    <GalleryContext.Provider value={value}>{children}</GalleryContext.Provider>
  );
}

// Hook
export function useGalleryContext() {
  const context = useContext(GalleryContext);
  if (context === undefined) {
    throw new Error("useGallery must be used within a GalleryProvider");
  }
  return context;
}

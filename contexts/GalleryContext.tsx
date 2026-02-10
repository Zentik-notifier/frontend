import { MediaType } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useGetCacheStats } from "@/hooks/useMediaCache";
import { useAppContext } from "@/contexts/AppContext";
import { CacheItem, mediaCache } from "@/services/media-cache-service";
import { DEFAULT_MEDIA_TYPES } from "@/services/settings-service";
import React, {
  createContext,
  useContext,
  useReducer,
  ReactNode,
  useMemo,
  useCallback,
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
}

type GalleryAction =
  | { type: "SET_SELECTION_MODE"; payload: boolean }
  | { type: "SET_SELECTED_ITEMS"; payload: Set<string> }
  | { type: "TOGGLE_ITEM_SELECTION"; payload: string }
  | { type: "CLEAR_SELECTION" }
  | { type: "SET_DELETE_LOADING"; payload: boolean }
  | { type: "SET_SHOW_FILTERS_MODAL"; payload: boolean }
  | { type: "SET_FILTERED_MEDIA"; payload: CacheItem[] };

// Initial state
const initialState: GalleryState = {
  selectionMode: false,
  selectedItems: new Set(),
  deleteLoading: false,
  showFiltersModal: false,
  filteredMedia: [],
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
    default:
      return state;
  }
}

// Context
interface GalleryContextType {
  state: GalleryState & { sections: GallerySection[]; flatOrder: CacheItem[] };
  dispatch: React.Dispatch<GalleryAction>;
  // Helper functions
  handleSetFilteredMedia: (media: CacheItem[]) => void;
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
  const numColumns = userSettings.settings.galleryVisualization.gridSize;

  const handleSetFilteredMedia = useCallback((media: CacheItem[]) => {
    dispatch({ type: "SET_FILTERED_MEDIA", payload: media });
  }, []);

  // Derive sections and flatOrder from filteredMedia via useMemo (no duplication in state)
  const { sections, flatOrder } = useMemo(() => {
    const filteredMedia = state.filteredMedia;
    if (filteredMedia.length === 0) {
      return { sections: [] as GallerySection[], flatOrder: [] as CacheItem[] };
    }

    // Group media by day
    const mediaByDay = new Map<string, CacheItem[]>();
    for (const media of filteredMedia) {
      const ts = media.notificationDate || media.downloadedAt || Date.now();
      const date = new Date(ts);
      const dayKey = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime().toString();
      if (!mediaByDay.has(dayKey)) {
        mediaByDay.set(dayKey, []);
      }
      mediaByDay.get(dayKey)!.push(media);
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

    const userLocale = userSettings.settings.locale || 'en-EN';

    const derivedSections = sortedDays.map((dayKey) => {
      const items = mediaByDay.get(dayKey)!;
      const date = new Date(Number(dayKey));
      const formattedDate = new Intl.DateTimeFormat(userLocale, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(date);
      const title = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
      return { title, data: buildRows(items), key: dayKey };
    });

    const derivedFlatOrder = sortedDays.flatMap((dayKey) => mediaByDay.get(dayKey)!);

    return { sections: derivedSections, flatOrder: derivedFlatOrder };
  }, [state.filteredMedia, numColumns, userSettings.settings.locale]);

  // Compose state with derived data for consumers
  const stateWithDerived = useMemo(() => ({
    ...state,
    sections,
    flatOrder,
  }), [state, sections, flatOrder]);

  const handleToggleMultiSelection = useCallback(() => {
    dispatch({ type: "SET_SELECTION_MODE", payload: !state.selectionMode });
  }, [state.selectionMode]);

  const handleToggleItemSelection = useCallback((itemId: string) => {
    dispatch({ type: "TOGGLE_ITEM_SELECTION", payload: itemId });
  }, []);

  const handleSelectAll = useCallback(() => {
    const allIds = new Set(state.filteredMedia.map((item) => item.key));
    dispatch({ type: "SET_SELECTED_ITEMS", payload: allIds });
  }, [state.filteredMedia]);

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

  const handleDeleteSelected = useCallback(async () => {
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
  }, [state.selectedItems, state.filteredMedia, t]);

  const value: GalleryContextType = useMemo(() => ({
    state: stateWithDerived,
    dispatch,
    handleSetFilteredMedia,
    handleToggleMultiSelection,
    handleToggleItemSelection,
    handleSelectAll,
    handleDeselectAll,
    handleCloseSelectionMode,
    handleShowFiltersModal,
    handleHideFiltersModal,
    handleDeleteSelected,
  }), [
    stateWithDerived,
    handleSetFilteredMedia,
    handleToggleMultiSelection,
    handleToggleItemSelection,
    handleSelectAll,
    handleDeselectAll,
    handleCloseSelectionMode,
    handleShowFiltersModal,
    handleHideFiltersModal,
    handleDeleteSelected,
  ]);

  // Only compute filteredMedia from cachedItems — sections/flatOrder are derived via useMemo above
  useEffect(() => {
    const allWithIds = cachedItems.map((item) => ({
      ...item,
      notificationDate: item.notificationDate || item.downloadedAt,
    }));

    // Get selected media types from settings (or use defaults if empty)
    const savedSelectedTypes = userSettings.settings.galleryVisualization.selectedMediaTypes;
    const selectedMediaTypes = savedSelectedTypes.length > 0 
      ? new Set(savedSelectedTypes) 
      : new Set(DEFAULT_MEDIA_TYPES);

    const filteredMedia = allWithIds.filter((item) => {
      if (!selectedMediaTypes.has(item.mediaType)) return false;
      if (!userSettings.settings.galleryVisualization.showFaultyMedias) {
        if (item?.isUserDeleted || item?.isPermanentFailure) return false;
      }
      return true;
    });

    handleSetFilteredMedia(filteredMedia);
  }, [
    cachedItems,
    userSettings.settings.galleryVisualization.selectedMediaTypes,
    userSettings.settings.galleryVisualization.showFaultyMedias,
    handleSetFilteredMedia,
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

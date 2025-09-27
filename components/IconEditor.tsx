import { usePublicAppConfigQuery } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { uploadBucketIcon } from "@/services/buckets";
import * as DocumentPicker from "expo-document-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import React, { useState } from "react";
import {
  Alert,
  Dimensions,
  GestureResponderEvent,
  Image,
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  View,
} from "react-native";
import {
  Icon,
  Modal,
  Portal,
  SegmentedButtons,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from "react-native-paper";

interface IconEditorProps {
  currentIcon?: string;
  onIconChange: (iconUrl: string) => void;
  onClose: () => void;
}

const CROP_TARGET_PX = 128;
const PREVIEW_SIZE = 300;

export default function IconEditor({
  currentIcon,
  onIconChange,
  onClose,
}: IconEditorProps) {
  const { t } = useI18n();
  const theme = useTheme();
  const { data: appConfig } = usePublicAppConfigQuery();

  const [mode, setMode] = useState<"url" | "file" | "crop">("url");
  const [url, setUrl] = useState(currentIcon || "");
  const [isLoading, setIsLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(
    currentIcon || null
  );
  const [previewLayout, setPreviewLayout] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [selection, setSelection] = useState<{
    x: number;
    y: number;
    size: number;
  } | null>(null);
  const MIN_SIZE = 40;

  const selectionRef = React.useRef(selection);
  const previewLayoutRef = React.useRef(previewLayout);

  React.useEffect(() => {
    selectionRef.current = selection;
  }, [selection]);

  React.useEffect(() => {
    previewLayoutRef.current = previewLayout;
  }, [previewLayout]);

  const initSelection = (w: number, h: number) => {
    const size = Math.min(w, h) * 0.6;
    const selection = {
      size,
      x: (w - size) / 2,
      y: (h - size) / 2,
    };
    setSelection(selection);
  };

  const onPreviewLayout = (e: LayoutChangeEvent) => {
    const { x, y, width, height } = e.nativeEvent.layout;
    setPreviewLayout({ x, y, width, height });
    if (!selection) {
      initSelection(width, height);
    }
  };

  function distanceFromTouches(evt: GestureResponderEvent) {
    if (evt.nativeEvent.touches.length < 2) return 0;
    const [a, b] = evt.nativeEvent.touches;
    const dx = a.pageX - b.pageX;
    const dy = a.pageY - b.pageY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  const pinchState = React.useRef<{
    initialDistance: number;
    initialSize: number;
    startSel: { x: number; y: number; size: number };
  } | null>(null);
  const dragBase = React.useRef<{ x: number; y: number; size: number } | null>(
    null
  );

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const currentSelection = selectionRef.current;
        if (currentSelection) dragBase.current = { ...currentSelection };
        if (evt.nativeEvent.touches.length === 2 && currentSelection) {
          const dist = distanceFromTouches(evt);
          pinchState.current = {
            initialDistance: dist,
            initialSize: currentSelection.size,
            startSel: { ...currentSelection },
          };
        } else pinchState.current = null;
      },
      onPanResponderMove: (evt, gesture) => {
        const currentSelection = selectionRef.current;
        const currentPreviewLayout = previewLayoutRef.current;
        if (!currentSelection || !currentPreviewLayout) return;

        if (evt.nativeEvent.touches.length === 2 && pinchState.current) {
          const dist = distanceFromTouches(evt);
          if (dist > 0) {
            const scale = dist / pinchState.current.initialDistance;
            let newSize = pinchState.current.initialSize * scale;
            newSize = Math.max(MIN_SIZE, Math.min(PREVIEW_SIZE, newSize));
            const start = pinchState.current.startSel;
            const centerX = start.x + start.size / 2;
            const centerY = start.y + start.size / 2;
            let nx = centerX - newSize / 2;
            let ny = centerY - newSize / 2;
            if (nx < 0) nx = 0;
            if (ny < 0) ny = 0;
            if (nx + newSize > PREVIEW_SIZE) nx = PREVIEW_SIZE - newSize;
            if (ny + newSize > PREVIEW_SIZE) ny = PREVIEW_SIZE - newSize;
            setSelection({ x: nx, y: ny, size: newSize });
          }
          return;
        }

        if (
          evt.nativeEvent.touches.length === 1 &&
          !pinchState.current &&
          dragBase.current
        ) {
          const base = dragBase.current;
          let nx = base.x + gesture.dx;
          let ny = base.y + gesture.dy;
          if (nx < 0) nx = 0;
          if (ny < 0) ny = 0;
          if (nx + base.size > PREVIEW_SIZE) nx = PREVIEW_SIZE - base.size;
          if (ny + base.size > PREVIEW_SIZE) ny = PREVIEW_SIZE - base.size;
          setSelection({ ...base, x: nx, y: ny });
        }
      },
      onPanResponderRelease: () => {
        pinchState.current = null;
        dragBase.current = null;
      },
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
    })
  ).current;

  const activeHandle = React.useRef<null | "tl" | "tr" | "bl" | "br">(null);

  const handlePan = (corner: "tl" | "tr" | "bl" | "br") =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => {
        activeHandle.current = corner;
      },
      onPanResponderMove: (evt, gesture) => {
        const currentSelection = selectionRef.current;
        if (!currentSelection) {
          return;
        }

        let { x, y, size } = currentSelection;

        switch (corner) {
          case "tl":
            const newSizeTL = Math.max(
              MIN_SIZE,
              Math.min(PREVIEW_SIZE, size - Math.max(gesture.dx, gesture.dy))
            );
            const deltaXTL = size - newSizeTL;
            x = Math.max(0, currentSelection.x + deltaXTL);
            y = Math.max(0, currentSelection.y + deltaXTL);
            size = newSizeTL;
            break;

          case "tr":
            const newSizeTR = Math.max(
              MIN_SIZE,
              Math.min(PREVIEW_SIZE, size + gesture.dx - gesture.dy)
            );
            const deltaYTR = size - newSizeTR;
            y = Math.max(0, currentSelection.y + deltaYTR);
            size = newSizeTR;
            break;

          case "bl":
            const newSizeBL = Math.max(
              MIN_SIZE,
              Math.min(PREVIEW_SIZE, size - gesture.dx + gesture.dy)
            );
            const deltaXBL = size - newSizeBL;
            x = Math.max(0, currentSelection.x + deltaXBL);
            size = newSizeBL;
            break;

          case "br":
            size = Math.max(
              MIN_SIZE,
              Math.min(PREVIEW_SIZE, size + Math.max(gesture.dx, gesture.dy))
            );
            break;
        }

        if (x + size > PREVIEW_SIZE) {
          if (corner === "br" || corner === "tr") {
            size = PREVIEW_SIZE - x;
          } else {
            x = PREVIEW_SIZE - size;
          }
        }
        if (y + size > PREVIEW_SIZE) {
          if (corner === "br" || corner === "bl") {
            size = PREVIEW_SIZE - y;
          } else {
            y = PREVIEW_SIZE - size;
          }
        }

        setSelection({ x, y, size });
      },
      onPanResponderRelease: () => {
        activeHandle.current = null;
      },
      onPanResponderTerminationRequest: () => false,
    });

  const cornerHandles = selection ? (
    <>
      <View
        style={[
          styles.handle,
          {
            left: selection.x - 15,
            top: selection.y - 15,
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.primary,
          },
        ]}
        {...handlePan("tl").panHandlers}
      />
      <View
        style={[
          styles.handle,
          {
            left: selection.x + selection.size - 15,
            top: selection.y - 15,
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.primary,
          },
        ]}
        {...handlePan("tr").panHandlers}
      />
      <View
        style={[
          styles.handle,
          {
            left: selection.x - 15,
            top: selection.y + selection.size - 15,
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.primary,
          },
        ]}
        {...handlePan("bl").panHandlers}
      />
      <View
        style={[
          styles.handle,
          {
            left: selection.x + selection.size - 15,
            top: selection.y + selection.size - 15,
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.primary,
          },
        ]}
        {...handlePan("br").panHandlers}
      />
    </>
  ) : null;

  const handleLoadFromUrl = () => {
    if (!url.trim()) {
      Alert.alert(t("common.error"), t("iconEditor.urlRequired"));
      return;
    }

    try {
      new URL(url);
      setPreviewImage(url);
      setMode("crop");
    } catch {
      Alert.alert(t("common.error"), t("iconEditor.invalidUrl"));
    }
  };

  const handleSelectFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ["image/*"],
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;
      const asset = res.assets?.[0];
      if (!asset?.uri) return;
      setPreviewImage(asset.uri);
      setMode("crop");
    } catch (e) {
      Alert.alert(t("common.error"), t("iconEditor.filePickError"));
    }
  };

  const handleConfirmCrop = async () => {
    if (!previewImage || !previewLayout || !selection) return;
    setIsLoading(true);
    try {
      const imageDims = await new Promise<{ w: number; h: number }>(
        (resolve, reject) => {
          Image.getSize(previewImage!, (w, h) => resolve({ w, h }), reject);
        }
      );
      const scaleX = imageDims.w / PREVIEW_SIZE;
      const scaleY = imageDims.h / PREVIEW_SIZE;
      const crop = {
        originX: selection.x * scaleX,
        originY: selection.y * scaleY,
        width: selection.size * scaleX,
        height: selection.size * scaleY,
      };

      const croppedWidth = selection.size * scaleX;
      const croppedHeight = selection.size * scaleY;
      const needsResize =
        croppedWidth > CROP_TARGET_PX || croppedHeight > CROP_TARGET_PX;

      const format = SaveFormat.PNG;
      const fileExtension = "png";

      const context = ImageManipulator.manipulate(previewImage);
      context.crop(crop);
      if (needsResize) {
        context.resize({ width: CROP_TARGET_PX, height: CROP_TARGET_PX });
      }

      const image = await context.renderAsync();
      const result = await image.saveAsync({
        compress: 1.0,
        format,
      });

      // Rilascia le risorse
      context.release();
      image.release();

      const iconUrl = await uploadBucketIcon(
        result.uri,
        `icon.${fileExtension}`
      );
      onIconChange(iconUrl);
      onClose();
    } catch (e) {
      console.error(e);
      Alert.alert(t("common.error"), t("iconEditor.cropError"));
    } finally {
      setIsLoading(false);
    }
  };

  const renderCropOverlay = () => {
    if (!selection) return null;
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <View style={styles.overlayContainer}>
          <View
            style={[
              styles.overlay,
              { height: selection.y, width: PREVIEW_SIZE },
            ]}
          />

          <View style={{ flexDirection: "row", height: selection.size }}>
            <View
              style={[
                styles.overlay,
                { width: selection.x, height: selection.size },
              ]}
            />
            <View style={{ width: selection.size, height: selection.size }} />
            <View
              style={[
                styles.overlay,
                {
                  width: PREVIEW_SIZE - selection.x - selection.size,
                  height: selection.size,
                },
              ]}
            />
          </View>

          <View
            style={[
              styles.overlay,
              {
                height: PREVIEW_SIZE - selection.y - selection.size,
                width: PREVIEW_SIZE,
              },
            ]}
          />
        </View>

        <View
          style={[
            styles.selection,
            {
              left: selection.x,
              top: selection.y,
              width: selection.size,
              height: selection.size,
            },
          ]}
        />

        <View
          style={[
            styles.cropGrid,
            {
              left: selection.x,
              top: selection.y,
              width: selection.size,
              height: selection.size,
            },
          ]}
        >
          <View
            style={[
              styles.gridLine,
              { top: selection.size / 3, width: selection.size },
            ]}
          />
          <View
            style={[
              styles.gridLine,
              { top: (selection.size * 2) / 3, width: selection.size },
            ]}
          />
          <View
            style={[
              styles.gridLine,
              { left: selection.size / 3, height: selection.size, width: 1 },
            ]}
          />
          <View
            style={[
              styles.gridLine,
              {
                left: (selection.size * 2) / 3,
                height: selection.size,
                width: 1,
              },
            ]}
          />
        </View>

        {cornerHandles}
      </View>
    );
  };

  const renderUrlInput = () => (
    <View style={styles.inputContainer}>
      <Text variant="titleSmall" style={styles.label}>
        {t("iconEditor.fromUrl")}
      </Text>
      <View style={styles.urlInputContainer}>
        <TextInput
          mode="outlined"
          style={styles.urlInput}
          value={url}
          onChangeText={setUrl}
          placeholder={t("iconEditor.urlPlaceholder")}
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableRipple
          style={[styles.loadButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleLoadFromUrl}
          disabled={!url.trim()}
        >
          <Icon source="cloud-download" size={20} color={theme.colors.onPrimary} />
        </TouchableRipple>
      </View>
    </View>
  );

  const renderFileInput = () => (
    <View style={styles.inputContainer}>
      <Text variant="titleSmall" style={styles.label}>
        {t("iconEditor.fromFile")}
      </Text>
      <TouchableRipple
        style={[styles.fileButton, { backgroundColor: theme.colors.primary }]}
        onPress={handleSelectFile}
      >
        <View style={styles.fileButtonContent}>
          <Icon source="folder-open" size={20} color={theme.colors.onPrimary} />
          <Text style={[styles.fileButtonText, { color: theme.colors.onPrimary }]}>
            {t("iconEditor.chooseFile")}
          </Text>
        </View>
      </TouchableRipple>
    </View>
  );

  const renderCropView = () => (
    <View style={styles.cropContainer}>
      <Text variant="titleSmall" style={styles.label}>
        {t("iconEditor.cropImage")}
      </Text>
      <View style={styles.imagePreviewContainer} onLayout={onPreviewLayout}>
        <View
          style={{
            width: PREVIEW_SIZE,
            height: PREVIEW_SIZE,
            position: "relative",
          }}
          {...panResponder.panHandlers}
        >
          <Image
            source={{ uri: previewImage || undefined }}
            style={[
              styles.previewImage,
              { width: PREVIEW_SIZE, height: PREVIEW_SIZE },
            ]}
          />
          {renderCropOverlay()}
        </View>
      </View>
      <TouchableRipple
        style={[styles.cropButton, { backgroundColor: theme.colors.primary }]}
        onPress={handleConfirmCrop}
        disabled={isLoading}
      >
        <View style={styles.cropButtonContent}>
          <Icon source="crop" size={20} color={theme.colors.onPrimary} />
          <Text style={[styles.cropButtonText, { color: theme.colors.onPrimary }]}>
            {isLoading ? t("common.loading") : t("iconEditor.cropAndUpload")}
          </Text>
        </View>
      </TouchableRipple>
    </View>
  );

  const deviceHeight = Dimensions.get("window").height;
  const containerStyle = {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 16,
    maxHeight: deviceHeight * 0.95,
    minHeight: deviceHeight * 0.7,
  } as const;

  return (
    <Portal>
      <Modal
        visible={true}
        onDismiss={onClose}
        contentContainerStyle={containerStyle}
        dismissableBackButton
      >
        <View style={{ borderRadius: 12, flex: 1 }}>
          <View
            style={[
              styles.modalHeader,
              {
                borderBottomColor: theme.colors.outline,
                backgroundColor: "transparent",
              },
            ]}
          >
            <View style={styles.headerLeft}>
              <Icon
                source="image-edit"
                size={24}
                color={theme.colors.primary}
              />
              <Text style={styles.modalTitle}>{t("iconEditor.title")}</Text>
            </View>
            <TouchableRipple
              style={[styles.closeButton]}
              onPress={onClose}
              borderless
            >
              <Icon source="close" size={20} color={theme.colors.onSurface} />
            </TouchableRipple>
          </View>

          <View style={{ padding: 20, flex: 1 }}>
            <SegmentedButtons
              value={mode}
              onValueChange={(value) => setMode(value as "url" | "file")}
              buttons={[
                {
                  value: "url",
                  label: t("iconEditor.fromUrl"),
                },
                {
                  value: "file",
                  label: t("iconEditor.fromFile"),
                },
              ]}
              style={styles.tabContainer}
            />

            <View style={styles.content}>
              {mode === "url" && renderUrlInput()}
              {mode === "file" && renderFileInput()}
              {mode === "crop" && renderCropView()}
            </View>
          </View>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 60,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  closeButton: {
    padding: 8,
  },
  tabContainer: {
    marginBottom: 20,
  },
  content: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  urlInputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  urlInput: {
    flex: 1,
    marginRight: 10,
  },
  loadButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    height: 56, // Altezza standard per TextInput outlined
  },
  fileButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fileButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  fileButtonText: {
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 8,
  },
  cropContainer: {
    flex: 1,
  },
  imagePreviewContainer: {
    alignItems: "center",
    marginVertical: 20,
    zIndex: 100,
    elevation: 10,
  },
  previewImage: {
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    borderRadius: 8,
  },
  handle: {
    position: "absolute",
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 3,
    zIndex: 10,
    elevation: 5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    padding: 5,
  },
  cropButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cropButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  cropButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  selection: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.9)",
    backgroundColor: "transparent",
    zIndex: 6,
  },
  overlayContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    zIndex: 1,
  },
  overlay: {
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  cropGrid: {
    position: "absolute",
    zIndex: 7,
  },
  gridLine: {
    position: "absolute",
    backgroundColor: "rgba(255,255,255,0.3)",
    height: 1,
  },
});

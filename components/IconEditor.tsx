import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  SafeAreaView,
  StatusBar,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '@/hooks/useI18n';
import * as DocumentPicker from 'expo-document-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { ThemedText } from './ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';
import { uploadBucketIcon } from '@/services/buckets';
import { usePublicAppConfigQuery } from '@/generated/gql-operations-generated';
import { PanResponder, LayoutChangeEvent, GestureResponderEvent, PanResponderGestureState } from 'react-native';

interface IconEditorProps {
  currentIcon?: string;
  onIconChange: (iconUrl: string) => void;
  onClose: () => void;
  bucketId: string;
}

const CROP_TARGET_PX = 256;
const PREVIEW_SIZE = 300; // enlarged preview dimension

export default function IconEditor({ currentIcon, onIconChange, onClose, bucketId }: IconEditorProps) {
  const { t } = useI18n();
  const { data: appConfig } = usePublicAppConfigQuery();
  
  const [mode, setMode] = useState<'url' | 'file' | 'crop'>('url');
  const [url, setUrl] = useState(currentIcon || '');
  const [isLoading, setIsLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(currentIcon || null);
  const [previewLayout, setPreviewLayout] = useState<{x:number;y:number;width:number;height:number}|null>(null);
  const [selection, setSelection] = useState<{x:number;y:number;size:number}|null>(null);
  const MIN_SIZE = 40; // minimum selectable square size

  // Refs per il PanResponder per evitare problemi di closure
  const selectionRef = React.useRef(selection);
  const previewLayoutRef = React.useRef(previewLayout);

  // Update refs quando gli stati cambiano
  React.useEffect(() => {
    selectionRef.current = selection;
  }, [selection]);

  React.useEffect(() => {
    previewLayoutRef.current = previewLayout;
  }, [previewLayout]);

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');

  const initSelection = (w:number,h:number) => {
    const size = Math.min(w,h) * 0.6;
    const selection = {
      size,
      x: (w - size)/2,
      y: (h - size)/2,
    };
    setSelection(selection);
  };

  const onPreviewLayout = (e: LayoutChangeEvent) => {
    const { x, y, width, height } = e.nativeEvent.layout;
    setPreviewLayout({x,y,width,height});
    if(!selection) {
      initSelection(width,height);
    }
  };

  // Euclidean distance between two active touches
  function distanceFromTouches(evt: GestureResponderEvent){
    if(evt.nativeEvent.touches.length < 2) return 0;
    const [a,b] = evt.nativeEvent.touches;
    const dx = a.pageX - b.pageX; const dy = a.pageY - b.pageY;
    return Math.sqrt(dx*dx + dy*dy);
  }

  // Pinch support state: track initial gesture distance & selection for two-finger scaling
  const pinchState = React.useRef<{initialDistance:number; initialSize:number; startSel:{x:number;y:number;size:number}}|null>(null);
  const dragBase = React.useRef<{x:number;y:number;size:number}|null>(null);

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        // Snapshot selezione per drag a un dito
        const currentSelection = selectionRef.current;
        if(currentSelection) dragBase.current = {...currentSelection};
        if(evt.nativeEvent.touches.length === 2 && currentSelection){
          const dist = distanceFromTouches(evt);
          pinchState.current = { initialDistance: dist, initialSize: currentSelection.size, startSel: {...currentSelection} };
        } else pinchState.current = null;
      },
      onPanResponderMove: (evt, gesture) => {
        const currentSelection = selectionRef.current;
        const currentPreviewLayout = previewLayoutRef.current;
        if(!currentSelection || !currentPreviewLayout) return;

        // Pinch (two fingers) -> scale selection keeping its center
        if(evt.nativeEvent.touches.length === 2 && pinchState.current){
          const dist = distanceFromTouches(evt);
            if(dist > 0){
              const scale = dist / pinchState.current.initialDistance;
              let newSize = pinchState.current.initialSize * scale;
              newSize = Math.max(MIN_SIZE, Math.min(PREVIEW_SIZE, newSize));
              // keep center stable
              const start = pinchState.current.startSel;
              const centerX = start.x + start.size/2;
              const centerY = start.y + start.size/2;
              let nx = centerX - newSize/2;
              let ny = centerY - newSize/2;
              // clamp
              if(nx < 0) nx = 0;
              if(ny < 0) ny = 0;
              if(nx + newSize > PREVIEW_SIZE) nx = PREVIEW_SIZE - newSize;
              if(ny + newSize > PREVIEW_SIZE) ny = PREVIEW_SIZE - newSize;
              setSelection({ x: nx, y: ny, size: newSize });
            }
            return;
        }

        // Single finger drag -> move selection within bounds
        if(evt.nativeEvent.touches.length === 1 && !pinchState.current && dragBase.current){
          const base = dragBase.current;
          let nx = base.x + gesture.dx;
          let ny = base.y + gesture.dy;
          if(nx < 0) nx = 0;
          if(ny < 0) ny = 0;
          if(nx + base.size > PREVIEW_SIZE) nx = PREVIEW_SIZE - base.size;
          if(ny + base.size > PREVIEW_SIZE) ny = PREVIEW_SIZE - base.size;
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

  const activeHandle = React.useRef<null | 'tl' | 'tr' | 'bl' | 'br'>(null);

  const handlePan = (corner: 'tl'|'tr'|'bl'|'br') => PanResponder.create({
    onStartShouldSetPanResponder: ()=>true,
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponderCapture: () => true,
    onPanResponderGrant: () => { 
      console.log(`🎯 Handle ${corner} grabbed`);
      activeHandle.current = corner; 
    },
    onPanResponderMove: (evt, gesture) => {
      const currentSelection = selectionRef.current;
      if(!currentSelection) {
        console.log('❌ No selection for handle resize');
        return;
      }
      
      console.log(`🔧 Resizing ${corner}:`, { dx: gesture.dx, dy: gesture.dy });
      
      let { x, y, size } = currentSelection;
      
      // Migliorata logica di resize per ogni angolo
      switch(corner){
        case 'tl': // Top Left - riduce size e sposta origine
          const newSizeTL = Math.max(MIN_SIZE, Math.min(PREVIEW_SIZE, size - Math.max(gesture.dx, gesture.dy)));
          const deltaXTL = size - newSizeTL;
          x = Math.max(0, currentSelection.x + deltaXTL);
          y = Math.max(0, currentSelection.y + deltaXTL);
          size = newSizeTL;
          break;
          
        case 'tr': // Top Right - riduce/aumenta size, sposta solo Y
          const newSizeTR = Math.max(MIN_SIZE, Math.min(PREVIEW_SIZE, size + gesture.dx - gesture.dy));
          const deltaYTR = size - newSizeTR;
          y = Math.max(0, currentSelection.y + deltaYTR);
          size = newSizeTR;
          break;
          
        case 'bl': // Bottom Left - riduce/aumenta size, sposta solo X  
          const newSizeBL = Math.max(MIN_SIZE, Math.min(PREVIEW_SIZE, size - gesture.dx + gesture.dy));
          const deltaXBL = size - newSizeBL;
          x = Math.max(0, currentSelection.x + deltaXBL);
          size = newSizeBL;
          break;
          
        case 'br': // Bottom Right - aumenta size
          size = Math.max(MIN_SIZE, Math.min(PREVIEW_SIZE, size + Math.max(gesture.dx, gesture.dy)));
          break;
      }
      
      // Assicuriamoci che rimanga nei bounds
      if (x + size > PREVIEW_SIZE) {
        if (corner === 'br' || corner === 'tr') {
          size = PREVIEW_SIZE - x;
        } else {
          x = PREVIEW_SIZE - size;
        }
      }
      if (y + size > PREVIEW_SIZE) {
        if (corner === 'br' || corner === 'bl') {
          size = PREVIEW_SIZE - y;
        } else {
          y = PREVIEW_SIZE - size;
        }
      }
      
      console.log('📐 New selection:', { x, y, size });
      setSelection({ x, y, size });
    },
    onPanResponderRelease: ()=> { 
      console.log(`🔚 Handle ${corner} released`);
      activeHandle.current = null; 
    },
    onPanResponderTerminationRequest: () => false,
  });

  const cornerHandles = selection ? (
    <>
      <View style={[styles.handle, { left: selection.x-15, top: selection.y-15 }]} {...handlePan('tl').panHandlers} />
      <View style={[styles.handle, { left: selection.x + selection.size -15, top: selection.y-15 }]} {...handlePan('tr').panHandlers} />
      <View style={[styles.handle, { left: selection.x-15, top: selection.y + selection.size -15 }]} {...handlePan('bl').panHandlers} />
      <View style={[styles.handle, { left: selection.x + selection.size -15, top: selection.y + selection.size -15 }]} {...handlePan('br').panHandlers} />
    </>
  ) : null;

  const handleLoadFromUrl = () => {
    if (!url.trim()) {
      Alert.alert(t('common.error'), t('iconEditor.urlRequired'));
      return;
    }
    
    try {
      new URL(url);
      setPreviewImage(url);
      setMode('crop');
    } catch {
      Alert.alert(t('common.error'), t('iconEditor.invalidUrl'));
    }
  };

  const handleSelectFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: ['image/*'], copyToCacheDirectory: true });
      if (res.canceled) return;
      const asset = res.assets?.[0];
      if (!asset?.uri) return;
      setPreviewImage(asset.uri);
      setMode('crop');
    } catch (e) {
      Alert.alert(t('common.error'), t('iconEditor.filePickError'));
    }
  };

  const handleConfirmCrop = async () => {
    if(!previewImage || !previewLayout || !selection) return;
    setIsLoading(true);
    try {
      // We need actual image dimensions. Load with Image.getSize
      const imageDims = await new Promise<{w:number;h:number}>((resolve,reject)=>{
        Image.getSize(previewImage!, (w,h)=>resolve({w,h}), reject);
      });
  // Map selection (in preview PREVIEW_SIZE x PREVIEW_SIZE) to real image
  const scaleX = imageDims.w / PREVIEW_SIZE;
  const scaleY = imageDims.h / PREVIEW_SIZE;
      const crop = {
        originX: selection.x * scaleX,
        originY: selection.y * scaleY,
        width: selection.size * scaleX,
        height: selection.size * scaleY,
      };
      const actions: ImageManipulator.Action[] = [{ crop }, { resize: { width: CROP_TARGET_PX, height: CROP_TARGET_PX } }];
      const result = await ImageManipulator.manipulateAsync(previewImage, actions, { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG });

      // Upload result
      const formData = new FormData();
      formData.append('icon', {
        uri: result.uri,
        type: 'image/jpeg',
        name: 'icon.jpg',
      } as any);
      const response = await uploadBucketIcon(bucketId, formData);
      onIconChange(response.iconUrl);
      onClose();
    } catch(e){
      Alert.alert(t('common.error'), t('iconEditor.cropError'));
    } finally {
      setIsLoading(false);
    }
  };

  const renderCropOverlay = () => {
    if(!selection) return null;
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {/* Overlay scuro per l'area esterna */}
        <View style={styles.overlayContainer}>
          {/* Top overlay */}
          <View style={[styles.overlay, { height: selection.y, width: PREVIEW_SIZE }]} />
          
          {/* Middle row with left and right overlays */}
          <View style={{ flexDirection: 'row', height: selection.size }}>
            <View style={[styles.overlay, { width: selection.x, height: selection.size }]} />
            <View style={{ width: selection.size, height: selection.size }} />
            <View style={[styles.overlay, { width: PREVIEW_SIZE - selection.x - selection.size, height: selection.size }]} />
          </View>
          
          {/* Bottom overlay */}
          <View style={[styles.overlay, { height: PREVIEW_SIZE - selection.y - selection.size, width: PREVIEW_SIZE }]} />
        </View>
        
        {/* Bordo del quadrato di selezione */}
        <View
          style={[
            styles.selection,
            {
              left: selection.x,
              top: selection.y,
              width: selection.size,
              height: selection.size,
            }
          ]}
        />
        
        {/* Griglia di aiuto all'interno del quadrato */}
        <View style={[
          styles.cropGrid,
          {
            left: selection.x,
            top: selection.y,
            width: selection.size,
            height: selection.size,
          }
        ]}>
          {/* Linee orizzontali */}
          <View style={[styles.gridLine, { top: selection.size / 3, width: selection.size }]} />
          <View style={[styles.gridLine, { top: (selection.size * 2) / 3, width: selection.size }]} />
          {/* Linee verticali */}
          <View style={[styles.gridLine, { left: selection.size / 3, height: selection.size, width: 1 }]} />
          <View style={[styles.gridLine, { left: (selection.size * 2) / 3, height: selection.size, width: 1 }]} />
        </View>
        
        {cornerHandles}
      </View>
    );
  };

  const renderUrlInput = () => (
    <View style={styles.inputContainer}>
      <ThemedText style={styles.label}>{t('iconEditor.fromUrl')}</ThemedText>
      <View style={styles.urlInputContainer}>
        <TextInput
          style={[styles.urlInput, { color: textColor, borderColor: tintColor }]}
          value={url}
          onChangeText={setUrl}
          placeholder={t('iconEditor.urlPlaceholder')}
          placeholderTextColor={textColor + '80'}
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[styles.loadButton, { backgroundColor: tintColor }]}
          onPress={handleLoadFromUrl}
          disabled={!url.trim()}
        >
          <Ionicons name="cloud-download" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFileInput = () => (
    <View style={styles.inputContainer}>
      <ThemedText style={styles.label}>{t('iconEditor.fromFile')}</ThemedText>
      <TouchableOpacity
        style={[styles.fileButton, { backgroundColor: tintColor }]}
        onPress={handleSelectFile}
      >
        <Ionicons name="folder-open" size={20} color="white" />
        <Text style={styles.fileButtonText}>{t('iconEditor.chooseFile')}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCropView = () => (
    <View style={styles.cropContainer}>
      <ThemedText style={styles.label}>{t('iconEditor.cropImage')}</ThemedText>
       <View 
         style={styles.imagePreviewContainer} 
         onLayout={onPreviewLayout}
       >
         <View
           style={{width:PREVIEW_SIZE,height:PREVIEW_SIZE, position: 'relative'}}
           {...panResponder.panHandlers}
         >
           <Image 
             source={{ uri: previewImage || undefined }} 
             style={[styles.previewImage,{width:PREVIEW_SIZE,height:PREVIEW_SIZE}]}
           />
           {renderCropOverlay()}
         </View>
       </View>
      <TouchableOpacity
        style={[styles.cropButton, { backgroundColor: tintColor }]}
        onPress={handleConfirmCrop}
        disabled={isLoading}
      >
        <Ionicons name="crop" size={20} color="white" />
        <Text style={styles.cropButtonText}>
          {isLoading ? t('common.loading') : t('iconEditor.cropAndUpload')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      visible={true}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        <StatusBar barStyle="light-content" backgroundColor={backgroundColor} />
        
        <View style={styles.header}>
          <ThemedText style={styles.title}>{t('iconEditor.title')}</ThemedText>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={textColor} />
          </TouchableOpacity>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              mode === 'url' && { backgroundColor: tintColor },
            ]}
            onPress={() => setMode('url')}
          >
            <ThemedText
              style={[
                styles.tabText,
                mode === 'url' && { color: 'white' },
              ]}
            >
              {t('iconEditor.fromUrl')}
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              mode === 'file' && { backgroundColor: tintColor },
            ]}
            onPress={() => setMode('file')}
          >
            <ThemedText
              style={[
                styles.tabText,
                mode === 'file' && { color: 'white' },
              ]}
            >
              {t('iconEditor.fromFile')}
            </ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {mode === 'url' && renderUrlInput()}
          {mode === 'file' && renderFileInput()}
          {mode === 'crop' && renderCropView()}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  urlInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  urlInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginRight: 10,
  },
  loadButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  fileButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  cropContainer: {
    flex: 1,
  },
  imagePreviewContainer: {
    alignItems: 'center',
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
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'white',
    borderWidth: 3,
    borderColor: '#007AFF',
    zIndex: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    // Area toccabile più grande
    padding: 5,
  },
  cropButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cropButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  selection: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
    backgroundColor: 'transparent',
    zIndex: 6,
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    zIndex: 1,
  },
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  cropGrid: {
    position: 'absolute',
    zIndex: 7,
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.3)',
    height: 1,
  },
});
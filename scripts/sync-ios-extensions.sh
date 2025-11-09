#!/bin/bash

# Script per sincronizzare le estensioni iOS dalla cartella plugins alla cartella ios
# Questo script copia i file Swift aggiornati nelle estensioni iOS

set -e  # Exit on error

echo "🔄 Sincronizzazione estensioni iOS in corso..."

# Percorsi delle cartelle
PLUGINS_DIR="plugins/withIosNotificationExtensions/files"
IOS_DIR="ios"

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funzione per stampare messaggi colorati
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verifica che la cartella plugins esista
if [ ! -d "$PLUGINS_DIR" ]; then
    print_error "Cartella plugins non trovata: $PLUGINS_DIR"
    print_error "Assicurati di eseguire lo script dalla cartella mobile"
    exit 1
fi

# Verifica che la cartella ios esista
if [ ! -d "$IOS_DIR" ]; then
    print_error "Cartella ios non trovata: $IOS_DIR"
    print_error "Assicurati di eseguire lo script dalla cartella mobile"
    exit 1
fi

# Funzione per sostituire i placeholder nei file
replace_placeholders() {
    local file_path="$1"
    local bundle_id="$2"
    
    if [[ "$file_path" == *.swift ]] || [[ "$file_path" == *.m ]] || [[ "$file_path" == *.entitlements ]]; then
        if [ -f "$file_path" ]; then
            sed -i '' "s/{{MAIN_BUNDLE_ID}}/$bundle_id/g" "$file_path"
            print_status "  🔄 Sostituiti placeholder in $(basename "$file_path")"
        fi
    fi
}

# Ottieni il bundle ID dall'app.config.ts
BUNDLE_ID="com.apocaliss92.zentik.dev"

# Controlla la variabile d'ambiente APP_VARIANT
if [ "$APP_VARIANT" = "development" ] || [ -f ".env" ] && grep -q "APP_VARIANT=development" .env; then
    BUNDLE_ID="com.apocaliss92.zentik.dev"
    print_status "Modalità development rilevata (APP_VARIANT), usando: $BUNDLE_ID"
elif [ -f "app.config.ts" ]; then
    # Fallback: controlla il file di configurazione
    if grep -q 'APP_VARIANT.*development' app.config.ts; then
        BUNDLE_ID="com.apocaliss92.zentik.dev"
        print_status "Modalità development rilevata da app.config.ts, usando: $BUNDLE_ID"
    else
        BUNDLE_ID="com.apocaliss92.zentik"
        print_status "Modalità production, usando: $BUNDLE_ID"
    fi
else
    print_status "Configurazione non trovata, usando bundle ID di default: $BUNDLE_ID"
fi

print_status "🎯 Bundle ID finale: $BUNDLE_ID"

print_status "Inizio sincronizzazione estensioni iOS..."

# 1. Notification Service Extension
print_status "Sincronizzazione Notification Service Extension..."

SERVICE_SOURCE="$PLUGINS_DIR/ZentikNotificationService"
SERVICE_DEST="$IOS_DIR/ZentikNotificationService"

if [ -d "$SERVICE_SOURCE" ]; then
    # Crea la cartella di destinazione se non esiste
    mkdir -p "$SERVICE_DEST"
    
    # Copia tutti i file Swift, plist e entitlements
    cp -f "$SERVICE_SOURCE"/*.swift "$SERVICE_DEST/" 2>/dev/null || true
    cp -f "$SERVICE_SOURCE"/*.plist "$SERVICE_DEST/" 2>/dev/null || true
    cp -f "$SERVICE_SOURCE"/*.entitlements "$SERVICE_DEST/" 2>/dev/null || true
    
    # Sostituisci placeholder nei file copiati
    for file in "$SERVICE_DEST"/*.swift "$SERVICE_DEST"/*.m "$SERVICE_DEST"/*.entitlements; do
        if [ -f "$file" ]; then
            replace_placeholders "$file" "$BUNDLE_ID"
        fi
    done
    
    print_success "Notification Service Extension sincronizzata"
    
    # Mostra i file copiati
    if [ -f "$SERVICE_DEST/NotificationService.swift" ]; then
        print_status "  ✅ NotificationService.swift copiato"
    fi
    if [ -f "$SERVICE_DEST/Info.plist" ]; then
        print_status "  ✅ Info.plist copiato"
    fi
else
    print_warning "Cartella Notification Service Extension non trovata: $SERVICE_SOURCE"
fi

# 2. Content Extension
print_status "Sincronizzazione Content Extension..."

CONTENT_SOURCE="$PLUGINS_DIR/ZentikNotificationContentExtension"
CONTENT_DEST="$IOS_DIR/ZentikNotificationContentExtension"

if [ -d "$CONTENT_SOURCE" ]; then
    # Crea la cartella di destinazione se non esiste
    mkdir -p "$CONTENT_DEST"
    
    # Copia tutti i file Swift, plist, storyboard e entitlements
    cp -f "$CONTENT_SOURCE"/*.swift "$CONTENT_DEST/" 2>/dev/null || true
    cp -f "$CONTENT_SOURCE"/*.plist "$CONTENT_DEST/" 2>/dev/null || true
    cp -f "$CONTENT_SOURCE"/*.storyboard "$CONTENT_DEST/" 2>/dev/null || true
    cp -f "$CONTENT_SOURCE"/*.entitlements "$CONTENT_DEST/" 2>/dev/null || true
    
    # Sostituisci placeholder nei file copiati
    for file in "$CONTENT_DEST"/*.swift "$CONTENT_DEST"/*.m "$CONTENT_DEST"/*.entitlements; do
        if [ -f "$file" ]; then
            replace_placeholders "$file" "$BUNDLE_ID"
        fi
    done
    
    print_success "Content Extension sincronizzata"
    
    # Mostra i file copiati
    if [ -f "$CONTENT_DEST/NotificationViewController.swift" ]; then
        print_status "  ✅ NotificationViewController.swift copiato"
    fi
    if [ -f "$CONTENT_DEST/Info.plist" ]; then
        print_status "  ✅ Info.plist copiato"
    fi
    if [ -f "$CONTENT_DEST/MainInterface.storyboard" ]; then
        print_status "  ✅ MainInterface.storyboard copiato"
    fi
else
    print_warning "Cartella Content Extension non trovata: $CONTENT_SOURCE"
fi

# 3. AppDelegate
print_status "Sincronizzazione AppDelegate..."

APPDELEGATE_SOURCE="plugins/withCustomAppDelegate/files/AppDelegate.swift"
APPDELEGATE_DEST="$IOS_DIR/ZentikDev/AppDelegate.swift"

if [ -f "$APPDELEGATE_SOURCE" ]; then
    # Copia AppDelegate
    cp -f "$APPDELEGATE_SOURCE" "$APPDELEGATE_DEST"
    
    # Sostituisci placeholder
    replace_placeholders "$APPDELEGATE_DEST" "$BUNDLE_ID"
    
    print_success "AppDelegate sincronizzato"
    print_status "  ✅ AppDelegate.swift copiato"
else
    print_warning "AppDelegate non trovato: $APPDELEGATE_SOURCE"
fi

# 3.5 WatchConnectivity (per app iOS principale)
print_status "Sincronizzazione WatchConnectivity files..."

WATCH_CONNECTIVITY_SOURCE="plugins/withWatchConnectivity/files"
WATCH_CONNECTIVITY_DEST="$IOS_DIR/ZentikDev"

WATCH_CONNECTIVITY_FILES=(
    "WatchConnectivityManager.swift"
    "WatchConnectivityBridge.swift"
    "WatchConnectivityBridge.m"
)

watch_conn_copied=0
for file in "${WATCH_CONNECTIVITY_FILES[@]}"; do
    source_file="$WATCH_CONNECTIVITY_SOURCE/$file"
    dest_file="$WATCH_CONNECTIVITY_DEST/$file"
    
    if [ -f "$source_file" ]; then
        cp -f "$source_file" "$dest_file"
        replace_placeholders "$dest_file" "$BUNDLE_ID"
        print_status "  ✅ $file copiato"
        ((watch_conn_copied++))
    else
        print_warning "  ⚠️  $file non trovato in $WATCH_CONNECTIVITY_SOURCE"
    fi
done

if [ $watch_conn_copied -gt 0 ]; then
    print_success "WatchConnectivity: $watch_conn_copied file copiati in iOS App"
fi

# 4. Shared Files (copiati in ogni target: AppDelegate, NSE, NCE)
print_status "Sincronizzazione file condivisi in tutti i target..."

SHARED_SOURCE="plugins/ZentikShared"

# Trova automaticamente tutti i file .swift nella cartella ZentikShared
if [ -d "$SHARED_SOURCE" ]; then
    SHARED_FILES=($(find "$SHARED_SOURCE" -maxdepth 1 -type f -name "*.swift" -exec basename {} \;))
    print_status "  📦 Trovati ${#SHARED_FILES[@]} file condivisi in ZentikShared"
else
    print_error "Cartella file condivisi non trovata: $SHARED_SOURCE"
    exit 1
fi

# Funzione per copiare i file condivisi in una destinazione
copy_shared_files() {
    local dest_dir="$1"
    local target_name="$2"
    local files_array=("${@:3}")  # Tutti gli argomenti dal terzo in poi
    
    if [ ! -d "$dest_dir" ]; then
        print_warning "Cartella destinazione non trovata: $dest_dir"
        return
    fi
    
    print_status "  Copiando file condivisi in $target_name..."
    
    local copied_count=0
    for file in "${files_array[@]}"; do
        local source_file="$SHARED_SOURCE/$file"
        local dest_file="$dest_dir/$file"
        
        if [ -f "$source_file" ]; then
            cp -f "$source_file" "$dest_file"
            replace_placeholders "$dest_file" "$BUNDLE_ID"
            print_status "    ✅ $file copiato"
            ((copied_count++))
        else
            print_warning "    ⚠️  $file non trovato in $SHARED_SOURCE"
        fi
    done
    
    print_success "  $target_name: $copied_count/${#files_array[@]} file copiati"
}

if [ -d "$SHARED_SOURCE" ]; then
    # Copia file condivisi in iOS App principale
    copy_shared_files "$IOS_DIR/ZentikDev" "iOS App" "${SHARED_FILES[@]}"
    
    # Copia file condivisi in Notification Service Extension
    copy_shared_files "$SERVICE_DEST" "NSE" "${SHARED_FILES[@]}"
    
    # Copia file condivisi in Content Extension
    copy_shared_files "$CONTENT_DEST" "NCE" "${SHARED_FILES[@]}"
    
    # 5. Watch Extension
    print_status "Sincronizzazione Watch Extension..."
    
    WATCH_DIR="targets/watch"
    
    if [ -d "$WATCH_DIR" ]; then
        copy_shared_files "$WATCH_DIR" "Watch" "${SHARED_FILES[@]}"
        
        # Note: Watch ha il suo CloudKitSyncManager_Watch.swift separato, non lo copiamo dal plugin
        print_status "  Watch usa CloudKitSyncManager_Watch.swift separato (non copiato dal plugin)"
        
        print_success "Watch Extension sincronizzata"
    else
        print_warning "Cartella Watch Extension non trovata: $WATCH_DIR"
    fi
    
    # 6. Widget Extension
    print_status "Sincronizzazione Widget Extension..."
    
    WIDGET_DIR="targets/widget"
    
    if [ -d "$WIDGET_DIR" ]; then
        copy_shared_files "$WIDGET_DIR" "Widget" "${SHARED_FILES[@]}"
        
        print_success "Widget Extension sincronizzata"
    else
        print_warning "Cartella Widget Extension non trovata: $WIDGET_DIR"
    fi
    
    print_success "File condivisi sincronizzati in tutti i target"
else
    print_error "Cartella file condivisi non trovata: $SHARED_SOURCE"
    print_error "Assicurati che la cartella $SHARED_SOURCE esista"
    exit 1
fi

# 7. Verifica finale
print_status "Verifica finale sincronizzazione..."

# Conta i file nelle cartelle di destinazione
SERVICE_FILES=$(find "$SERVICE_DEST" -name "*.swift" -o -name "*.plist" 2>/dev/null | wc -l | tr -d ' ')
CONTENT_FILES=$(find "$CONTENT_DEST" -name "*.swift" -o -name "*.plist" -o -name "*.storyboard" 2>/dev/null | wc -l | tr -d ' ')
APPDELEGATE_FILES=$(find "$IOS_DIR/ZentikDev" -name "*.swift" 2>/dev/null | wc -l | tr -d ' ')
WATCH_FILES=$(find "$WATCH_DIR" -name "*.swift" 2>/dev/null | wc -l | tr -d ' ')
WIDGET_FILES=$(find "$WIDGET_DIR" -name "*.swift" 2>/dev/null | wc -l | tr -d ' ')

print_success "Sincronizzazione completata!"
print_status "File copiati:"
print_status "  📱 Notification Service Extension: $SERVICE_FILES file"
print_status "  🎨 Content Extension: $CONTENT_FILES file"
if [ -f "$APPDELEGATE_DEST" ]; then
    print_status "  🎯 AppDelegate: copiato + file condivisi"
fi
if [ $watch_conn_copied -gt 0 ]; then
    print_status "  📡 WatchConnectivity: $watch_conn_copied file copiati in iOS App"
fi
if [ -d "$WATCH_DIR" ]; then
    print_status "  ⌚ Watch Extension: $WATCH_FILES file"
fi
if [ -d "$WIDGET_DIR" ]; then
    print_status "  📦 Widget Extension: $WIDGET_FILES file"
fi
print_status "  📦 File condivisi: ${#SHARED_FILES[@]} file .swift copiati automaticamente da plugins/ZentikShared in tutti i target (iOS App, NSE, NCE, Watch, Widget)"

# 8. Suggerimenti per il prossimo step
echo ""
print_status "🎯 Prossimi passi:"
print_status "1. Verifica le modifiche: git diff"
print_status "2. I file sono già sincronizzati in watch/widget, non serve prebuild"
print_status "3. Testa le notifiche per verificare che tutto funzioni"
print_status "4. Controlla i log per confermare l'uso dei file condivisi"
print_status ""
print_status "📝 Nota: Tutti i file .swift in plugins/ZentikShared vengono copiati automaticamente"
print_status "    in ogni target (iOS App, NSE, NCE, Watch, Widget) per evitare il prebuild"

echo ""
print_success "✨ Sincronizzazione completata con successo!"

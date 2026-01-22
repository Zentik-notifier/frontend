#!/bin/bash

# Sync iOS extensions and shared Swift files from ./plugins into ./ios and ./targets.
# Focus: show what gets copied and where.

set -e  # Exit on error

VERBOSE=${VERBOSE:-0}

printf "Syncing iOS extensions and shared files...\n"

# Percorsi delle cartelle
PLUGINS_DIR="plugins/withIosNotificationExtensions/files"
IOS_DIR="ios"

print_status() { printf "[INFO] %s\n" "$1"; }
print_success() { printf "[OK] %s\n" "$1"; }
print_warning() { printf "[WARN] %s\n" "$1"; }
print_error() { printf "[ERROR] %s\n" "$1"; }

is_verbose() {
    [[ "$VERBOSE" == "1" || "$VERBOSE" == "true" ]]
}

# Verifica che la cartella plugins esista
if [ ! -d "$PLUGINS_DIR" ]; then
    print_error "Plugins directory not found: $PLUGINS_DIR"
    print_error "Run this script from the frontend directory"
    exit 1
fi

# Verifica che la cartella ios esista
if [ ! -d "$IOS_DIR" ]; then
    print_error "iOS directory not found: $IOS_DIR"
    print_error "Run this script from the frontend directory"
    exit 1
fi

# Funzione per sostituire i placeholder nei file
replace_placeholders() {
    local file_path="$1"
    local bundle_id="$2"
    
    if [[ "$file_path" == *.swift ]] || [[ "$file_path" == *.m ]] || [[ "$file_path" == *.entitlements ]]; then
        if [ -f "$file_path" ]; then
            sed -i '' "s/{{MAIN_BUNDLE_ID}}/$bundle_id/g" "$file_path"
            if is_verbose; then
                print_status "Replaced placeholders in $(basename "$file_path")"
            fi
        fi
    fi
}

# Ottieni il bundle ID dall'app.config.ts
BUNDLE_ID="com.apocaliss92.zentik.dev"

# Controlla la variabile d'ambiente APP_VARIANT
if [ "$APP_VARIANT" = "development" ] || [ -f ".env" ] && grep -q "APP_VARIANT=development" .env; then
    BUNDLE_ID="com.apocaliss92.zentik.dev"
    print_status "Using development bundle id: $BUNDLE_ID"
elif [ -f "app.config.ts" ]; then
    # Fallback: controlla il file di configurazione
    if grep -q 'APP_VARIANT.*development' app.config.ts; then
        BUNDLE_ID="com.apocaliss92.zentik.dev"
        print_status "Using development bundle id: $BUNDLE_ID"
    else
        BUNDLE_ID="com.apocaliss92.zentik"
        print_status "Using production bundle id: $BUNDLE_ID"
    fi
else
    print_status "Config not found; using default bundle id: $BUNDLE_ID"
fi

print_status "Bundle id: $BUNDLE_ID"

# 1. Notification Service Extension
print_status "Syncing Notification Service Extension..."

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
    
    print_success "Notification Service Extension synced"
else
    print_warning "Notification Service Extension source not found: $SERVICE_SOURCE"
fi

# 2. Content Extension
print_status "Syncing Notification Content Extension..."

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
    
    print_success "Notification Content Extension synced"
else
    print_warning "Notification Content Extension source not found: $CONTENT_SOURCE"
fi

# 3. AppDelegate
print_status "Syncing AppDelegate..."

APPDELEGATE_SOURCE="plugins/withCustomAppDelegate/files/AppDelegate.swift"
APPDELEGATE_DEST="$IOS_DIR/ZentikDev/AppDelegate.swift"

if [ -f "$APPDELEGATE_SOURCE" ]; then
    # Copia AppDelegate
    cp -f "$APPDELEGATE_SOURCE" "$APPDELEGATE_DEST"
    
    # Sostituisci placeholder
    replace_placeholders "$APPDELEGATE_DEST" "$BUNDLE_ID"
    
    print_success "AppDelegate synced"
else
    print_warning "AppDelegate source not found: $APPDELEGATE_SOURCE"
fi

# 3.5 DatabaseAccessBridge (iOS app only)
print_status "Syncing DatabaseAccessBridge..."

DATABASE_ACCESS_BRIDGE_SOURCE="plugins/withDatabaseAccessBridge/files"
DATABASE_ACCESS_BRIDGE_DEST="$IOS_DIR/ZentikDev"

DATABASE_ACCESS_BRIDGE_FILES=(
    "DatabaseAccessBridge.swift"
    "DatabaseAccessBridge.m"
)

db_bridge_copied=0
for file in "${DATABASE_ACCESS_BRIDGE_FILES[@]}"; do
    source_file="$DATABASE_ACCESS_BRIDGE_SOURCE/$file"
    dest_file="$DATABASE_ACCESS_BRIDGE_DEST/$file"
    
    if [ -f "$source_file" ]; then
        cp -f "$source_file" "$dest_file"
        replace_placeholders "$dest_file" "$BUNDLE_ID"
        if is_verbose; then
            print_status "Copied $file to iOS app"
        fi
        ((db_bridge_copied++))
    else
        print_warning "$file not found in $DATABASE_ACCESS_BRIDGE_SOURCE"
    fi
done

if [ $db_bridge_copied -gt 0 ]; then
    print_success "DatabaseAccessBridge: copied $db_bridge_copied file(s)"
fi

# 3.7 CloudKitSyncBridge (iOS app only)
# CloudKitSyncBridge.swift viene copiato automaticamente dalla sezione file condivisi
# Qui copiamo solo il file .m (Objective-C bridge)
print_status "Syncing CloudKitSyncBridge (Objective-C bridge)..."

CLOUDKIT_SYNC_BRIDGE_SOURCE="plugins/ZentikShared"
CLOUDKIT_SYNC_BRIDGE_DEST="$IOS_DIR/ZentikDev"

CLOUDKIT_SYNC_BRIDGE_FILES=(
    "CloudKitSyncBridge.m"
)

cloudkit_bridge_copied=0
for file in "${CLOUDKIT_SYNC_BRIDGE_FILES[@]}"; do
    source_file="$CLOUDKIT_SYNC_BRIDGE_SOURCE/$file"
    dest_file="$CLOUDKIT_SYNC_BRIDGE_DEST/$file"
    
    if [ -f "$source_file" ]; then
        cp -f "$source_file" "$dest_file"
        replace_placeholders "$dest_file" "$BUNDLE_ID"
        if is_verbose; then
            print_status "Copied $file to iOS app"
        fi
        ((cloudkit_bridge_copied++))
    else
        print_warning "$file not found in $CLOUDKIT_SYNC_BRIDGE_SOURCE"
    fi
done

if [ $cloudkit_bridge_copied -gt 0 ]; then
    print_success "CloudKitSyncBridge: copied $cloudkit_bridge_copied file(s) (.m only)"
fi

# 4. Shared Files (copied into iOS app + extensions + watch/widget targets)
print_status "Syncing shared Swift files into all targets..."

SHARED_SOURCE="plugins/ZentikShared"

# Trova automaticamente tutti i file .swift nella cartella ZentikShared
if [ -d "$SHARED_SOURCE" ]; then
    SHARED_FILES=($(find "$SHARED_SOURCE" -maxdepth 1 -type f -name "*.swift" -exec basename {} \;))
    print_status "Found ${#SHARED_FILES[@]} shared Swift file(s) in plugins/ZentikShared"
else
    print_error "Shared files directory not found: $SHARED_SOURCE"
    exit 1
fi

# Funzione per copiare i file condivisi in una destinazione
# Uso: copy_shared_files <dest_dir> <target_name> <exclude_pattern> <files...>
copy_shared_files() {
    local dest_dir="$1"
    local target_name="$2"
    local exclude_pattern="$3"  # Pattern di file da escludere (es. "NotificationActionHandler.swift")
    local files_array=("${@:4}")  # Tutti gli argomenti dal quarto in poi
    
    if [ ! -d "$dest_dir" ]; then
        print_warning "Cartella destinazione non trovata: $dest_dir"
        return
    fi
    
    local copied_list=()
    local skipped_list=()
    local removed_list=()
    
    # First, remove excluded files if they exist
    local removed_count=0
    if [ -n "$exclude_pattern" ]; then
        IFS='|' read -ra PATTERNS <<< "$exclude_pattern"
        for pattern in "${PATTERNS[@]}"; do
            local excluded_file="$dest_dir/$pattern"
            if [ -f "$excluded_file" ]; then
                rm -f "$excluded_file"
                removed_list+=("$pattern")
                ((removed_count++))
            fi
        done
    fi
    
    local copied_count=0
    local skipped_count=0
    for file in "${files_array[@]}"; do
        # Salta i file che matchano il pattern di esclusione (supporta pattern multipli separati da |)
        if [ -n "$exclude_pattern" ]; then
            local should_skip=false
            IFS='|' read -ra PATTERNS <<< "$exclude_pattern"
            for pattern in "${PATTERNS[@]}"; do
                if [[ "$file" == $pattern ]]; then
                    should_skip=true
                    break
                fi
            done
            if [ "$should_skip" = true ]; then
                skipped_list+=("$file")
                ((skipped_count++))
                continue
            fi
        fi
        
        local source_file="$SHARED_SOURCE/$file"
        local dest_file="$dest_dir/$file"
        
        if [ -f "$source_file" ]; then
            cp -f "$source_file" "$dest_file"
            replace_placeholders "$dest_file" "$BUNDLE_ID"
            copied_list+=("$file")
            ((copied_count++))
        else
            print_warning "$file not found in $SHARED_SOURCE"
        fi
    done

    print_success "$target_name: copied $copied_count/${#files_array[@]} (skipped $skipped_count, removed $removed_count)"
    if [ ${#copied_list[@]} -gt 0 ]; then
        print_status "$target_name copied: ${copied_list[*]}"
    fi
    if is_verbose && [ ${#skipped_list[@]} -gt 0 ]; then
        print_status "$target_name skipped: ${skipped_list[*]}"
    fi
    if is_verbose && [ ${#removed_list[@]} -gt 0 ]; then
        print_status "$target_name removed: ${removed_list[*]}"
    fi
}

if [ -d "$SHARED_SOURCE" ]; then
    # Copia file condivisi in iOS App principale
    copy_shared_files "$IOS_DIR/ZentikDev" "iOS App" "" "${SHARED_FILES[@]}"
    
    # Copia file condivisi in Notification Service Extension (escludi bridge RN + monolite CloudKit)
    copy_shared_files "$SERVICE_DEST" "NSE" "CloudKitSyncBridge.swift|CloudKitManager.swift" "${SHARED_FILES[@]}"
    
    # Copia file condivisi in Content Extension (escludi bridge RN + monolite CloudKit)
    copy_shared_files "$CONTENT_DEST" "NCE" "CloudKitSyncBridge.swift|CloudKitManager.swift" "${SHARED_FILES[@]}"
    
    # 5. Watch Extension
    print_status "Syncing Watch target shared files..."
    
    WATCH_DIR="targets/watch"
    
    if [ -d "$WATCH_DIR" ]; then
        # Exclude CloudKitSyncBridge.swift (React Native bridge, not needed on Watch)
        # Start cutting out the monolithic CloudKitManager.swift from the watch target.
        copy_shared_files "$WATCH_DIR" "Watch" "CloudKitSyncBridge.swift|CloudKitManager.swift|PhoneCloudKit.swift" "${SHARED_FILES[@]}"
        
        print_success "Watch target synced"
    else
        print_warning "Watch target directory not found: $WATCH_DIR"
    fi
    
    # 6. Widget Extension
    print_status "Syncing Widget target shared files..."
    
    WIDGET_DIR="targets/widget"
    
    if [ -d "$WIDGET_DIR" ]; then
        # Exclude NotificationActionHandler.swift, CloudKitSyncBridge.swift and CloudKitManager.swift
        # Widget Extension doesn't handle CloudKit remote notifications and doesn't need CloudKit sync
        copy_shared_files "$WIDGET_DIR" "Widget" "NotificationActionHandler.swift|CloudKitSyncBridge.swift|CloudKitManager.swift" "${SHARED_FILES[@]}"
        
        print_success "Widget target synced"
    else
        print_warning "Widget target directory not found: $WIDGET_DIR"
    fi
    
    print_success "Shared files synced into all targets"
else
    print_error "Shared files directory not found: $SHARED_SOURCE"
    exit 1
fi

# 7. Final summary
print_status "Sync completed."

# Conta i file nelle cartelle di destinazione
SERVICE_FILES=$(find "$SERVICE_DEST" -name "*.swift" -o -name "*.plist" 2>/dev/null | wc -l | tr -d ' ')
CONTENT_FILES=$(find "$CONTENT_DEST" -name "*.swift" -o -name "*.plist" -o -name "*.storyboard" 2>/dev/null | wc -l | tr -d ' ')
APPDELEGATE_FILES=$(find "$IOS_DIR/ZentikDev" -name "*.swift" 2>/dev/null | wc -l | tr -d ' ')
WATCH_FILES=$(find "$WATCH_DIR" -name "*.swift" 2>/dev/null | wc -l | tr -d ' ')
WIDGET_FILES=$(find "$WIDGET_DIR" -name "*.swift" 2>/dev/null | wc -l | tr -d ' ')

print_success "Summary"
print_status "Notification Service Extension files: $SERVICE_FILES"
print_status "Notification Content Extension files: $CONTENT_FILES"
if [ -f "$APPDELEGATE_DEST" ]; then
    print_status "AppDelegate: synced"
fi
if [ $db_bridge_copied -gt 0 ]; then
    print_status "DatabaseAccessBridge: $db_bridge_copied file(s)"
fi
if [ $cloudkit_bridge_copied -gt 0 ]; then
    print_status "CloudKitSyncBridge (.m): $cloudkit_bridge_copied file(s)"
fi
if [ -d "$WATCH_DIR" ]; then
    print_status "Watch target Swift files: $WATCH_FILES"
fi
if [ -d "$WIDGET_DIR" ]; then
    print_status "Widget target Swift files: $WIDGET_FILES"
fi
print_status "Shared Swift files available: ${#SHARED_FILES[@]} (from plugins/ZentikShared)"
print_status "Tip: set VERBOSE=1 for skipped/removed details."

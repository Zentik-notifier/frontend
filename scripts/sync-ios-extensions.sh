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

# 4. Shared Framework (ZentikShared)
print_status "Sincronizzazione ZentikShared framework..."

SHARED_SOURCE="plugins/withZentikShared/files"
SHARED_DEST="$IOS_DIR/ZentikShared"

if [ -d "$SHARED_SOURCE" ]; then
    # Crea la cartella di destinazione se non esiste
    mkdir -p "$SHARED_DEST"
    
    # Copia tutti i file Swift del framework
    cp -f "$SHARED_SOURCE"/*.swift "$SHARED_DEST/" 2>/dev/null || true
    
    print_success "ZentikShared framework sincronizzato"
    
    # Mostra i file copiati
    for file in "$SHARED_SOURCE"/*.swift; do
        if [ -f "$file" ]; then
            print_status "  ✅ $(basename "$file") copiato"
        fi
    done
else
    print_warning "Cartella ZentikShared non trovata: $SHARED_SOURCE"
fi

# 5. Verifica finale
print_status "Verifica finale sincronizzazione..."

# Conta i file nelle cartelle di destinazione
SERVICE_FILES=$(find "$SERVICE_DEST" -name "*.swift" -o -name "*.plist" 2>/dev/null | wc -l)
CONTENT_FILES=$(find "$CONTENT_DEST" -name "*.swift" -o -name "*.plist" -o -name "*.storyboard" 2>/dev/null | wc -l)
SHARED_FILES=$(find "$SHARED_DEST" -name "*.swift" 2>/dev/null | wc -l)

print_success "Sincronizzazione completata!"
print_status "File copiati:"
print_status "  📱 Notification Service Extension: $SERVICE_FILES file"
print_status "  🎨 Content Extension: $CONTENT_FILES file"
if [ -f "$APPDELEGATE_DEST" ]; then
    print_status "  🎯 AppDelegate: copiato"
fi
print_status "  📦 ZentikShared framework: $SHARED_FILES file"

# 5. Suggerimenti per il prossimo step
echo ""
print_status "🎯 Prossimi passi:"
print_status "1. Ricompila l'app: npx expo prebuild --clean"
print_status "2. Apri Xcode e verifica che ZentikShared.framework sia linkato"
print_status "3. Aggiungi 'import ZentikShared' nelle estensioni"
print_status "4. Testa le notifiche per verificare il framework condiviso"
print_status "5. Controlla i log per confermare l'uso del framework"

echo ""
print_success "✨ Sincronizzazione completata con successo!"

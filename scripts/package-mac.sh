#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_NAME="Practice Planner"
BIN_DIR="$ROOT_DIR/bin"
DIST_DIR="$ROOT_DIR/dist/mac"
APP_BUNDLE="$DIST_DIR/$APP_NAME.app"
DMG_STAGING="$DIST_DIR/dmg-staging"
DMG_PATH="$DIST_DIR/$APP_NAME.dmg"
WAILS_BIN="${WAILS_BIN:-$HOME/go/bin/wails3}"

if [ ! -x "$WAILS_BIN" ]; then
  echo "wails3 not found at $WAILS_BIN"
  echo "Install it with: go install github.com/wailsapp/wails/v3/cmd/wails3@latest"
  exit 1
fi

cd "$ROOT_DIR"

export CGO_CFLAGS="${CGO_CFLAGS:-} -mmacosx-version-min=12.0"
export CGO_LDFLAGS="${CGO_LDFLAGS:-} -mmacosx-version-min=12.0"
export MACOSX_DEPLOYMENT_TARGET="${MACOSX_DEPLOYMENT_TARGET:-12.0}"

"$WAILS_BIN" generate bindings -ts -i -clean=true

(
  cd frontend
  npm install
  npm run build
)

go mod tidy
go test ./...

mkdir -p "$BIN_DIR" "$DIST_DIR"
go build -tags production -trimpath -buildvcs=false -ldflags="-w -s" -o "$BIN_DIR/$APP_NAME"

rm -rf "$APP_BUNDLE" "$DMG_STAGING" "$DMG_PATH"
mkdir -p "$APP_BUNDLE/Contents/MacOS" "$APP_BUNDLE/Contents/Resources"
cp "$BIN_DIR/$APP_NAME" "$APP_BUNDLE/Contents/MacOS/$APP_NAME"
cp "$ROOT_DIR/desktop/macos/Info.plist" "$APP_BUNDLE/Contents/Info.plist"

codesign --force --deep --sign - "$APP_BUNDLE"

mkdir -p "$DMG_STAGING"
cp -R "$APP_BUNDLE" "$DMG_STAGING/"
ln -s /Applications "$DMG_STAGING/Applications"

hdiutil create -volname "$APP_NAME" -srcfolder "$DMG_STAGING" -ov -format UDZO "$DMG_PATH"

echo "Created $APP_BUNDLE"
echo "Created $DMG_PATH"

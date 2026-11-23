#!/bin/bash
# Build a signed Birdsong IPA for a registered device.
# Prereqs (once in Xcode): Xcode-managed provisioning profile for
# com.khooeee.birdsong, and ios/Config/Local.xcconfig with DEVELOPMENT_TEAM.
# Usage: scripts/build-ios-ipa.sh [--method development] [--archive-path PATH] [--export-dir DIR]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
METHOD="development"
ARCHIVE_PATH="$ROOT/ios/build/Birdsong.xcarchive"
EXPORT_DIR="$ROOT/ios/build/ipa"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --method) METHOD="$2"; shift 2 ;;
    --archive-path) ARCHIVE_PATH="$2"; shift 2 ;;
    --export-dir) EXPORT_DIR="$2"; shift 2 ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

if [[ "$(uname)" != "Darwin" ]]; then
  echo "iOS builds require macOS with Xcode." >&2; exit 1
fi
command -v xcodegen >/dev/null || { echo "Missing xcodegen: brew install xcodegen" >&2; exit 1; }
command -v xcodebuild >/dev/null || { echo "Missing xcodebuild (install Xcode)." >&2; exit 1; }

TEAM_ID="${DEVELOPMENT_TEAM:-}"
if [[ -z "$TEAM_ID" && -f "$ROOT/ios/Config/Local.xcconfig" ]]; then
  TEAM_ID="$(grep -E '^\s*DEVELOPMENT_TEAM\s*=' "$ROOT/ios/Config/Local.xcconfig" | sed 's/.*=\s*//' | tr -d '[:space:]' || true)"
fi
if [[ -z "$TEAM_ID" ]]; then
  echo "Missing DEVELOPMENT_TEAM. Put 'DEVELOPMENT_TEAM = <team id>' in ios/Config/Local.xcconfig" >&2
  exit 1
fi

# Regenerate the gitignored .xcodeproj from ios/project.yml.
(cd "$ROOT" && npm run ios --silent)

# Archive for a real device (generic/platform=iOS, Release).
xcodebuild archive \
  -project "$ROOT/ios/Birdsong.xcodeproj" \
  -scheme Birdsong \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE_PATH" \
  -allowProvisioningUpdates \
  CODE_SIGN_STYLE=Automatic \
  DEVELOPMENT_TEAM="$TEAM_ID"

# Export the archive to an IPA using the same team- provisioning profile.
EXPORT_PLIST="$(mktemp -t BirdsongExportOptions).plist"
trap 'rm -f "$EXPORT_PLIST"' EXIT
cat >"$EXPORT_PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>${METHOD}</string>
  <key>teamID</key>
  <string>${TEAM_ID}</string>
  <key>signingStyle</key>
  <string>automatic</string>
</dict>
</plist>
EOF

rm -rf "$EXPORT_DIR"
mkdir -p "$EXPORT_DIR"
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportPath "$EXPORT_DIR" \
  -exportOptionsPlist "$EXPORT_PLIST" \
  -allowProvisioningUpdates

echo "IPA: $(echo "$EXPORT_DIR"/*.ipa)"

#!/bin/sh
# Archive and upload Wooly Walking to App Store Connect (TestFlight).
# Needs a paid Apple Developer Program team in Config/Signing.local.xcconfig
# and Xcode signed in to that account (Xcode > Settings > Accounts).
set -eu
cd "$(dirname "$0")/.."

team=$(sed -n 's/^DEVELOPMENT_TEAM *= *\([A-Z0-9]\{10\}\).*/\1/p' Config/Signing.local.xcconfig 2>/dev/null || true)
[ -n "$team" ] || { echo "set DEVELOPMENT_TEAM in Config/Signing.local.xcconfig" >&2; exit 1; }

# Every upload needs a unique build number: use a timestamp.
build=$(date +%Y%m%d%H%M)
archive=build/WoolyWalking-$build.xcarchive

xcodebuild -project WoolyWalking.xcodeproj -scheme WoolyWalking -configuration Release \
  -destination 'generic/platform=iOS' -archivePath "$archive" \
  -allowProvisioningUpdates CURRENT_PROJECT_VERSION="$build" archive

opts=build/ExportOptions.plist
cat > "$opts" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>method</key><string>app-store-connect</string>
  <key>destination</key><string>upload</string>
  <key>teamID</key><string>$team</string>
  <key>manageAppVersionAndBuildNumber</key><false/>
</dict></plist>
EOF

xcodebuild -exportArchive -archivePath "$archive" -exportOptionsPlist "$opts" \
  -exportPath build/export -allowProvisioningUpdates

echo "uploaded build $build: it appears in App Store Connect > TestFlight after processing (5-30 min)"

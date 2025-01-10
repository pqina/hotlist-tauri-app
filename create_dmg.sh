# not used currently

#!/bin/sh
test -f Hotlist.dmg && rm Hotlist.dmg
create-dmg \
  --volname "Hotlist Installer" \
  --volicon "src-tauri/icons/icon.icns" \
  --background "dmg-background.png" \
  --window-pos 200 120 \
  --window-size 700 500 \
  --icon-size 150 \
  --text-size 16 \
  --icon "Hotlist.app" 200 210 \
  --app-drop-link 500 205 \
  --hide-extension "Hotlist.app" \
  "Hotlist.dmg" \
  "src-tauri/target/universal-apple-darwin/release/bundle/macos/"
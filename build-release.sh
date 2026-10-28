#!/usr/bin/env bash
set -e

cd /root/projects/moreader-web-ext

echo "1. Building Vue extension..."
npm run build:extension

echo "2. Preparing dist-ext directory..."
rm -rf dist-ext
mkdir -p dist-ext

cp -r dist/* dist-ext/
cp ext/manifest.json dist-ext/
cp -r ext/icons dist-ext/
cp ext/background.js dist-ext/

echo "3. Packaging zip file..."
ZIP_NAME="moreader-v2.10.9-chromestore-release.zip"
rm -f "$ZIP_NAME"
cd dist-ext
zip -q -r "../$ZIP_NAME" .
cd ..

echo "✓ Release built: $ZIP_NAME"
ls -lh "$ZIP_NAME"

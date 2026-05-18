#!/bin/bash
# Mobile app build and deployment script
# Requires: Xcode (iOS), Android Studio (Android), Fastlane (optional)
set -e

PLATFORM="${1:-both}" # ios, android, or both
ENVIRONMENT="${ENVIRONMENT:-production}"
API_URL="${API_URL:-https://api.tourismmarketplace.com}"

echo "=== Tourism Marketplace Mobile Deployment ==="
echo "Platform: $PLATFORM"
echo "Environment: $ENVIRONMENT"

cd packages/mobile

# Install dependencies
echo "Installing dependencies..."
npm ci

# Write production env
echo "Configuring API URL: $API_URL"
echo "API_URL=$API_URL" > .env.production

# Check if Fastlane is available
HAS_FASTLANE=false
if command -v fastlane &> /dev/null; then
  HAS_FASTLANE=true
  echo "Fastlane detected — using automated lanes."
fi

if [ "$PLATFORM" = "ios" ] || [ "$PLATFORM" = "both" ]; then
  echo ""
  echo "=== iOS Build ==="

  if [ "$HAS_FASTLANE" = true ]; then
    echo "Running Fastlane ios_release lane..."
    fastlane ios ios_release
  else
    echo "Fastlane not found. Manual steps to deploy iOS:"
    echo "  1. cd ios && pod install && cd .."
    echo "  2. Open ios/TourismMarketplace.xcworkspace in Xcode"
    echo "  3. Set signing team and bundle identifier"
    echo "  4. Archive: Product → Archive"
    echo "  5. Distribute: Window → Organizer → Distribute App"
    echo "  6. Select 'App Store Connect' and follow prompts"
    echo ""
    echo "Or install Fastlane and run: fastlane ios ios_release"
  fi
fi

if [ "$PLATFORM" = "android" ] || [ "$PLATFORM" = "both" ]; then
  echo ""
  echo "=== Android Build ==="

  if [ "$HAS_FASTLANE" = true ]; then
    echo "Running Fastlane android_release lane..."
    fastlane android android_release
  elif [ -f "android/gradlew" ]; then
    echo "Building Android release AAB..."
    cd android
    ./gradlew bundleRelease
    cd ..
    echo "Android AAB built at: android/app/build/outputs/bundle/release/app-release.aab"
    echo ""
    echo "To submit to Google Play:"
    echo "  1. Sign the AAB with your keystore"
    echo "  2. Upload to Google Play Console"
    echo "  3. Complete store listing and submit for review"
  else
    echo "Android build requires Android Studio setup."
    echo "Steps to deploy Android:"
    echo "  1. Open android/ folder in Android Studio"
    echo "  2. Build → Generate Signed Bundle/APK"
    echo "  3. Select Android App Bundle"
    echo "  4. Upload to Google Play Console"
    echo ""
    echo "Or install Fastlane and run: fastlane android android_release"
  fi
fi

echo ""
echo "=== Mobile deployment complete ==="

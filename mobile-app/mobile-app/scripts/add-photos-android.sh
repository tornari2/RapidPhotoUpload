#!/bin/bash

# Script to add sample photos to Android emulator
# Usage: ./scripts/add-photos-android.sh

echo "Adding photos to Android emulator..."

# Check if adb is available
if ! command -v adb &> /dev/null; then
    echo "Error: adb not found. Please install Android SDK Platform Tools."
    exit 1
fi

# Check if device is connected
DEVICE=$(adb devices | grep -v "List" | grep "device" | awk '{print $1}')
if [ -z "$DEVICE" ]; then
    echo "Error: No Android device/emulator found. Please start your emulator first."
    exit 1
fi

echo "Found device: $DEVICE"

# Create DCIM/Camera directory if it doesn't exist
adb shell mkdir -p /sdcard/DCIM/Camera

# Get the absolute path to sample_photos
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PHOTOS_DIR="$PROJECT_ROOT/sample_photos"

if [ ! -d "$PHOTOS_DIR" ]; then
    echo "Error: Sample photos directory not found at $PHOTOS_DIR"
    exit 1
fi

echo "Copying photos from $PHOTOS_DIR..."

# Push all photos to the emulator
COUNT=0
for photo in "$PHOTOS_DIR"/*.{jpg,jpeg,png,webp}; do
    if [ -f "$photo" ]; then
        FILENAME=$(basename "$photo")
        echo "Pushing $FILENAME..."
        adb push "$photo" /sdcard/DCIM/Camera/
        COUNT=$((COUNT + 1))
    fi
done

echo ""
echo "✅ Successfully pushed $COUNT photos to Android emulator!"
echo "Photos are now available in the Gallery app."

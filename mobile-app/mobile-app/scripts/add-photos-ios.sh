#!/bin/bash

# Script to add sample photos to iOS Simulator
# Usage: ./scripts/add-photos-ios.sh

echo "Adding photos to iOS Simulator..."

# Check if xcrun simctl is available
if ! command -v xcrun &> /dev/null; then
    echo "Error: xcrun not found. This script requires Xcode to be installed."
    exit 1
fi

# Get the booted simulator
BOOTED_SIM=$(xcrun simctl list devices | grep "(Booted)" | head -1 | sed 's/.*(\([^)]*\)).*/\1/')

if [ -z "$BOOTED_SIM" ]; then
    echo "Error: No booted iOS simulator found. Please start your simulator first."
    exit 1
fi

echo "Found booted simulator: $BOOTED_SIM"

# Get the absolute path to sample_photos
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PHOTOS_DIR="$PROJECT_ROOT/sample_photos"

if [ ! -d "$PHOTOS_DIR" ]; then
    echo "Error: Sample photos directory not found at $PHOTOS_DIR"
    exit 1
fi

echo "Adding photos from $PHOTOS_DIR..."

# Add photos to the simulator's photo library
COUNT=0
for photo in "$PHOTOS_DIR"/*.{jpg,jpeg,png,webp}; do
    if [ -f "$photo" ]; then
        FILENAME=$(basename "$photo")
        echo "Adding $FILENAME..."
        xcrun simctl addmedia "$BOOTED_SIM" "$photo" 2>/dev/null
        COUNT=$((COUNT + 1))
    fi
done

echo ""
echo "✅ Successfully added $COUNT photos to iOS Simulator!"
echo "Photos are now available in the Photos app."

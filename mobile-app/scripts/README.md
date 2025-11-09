# Adding Sample Photos to Mobile Emulator/Simulator

This guide explains how to add the 100 sample photos from the `sample_photos` folder to your mobile app emulator for testing.

## Prerequisites

- Your emulator/simulator must be running
- For Android: Android SDK Platform Tools (adb) must be installed
- For iOS: Xcode must be installed

## Quick Start

### Android Emulator

1. Start your Android emulator
2. Run the script:
   ```bash
   cd mobile-app
   ./scripts/add-photos-android.sh
   ```

The script will:
- Check if adb is available
- Verify an emulator is running
- Copy all photos from `sample_photos/` to `/sdcard/DCIM/Camera/`
- Make photos available in the Gallery app

### iOS Simulator

1. Start your iOS Simulator
2. Run the script:
   ```bash
   cd mobile-app
   ./scripts/add-photos-ios.sh
   ```

The script will:
- Check if Xcode is installed
- Find the booted simulator
- Add all photos from `sample_photos/` to the simulator's photo library
- Make photos available in the Photos app

## Manual Methods

### Android Emulator (Manual)

If the script doesn't work, you can manually push photos:

```bash
# List connected devices
adb devices

# Push a single photo
adb push sample_photos/sample_photo_001.jpg /sdcard/DCIM/Camera/

# Push all photos (run from project root)
for photo in sample_photos/*.{jpg,jpeg,png,webp}; do
    adb push "$photo" /sdcard/DCIM/Camera/
done
```

### iOS Simulator (Manual)

**Method 1: Drag and Drop**
1. Open Photos app in the iOS Simulator
2. Drag photos from Finder directly into the Photos app window

**Method 2: Using simctl**
```bash
# Get simulator ID
xcrun simctl list devices | grep Booted

# Add a single photo
xcrun simctl addmedia <SIMULATOR_ID> sample_photos/sample_photo_001.jpg

# Add all photos (run from project root)
for photo in sample_photos/*.{jpg,jpeg,png,webp}; do
    xcrun simctl addmedia <SIMULATOR_ID> "$photo"
done
```

## Troubleshooting

### Android: "adb not found"
- Install Android SDK Platform Tools
- Add `adb` to your PATH
- On macOS with Homebrew: `brew install android-platform-tools`

### Android: "No device found"
- Make sure your emulator is running
- Check with `adb devices`
- Try restarting the emulator

### iOS: "xcrun not found"
- Install Xcode from the App Store
- Run `xcode-select --install` if needed

### iOS: "No booted simulator found"
- Start the iOS Simulator from Xcode or run `open -a Simulator`
- Make sure a simulator is booted (not just listed)

### Photos not appearing
- **Android**: Open the Gallery app and refresh (pull down)
- **iOS**: Open the Photos app - photos should appear automatically
- Try restarting the emulator/simulator
- Check that photos are in the correct format (jpg, png, webp)

## Notes

- The scripts support `.jpg`, `.jpeg`, `.png`, and `.webp` formats
- Photos are copied, not moved (original files remain in `sample_photos/`)
- It may take a few minutes to transfer 100 photos
- The scripts will show progress as each photo is added


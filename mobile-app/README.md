# RapidPhotoUpload Mobile App

React Native mobile application for RapidPhotoUpload, built with Expo.

## Features

- **Authentication**: JWT-based authentication with secure token storage
- **Photo Upload**: Upload up to 100 photos concurrently with real-time progress
- **Photo Gallery**: View photos in an infinite-scroll grid with multi-select
- **Tagging**: Add tags to photos individually or in bulk
- **Download**: Save photos to device storage
- **Dark Theme**: Modern UI with gradient buttons

## Tech Stack

- **React Native** with **Expo**
- **TypeScript**
- **React Navigation** (Stack & Tab navigators)
- **Redux Toolkit** for state management
- **Axios** for API calls
- **expo-secure-store** for secure token storage
- **expo-image-picker** for gallery access
- **expo-file-system** for file downloads
- **expo-linear-gradient** for gradient UI elements

## Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (Mac only) or Android Studio for emulators
- Expo Go app on your physical device (optional)

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Backend URL

Update the API base URL in `src/services/api.ts`:

```typescript
const API_BASE_URL = __DEV__
  ? 'http://YOUR_LOCAL_IP:8080'  // Replace with your local IP for physical device testing
  : 'https://your-production-api.com';
```

**Note**: When testing on a physical device, you MUST use your computer's local IP address (e.g., `http://192.168.1.100:8080`) instead of `localhost`.

### 3. Start the Development Server

```bash
npm start
```

This will open the Expo developer tools in your browser.

### 4. Run on a Device/Emulator

Choose one of the following options:

- Press `i` - Run on iOS Simulator (Mac only)
- Press `a` - Run on Android Emulator
- Scan the QR code with Expo Go app on your physical device

## Project Structure

```
mobile-app/
├── App.tsx                 # Main app entry point
├── src/
│   ├── navigation/         # React Navigation setup
│   │   └── AppNavigator.tsx
│   ├── screens/           # Screen components
│   ├── components/        # Reusable UI components
│   │   └── Button.tsx     # Custom button with gradient
│   ├── hooks/             # Custom hooks
│   │   └── redux.ts       # Typed Redux hooks
│   ├── services/          # API services
│   │   └── api.ts         # Axios instance with interceptors
│   ├── contexts/          # React contexts
│   │   └── AuthContext.tsx
│   ├── store/             # Redux store
│   │   └── index.ts
│   ├── types/             # TypeScript types
│   │   └── index.ts
│   └── utils/             # Utility functions
├── assets/                # Images, fonts, etc.
└── app.json               # Expo configuration
```

## Development

### Running on Physical Device

1. Install Expo Go from the App Store (iOS) or Play Store (Android)
2. Make sure your phone and computer are on the same WiFi network
3. Update `API_BASE_URL` in `src/services/api.ts` to use your computer's local IP
4. Run `npm start` and scan the QR code with Expo Go

### Testing with Backend

The mobile app connects to the same Spring Boot backend as the web app. Make sure the backend is running on `localhost:8080` (or your configured port).

## Available Scripts

- `npm start` - Start the Expo development server
- `npm run android` - Run on Android emulator
- `npm run ios` - Run on iOS simulator
- `npm run web` - Run in web browser (limited functionality)

## Building for Production

### Create Production Builds

1. Install EAS CLI:
```bash
npm install -g eas-cli
```

2. Configure EAS:
```bash
eas build:configure
```

3. Build for iOS and Android:
```bash
eas build --platform all
```

Refer to Task 28 (Mobile App Deployment and Publishing) for detailed deployment instructions.

## Integration with Backend

This mobile app uses the same REST API as the web application:

- Authentication: `/api/auth/*`
- Photos: `/api/photos/*`
- Upload: `/api/upload/*`
- Tags: `/api/tags/*`
- Download: `/api/download/*`

All API requests are automatically configured with JWT authentication via request interceptors.

## Troubleshooting

### "Network request failed" errors

- Ensure backend is running
- Check that you're using the correct IP address (not localhost on physical devices)
- Verify your firewall allows connections on port 8080

### "Unable to resolve module" errors

```bash
npm install
expo start -c  # Clear cache
```

### iOS build issues

```bash
cd ios && pod install && cd ..
```

## Next Steps

See the following tasks for implementing features:
- **Task 27**: Mobile Authentication System
- **Task 20**: Mobile Upload Feature
- **Task 21**: Mobile Photo Grid
- **Task 22**: Mobile Tagging System
- **Task 23**: Mobile Download Feature

## License

MIT


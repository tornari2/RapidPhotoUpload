import { configureStore } from '@reduxjs/toolkit';

// Import your reducers here when you create them
// import photosReducer from './slices/photosSlice';
// import uploadReducer from './slices/uploadSlice';
// import tagsReducer from './slices/tagsSlice';

export const store = configureStore({
  reducer: {
    // Add your reducers here
    // photos: photosReducer,
    // upload: uploadReducer,
    // tags: tagsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types if needed
        ignoredActions: ['your/action/type'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['meta.arg', 'payload.timestamp'],
        // Ignore these paths in the state
        ignoredPaths: ['items.dates'],
      },
    }),
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;


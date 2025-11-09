import { configureStore } from '@reduxjs/toolkit';

// Placeholder reducer until we add feature slices
const placeholderReducer = (state = {}) => state;

export const store = configureStore({
  reducer: {
    // Placeholder reducer - will be replaced with actual reducers in future tasks
    app: placeholderReducer,
    // Add your reducers here when you create them:
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

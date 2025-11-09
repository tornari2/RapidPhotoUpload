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
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

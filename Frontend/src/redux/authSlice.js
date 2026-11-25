import { createAction, createSlice } from "@reduxjs/toolkit";

// Logging out resets every slice (see store.js), so nothing from the last
// user - saved jobs, applications, companies - stays in the browser.
export const logoutUser = createAction("app/logout");

const authSlice = createSlice({
  name: "auth",
  initialState: {
    loading: false,
    user: null,
  },
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setUser: (state, action) => {
      state.user = action.payload;
    },
  },
});

// Export the actions
export const { setLoading, setUser } = authSlice.actions;

// Export the reducer
export default authSlice.reducer;

// Export the authSlice if needed
export const authSliceReducer = authSlice.reducer;

import { combineReducers, configureStore } from "@reduxjs/toolkit";
import authReducer, { logoutUser } from "./authSlice";
import jobReducer from "./jobSlice";
import companyReducer from "./companyslice";

import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import storage from "redux-persist/lib/storage";
import applicationSlice from "./applicationSlice";
const persistConfig = {
  key: "root",
  version: 3,
  storage,
  migrate: (state) => {
    if (!state) return Promise.resolve(state);
    // older versions also stored a duplicate "jobs" copy of the job state -
    // drop it from saved data so it doesn't linger in the browser
    const { jobs, ...rest } = state; // eslint-disable-line no-unused-vars
    // before version 2, saved jobs lived only in the browser and weren't tied
    // to an account - drop them; they're now loaded from the server
    if ((state._persist?.version ?? 0) < 2 && rest.job) {
      rest.job = { ...rest.job, savedJobs: [] };
    }
    // version 3 renamed the "Student" role to "JobSeeker" - update the
    // logged-in user saved in the browser so they stay logged in
    if (rest.auth?.user?.role === "Student") {
      rest.auth = { ...rest.auth, user: { ...rest.auth.user, role: "JobSeeker" } };
    }
    return Promise.resolve(rest);
  },
};

// each slice registered once (job and company used to be registered twice)
const rootReducer = combineReducers({
  auth: authReducer,
  job: jobReducer,
  company: companyReducer,
  application: applicationSlice,
});

// on logout, start every slice from scratch
const appReducer = (state, action) =>
  rootReducer(action.type === logoutUser.type ? undefined : state, action);

const persistedReducer = persistReducer(persistConfig, appReducer);

const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export default store;

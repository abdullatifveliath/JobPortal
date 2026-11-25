import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { Toaster } from "./components/ui/sonner";
import ChatWidget from "./components/components_lite/ChatWidget";
import { Provider } from "react-redux";
import { persistStore } from "redux-persist";

import store from "./redux/store";
import { PersistGate } from "redux-persist/integration/react";

const persistor = persistStore(store);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <App />
        <Toaster />
        <ChatWidget />
      </PersistGate>
    </Provider>
  </StrictMode>
);

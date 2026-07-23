import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import App from "./App";
import { AuthProvider } from "./auth/AuthContext";
import { ThemeProvider } from "./theme/ThemeContext";
import { ToastProvider } from "./contexts/ToastContext";
import ToastContainer from "./components/ToastContainer";
import { ConfirmProvider } from "./contexts/ConfirmContext";
import ConfirmDialog from "./components/ConfirmDialog";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    // A 30s staleTime avoids an extra network round-trip every time a user
    // re-visits a page they were just on (e.g. tab-switching between
    // Employees and a drawer); explicit mutations still invalidate their
    // queries immediately, so this never serves stale data after a write.
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
        <ThemeProvider>
          <ToastProvider>
            <ConfirmProvider>
              <BrowserRouter>
                <QueryClientProvider client={queryClient}>
                  <AuthProvider>
                    <App />
                    <ToastContainer />
                    <ConfirmDialog />
                  </AuthProvider>
                </QueryClientProvider>
              </BrowserRouter>
            </ConfirmProvider>
          </ToastProvider>
        </ThemeProvider>
      </MotionConfig>
    </ErrorBoundary>
  </React.StrictMode>,
);

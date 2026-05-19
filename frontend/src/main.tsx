import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";

import "./index.css";
import Unitor from "./App.tsx";
import { AuthProvider } from "@/context/AuthContext";

// One client for the whole app. Defaults are mostly fine for stage 1;
// we'll tune per-query (staleTime, refetchOnWindowFocus, etc.) as
// individual screens land.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Avoid the dev-time double-fetch storm on every focus change.
      refetchOnWindowFocus: false,
      // Cached data is "fresh" for 30s before tanstack-query will refetch.
      staleTime: 30_000,
      retry: 1,
    },
  },
});

// Strip trailing slash; React Router doesn't want one in basename.
const basename = import.meta.env.BASE_URL.replace(/\/$/, "");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={basename}>
        <AuthProvider>
          <Unitor />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);

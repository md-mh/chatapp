"use client";

import { useState } from "react";
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { isAuthError } from "@/lib/api";
import { signOut } from "@/lib/session";

// A rejected token cannot be recovered from anywhere in the tree, so it is
// handled once here rather than being re-checked in every query.
function endSessionOnAuthError(error) {
  if (isAuthError(error)) signOut();
}

export default function Providers({ children }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30000,
            retry: (failureCount, error) =>
              !isAuthError(error) && failureCount < 1,
            refetchOnWindowFocus: true,
          },
        },
        queryCache: new QueryCache({ onError: endSessionOnAuthError }),
        mutationCache: new MutationCache({ onError: endSessionOnAuthError }),
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

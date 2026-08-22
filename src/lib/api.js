import {
  casingVariants,
  dedupeById,
  escapeRegex,
  isPhoneQuery,
  matchesPhone,
} from "./search";

export const BASE_URL = "https://frontend-task-chatapp.onrender.com";
export const API_URL = `${BASE_URL}/api`;
// Socket.IO is mounted on the deployment root, not under /api.
export const SOCKET_URL = BASE_URL;

const TOKEN_KEY = "chaton_token";
const USER_KEY = "chaton_user";

export function getToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(window.localStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
}

export function saveSession(token, user) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
  if (user) window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

// Failures come back as { error: { message, code, details } }, so unwrap that
// envelope first and keep the code around for auth handling upstream.
export async function apiRequest(path, options = {}) {
  const token = getToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(
      body?.error?.details?.[0]?.message ||
        body?.error?.message ||
        body?.message ||
        "Request failed",
    );
    error.status = response.status;
    error.code = body?.error?.code || null;
    error.details = body?.error?.details || null;
    throw error;
  }
  return body;
}

const AUTH_ERROR_CODES = new Set([
  "NO_TOKEN",
  "INVALID_TOKEN",
  "TOKEN_EXPIRED",
  "UNAUTHORIZED",
]);

export function isAuthError(error) {
  return error?.status === 401 || AUTH_ERROR_CODES.has(error?.code);
}

export const chatApi = {
  login: (payload) =>
    apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  me: () => apiRequest("/auth/me"),
  // The server matches a case-sensitive prefix of `name` and nothing else,
  // so casing is retried here and phone numbers are resolved client-side
  // against the directory page. See src/lib/search.js for the evidence.
  searchUsers: async (query) => {
    const term = String(query ?? "").trim();
    if (!term) return [];

    if (isPhoneQuery(term)) {
      const directory = await apiRequest("/users/search?q=");
      const list = Array.isArray(directory) ? directory : [];
      return list.filter((user) => matchesPhone(user, term));
    }

    const attempts = await Promise.all(
      casingVariants(term).map((variant) =>
        apiRequest(
          `/users/search?q=${encodeURIComponent(escapeRegex(variant))}`,
        )
          // One casing failing should not lose the results of the others.
          .catch(() => []),
      ),
    );
    return dedupeById(attempts);
  },
  conversations: () => apiRequest("/conversations"),
  startConversation: (userId) =>
    apiRequest("/conversations", {
      method: "POST",
      body: JSON.stringify({ userId }),
    }),
  createGroup: (name, participantIds) =>
    apiRequest("/conversations/group", {
      method: "POST",
      body: JSON.stringify({ name, participantIds }),
    }),
  // The list is newest-first and `before` is inclusive of the cursor message.
  messages: (id, { limit = 30, before } = {}) => {
    const query = new URLSearchParams({ limit: String(limit) });
    if (before) query.set("before", before);
    return apiRequest(`/conversations/${id}/messages?${query}`);
  },
  sendMessage: (conversationId, text) =>
    apiRequest("/messages", {
      method: "POST",
      body: JSON.stringify({ conversationId, text }),
    }),
  addParticipants: (conversationId, userIds) =>
    apiRequest(`/conversations/${conversationId}/participants`, {
      method: "POST",
      body: JSON.stringify({ userIds }),
    }),
  removeParticipant: (conversationId, userId) =>
    apiRequest(`/conversations/${conversationId}/participants/${userId}`, {
      method: "DELETE",
    }),
  promoteAdmin: (conversationId, userId) =>
    apiRequest(`/conversations/${conversationId}/admins`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    }),
  renameGroup: (conversationId, name) =>
    apiRequest(`/conversations/${conversationId}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),
  // Health sits on the root, outside the /api prefix.
  health: async () => {
    const response = await fetch(`${BASE_URL}/health`);
    if (!response.ok) throw new Error("Service unavailable");
    return response.json();
  },
};

"use client";

import { useEffect, useSyncExternalStore } from "react";
import { io } from "socket.io-client";
import { SOCKET_URL } from "./api";

// One socket per token, shared by every component that listens.
let socket = null;
let socketToken = null;
let status = "offline";
const listeners = new Set();

function setStatus(next) {
  if (status === next) return;
  status = next;
  for (const listener of listeners) listener();
}

function teardown() {
  if (socket) {
    socket.removeAllListeners();
    socket.close();
  }
  socket = null;
  socketToken = null;
  setStatus("offline");
}

function ensureSocket(token) {
  if (!token) {
    teardown();
    return null;
  }
  if (socket && socketToken === token) return socket;
  teardown();
  socketToken = token;
  setStatus("connecting");
  socket = io(SOCKET_URL, { auth: { token }, transports: ["websocket"] });
  socket.on("connect", () => setStatus("online"));
  socket.on("disconnect", () => setStatus("offline"));
  socket.on("connect_error", () => setStatus("offline"));
  return socket;
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSocketStatus() {
  return useSyncExternalStore(
    subscribe,
    () => status,
    () => "offline",
  );
}

// The server never echoes an event back to the client that caused it, so these
// handlers only ever fire for other people's messages and group changes.
export function useChatSocket(token, { onMessage, onConversationUpdated }) {
  useEffect(() => {
    const active = ensureSocket(token);
    if (!active) return undefined;
    active.on("message:new", onMessage);
    active.on("conversation:updated", onConversationUpdated);
    return () => {
      active.off("message:new", onMessage);
      active.off("conversation:updated", onConversationUpdated);
    };
  }, [token, onMessage, onConversationUpdated]);
}

export function closeSocket() {
  teardown();
}

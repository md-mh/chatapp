"use client";

import { useSyncExternalStore } from "react";
import { clearSession, getStoredUser, getToken, saveSession } from "./api";

// localStorage is an external store, so the session is read through
// useSyncExternalStore instead of being copied into state inside an effect.
const SIGNED_OUT = { token: null, user: null };
const listeners = new Set();
let snapshot = SIGNED_OUT;

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function getSnapshot() {
  const token = getToken();
  if (!token) {
    snapshot = SIGNED_OUT;
    return snapshot;
  }
  const user = getStoredUser();
  if (snapshot.token !== token || snapshot.user?._id !== user?._id)
    snapshot = { token, user };
  return snapshot;
}

function getServerSnapshot() {
  return SIGNED_OUT;
}

export function signIn(token, user) {
  saveSession(token, user);
  emit();
}

export function signOut() {
  clearSession();
  emit();
}

export function useSession() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// The first client render still uses the server snapshot, so a route guard
// that reads the session immediately would bounce a signed-in user. This
// flips to true only once hydration has happened.
const noopSubscribe = () => () => {};

export function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

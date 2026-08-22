"use client";

import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { chatApi } from "./api";
import { queryKeys } from "./queryKeys";
import { appendToPages, markInPages, removeFromPages, replaceInPages } from "./messages";
import { applyIncomingMessage } from "./conversations";

// Date.now() alone collides when two messages leave in the same millisecond.
let outboxSequence = 0;
const nextDraftId = () => `draft-${Date.now()}-${(outboxSequence += 1)}`;

// Sending goes over REST rather than the socket: the socket only acknowledges
// with { ok: true }, while REST returns the stored message, so the optimistic
// bubble can be swapped for the real one by id. Delivery to everyone else is
// identical either way.
export function useSendMessage(conversationId, currentUserId) {
  const queryClient = useQueryClient();
  const key = queryKeys.messages(conversationId);

  const mutation = useMutation({
    mutationFn: ({ text }) => chatApi.sendMessage(conversationId, text),
    onMutate: async ({ text, draftId }) => {
      await queryClient.cancelQueries({ queryKey: key });
      queryClient.setQueryData(key, (data) =>
        appendToPages(data, {
          _id: draftId,
          conversation: conversationId,
          sender: currentUserId,
          text,
          createdAt: new Date().toISOString(),
          pending: true,
        }),
      );
      return { draftId };
    },
    onSuccess: (created, { text }, context) => {
      queryClient.setQueryData(key, (data) =>
        replaceInPages(data, context.draftId, created),
      );
      queryClient.setQueryData(queryKeys.conversations, (data) => ({
        data: applyIncomingMessage(data, {
          conversationId,
          text: created?.text ?? text,
          senderId: currentUserId,
          createdAt: new Date(created?.createdAt ?? Date.now()).getTime(),
        }),
      }));
    },
    // The bubble stays put and is flagged instead of vanishing, so a dropped
    // request never costs the sender the text they typed.
    onError: (error, variables, context) => {
      queryClient.setQueryData(key, (data) =>
        markInPages(data, context.draftId, { pending: false, failed: true }),
      );
    },
  });

  const send = useCallback(
    (raw) => {
      const text = raw.trim();
      // The server accepts an empty body happily, so the guard lives here.
      if (!text || !conversationId) return false;
      mutation.mutate({ text, draftId: nextDraftId() });
      return true;
    },
    [conversationId, mutation],
  );

  const retry = useCallback(
    (message) => {
      if (!message?.id) return;
      queryClient.setQueryData(key, (data) =>
        removeFromPages(data, message.id),
      );
      mutation.mutate({ text: message.text, draftId: nextDraftId() });
    },
    [key, mutation, queryClient],
  );

  const discard = useCallback(
    (message) => {
      if (!message?.id) return;
      queryClient.setQueryData(key, (data) =>
        removeFromPages(data, message.id),
      );
    },
    [key, queryClient],
  );

  return { send, retry, discard, error: mutation.error };
}

"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";

// A message list has two competing jobs: follow the conversation as it grows,
// and stay exactly where the reader left it when they scroll back to catch up
// on history. This hook keeps both honest by tracking whether the viewport is
// currently pinned to the bottom, and only auto-scrolling when it is.
const PIN_THRESHOLD = 80;

export function useStickyScroll({
  conversationId,
  newestId,
  newestIsMine,
  count,
}) {
  const ref = useRef(null);
  const pinned = useRef(true);
  // Distance from the bottom captured before older messages are prepended.
  const anchor = useRef(null);
  const lastNewestId = useRef(null);
  const lastConversationId = useRef(null);
  const [unread, setUnread] = useState(0);
  const [atBottom, setAtBottom] = useState(true);

  const scrollToBottom = useCallback((behavior = "smooth") => {
    const element = ref.current;
    if (!element) return;
    element.scrollTo({ top: element.scrollHeight, behavior });
    pinned.current = true;
    setAtBottom(true);
    setUnread(0);
  }, []);

  const onScroll = useCallback(() => {
    const element = ref.current;
    if (!element) return;
    const distance =
      element.scrollHeight - element.scrollTop - element.clientHeight;
    const isPinned = distance <= PIN_THRESHOLD;
    pinned.current = isPinned;
    setAtBottom(isPinned);
    if (isPinned) setUnread(0);
  }, []);

  // Called just before an older page is requested. Measuring from the bottom
  // means the restore works no matter how tall the prepended page turns out.
  const captureAnchor = useCallback(() => {
    const element = ref.current;
    if (element) anchor.current = element.scrollHeight - element.scrollTop;
  }, []);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    // A different conversation always opens on the newest message.
    if (lastConversationId.current !== conversationId) {
      lastConversationId.current = conversationId;
      lastNewestId.current = newestId ?? null;
      anchor.current = null;
      pinned.current = true;
      element.scrollTop = element.scrollHeight;
      setAtBottom(true);
      setUnread(0);
      return;
    }

    // Older messages were prepended: hold the reader's place instead of
    // letting the new content push the viewport up the thread.
    if (anchor.current != null) {
      element.scrollTop = element.scrollHeight - anchor.current;
      anchor.current = null;
      return;
    }

    if (newestId === lastNewestId.current) return;
    const isFirstPaint = lastNewestId.current === null;
    lastNewestId.current = newestId ?? null;

    // Follow the thread when the reader is already at the bottom, and when the
    // new message is their own — sending is an explicit request to catch up.
    if (pinned.current || newestIsMine || isFirstPaint) {
      element.scrollTop = element.scrollHeight;
      setAtBottom(true);
      setUnread(0);
      return;
    }

    // Otherwise the reader is reading history. Leave them there and count
    // what arrived so they can choose to jump down.
    setUnread((current) => current + 1);
  }, [conversationId, newestId, newestIsMine, count]);

  return { ref, onScroll, atBottom, unread, scrollToBottom, captureAnchor };
}

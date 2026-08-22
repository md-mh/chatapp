// REST returns { _id, createdAt: ISO } while the socket sends { id, createdAt: epoch },
// so every message is funnelled through one shape before it reaches the UI.
export function normalizeMessage(message) {
  if (!message) return null;
  const id = message._id ?? message.id ?? null;
  if (!id) return null;
  const sender = message.sender;
  return {
    id,
    conversationId: message.conversation ?? message.conversationId ?? null,
    senderId:
      typeof sender === "object" ? (sender?._id ?? null) : (sender ?? null),
    senderName: typeof sender === "object" ? (sender?.name ?? null) : null,
    text: message.text ?? "",
    createdAt: new Date(message.createdAt ?? Date.now()).getTime(),
    pending: Boolean(message.pending),
    failed: Boolean(message.failed),
  };
}

export function normalizeMessagePage(payload) {
  const list = Array.isArray(payload) ? payload : (payload?.messages ?? []);
  const messages = (Array.isArray(list) ? list : [])
    .map(normalizeMessage)
    .filter(Boolean);
  return { messages, hasMore: Boolean(payload?.hasMore) };
}

// Oldest first for rendering, deduped by id because `before` is inclusive of
// the cursor message and the sender also appends its own optimistic copy.
export function mergeMessages(...groups) {
  const byId = new Map();
  for (const group of groups)
    for (const message of group ?? []) {
      if (!message?.id) continue;
      const existing = byId.get(message.id);
      if (!existing || (existing.pending && !message.pending))
        byId.set(message.id, message);
    }
  return [...byId.values()].sort((a, b) => a.createdAt - b.createdAt);
}

// Pages hold raw server objects, newest first, with page 0 the newest page.
export function appendToPages(data, rawMessage) {
  const id = rawMessage?._id ?? rawMessage?.id;
  if (!data?.pages?.length || !id) return data;
  const [first, ...rest] = data.pages;
  const messages = first?.messages ?? [];
  if (messages.some((message) => (message._id ?? message.id) === id)) return data;
  return {
    ...data,
    pages: [{ ...first, messages: [rawMessage, ...messages] }, ...rest],
  };
}

export function replaceInPages(data, targetId, rawMessage) {
  if (!data?.pages?.length) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      messages: (page.messages ?? []).map((message) =>
        (message._id ?? message.id) === targetId ? rawMessage : message,
      ),
    })),
  };
}

// A send that failed keeps its bubble so the text is never lost; the flag
// turns it into a retry affordance instead of a silent disappearance.
export function markInPages(data, targetId, patch) {
  if (!data?.pages?.length) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      messages: (page.messages ?? []).map((message) =>
        (message._id ?? message.id) === targetId
          ? { ...message, ...patch }
          : message,
      ),
    })),
  };
}

export function removeFromPages(data, targetId) {
  if (!data?.pages?.length) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      messages: (page.messages ?? []).filter(
        (message) => (message._id ?? message.id) !== targetId,
      ),
    })),
  };
}

// `before` is inclusive, so the cursor is the oldest id of the page just read
// and the repeated message is dropped when the pages are merged.
export function nextCursor(lastPage, lastPageParam) {
  if (!lastPage?.hasMore) return undefined;
  const messages = lastPage.messages ?? [];
  if (!messages.length) return undefined;
  const oldest = messages.at(-1);
  const cursor = oldest?._id ?? oldest?.id;
  // A page that cannot move the cursor would otherwise loop forever.
  return !cursor || cursor === lastPageParam ? undefined : cursor;
}

export function formatMessageTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatDayLabel(value, now = new Date()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const startOf = (input) => {
    const day = new Date(input);
    day.setHours(0, 0, 0, 0);
    return day.getTime();
  };
  const days = Math.round((startOf(now) - startOf(date)) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return date.toLocaleDateString([], { weekday: "long" });
  return date.toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Messages carry no day separators of their own, so group them as they render.
export function groupByDay(messages, now = new Date()) {
  const groups = [];
  for (const message of messages) {
    const label = formatDayLabel(message.createdAt, now);
    const last = groups.at(-1);
    if (last?.label === label) last.messages.push(message);
    else groups.push({ label, messages: [message] });
  }
  return groups;
}

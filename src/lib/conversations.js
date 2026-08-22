// Conversation payloads are undocumented in Swagger, so every reader here
// tolerates a missing envelope, a missing lastMessage, or a missing field.
const AVATAR_COLORS = [
  "#f1a08a",
  "#8fbea9",
  "#d7b87d",
  "#b9e7d3",
  "#e0a3b8",
  "#9cbcdc",
];

export function normalizeConversations(payload) {
  const list = Array.isArray(payload)
    ? payload
    : (payload?.data ?? payload?.conversations);
  return Array.isArray(list) ? list : [];
}

export function isGroup(conversation) {
  return conversation?.type === "group";
}

export function conversationTitle(conversation) {
  if (isGroup(conversation)) return conversation.name?.trim() || "Untitled group";
  return (
    conversation?.participant?.name?.trim() ||
    conversation?.participant?.phone ||
    "Unknown contact"
  );
}

export function conversationDetail(conversation) {
  if (isGroup(conversation)) {
    const count = conversation.participants?.length ?? 0;
    return count ? `${count} member${count === 1 ? "" : "s"}` : "Group";
  }
  return conversation?.participant?.phone || "Direct message";
}

export function participantsOf(conversation) {
  if (Array.isArray(conversation?.participants)) return conversation.participants;
  return conversation?.participant ? [conversation.participant] : [];
}

function idOf(value) {
  return typeof value === "object" ? (value?._id ?? null) : (value ?? null);
}

export function isAdmin(conversation, userId) {
  if (!userId) return false;
  return (conversation?.admins ?? []).some((admin) => idOf(admin) === userId);
}

export function initialsOf(name) {
  const parts = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function avatarColorFor(seed) {
  const key = String(seed ?? "");
  let hash = 0;
  for (let index = 0; index < key.length; index += 1)
    hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function lastActivityAt(conversation) {
  const stamp =
    conversation?.lastMessage?.createdAt ??
    conversation?.updatedAt ??
    conversation?.createdAt;
  const time = stamp ? new Date(stamp).getTime() : Number.NaN;
  return Number.isNaN(time) ? 0 : time;
}

export function lastMessagePreview(conversation, currentUserId) {
  const text = conversation?.lastMessage?.text?.trim();
  if (!text) return "No messages yet";
  const senderId = idOf(conversation.lastMessage.sender);
  return senderId && senderId === currentUserId ? `You: ${text}` : text;
}

function startOfDay(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function formatChatTime(value, now = new Date()) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);
  if (days <= 0)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (days === 1) return "Yesterday";
  if (days < 7) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { day: "numeric", month: "short" });
}

export function toChatItem(conversation, currentUserId) {
  const name = conversationTitle(conversation);
  const id = conversation?._id ?? conversation?.id ?? null;
  return {
    id,
    name,
    detail: conversationDetail(conversation),
    preview: lastMessagePreview(conversation, currentUserId),
    time: formatChatTime(lastActivityAt(conversation) || null),
    initials: initialsOf(name),
    color: avatarColorFor(id ?? name),
    isGroup: isGroup(conversation),
  };
}

// Newest activity first, so the last conversation you touched stays on top.
export function sortConversations(payload) {
  return normalizeConversations(payload)
    .slice()
    .sort((a, b) => lastActivityAt(b) - lastActivityAt(a));
}

// A socket update carries the whole conversation, so swap it in by id and let
// the sort settle its new position. Unknown ids are prepended as new threads.
export function applyConversationUpdate(payload, updated) {
  const id = updated?._id ?? updated?.id;
  if (!id) return normalizeConversations(payload);
  const list = normalizeConversations(payload);
  const index = list.findIndex((conversation) => conversation._id === id);
  if (index === -1) return [updated, ...list];
  const next = list.slice();
  next[index] = { ...next[index], ...updated };
  return next;
}

// The list endpoint owns lastMessage, so a live message has to be folded in by
// hand to keep the preview and the ordering honest.
export function applyIncomingMessage(payload, message) {
  const list = normalizeConversations(payload);
  return list.map((conversation) =>
    conversation._id === message?.conversationId
      ? {
          ...conversation,
          lastMessage: {
            text: message.text,
            sender: message.senderId,
            createdAt: new Date(message.createdAt).toISOString(),
          },
          updatedAt: new Date(message.createdAt).toISOString(),
        }
      : conversation,
  );
}

export const queryKeys = {
  me: ["me"],
  health: ["health"],
  conversations: ["conversations"],
  messages: (conversationId) => ["messages", conversationId],
  users: (query) => ["users", query],
};

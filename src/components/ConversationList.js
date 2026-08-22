"use client";

import { AlertCircle, MessageCircle, Users } from "lucide-react";
import Avatar from "./Avatar";

function Notice({ children }) {
  return (
    <div className="rounded-xl bg-[#f0efe9] p-4 text-center text-xs leading-relaxed text-[#193c36]/60">
      {children}
    </div>
  );
}

export default function ConversationList({
  items = [],
  activeId,
  onSelect,
  isLoading = false,
  error = null,
  onRetry,
  emptyLabel = "No conversations yet. Start one and it will appear here.",
}) {
  if (isLoading)
    return (
      <div className="space-y-1" aria-busy="true" aria-label="Loading conversations">
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="flex animate-pulse items-center gap-3 p-3">
            <div className="h-8 w-8 shrink-0 rounded-full bg-[#e4e3da]" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-2.5 w-1/2 rounded bg-[#e4e3da]" />
              <div className="h-2.5 w-3/4 rounded bg-[#eceadf]" />
            </div>
          </div>
        ))}
      </div>
    );

  if (error)
    return (
      <Notice>
        <AlertCircle size={18} className="mx-auto mb-2 text-[#ef806f]" />
        <p className="mb-3">{error.message || "Could not load conversations."}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="rounded-lg bg-[#193c36] px-3 py-2 text-xs font-semibold text-[#f4f1ea] transition hover:bg-[#28544c]"
          >
            Try again
          </button>
        )}
      </Notice>
    );

  if (!items.length)
    return (
      <Notice>
        <MessageCircle size={18} className="mx-auto mb-2 text-[#193c36]/40" />
        <p>{emptyLabel}</p>
      </Notice>
    );

  return (
    <div className="space-y-1">
      {items.map((chat) => (
        <button
          key={chat.id}
          onClick={() => onSelect(chat.id)}
          aria-current={activeId === chat.id ? "true" : undefined}
          className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${activeId === chat.id ? "bg-[#e9e8df]" : "hover:bg-[#f0efe9]"}`}
        >
          <Avatar chat={chat} small />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-sm font-semibold">{chat.name}</span>
              {chat.isGroup && (
                <Users size={12} className="shrink-0 text-[#193c36]/40" />
              )}
            </span>
            <span
              className={`block truncate text-xs ${chat.unread > 0 ? "font-semibold text-[#193c36]/75" : "text-[#193c36]/50"}`}
            >
              {chat.preview}
            </span>
          </span>
          <span className="flex shrink-0 flex-col items-end gap-1 self-start pt-1">
            <span className="text-[10px] text-[#193c36]/40">{chat.time}</span>
            {chat.unread > 0 && (
              <span
                aria-label={`${chat.unread} unread`}
                className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ef806f] px-1 text-[10px] font-bold text-[#193c36]"
              >
                {chat.unread > 9 ? "9+" : chat.unread}
              </span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
}

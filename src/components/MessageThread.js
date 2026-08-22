"use client";

import { useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ArrowDown, Check, CircleAlert, RotateCcw, X } from "lucide-react";
import { chatApi } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import {
  formatMessageTime,
  groupByDay,
  mergeMessages,
  nextCursor,
  normalizeMessagePage,
} from "@/lib/messages";
import { avatarColorFor, initialsOf } from "@/lib/conversations";
import { useStickyScroll } from "@/lib/useStickyScroll";
import Avatar from "./Avatar";

const PAGE_SIZE = 30;

function Bubble({ item, mine, isGroup, senderName, onRetry, onDiscard }) {
  return (
    <div
      className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}
    >
      {!mine && isGroup && (
        <Avatar
          chat={{
            initials: initialsOf(senderName),
            color: avatarColorFor(item.senderId ?? senderName),
          }}
          small
        />
      )}
      <div
        className={`flex max-w-[80%] flex-col ${mine ? "items-end" : "items-start"}`}
      >
        {!mine && isGroup && (
          <span className="mb-1 px-1 text-[10px] font-semibold text-[#193c36]/45">
            {senderName}
          </span>
        )}
        <div
          className={`whitespace-pre-wrap wrap-break-word rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${
            mine
              ? "rounded-br-sm bg-[#193c36] text-[#f4f1ea]"
              : "rounded-bl-sm bg-[#edf0e9] text-[#193c36]"
          } ${item.pending ? "opacity-60" : ""} ${
            item.failed ? "bg-[#7a3a30] text-[#f4f1ea]" : ""
          }`}
        >
          {item.text}
        </div>
        {item.failed ? (
          <span className="mt-1.5 flex items-center gap-2 px-1 text-[10px] text-[#ef806f]">
            Not sent
            <button
              type="button"
              onClick={() => onRetry(item)}
              className="flex items-center gap-1 font-semibold underline underline-offset-2"
            >
              <RotateCcw size={11} /> Retry
            </button>
            <button
              type="button"
              onClick={() => onDiscard(item)}
              aria-label="Discard message"
              className="flex items-center gap-1 text-[#193c36]/45"
            >
              <X size={11} /> Discard
            </button>
          </span>
        ) : (
          <span className="mt-1.5 flex items-center gap-1 px-1 text-[10px] text-[#193c36]/40">
            {item.pending ? "Sending..." : formatMessageTime(item.createdAt)}
            {mine && !item.pending && <Check size={12} />}
          </span>
        )}
      </div>
    </div>
  );
}

export default function MessageThread({
  conversationId,
  currentUserId,
  isGroup,
  namesById,
  onRetry,
  onDiscard,
}) {
  const query = useInfiniteQuery({
    queryKey: queryKeys.messages(conversationId),
    queryFn: ({ pageParam }) =>
      chatApi.messages(conversationId, { limit: PAGE_SIZE, before: pageParam }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage, allPages, lastPageParam) =>
      nextCursor(lastPage, lastPageParam),
    enabled: Boolean(conversationId),
  });

  const messages = useMemo(
    () =>
      mergeMessages(
        ...(query.data?.pages ?? []).map(
          (page) => normalizeMessagePage(page).messages,
        ),
      ),
    [query.data],
  );

  const days = useMemo(() => groupByDay(messages), [messages]);
  const newest = messages.at(-1);

  const { ref, onScroll, atBottom, unread, scrollToBottom, captureAnchor } =
    useStickyScroll({
      conversationId,
      newestId: newest?.id,
      newestIsMine: newest?.senderId === currentUserId,
      count: messages.length,
    });

  const loadEarlier = () => {
    // Measure before the request so the prepended page can be absorbed
    // without moving what the reader is looking at.
    captureAnchor();
    query.fetchNextPage();
  };

  if (query.isPending)
    return (
      <div className="flex flex-1 items-center justify-center px-5 py-7">
        <p className="text-sm text-[#193c36]/45">Loading messages...</p>
      </div>
    );

  if (query.error)
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5 py-7 text-center">
        <CircleAlert size={20} className="text-[#ef806f]" />
        <p className="max-w-xs text-sm text-[#193c36]/55">
          {query.error.message}
        </p>
        <button
          onClick={() => query.refetch()}
          className="rounded-lg bg-[#193c36] px-3 py-2 text-xs font-semibold text-[#f4f1ea] transition hover:bg-[#28544c]"
        >
          Try again
        </button>
      </div>
    );

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={ref}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto px-5 py-7 sm:px-12"
        aria-live="polite"
        aria-relevant="additions"
      >
        <div className="mx-auto w-full max-w-2xl">
          {query.hasNextPage && (
            <div className="mb-6 flex justify-center">
              <button
                onClick={loadEarlier}
                disabled={query.isFetchingNextPage}
                className="rounded-full border border-[#193c36]/15 px-4 py-2 text-xs font-semibold text-[#193c36]/70 transition hover:bg-[#f0efe9] disabled:opacity-50"
              >
                {query.isFetchingNextPage
                  ? "Loading..."
                  : "Load earlier messages"}
              </button>
            </div>
          )}

          {!messages.length && (
            <p className="py-10 text-center text-sm text-[#193c36]/45">
              No messages yet. Say the first thing.
            </p>
          )}

          {days.map((day) => (
            <div key={day.label} className="mb-6 last:mb-0">
              <div className="mb-6 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[.18em] text-[#193c36]/35">
                <span className="h-px flex-1 bg-[#193c36]/10" />
                {day.label}
                <span className="h-px flex-1 bg-[#193c36]/10" />
              </div>
              <div className="space-y-5">
                {day.messages.map((item) => (
                  <Bubble
                    key={item.id}
                    item={item}
                    mine={item.senderId === currentUserId}
                    isGroup={isGroup}
                    senderName={
                      item.senderName ?? namesById?.[item.senderId] ?? "Member"
                    }
                    onRetry={onRetry}
                    onDiscard={onDiscard}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reading history is never interrupted; the reader is told what arrived
          and decides when to catch up. */}
      {!atBottom && (
        <button
          type="button"
          onClick={() => scrollToBottom()}
          className={`absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold shadow-lg transition ${
            unread
              ? "bg-[#ef806f] text-[#193c36] shadow-[#ef806f]/30"
              : "bg-white text-[#193c36]/70 shadow-[#193c36]/15"
          }`}
        >
          {unread
            ? `${unread} new message${unread === 1 ? "" : "s"}`
            : "Jump to latest"}
          <ArrowDown size={14} />
        </button>
      )}
    </div>
  );
}

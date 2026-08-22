"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  LogOut,
  MessageCircle,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";
import Avatar from "@/components/Avatar";
import Composer from "@/components/Composer";
import ConversationList from "@/components/ConversationList";
import GroupPanel from "@/components/GroupPanel";
import MessageThread from "@/components/MessageThread";
import NewConversationDialog from "@/components/NewConversationDialog";
import { chatApi } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { signOut, useHydrated, useSession } from "@/lib/session";
import { closeSocket, useChatSocket, useSocketStatus } from "@/lib/socket";
import { appendToPages, normalizeMessage } from "@/lib/messages";
import { useSendMessage } from "@/lib/useSendMessage";
import {
  applyConversationUpdate,
  applyIncomingMessage,
  initialsOf,
  isGroup,
  participantsOf,
  sortConversations,
  toChatItem,
} from "@/lib/conversations";

export default function ChatPage() {
  const router = useRouter();
  const session = useSession();
  const hydrated = useHydrated();
  const queryClient = useQueryClient();
  const socketStatus = useSocketStatus();

  const [activeId, setActiveId] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [filter, setFilter] = useState("");
  const [listOpen, setListOpen] = useState(true);
  const [unreadById, setUnreadById] = useState({});

  const isLive = Boolean(session.token);

  useEffect(() => {
    if (hydrated && !isLive) router.replace("/login");
  }, [hydrated, isLive, router]);

  const meQuery = useQuery({
    queryKey: queryKeys.me,
    queryFn: chatApi.me,
    enabled: isLive,
  });

  const healthQuery = useQuery({
    queryKey: queryKeys.health,
    queryFn: chatApi.health,
    enabled: isLive,
    refetchInterval: 60000,
    retry: false,
  });

  const conversationsQuery = useQuery({
    queryKey: queryKeys.conversations,
    queryFn: chatApi.conversations,
    enabled: isLive,
  });

  const me = meQuery.data ?? session.user;
  const currentUserId = me?._id ?? null;

  // Read inside the socket callbacks without giving them a new identity on
  // every selection, which would tear the listeners down and rebuild them.
  const activeIdRef = useRef(activeId);
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  const handleIncomingMessage = useCallback(
    (raw) => {
      const incoming = normalizeMessage(raw);
      if (!incoming?.conversationId) return;
      queryClient.setQueryData(
        queryKeys.messages(incoming.conversationId),
        (data) => appendToPages(data, raw),
      );
      queryClient.setQueryData(queryKeys.conversations, (data) => ({
        data: applyIncomingMessage(data, incoming),
      }));
      // A message for a thread you are not looking at is worth a badge.
      if (incoming.conversationId !== activeIdRef.current)
        setUnreadById((current) => ({
          ...current,
          [incoming.conversationId]:
            (current[incoming.conversationId] ?? 0) + 1,
        }));
    },
    [queryClient],
  );

  const handleConversationUpdated = useCallback(
    (updated) => {
      queryClient.setQueryData(queryKeys.conversations, (data) => ({
        data: applyConversationUpdate(data, updated),
      }));
    },
    [queryClient],
  );

  useChatSocket(session.token, {
    onMessage: handleIncomingMessage,
    onConversationUpdated: handleConversationUpdated,
  });

  // Anything that happened while the socket was down was never delivered, so
  // a reconnect resyncs from REST instead of trusting the cache.
  const wasOnline = useRef(false);
  useEffect(() => {
    if (socketStatus === "online" && !wasOnline.current)
      queryClient.invalidateQueries();
    wasOnline.current = socketStatus === "online";
  }, [socketStatus, queryClient]);

  const conversations = useMemo(
    () => sortConversations(conversationsQuery.data),
    [conversationsQuery.data],
  );

  const chats = useMemo(
    () =>
      conversations
        .map((conversation) => ({
          ...toChatItem(conversation, currentUserId),
          unread: unreadById[conversation._id] ?? 0,
        }))
        .filter((chat) => chat.id),
    [conversations, currentUserId, unreadById],
  );

  const term = filter.trim().toLowerCase();
  const visibleChats = term
    ? chats.filter(
        (chat) =>
          chat.name.toLowerCase().includes(term) ||
          chat.detail.toLowerCase().includes(term),
      )
    : chats;

  const activeConversation =
    conversations.find((conversation) => conversation._id === activeId) ?? null;
  const activeChat = chats.find((chat) => chat.id === activeId) ?? null;

  const namesById = useMemo(() => {
    const map = {};
    for (const member of participantsOf(activeConversation))
      if (member?._id) map[member._id] = member.name;
    return map;
  }, [activeConversation]);

  const { send, retry, discard } = useSendMessage(activeId, currentUserId);

  const openConversation = (id) => {
    setActiveId(id);
    setListOpen(false);
    setUnreadById((current) => {
      if (!current[id]) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  const handleSignOut = () => {
    closeSocket();
    signOut();
    queryClient.clear();
    router.replace("/");
  };

  const connectionLabel =
    socketStatus === "online"
      ? "Live"
      : healthQuery.isError
        ? "Service offline"
        : "Connecting";

  if (!hydrated || !isLive)
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f1ea]">
        <p className="text-sm text-[#193c36]/45">Opening your workspace...</p>
      </main>
    );

  const emptyLabel = term
    ? "Nothing matches that filter."
    : "No conversations yet. Start one and it will appear here.";

  return (
    <div className="h-screen bg-[#f4f1ea] text-[#193c36] sm:p-5">
      <div className="mx-auto flex h-full max-w-[1440px] overflow-hidden border-[#193c36]/10 bg-white sm:rounded-[26px] sm:border sm:shadow-xl sm:shadow-[#193c36]/5">
        {/* One pane at a time on a phone, both side by side from md up. */}
        <aside
          className={`${listOpen ? "flex" : "hidden"} w-full shrink-0 flex-col border-r border-[#193c36]/10 bg-[#fbfaf6] md:flex md:w-[290px]`}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-[#193c36]/10 p-5">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ef806f]">
                <Sparkles size={15} />
              </span>
              <span className="display font-semibold">chaton</span>
            </Link>
            <button
              onClick={() => setDialog("new")}
              className="rounded-lg p-2 hover:bg-[#e9e8df]"
              aria-label="New conversation"
            >
              <Plus size={18} />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <div className="mb-4 flex items-center gap-3 rounded-2xl bg-[#e0f1e8] p-3">
              <div className="relative">
                <Avatar
                  chat={{
                    initials: initialsOf(me?.name ?? "You"),
                    color: "#b9e7d3",
                  }}
                  small
                />
                <span
                  className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#e0f1e8] ${
                    socketStatus === "online"
                      ? "bg-[#56a77d]"
                      : "pulse-dot bg-[#d7b87d]"
                  }`}
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {me?.name ?? "Loading..."}
                </p>
                <p className="text-xs text-[#193c36]/55">{connectionLabel}</p>
              </div>
            </div>

            <input
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Filter conversations"
              aria-label="Filter conversations"
              className="mb-4 w-full rounded-xl border border-[#193c36]/12 bg-white px-3 py-2 text-xs outline-none focus:border-[#ef806f]"
            />

            <p className="mb-3 px-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#193c36]/45">
              Conversations
            </p>
            <ConversationList
              items={visibleChats}
              activeId={activeId}
              onSelect={openConversation}
              isLoading={conversationsQuery.isPending}
              error={conversationsQuery.error}
              onRetry={conversationsQuery.refetch}
              emptyLabel={emptyLabel}
            />
          </div>

          <div className="shrink-0 border-t border-[#193c36]/10 p-4">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 text-sm text-[#193c36]/60 transition hover:text-[#193c36]"
            >
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </aside>

        <section
          className={`${listOpen ? "hidden" : "flex"} min-w-0 flex-1 flex-col md:flex`}
        >
          {activeChat ? (
            <>
              <header className="flex shrink-0 items-center justify-between border-b border-[#193c36]/10 px-4 py-4 sm:px-8">
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    onClick={() => setListOpen(true)}
                    className="-ml-1 rounded-lg p-1.5 hover:bg-[#f0efe9] md:hidden"
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <Avatar chat={activeChat} small />
                  <div className="min-w-0">
                    <h1 className="display truncate text-base font-semibold">
                      {activeChat.name}
                    </h1>
                    <p className="truncate text-xs text-[#193c36]/50">
                      {activeChat.detail}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDialog("details")}
                  className="rounded-lg p-2.5 hover:bg-[#f0efe9]"
                  aria-label="Conversation details"
                >
                  <Users size={18} />
                </button>
              </header>

              <MessageThread
                conversationId={activeChat.id}
                currentUserId={currentUserId}
                isGroup={isGroup(activeConversation)}
                namesById={namesById}
                onRetry={retry}
                onDiscard={discard}
              />
              <Composer onSend={send} />
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center px-5 py-7 text-center">
              <div className="max-w-sm">
                <MessageCircle
                  size={26}
                  className="mx-auto mb-3 text-[#193c36]/25"
                />
                <p className="mb-4 text-sm leading-relaxed text-[#193c36]/50">
                  {conversationsQuery.isPending
                    ? "Loading your conversations..."
                    : chats.length
                      ? "Pick a conversation to open it here."
                      : "Nothing here yet. Start a conversation and it will open right here."}
                </p>
                {!conversationsQuery.isPending && !chats.length && (
                  <button
                    onClick={() => setDialog("new")}
                    className="rounded-full bg-[#193c36] px-5 py-2.5 text-sm font-semibold text-[#f4f1ea] transition hover:bg-[#28544c]"
                  >
                    New conversation
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      {dialog === "new" && (
        <NewConversationDialog
          currentUserId={currentUserId}
          onClose={() => setDialog(null)}
          onCreated={openConversation}
        />
      )}
      {dialog === "details" && activeConversation && (
        <GroupPanel
          conversation={activeConversation}
          currentUserId={currentUserId}
          onClose={() => setDialog(null)}
          onLeft={() => {
            setActiveId(null);
            setListOpen(true);
          }}
        />
      )}
    </div>
  );
}

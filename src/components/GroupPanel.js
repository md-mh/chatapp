"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Crown, LogOut, Pencil, ShieldCheck, UserPlus, X } from "lucide-react";
import { chatApi } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import {
  applyConversationUpdate,
  avatarColorFor,
  conversationTitle,
  initialsOf,
  isAdmin,
  isGroup,
  participantsOf,
} from "@/lib/conversations";
import Avatar from "./Avatar";
import Modal from "./Modal";
import UserSearch from "./UserSearch";

export default function GroupPanel({
  conversation,
  currentUserId,
  onClose,
  onLeft,
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(conversation?.name ?? "");
  const [renaming, setRenaming] = useState(false);
  const [adding, setAdding] = useState(false);

  const group = isGroup(conversation);
  const members = participantsOf(conversation);
  const youAreAdmin = isAdmin(conversation, currentUserId);

  // Every management endpoint answers with the whole conversation, so the
  // cache can be updated from the response instead of refetching the list.
  const absorb = (updated) =>
    queryClient.setQueryData(queryKeys.conversations, (data) => ({
      data: applyConversationUpdate(data, updated),
    }));

  const renameMutation = useMutation({
    mutationFn: (value) => chatApi.renameGroup(conversation._id, value),
    onSuccess: (updated) => {
      absorb(updated);
      setRenaming(false);
    },
  });

  const addMutation = useMutation({
    mutationFn: (userId) => chatApi.addParticipants(conversation._id, [userId]),
    onSuccess: absorb,
  });

  const promoteMutation = useMutation({
    mutationFn: (userId) => chatApi.promoteAdmin(conversation._id, userId),
    onSuccess: absorb,
  });

  const removeMutation = useMutation({
    mutationFn: (userId) => chatApi.removeParticipant(conversation._id, userId),
    onSuccess: (updated, userId) => {
      if (userId === currentUserId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
        onLeft();
        onClose();
        return;
      }
      absorb(updated);
    },
  });

  const error =
    renameMutation.error ||
    addMutation.error ||
    promoteMutation.error ||
    removeMutation.error;

  return (
    <Modal
      title={conversationTitle(conversation)}
      subtitle={
        group
          ? `${members.length} member${members.length === 1 ? "" : "s"}`
          : conversation?.participant?.phone
      }
      onClose={onClose}
    >
      {error && <p className="mb-3 text-xs text-[#ef806f]">{error.message}</p>}

      {!group && (
        <p className="text-sm leading-relaxed text-[#193c36]/55">
          This is a direct conversation. Group tools apply to groups only.
        </p>
      )}

      {group && (
        <div className="space-y-4">
          {youAreAdmin && (
            <div>
              {renaming ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (name.trim()) renameMutation.mutate(name.trim());
                  }}
                  className="flex gap-2"
                >
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="min-w-0 flex-1 rounded-xl border border-[#193c36]/15 bg-white px-3 py-2 text-sm outline-none focus:border-[#ef806f]"
                    aria-label="Group name"
                    autoFocus
                  />
                  <button
                    disabled={!name.trim() || renameMutation.isPending}
                    className="rounded-xl bg-[#193c36] px-3 py-2 text-xs font-semibold text-[#f4f1ea] disabled:opacity-40"
                  >
                    {renameMutation.isPending ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setName(conversation.name ?? "");
                      setRenaming(false);
                    }}
                    className="rounded-xl px-2 text-[#193c36]/50"
                    aria-label="Cancel rename"
                  >
                    <X size={16} />
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setRenaming(true)}
                  className="flex items-center gap-2 text-xs font-semibold text-[#193c36]/65 transition hover:text-[#193c36]"
                >
                  <Pencil size={13} /> Rename group
                </button>
              )}
            </div>
          )}

          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#193c36]/45">
              Members
            </p>
            <div className="max-h-56 space-y-1 overflow-y-auto">
              {members.map((member) => {
                const memberIsAdmin = isAdmin(conversation, member._id);
                const isYou = member._id === currentUserId;
                return (
                  <div
                    key={member._id}
                    className="flex items-center gap-3 rounded-xl p-2"
                  >
                    <Avatar
                      chat={{
                        initials: initialsOf(member.name),
                        color: avatarColorFor(member._id),
                      }}
                      small
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-semibold">
                          {member.name}
                          {isYou && (
                            <span className="ml-1 text-xs font-normal text-[#193c36]/45">
                              you
                            </span>
                          )}
                        </span>
                        {memberIsAdmin && (
                          <Crown size={12} className="shrink-0 text-[#d7b87d]" />
                        )}
                      </span>
                      <span className="block truncate text-xs text-[#193c36]/50">
                        {member.phone}
                      </span>
                    </span>
                    {youAreAdmin && !memberIsAdmin && (
                      <button
                        type="button"
                        title="Make admin"
                        aria-label={`Make ${member.name} an admin`}
                        disabled={promoteMutation.isPending}
                        onClick={() => promoteMutation.mutate(member._id)}
                        className="rounded-lg p-1.5 text-[#193c36]/45 transition hover:bg-[#e9e8df] hover:text-[#193c36] disabled:opacity-40"
                      >
                        <ShieldCheck size={15} />
                      </button>
                    )}
                    {youAreAdmin && !isYou && (
                      <button
                        type="button"
                        title="Remove from group"
                        aria-label={`Remove ${member.name}`}
                        disabled={removeMutation.isPending}
                        onClick={() => removeMutation.mutate(member._id)}
                        className="rounded-lg p-1.5 text-[#193c36]/45 transition hover:bg-[#f6ded9] hover:text-[#ef806f] disabled:opacity-40"
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {youAreAdmin && (
            <div>
              {adding ? (
                <UserSearch
                  excludeIds={members.map((member) => member._id)}
                  busyId={addMutation.isPending ? addMutation.variables : null}
                  onSelect={(user) => addMutation.mutate(user._id)}
                  placeholder="Add someone to this group"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setAdding(true)}
                  className="flex items-center gap-2 text-xs font-semibold text-[#193c36]/65 transition hover:text-[#193c36]"
                >
                  <UserPlus size={13} /> Add members
                </button>
              )}
            </div>
          )}

          <button
            type="button"
            disabled={removeMutation.isPending}
            onClick={() => removeMutation.mutate(currentUserId)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#ef806f]/40 px-4 py-2.5 text-xs font-semibold text-[#ef806f] transition hover:bg-[#f6ded9] disabled:opacity-40"
          >
            <LogOut size={14} />
            {removeMutation.isPending ? "Leaving..." : "Leave group"}
          </button>
        </div>
      )}
    </Modal>
  );
}

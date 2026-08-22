"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as yup from "yup";
import { X } from "lucide-react";
import { chatApi } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { avatarColorFor, initialsOf } from "@/lib/conversations";
import Avatar from "./Avatar";
import Modal from "./Modal";
import UserSearch from "./UserSearch";

// The API rejects a group with fewer than three members, creator included.
const MIN_OTHERS = 2;

const groupSchema = yup.object({
  name: yup
    .string()
    .trim()
    .min(2, "Give the group a longer name")
    .required("Name the group"),
});

export default function NewConversationDialog({
  currentUserId,
  onClose,
  onCreated,
}) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("direct");
  const [picked, setPicked] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [nameError, setNameError] = useState("");

  const settle = async (conversation) => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
    const id = conversation?._id ?? conversation?.id;
    if (id) onCreated(id);
    onClose();
  };

  const directMutation = useMutation({
    mutationFn: (userId) => chatApi.startConversation(userId),
    onSuccess: settle,
  });

  const groupMutation = useMutation({
    mutationFn: ({ name, participantIds }) =>
      chatApi.createGroup(name, participantIds),
    onSuccess: settle,
  });

  const togglePick = (user) =>
    setPicked((current) =>
      current.some((item) => item._id === user._id)
        ? current.filter((item) => item._id !== user._id)
        : [...current, user],
    );

  const submitGroup = async (event) => {
    event.preventDefault();
    try {
      const { name } = await groupSchema.validate({ name: groupName });
      setNameError("");
      groupMutation.mutate({
        name,
        participantIds: picked.map((user) => user._id),
      });
    } catch (validationError) {
      setNameError(validationError.message);
    }
  };

  const busy = directMutation.isPending || groupMutation.isPending;
  const error = directMutation.error || groupMutation.error;

  return (
    <Modal
      title="New conversation"
      subtitle="Start a direct chat or build a group."
      onClose={onClose}
    >
      <div className="mb-4 flex gap-1 rounded-xl bg-[#e9e8df] p-1">
        {[
          ["direct", "Direct"],
          ["group", "Group"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${
              tab === key ? "bg-white shadow-sm" : "text-[#193c36]/60"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="mb-3 text-xs text-[#ef806f]">{error.message}</p>}

      {tab === "direct" ? (
        <UserSearch
          excludeIds={[currentUserId]}
          busyId={busy ? directMutation.variables : null}
          onSelect={(user) => directMutation.mutate(user._id)}
          placeholder="Who do you want to talk to?"
        />
      ) : (
        <form onSubmit={submitGroup}>
          <label className="block text-xs text-[#193c36]/60">
            Group name
            <input
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#193c36]/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#ef806f]"
              placeholder="Studio North"
            />
            {nameError && (
              <span className="mt-1.5 block text-[#ef806f]">{nameError}</span>
            )}
          </label>

          {picked.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {picked.map((user) => (
                <button
                  key={user._id}
                  type="button"
                  onClick={() => togglePick(user)}
                  className="flex items-center gap-1.5 rounded-full bg-[#e0f1e8] py-1 pl-1 pr-2.5 text-xs font-semibold"
                >
                  <Avatar
                    chat={{
                      initials: initialsOf(user.name),
                      color: avatarColorFor(user._id),
                    }}
                    small
                  />
                  {user.name}
                  <X size={12} />
                </button>
              ))}
            </div>
          )}

          <div className="mt-3">
            <UserSearch
              excludeIds={[currentUserId]}
              selectedIds={picked.map((user) => user._id)}
              onSelect={togglePick}
              placeholder="Add members"
            />
          </div>

          <p className="mt-3 text-xs text-[#193c36]/45">
            {picked.length < MIN_OTHERS
              ? `Pick at least ${MIN_OTHERS} people — a group needs three members.`
              : `${picked.length + 1} members including you.`}
          </p>

          <button
            disabled={busy || picked.length < MIN_OTHERS}
            className="mt-4 w-full rounded-xl bg-[#193c36] px-4 py-3 text-sm font-semibold text-[#f4f1ea] transition hover:bg-[#28544c] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {groupMutation.isPending ? "Creating..." : "Create group"}
          </button>
        </form>
      )}
    </Modal>
  );
}

"use client";

import { useDeferredValue, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Search } from "lucide-react";
import { chatApi } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { avatarColorFor, initialsOf } from "@/lib/conversations";
import { isPhoneQuery } from "@/lib/search";
import Avatar from "./Avatar";

export default function UserSearch({
  excludeIds = [],
  selectedIds = [],
  onSelect,
  placeholder = "Search by name or phone",
  busyId = null,
}) {
  const [term, setTerm] = useState("");
  const deferred = useDeferredValue(term.trim());

  const query = useQuery({
    queryKey: queryKeys.users(deferred),
    queryFn: () => chatApi.searchUsers(deferred),
    // An empty q returns every user on the deployment, so wait for a character.
    enabled: deferred.length > 0,
  });

  const excluded = new Set(excludeIds);
  const selected = new Set(selectedIds);
  const results = (Array.isArray(query.data) ? query.data : []).filter(
    (user) => user?._id && !excluded.has(user._id),
  );

  return (
    <div>
      <div className="flex items-center gap-2 rounded-xl border border-[#193c36]/15 bg-white px-3 py-2.5 focus-within:border-[#ef806f]">
        <Search size={16} className="shrink-0 text-[#193c36]/40" />
        <input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          placeholder={placeholder}
          autoFocus
        />
      </div>
      <div className="mt-3 max-h-64 space-y-1 overflow-y-auto">
        {!deferred && (
          <p className="px-1 py-3 text-xs text-[#193c36]/45">
            Start typing to find someone.
          </p>
        )}
        {deferred && query.isPending && (
          <p className="px-1 py-3 text-xs text-[#193c36]/45">Searching...</p>
        )}
        {deferred && query.error && (
          <p className="px-1 py-3 text-xs text-[#ef806f]">
            {query.error.message}
          </p>
        )}
        {deferred && !query.isPending && !query.error && !results.length && (
          <p className="px-1 py-3 text-xs leading-relaxed text-[#193c36]/45">
            Nobody matches “{deferred}”.
            {isPhoneQuery(deferred) &&
              " The directory only indexes names, so a number is matched against the first page of users — try their name instead."}
          </p>
        )}
        {results.map((user) => (
          <button
            key={user._id}
            type="button"
            disabled={busyId === user._id}
            onClick={() => onSelect(user)}
            className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition hover:bg-[#f0efe9] disabled:opacity-50"
          >
            <Avatar
              chat={{
                initials: initialsOf(user.name),
                color: avatarColorFor(user._id),
              }}
              small
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">
                {user.name}
              </span>
              <span className="block truncate text-xs text-[#193c36]/50">
                {user.phone}
              </span>
            </span>
            {busyId === user._id ? (
              <span className="text-[10px] text-[#193c36]/45">Adding...</span>
            ) : (
              selected.has(user._id) && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#193c36] text-[#f4f1ea]">
                  <Check size={12} />
                </span>
              )
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

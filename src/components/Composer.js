"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";

const MAX_ROWS_HEIGHT = 132;

export default function Composer({ onSend, disabled = false }) {
  const [text, setText] = useState("");
  const field = useRef(null);

  // Grow with the draft up to a ceiling, then scroll inside the field.
  useEffect(() => {
    const element = field.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, MAX_ROWS_HEIGHT)}px`;
  }, [text]);

  const submit = (event) => {
    event?.preventDefault();
    // Whitespace-only drafts are not messages; the button is disabled and the
    // guard repeats here because Enter bypasses the button entirely.
    if (!text.trim() || disabled) return;
    if (onSend(text)) setText("");
  };

  const onKeyDown = (event) => {
    // Enter sends, Shift+Enter starts a new line — the shape people expect
    // from a chat box rather than a form field.
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <form
      onSubmit={submit}
      className="shrink-0 border-t border-[#193c36]/10 px-5 py-4 sm:px-12"
    >
      <div className="mx-auto max-w-2xl">
        <div className="flex items-end gap-3 rounded-2xl border border-[#193c36]/15 bg-[#fbfaf6] p-2 pl-4 focus-within:border-[#ef806f]">
          <textarea
            ref={field}
            rows={1}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={onKeyDown}
            className="min-w-0 flex-1 resize-none bg-transparent py-2 text-sm outline-none"
            placeholder="Write a message..."
            aria-label="Message"
          />
          <button
            disabled={!text.trim() || disabled}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ef806f] text-[#193c36] transition hover:bg-[#f59a8b] disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Send message"
          >
            <ArrowUpRight size={19} />
          </button>
        </div>
        <p className="mt-1.5 px-1 text-[10px] text-[#193c36]/35">
          Enter to send · Shift + Enter for a new line
        </p>
      </div>
    </form>
  );
}

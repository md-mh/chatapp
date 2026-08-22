"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";

// Most chat UIs claim they "auto-scroll". The interesting part is what they do
// when you have scrolled up to read something — so rather than assert it, this
// panel lets the visitor feel both behaviours side by side.
const PIN_THRESHOLD = 40;

const HISTORY = [
  { mine: false, text: "Morning — did the revised deck land?" },
  { mine: true, text: "Yes, opening it now." },
  {
    mine: false,
    text: "Slide four is the one I keep going back and forth on.",
  },
  { mine: true, text: "The pricing table?" },
  { mine: false, text: "That one. It reads heavy." },
  { mine: true, text: "Agreed. I'd cut the third column entirely." },
  { mine: false, text: "Then the comparison does the work on its own." },
  { mine: true, text: "Exactly. Less to defend in the room." },
  { mine: false, text: "Let me redraw it and send it back." },
  { mine: true, text: "No rush — the review isn't until Thursday." },
];

const INCOMING = [
  "One more thought on slide four...",
  "Should we keep the footnote?",
  "I think it earns its space.",
  "Rafi is pulling the numbers now.",
  "Sending the redraw in five.",
  "Okay — attached.",
];

export default function ScrollBehaviourDemo() {
  const [mode, setMode] = useState("chaton");
  const [messages, setMessages] = useState(HISTORY);
  const [unread, setUnread] = useState(0);
  const [atBottom, setAtBottom] = useState(true);
  const scroller = useRef(null);
  const pinned = useRef(true);
  const cursor = useRef(0);

  const reset = () => {
    setMessages(HISTORY);
    setUnread(0);
    cursor.current = 0;
    pinned.current = true;
    setAtBottom(true);
    const element = scroller.current;
    if (element) element.scrollTop = element.scrollHeight;
  };

  // Switching modes starts the comparison from the same place both times.
  const chooseMode = (next) => {
    setMode(next);
    reset();
  };

  const onScroll = () => {
    const element = scroller.current;
    if (!element) return;
    const distance =
      element.scrollHeight - element.scrollTop - element.clientHeight;
    pinned.current = distance <= PIN_THRESHOLD;
    setAtBottom(pinned.current);
    if (pinned.current) setUnread(0);
  };

  // The whole point of the demo lives here: naive always yanks you down,
  // Chaton only follows when you were already at the bottom.
  useLayoutEffect(() => {
    const element = scroller.current;
    if (!element) return;
    if (mode === "naive" || pinned.current) {
      element.scrollTop = element.scrollHeight;
      setAtBottom(true);
      setUnread(0);
    }
  }, [messages, mode]);

  const receive = () => {
    const text = INCOMING[cursor.current % INCOMING.length];
    cursor.current += 1;
    setMessages((current) => [...current, { mine: false, text }]);
    if (mode === "chaton" && !pinned.current) setUnread((count) => count + 1);
  };

  const jump = () => {
    const element = scroller.current;
    if (!element) return;
    element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
    pinned.current = true;
    setAtBottom(true);
    setUnread(0);
  };

  return (
    <div className="overflow-hidden rounded-[26px] border border-[#193c36]/10 bg-white shadow-xl shadow-[#193c36]/5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#193c36]/10 p-4">
        <div className="flex rounded-xl bg-[#e9e8df] p-1">
          {[
            ["naive", "Naive auto-scroll"],
            ["chaton", "How Chaton does it"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => chooseMode(key)}
              aria-pressed={mode === key}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                mode === key ? "bg-white shadow-sm" : "text-[#193c36]/55"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={receive}
          className="rounded-full bg-[#193c36] px-4 py-2 text-xs font-semibold text-[#f4f1ea] transition hover:bg-[#28544c]"
        >
          Receive a message
        </button>
      </div>

      <div className="relative">
        <div
          ref={scroller}
          onScroll={onScroll}
          className="h-72 overflow-y-auto bg-[#fbfaf6] px-4 py-5"
        >
          <div className="space-y-3">
            {messages.map((item, index) => (
              <div
                key={index}
                className={`flex ${item.mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    item.mine
                      ? "rounded-br-sm bg-[#193c36] text-[#f4f1ea]"
                      : "rounded-bl-sm bg-[#e8eee7] text-[#193c36]"
                  }`}
                >
                  {item.text}
                </div>
              </div>
            ))}
          </div>
        </div>

        {mode === "chaton" && !atBottom && (
          <button
            type="button"
            onClick={jump}
            className={`absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold shadow-lg transition ${
              unread
                ? "bg-[#ef806f] text-[#193c36]"
                : "bg-white text-[#193c36]/70"
            }`}
          >
            {unread
              ? `${unread} new message${unread === 1 ? "" : "s"}`
              : "Jump to latest"}
            <ArrowDown size={13} />
          </button>
        )}
      </div>

      <p className="border-t border-[#193c36]/10 p-4 text-xs leading-relaxed text-[#193c36]/60">
        {mode === "naive" ? (
          <>
            <strong className="text-[#193c36]">Try it:</strong> scroll up inside
            the panel, then receive a message. The view snaps to the bottom and
            takes the sentence you were reading with it.
          </>
        ) : (
          <>
            <strong className="text-[#193c36]">Try it:</strong> scroll up, then
            receive a message. You stay exactly where you were, and a counter
            tells you what arrived. Scroll back down and it clears itself.
          </>
        )}
      </p>
    </div>
  );
}

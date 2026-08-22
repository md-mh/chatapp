"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle } from "lucide-react";
import Avatar from "@/components/Avatar";
import { useReducedMotion } from "@/lib/useReducedMotion";

const SCRIPT = [
  { mine: false, text: "I pulled together three directions for the launch story.", at: "09:35" },
  { mine: true, text: "I keep coming back to the quieter one. It feels more like us.", at: "09:38" },
  { mine: false, text: "Same. Less noise, more room for the good stuff.", at: "09:40" },
  { mine: true, text: "The quiet version feels right.", at: "09:42" },
];

const STEP_MS = 1400;
const TYPING_MS = 700;

// The hero shows the real thing arriving rather than a static screenshot: the
// thread plays itself out once, with the typing indicator that precedes it.
export default function HeroPreview() {
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(1);
  const [typing, setTyping] = useState(false);
  const timers = useRef([]);

  // Someone who asked for less motion gets the finished thread, not a replay.
  const visible = reduceMotion ? SCRIPT.length : step;

  useEffect(() => {
    if (reduceMotion) return undefined;

    for (let index = 1; index < SCRIPT.length; index += 1) {
      const arrivesAt = index * STEP_MS;
      timers.current.push(
        setTimeout(() => setTyping(true), arrivesAt - TYPING_MS),
        setTimeout(() => {
          setTyping(false);
          setStep(index + 1);
        }, arrivesAt),
      );
    }
    const snapshot = timers.current;
    return () => snapshot.forEach(clearTimeout);
  }, [reduceMotion]);

  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="absolute -right-3 -top-4 z-10 flex items-center gap-2 rounded-full bg-[#ef806f] px-4 py-2 text-xs font-bold text-[#193c36] shadow-lg shadow-[#ef806f]/25">
        <span className="pulse-dot h-2 w-2 rounded-full bg-[#193c36]" />
        Live
      </div>

      <div className="overflow-hidden rounded-[26px] border border-[#193c36]/10 bg-[#fbfaf6] shadow-2xl shadow-[#193c36]/15">
        <div className="flex items-center justify-between border-b border-[#193c36]/10 p-5">
          <div className="flex items-center gap-3">
            <Avatar chat={{ initials: "MC", color: "#f1a08a" }} small />
            <div>
              <p className="text-sm font-semibold">Maya Chen</p>
              <p className="text-xs text-[#193c36]/45">
                {typing ? "typing…" : "Design lead · Active now"}
              </p>
            </div>
          </div>
          <MessageCircle size={18} className="text-[#ef806f]" />
        </div>

        <div className="min-h-[280px] space-y-4 p-5">
          <p className="text-center text-[10px] font-bold uppercase tracking-[.18em] text-[#193c36]/30">
            Today
          </p>
          {SCRIPT.slice(0, visible).map((item, index) => (
            <div
              key={index}
              className={`rise flex ${item.mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`flex max-w-[82%] flex-col ${item.mine ? "items-end" : "items-start"}`}
              >
                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    item.mine
                      ? "rounded-br-sm bg-[#193c36] text-[#f4f1ea]"
                      : "rounded-bl-sm bg-[#e8eee7]"
                  }`}
                >
                  {item.text}
                </div>
                <span className="mt-1 px-1 text-[10px] text-[#193c36]/35">
                  {item.at}
                </span>
              </div>
            </div>
          ))}
          {typing && (
            <div className="flex justify-start">
              <div className="flex gap-1 rounded-2xl rounded-bl-sm bg-[#e8eee7] px-4 py-3.5">
                {[0, 1, 2].map((dot) => (
                  <span
                    key={dot}
                    className="pulse-dot h-1.5 w-1.5 rounded-full bg-[#193c36]/40"
                    style={{ animationDelay: `${dot * 0.2}s` }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="absolute -bottom-7 -left-7 hidden rounded-2xl bg-[#193c36] p-4 text-[#f4f1ea] shadow-xl sm:block">
        <p className="display text-2xl font-semibold">1:1</p>
        <p className="text-xs text-white/55">or a room for everyone</p>
      </div>
    </div>
  );
}

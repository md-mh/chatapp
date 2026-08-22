"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  MessagesSquare,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import HeroPreview from "@/components/landing/HeroPreview";
import Reveal from "@/components/landing/Reveal";
import ScrollBehaviourDemo from "@/components/landing/ScrollBehaviourDemo";
import { useHydrated, useSession } from "@/lib/session";

const FEATURES = [
  {
    icon: Radio,
    title: "Live without a refresh",
    body: "Messages arrive over a single shared socket. Send optimistically, and if the request drops, the bubble stays put with a retry rather than vanishing.",
  },
  {
    icon: Users,
    title: "Rooms, not just threads",
    body: "Start one-to-one from a search, or gather a group. Rename it, add people, hand over admin, or leave — everyone sees the change as it happens.",
  },
  {
    icon: Search,
    title: "Find people by name or number",
    body: "Search finds anyone on the service. A number nobody has used yet simply becomes a new account the first time it signs in.",
  },
  {
    icon: ShieldCheck,
    title: "Honest about its state",
    body: "Loading, empty, offline, and failed all look different from each other, because a spinner that never resolves is worse than an error.",
  },
];

const STEPS = [
  {
    number: "01",
    title: "Sign in with a number",
    body: "A name and a phone number. No password to forget, no confirmation email to wait for.",
  },
  {
    number: "02",
    title: "Find someone",
    body: "Search by name or number, then open a direct thread — or pick a few people and make it a group.",
  },
  {
    number: "03",
    title: "Say something",
    body: "History loads a page at a time, the newest message is where you left it, and everything else keeps up on its own.",
  },
];

export default function LandingPage() {
  const session = useSession();
  const hydrated = useHydrated();
  const signedIn = hydrated && Boolean(session.token);

  const primaryHref = signedIn ? "/chat" : "/login";
  const primaryLabel = signedIn
    ? "Open your workspace"
    : "Start a conversation";

  return (
    <main className="grain min-h-screen overflow-hidden bg-[#dcefe4]">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 sm:px-10">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ef806f] text-[#193c36]">
            <Sparkles size={17} />
          </span>
          <span className="display text-lg font-semibold">chaton</span>
        </Link>
        <Link
          href={primaryHref}
          className="rounded-full border border-[#193c36]/20 px-5 py-2.5 text-sm font-semibold transition hover:bg-[#193c36] hover:text-[#f4f1ea]"
        >
          {signedIn ? "Open app" : "Sign in"}
          <ArrowUpRight className="ml-1 inline" size={15} />
        </Link>
      </nav>

      <section className="mx-auto grid max-w-7xl items-center gap-14 px-6 pb-16 pt-10 sm:px-10 lg:grid-cols-[1.05fr_.95fr] lg:gap-16 lg:pb-24 lg:pt-16">
        <div className="rise">
          <p className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-[#ef806f]">
            <span className="pulse-dot h-2 w-2 rounded-full bg-[#ef806f]" />A
            calmer way to connect
          </p>
          <h1 className="display max-w-3xl text-5xl font-semibold leading-[.98] tracking-tight sm:text-7xl">
            Make space for <span className="text-[#ef806f]">better</span>{" "}
            conversations.
          </h1>
          <p className="mt-7 max-w-lg text-lg leading-relaxed text-[#193c36]/65">
            Chaton is a real-time chat workspace built around one idea: the
            software should stay out of the way of what you are saying.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href={primaryHref}
              className="rounded-full bg-[#193c36] px-6 py-3.5 text-sm font-semibold text-[#f4f1ea] transition hover:bg-[#28544c]"
            >
              {primaryLabel}
              <ArrowUpRight className="ml-2 inline" size={17} />
            </Link>
            <a
              href="#the-detail"
              className="rounded-full border border-[#193c36]/20 px-6 py-3.5 text-sm font-semibold transition hover:bg-white/60"
            >
              See the detail we obsessed over
            </a>
          </div>
        </div>
        <div className="rise delay-2">
          <HeroPreview />
        </div>
      </section>

      {/* The showpiece: rather than claim the scroll behaviour is thoughtful,
          let the visitor break the naive version themselves. */}
      <section
        id="the-detail"
        className="scroll-mt-8 border-t border-[#193c36]/10 bg-[#f4f1ea] px-6 py-20 sm:px-10"
      >
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.85fr_1.15fr] lg:gap-16">
          <Reveal>
            <p className="mb-4 text-xs font-bold uppercase tracking-[.2em] text-[#ef806f]">
              The detail nobody demos
            </p>
            <h2 className="display text-4xl font-semibold leading-tight sm:text-5xl">
              Scrolling up should not be punished.
            </h2>
            <p className="mt-6 text-base leading-relaxed text-[#193c36]/65">
              Every chat app auto-scrolls. Almost none of them ask what happens
              when you have scrolled back to re-read something and a new message
              lands. Most yank you to the bottom mid-sentence.
            </p>
            <p className="mt-4 text-base leading-relaxed text-[#193c36]/65">
              Chaton follows the conversation only while you are already at the
              bottom. Move away and it holds your place, counts what arrived,
              and waits for you to ask. Load older history and the page you were
              reading stays under your eyes instead of jumping.
            </p>
            <p className="mt-6 text-sm font-semibold text-[#193c36]">
              Flip the switch and try to break it →
            </p>
          </Reveal>
          <Reveal delay={120}>
            <ScrollBehaviourDemo />
          </Reveal>
        </div>
      </section>

      <section className="border-t border-[#193c36]/10 px-6 py-20 sm:px-10">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <h2 className="display max-w-2xl text-4xl font-semibold leading-tight sm:text-5xl">
              Everything you would expect, built like it matters.
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {FEATURES.map((feature, index) => (
              <Reveal
                key={feature.title}
                delay={index * 90}
                className="rounded-[22px] border border-[#193c36]/10 bg-white/70 p-7 transition hover:border-[#ef806f]/40 hover:bg-white"
              >
                <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-full bg-[#dcefe4] text-[#193c36]">
                  <feature.icon size={19} />
                </span>
                <h3 className="display mb-2 text-xl font-semibold">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-[#193c36]/60">
                  {feature.body}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[#193c36]/10 bg-[#193c36] px-6 py-20 text-[#f4f1ea] sm:px-10">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <p className="mb-4 text-xs font-bold uppercase tracking-[.2em] text-[#b9e7d3]">
              Three steps
            </p>
            <h2 className="display max-w-xl text-4xl font-semibold leading-tight sm:text-5xl">
              You are talking in under a minute.
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <Reveal key={step.number} delay={index * 100}>
                <p className="display mb-3 text-5xl font-semibold text-[#ef806f]">
                  {step.number}
                </p>
                <h3 className="mb-2 text-lg font-semibold">{step.title}</h3>
                <p className="text-sm leading-relaxed text-white/60">
                  {step.body}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 sm:px-10">
        <Reveal className="mx-auto max-w-3xl text-center">
          <MessagesSquare size={28} className="mx-auto mb-5 text-[#ef806f]" />
          <h2 className="display text-4xl font-semibold leading-tight sm:text-5xl">
            Say the thing you have been meaning to say.
          </h2>
          <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-[#193c36]/60">
            A name and a number is the whole sign-up. There is nothing else to
            configure.
          </p>
          <Link
            href={primaryHref}
            className="mt-8 inline-flex items-center rounded-full bg-[#193c36] px-7 py-4 text-sm font-semibold text-[#f4f1ea] transition hover:bg-[#28544c]"
          >
            {primaryLabel}
            <ArrowUpRight className="ml-2" size={17} />
          </Link>
        </Reveal>
      </section>

      <footer className="border-t border-[#193c36]/10 px-6 py-8 sm:px-10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 text-sm text-[#193c36]/55">
          <span className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#ef806f] text-[#193c36]">
              <Sparkles size={12} />
            </span>
            Chaton — a frontend assignment build
          </span>
          <span className="flex flex-wrap gap-5">
            <Link href="/login" className="transition hover:text-[#193c36]">
              Sign in
            </Link>
            <Link href="/chat" className="transition hover:text-[#193c36]">
              Workspace
            </Link>
            <a
              href="https://frontend-task-chatapp.onrender.com/docs/"
              target="_blank"
              rel="noreferrer"
              className="transition hover:text-[#193c36]"
            >
              API reference
            </a>
          </span>
        </div>
      </footer>
    </main>
  );
}

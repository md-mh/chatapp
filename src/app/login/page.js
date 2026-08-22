"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import * as yup from "yup";
import { ArrowLeft, ArrowUpRight, Sparkles } from "lucide-react";
import { chatApi } from "@/lib/api";
import { signIn, useHydrated, useSession } from "@/lib/session";

// The API registers any unseen phone number, so this is the only gate: a name
// to be known by and a number to be reached on.
const loginSchema = yup.object({
  name: yup
    .string()
    .trim()
    .min(2, "Use at least two characters")
    .required("Tell us your name"),
  phone: yup
    .string()
    .trim()
    .matches(/^\+?[\d\s-]{6,20}$/, "Enter a valid phone number")
    .required("A phone number is required"),
});

const fieldClass =
  "mt-2 w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3.5 text-[#f4f1ea] outline-none placeholder:text-white/35 focus:border-[#ef806f]";

export default function LoginPage() {
  const router = useRouter();
  const session = useSession();
  const hydrated = useHydrated();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState({});

  // Someone who already has a token never needs to see this screen.
  useEffect(() => {
    if (hydrated && session.token) router.replace("/chat");
  }, [hydrated, session.token, router]);

  const loginMutation = useMutation({
    mutationFn: async (values) => {
      const data = await chatApi.login(values);
      if (!data?.token) throw new Error("Login did not return a token");
      return data;
    },
    onSuccess: (data) => {
      signIn(data.token, data.user);
      router.replace("/chat");
    },
  });

  const submit = async (event) => {
    event.preventDefault();
    try {
      const values = await loginSchema.validate(
        { name, phone },
        { abortEarly: false },
      );
      setErrors({});
      loginMutation.mutate(values);
    } catch (validationError) {
      const next = {};
      for (const issue of validationError.inner ?? [])
        if (issue.path && !next[issue.path]) next[issue.path] = issue.message;
      setErrors(next);
    }
  };

  return (
    <main className="grain flex min-h-screen items-center justify-center bg-[#dcefe4] px-5 py-10">
      <div className="rise w-full max-w-md rounded-[28px] bg-[#193c36] p-8 text-[#f4f1ea] shadow-2xl shadow-[#193c36]/20 sm:p-10">
        <div className="mb-10 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ef806f] text-[#193c36]">
              <Sparkles size={17} />
            </span>
            <span className="display text-lg font-semibold">chaton</span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1 text-xs text-white/45 transition hover:text-white/80"
          >
            <ArrowLeft size={13} /> Back
          </Link>
        </div>

        <p className="mb-3 text-sm uppercase tracking-[.2em] text-[#b9e7d3]">
          Your conversations, considered
        </p>
        <h1 className="display mb-8 text-4xl font-semibold leading-tight">
          A little room
          <br />
          to say more.
        </h1>

        <form className="space-y-3" onSubmit={submit} noValidate>
          <label className="block text-xs text-[#b9e7d3]">
            Your name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={Boolean(errors.name)}
              autoComplete="name"
              className={fieldClass}
              placeholder="Maya Chen"
            />
            {errors.name && (
              <span className="mt-1.5 block text-[#f8b3a6]">{errors.name}</span>
            )}
          </label>

          <label className="block text-xs text-[#b9e7d3]">
            Phone number
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              aria-invalid={Boolean(errors.phone)}
              autoComplete="tel"
              inputMode="tel"
              className={fieldClass}
              placeholder="+1 555 123 4567"
            />
            {errors.phone && (
              <span className="mt-1.5 block text-[#f8b3a6]">
                {errors.phone}
              </span>
            )}
          </label>

          {loginMutation.isError && (
            <p role="alert" className="text-xs text-[#f8b3a6]">
              {loginMutation.error.message}
            </p>
          )}

          <button
            disabled={loginMutation.isPending}
            className="mt-4 flex w-full items-center justify-between rounded-xl bg-[#ef806f] px-5 py-4 font-semibold text-[#193c36] transition hover:bg-[#f59a8b] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loginMutation.isPending ? "Signing in..." : "Enter Chaton"}
            <ArrowUpRight size={19} />
          </button>
        </form>

        <p className="mt-7 text-center text-xs leading-relaxed text-white/45">
          There is no separate sign-up. A number we have not seen before becomes
          a new account automatically.
        </p>
      </div>
    </main>
  );
}

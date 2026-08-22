import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <h1 className="text-4xl font-bold text-[#193c36] dark:text-[#f4f1ea]">
        Welcome to ChatOn!
      </h1>
      <p className="mt-4 text-lg text-[#193c36]/70 dark:text-[#f4f1ea]/70">
        Your ultimate chat application for seamless communication.
      </p>
    </div>
  );
}

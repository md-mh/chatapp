export default function Avatar({ chat, small = false }) {
  return (
    <div
      className={`${small ? "h-8 w-8 text-[10px]" : "h-11 w-11 text-xs"} flex shrink-0 items-center justify-center rounded-full font-bold text-[#193c36]`}
      style={{ background: chat.color }}
    >
      {chat.initials}
    </div>
  );
}

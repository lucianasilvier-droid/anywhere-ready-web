const FALLBACK = { label: "—", cls: "bg-white/8 text-white/60 border-white/15" };

export default function StatusPill({ map, value, label }) {
  const conf = map?.[value] || FALLBACK;
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10.5px] font-semibold ${conf.cls}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label || conf.label}
    </span>
  );
}
export default function StatCard({ icon: Icon, label, value, hint, accent = "#ffc24a" }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-semibold uppercase leading-tight tracking-wider text-white/40">
          {label}
        </p>
        {Icon && (
          <span
            className="grid h-8 w-8 place-items-center rounded-lg"
            style={{ backgroundColor: `${accent}1f`, color: accent }}
          >
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <p className="mt-2 font-heading text-2xl font-extrabold text-white">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-white/35">{hint}</p>}
    </div>
  );
}
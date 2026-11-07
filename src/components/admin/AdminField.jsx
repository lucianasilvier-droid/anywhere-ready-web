export default function AdminField({
  label,
  value,
  onChange,
  type = "text",
  options,
  textarea,
  placeholder,
  hint,
  className = "",
  step,
}) {
  const base =
    "mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[12.5px] text-white placeholder:text-white/25 focus:border-primary/40 focus:outline-none";
  return (
    <label className={`block ${className}`}>
      <span className="text-[10.5px] font-semibold uppercase tracking-wider text-white/40">{label}</span>
      {options ? (
        <select value={value} onChange={onChange} className={`${base} bg-[#0d1729]`}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : textarea ? (
        <textarea rows={textarea === true ? 3 : textarea} value={value} onChange={onChange} placeholder={placeholder} className={base} />
      ) : (
        <input type={type} step={step} value={value} onChange={onChange} placeholder={placeholder} className={base} />
      )}
      {hint && <span className="mt-1 block text-[10.5px] leading-relaxed text-white/25">{hint}</span>}
    </label>
  );
}
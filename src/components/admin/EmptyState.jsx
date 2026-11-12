export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-6 py-12 text-center">
      {Icon && <Icon className="mx-auto h-8 w-8 text-white/20" />}
      <p className="mt-3 text-sm font-semibold text-white">{title}</p>
      {description && (
        <p className="mx-auto mt-1 max-w-sm text-[12.5px] leading-relaxed text-white/45">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
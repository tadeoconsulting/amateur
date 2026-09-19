export function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-3 mb-8">
      <span className="font-heading text-sm font-semibold text-text-primary">
        {current} de {total}
      </span>
      <div className="flex flex-1 gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full ${
              i < current ? "bg-surface-secondary" : "bg-brand-300"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

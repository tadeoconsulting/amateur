"use client";

export function CategoryTabs({
  categories,
  active,
  onChange,
}: {
  categories: string[];
  active: string;
  onChange: (category: string) => void;
}) {
  return (
    <div className="flex gap-2">
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          className={`rounded border px-4 py-2 font-heading text-xs font-semibold transition-all active:scale-[0.97] ${
            active === cat
              ? "border-border-primary bg-brand-900 text-text-invert"
              : "border-border-primary bg-transparent text-text-primary hover:bg-brand-300"
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}

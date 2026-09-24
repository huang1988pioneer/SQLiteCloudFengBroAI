"use client";

export type FilterChipItem = {
  key: string;
  label: string;
  count: number;
};

type Props = {
  label: string;
  items: FilterChipItem[];
  active: string;
  onChange: (key: string) => void;
};

export function FilterChips({ label, items, active, onChange }: Props) {
  return (
    <div className="filter-chips" role="group" aria-label={label}>
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className={`filter-chip${active === item.key ? " active" : ""}`}
          aria-pressed={active === item.key}
          onClick={() => onChange(item.key)}
          disabled={item.count === 0 && item.key !== "all" && active !== item.key}
        >
          <span>{item.label}</span>
          <b>{item.count}</b>
        </button>
      ))}
    </div>
  );
}

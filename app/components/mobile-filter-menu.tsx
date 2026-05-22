"use client";

import { useEffect, useRef } from "react";

export type MobileFilterOption = {
  label: string;
  value: string;
};

type MobileFilterMenuProps = {
  label: string;
  onSelect: (value: string) => void;
  options: MobileFilterOption[];
  selectedValue: string;
};

export default function MobileFilterMenu({
  label,
  onSelect,
  options,
  selectedValue,
}: MobileFilterMenuProps) {
  const menuRef = useRef<HTMLDetailsElement>(null);
  const selectedOption =
    options.find((option) => option.value === selectedValue) ?? options[0];

  useEffect(() => {
    const closeMenu = (event: PointerEvent) => {
      const menu = menuRef.current;

      if (menu && !menu.contains(event.target as Node)) {
        menu.removeAttribute("open");
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        menuRef.current?.removeAttribute("open");
      }
    };

    document.addEventListener("pointerdown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <div className="block md:hidden">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </span>
      <details ref={menuRef} className="group relative z-[70]">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-full border border-yellow-400/55 bg-[#020617] px-4 text-sm font-black text-yellow-300 shadow-inner shadow-black/30 outline-none transition hover:border-yellow-300 hover:bg-yellow-400/10 hover:text-yellow-200 [&::-webkit-details-marker]:hidden">
          <span className="truncate">{selectedOption?.label ?? "Select"}</span>
          <span aria-hidden="true" className="transition group-open:rotate-180">
            ▾
          </span>
        </summary>
        <div className="absolute left-0 right-0 z-[90] mt-2 grid max-h-80 gap-1 overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 p-2 shadow-2xl shadow-black/60">
          {options.map((option) => {
            const isSelected = option.value === selectedValue;

            return (
              <button
                key={option.value}
                type="button"
                onClick={(event) => {
                  onSelect(option.value);
                  event.currentTarget
                    .closest("details")
                    ?.removeAttribute("open");
                }}
                className={`rounded-full border px-3 py-2 text-left text-sm font-black transition ${
                  isSelected
                    ? "border-yellow-400/60 bg-yellow-400/10 text-yellow-300"
                    : "border-transparent text-slate-200 hover:bg-yellow-400/10 hover:text-yellow-300"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </details>
    </div>
  );
}

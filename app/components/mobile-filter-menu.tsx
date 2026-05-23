"use client";

import { useEffect, useRef, useState } from "react";

export type MobileFilterOption = {
  label: string;
  value: string;
};

type MobileFilterMenuProps = {
  className?: string;
  label: string;
  labelClassName?: string;
  menuClassName?: string;
  onSelect: (value: string) => void;
  options: MobileFilterOption[];
  selectedValue: string;
  summaryClassName?: string;
};

export default function MobileFilterMenu({
  className,
  label,
  labelClassName,
  menuClassName,
  onSelect,
  options,
  selectedValue,
  summaryClassName,
}: MobileFilterMenuProps) {
  const menuRef = useRef<HTMLDetailsElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption =
    options.find((option) => option.value === selectedValue) ?? options[0];

  useEffect(() => {
    const closeMenu = (event: PointerEvent) => {
      const menu = menuRef.current;

      if (menu && !menu.contains(event.target as Node)) {
        menu.removeAttribute("open");
        setIsOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        menuRef.current?.removeAttribute("open");
        setIsOpen(false);
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
    <div
      className={className ?? "relative z-[400] block md:hidden"}
      style={isOpen ? { zIndex: 1200 } : undefined}
    >
      <span
        className={
          labelClassName ??
          "mb-1 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-400"
        }
      >
        {label}
      </span>
      <details
        ref={menuRef}
        className="group relative z-[500]"
        onToggle={(event) => setIsOpen(event.currentTarget.open)}
      >
        <summary
          className={
            summaryClassName ??
            "flex min-h-9 cursor-pointer list-none items-center justify-between gap-2 rounded-full border border-yellow-400/55 bg-[#020617] px-3 text-xs font-black text-yellow-300 shadow-inner shadow-black/30 outline-none transition hover:border-yellow-300 hover:bg-yellow-400/10 hover:text-yellow-200 sm:min-h-10 sm:text-sm [&::-webkit-details-marker]:hidden"
          }
        >
          <span className="truncate">{selectedOption?.label ?? "Select"}</span>
          <span aria-hidden="true" className="transition group-open:rotate-180">
            ▾
          </span>
        </summary>
        <div
          className={
            menuClassName ??
            "absolute left-0 right-0 z-[999] mt-1.5 grid max-h-60 gap-1 overflow-y-auto rounded-2xl border border-slate-700 bg-[#020617]/95 p-1.5 shadow-2xl shadow-black/70 backdrop-blur-xl"
          }
        >
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
                  setIsOpen(false);
                }}
                className={`rounded-full border px-3 py-1.5 text-left text-sm font-black transition ${
                  isSelected
                    ? "border-yellow-400/70 bg-yellow-400/10 text-yellow-300"
                    : "border-transparent text-slate-200 hover:border-yellow-400/30 hover:bg-yellow-400/10 hover:text-yellow-300"
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

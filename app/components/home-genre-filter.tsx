"use client";

import { useRouter } from "next/navigation";
import MobileFilterMenu from "@/app/components/mobile-filter-menu";

type HomeGenreFilterOption = {
  href: string;
  id: string;
  isActive: boolean;
  name: string;
};

type HomeGenreFilterProps = {
  filters: HomeGenreFilterOption[];
};

export default function HomeGenreFilter({ filters }: HomeGenreFilterProps) {
  const router = useRouter();
  const selectedFilter =
    filters.find((filter) => filter.isActive) ?? filters[0];

  return (
    <MobileFilterMenu
      className="relative z-[700] block sm:hidden"
      label="Genre"
      onSelect={(href) => router.push(href)}
      options={filters.map((filter) => ({
        label: filter.name,
        value: filter.href,
      }))}
      selectedValue={selectedFilter.href}
      summaryClassName="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl border border-yellow-400/55 bg-slate-950/85 px-4 text-sm font-black text-yellow-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_45px_rgba(0,0,0,0.35)] outline-none backdrop-blur transition hover:border-yellow-300 hover:bg-yellow-400/10 hover:text-yellow-200 [&::-webkit-details-marker]:hidden"
      menuClassName="absolute left-0 right-0 z-[999] mt-2 grid max-h-72 gap-1 overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950/95 p-1.5 shadow-2xl shadow-black/70 backdrop-blur-xl"
    />
  );
}

import { QUICK_REACTIONS, QuickReactionKey } from "@/lib/profile-config";

export default function QuickReactionBadge({
  reaction,
}: {
  reaction: QuickReactionKey;
}) {
  const details = QUICK_REACTIONS[reaction];

  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-yellow-400/20 bg-yellow-400/10 px-2 py-0.5 text-[10px] font-black text-yellow-300 sm:px-3 sm:py-1 sm:text-xs">
      <span className="shrink-0">{details.icon}</span>
      <span className="truncate">{details.label}</span>
    </span>
  );
}

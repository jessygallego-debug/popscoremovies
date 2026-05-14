import { QUICK_REACTIONS, QuickReactionKey } from "@/lib/profile-config";

export default function QuickReactionBadge({
  reaction,
}: {
  reaction: QuickReactionKey;
}) {
  const details = QUICK_REACTIONS[reaction];

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-xs font-black text-yellow-300">
      <span>{details.icon}</span>
      {details.label}
    </span>
  );
}

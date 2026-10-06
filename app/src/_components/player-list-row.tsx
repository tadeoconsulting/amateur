import { PlayerAvatar } from "@/_components/player-avatar";

export function PlayerListRow({
  name,
  position,
  avatarUrl,
}: {
  name: string;
  position: string;
  avatarUrl?: string | null;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-brand-200 px-4 py-3 last:border-0">
      <PlayerAvatar avatarUrl={avatarUrl} size="h-10 w-10" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-text-primary">{name}</p>
        <p className="text-xs text-text-secondary">{position}</p>
      </div>
    </div>
  );
}

interface Props {
  score: number;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

function getColor(score: number) {
  if (score >= 70) return 'bg-emerald-500';
  if (score >= 45) return 'bg-amber-500';
  return 'bg-red-500';
}

export default function ScoreMeter({
  score,
  size = 'md',
  showLabel = true,
}: Props) {
  const color = getColor(score);
  const h = size === 'sm' ? 'h-1.5' : 'h-2';
  const capped = Math.min(100, Math.max(0, score));
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div
        className={`flex-1 bg-gray-700 rounded-full ${h} overflow-hidden`}
      >
        <div
          className={`${h} ${color} rounded-full transition-all`}
          style={{ width: `${capped}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-gray-400 w-8 text-right shrink-0">
          {score}
        </span>
      )}
    </div>
  );
}

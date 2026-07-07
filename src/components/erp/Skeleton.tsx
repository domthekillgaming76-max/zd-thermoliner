interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`rounded-xl shimmer ${className}`}
      style={{ background: 'rgba(255,255,255,0.04)' }}
    />
  );
}

interface SkeletonListProps {
  count?: number;
  height?: string;
}

export function SkeletonList({ count = 3, height = 'h-14' }: SkeletonListProps) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={height} />
      ))}
    </div>
  );
}

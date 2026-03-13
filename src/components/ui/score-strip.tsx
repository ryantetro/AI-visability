import { ScoreRing } from '@/components/ui/score-ring';

interface ScoreStripItem {
  label: string;
  score: number | null;
  color?: string;
  caption?: string;
}

export function ScoreStrip({ items }: { items: ScoreStripItem[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="aiso-card-soft flex flex-col items-center justify-center p-5 text-center">
          <ScoreRing
            score={item.score}
            color={item.color}
            size={104}
            emphasis="compact"
            label={item.label}
            caption={item.caption}
          />
        </div>
      ))}
    </div>
  );
}

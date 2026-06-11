import { Minus, Plus } from 'lucide-react';

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  line: string;
}

interface ContractDiffViewProps {
  diff: DiffLine[];
  previousVersion?: number;
  currentVersion: number;
}

export default function ContractDiffView({
  diff,
  previousVersion,
  currentVersion,
}: ContractDiffViewProps) {
  const hasChanges = diff.some((line) => line.type !== 'unchanged');

  if (!hasChanges) {
    return (
      <p className="text-sm text-neutral-400">
        Önceki sürüm (v{previousVersion}) ile aktif sürüm (v{currentVersion}) arasında metin farkı
        bulunmuyor.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-neutral-400">
        v{previousVersion} → v{currentVersion} arasındaki değişiklikler:
      </p>
      <div className="rounded-xl border border-neutral-800 overflow-hidden text-sm font-mono">
        {diff.map((entry, index) => {
          if (entry.type === 'unchanged') {
            return (
              <div
                key={index}
                className="px-4 py-2 text-neutral-500 bg-neutral-950/50 border-b border-neutral-800/50 last:border-0"
              >
                <span className="select-none mr-2 text-neutral-600"> </span>
                {entry.line}
              </div>
            );
          }

          if (entry.type === 'removed') {
            return (
              <div
                key={index}
                className="px-4 py-2 text-red-300 bg-red-500/10 border-b border-red-500/10 last:border-0 flex gap-2"
              >
                <Minus className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                <span>{entry.line}</span>
              </div>
            );
          }

          return (
            <div
              key={index}
              className="px-4 py-2 text-emerald-300 bg-emerald-500/10 border-b border-emerald-500/10 last:border-0 flex gap-2"
            >
              <Plus className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <span>{entry.line}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

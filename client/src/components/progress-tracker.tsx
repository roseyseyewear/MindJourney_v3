import { X } from "lucide-react";

interface ProgressTrackerProps {
  currentLevel: number;
  totalLevels: number;
  progress: number;
  onExit: () => void;
  visible: boolean;
  visitorNumber?: number | null;
}

export default function ProgressTracker({
  currentLevel,
  totalLevels,
  progress,
  onExit,
  visible,
  visitorNumber,
}: ProgressTrackerProps) {
  console.log('🔥 ProgressTracker render:', { visible, visitorNumber });
  if (!visible) return null;

  return (
    <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-10 opacity-90 rounded-xl px-3 py-3" style={{ backgroundColor: 'rgba(20, 20, 20, 0.7)' }}>
      <div className="text-sm experiment-text-secondary">
        {visitorNumber && (
          <>
            <span className="font-bold tracking-wider">Visitor</span>
            <span> #</span>
            <span className="font-bold tracking-wider">{visitorNumber.toString().padStart(4, '0')}</span>
            <span className="mx-2">•</span>
          </>
        )}
        <span className="text-xs font-bold tracking-wider">Level {currentLevel}</span>
        <span className="mx-2">•</span>
        <span>{Math.round(progress)}% Complete</span>
      </div>
      <button
        onClick={onExit}
        className="transition-colors"
        style={{ color: '#eeeeee' }}
        aria-label="Exit experiment"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

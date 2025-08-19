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
  if (!visible) return null;

  return (
    <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-10 opacity-90">
      <div className="text-sm experiment-text-secondary">
        {visitorNumber && (
          <>
            <span className="font-medium">Visitor #{visitorNumber}</span>
            <span className="mx-2">•</span>
          </>
        )}
        <span>Level {currentLevel}</span>
        <span className="mx-2">•</span>
        <span>{Math.round(progress)}% Complete</span>
      </div>
      <button
        onClick={onExit}
        className="experiment-text-secondary hover:experiment-text-primary transition-colors"
        aria-label="Exit experiment"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

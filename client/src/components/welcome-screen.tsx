import { Play } from "lucide-react";

interface WelcomeScreenProps {
  onStart: () => void;
  isLoading: boolean;
  experimentTitle?: string;
  experimentDescription?: string;
  totalLevels?: number;
}

export default function WelcomeScreen({
  onStart,
  isLoading,
  experimentTitle = "THE EXPERIMENT",
  experimentDescription = "A Study on Perception",
  totalLevels = 5,
}: WelcomeScreenProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 fade-in">
      <div className="text-center max-w-2xl">
        <div className="mb-8">
          <h1 className="md:text-6xl tracking-wider mb-4 experiment-text-primary font-semibold text-[33px]">Share Your Hypothesis</h1>
          
        </div>
        
        
        
        <div className="flex flex-col items-center space-y-4">
          <button
            onClick={onStart}
            disabled={isLoading}
            className="group relative w-20 h-20 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {isLoading ? (
              <div className="loading-spinner rounded-full h-8 w-8 border-2 border-gray-600 border-t-black"></div>
            ) : (
              <Play className="w-8 h-8 text-black ml-1 group-hover:scale-110 transition-transform duration-300" fill="black" />
            )}
          </button>
          
          <p className="text-lg experiment-text-primary font-medium tracking-wide">
            Press Play to Begin
          </p>
        </div>
        
        <div className="mt-8 text-xs experiment-text-secondary">
          Level 1 of ? • Estimated time: 3 mins
        </div>
      </div>
    </div>
  );
}

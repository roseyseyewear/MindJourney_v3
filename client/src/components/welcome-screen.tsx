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
          <h1 className="md:text-6xl tracking-wider mb-4 font-bold text-[33px]" style={{ color: '#141414' }}>Share Your Hypothesis</h1>
          
        </div>
        
        
        
        <div className="flex flex-col items-center space-y-8">
          <button
            onClick={onStart}
            disabled={isLoading}
            className="group relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            style={{ backgroundColor: '#141414' }}
          >
            {isLoading ? (
              <div className="loading-spinner rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
            ) : (
              <Play className="w-8 h-8 ml-1 group-hover:scale-110 transition-transform duration-300" fill="#eeeeee" style={{ color: '#eeeeee' }} />
            )}
          </button>
          
          <div className="text-center space-y-1">
            <p className="text-xl font-bold tracking-wide uppercase" style={{ color: '#141414', marginTop: '-15px' }}>
              PRESS PLAY TO BEGIN
            </p>
            <div className="text-base tracking-wide" style={{ color: '#141414', fontFamily: 'Magda Clean, sans-serif' }}>
              Unlock Early Access & Worldwide Delivery.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

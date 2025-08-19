import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Play } from "lucide-react";
import WelcomeScreen from "@/components/welcome-screen";
import VideoLightbox from "@/components/video-lightbox";
import ProgressTracker from "@/components/progress-tracker";

import { type ExperimentSession, type ExperimentLevel, type Experiment } from "@shared/schema";

type ExperimentState = 'welcome' | 'immersive' | 'loading' | 'completed';

export default function Experiment() {
  const [currentState, setCurrentState] = useState<ExperimentState>('welcome');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [visitorNumber, setVisitorNumber] = useState<number | null>(null);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [currentLevelData, setCurrentLevelData] = useState<ExperimentLevel | null>(null);
  const [branchingPath, setBranchingPath] = useState('default');
  const [isVideoLightboxOpen, setIsVideoLightboxOpen] = useState(false);
  const { toast } = useToast();

  // Fetch active experiment
  const { data: experiment, isLoading: experimentLoading } = useQuery({
    queryKey: ['/api/experiment'],
  }) as { data: Experiment | undefined; isLoading: boolean };

  // Fetch experiment levels
  const { data: levels = [] } = useQuery({
    queryKey: ['/api/experiment', experiment?.id, 'levels'],
    enabled: !!experiment?.id,
  }) as { data: ExperimentLevel[] };

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (experimentId: string) => {
      const response = await apiRequest('POST', '/api/session', {
        experimentId,
        currentLevel: 1,
        branchingPath: 'default',
      });
      return response.json();
    },
    onSuccess: (session: ExperimentSession) => {
      console.log('🔥 Session created:', session);
      setSessionId(session.id);
      setVisitorNumber(session.visitorNumber || null);
      console.log('🔥 Visitor number set to:', session.visitorNumber);
      setCurrentState('immersive');
      setIsVideoLightboxOpen(true);
      // Load first level
      if (levels.length > 0) {
        setCurrentLevelData(levels[0]);
      }
      
      // Log visitor number assignment (no popup)
      if (session.visitorNumber) {
        console.log(`✅ Welcome, Visitor #${session.visitorNumber.toString().padStart(4, '0')}!`);
      } else {
        console.warn('⚠️ Session created without visitor number');
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to start experiment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update session mutation
  const updateSessionMutation = useMutation({
    mutationFn: async ({ sessionId, updates }: { sessionId: string; updates: Partial<ExperimentSession> }) => {
      const response = await apiRequest('PATCH', `/api/session/${sessionId}`, updates);
      return response.json();
    },
  });

  const handleStartExperiment = () => {
    if (!experiment?.id) return;
    // Keep welcome screen visible while button spins
    createSessionMutation.mutate(experiment.id);
  };

  const handleVideoEnd = () => {
    // Video ended, questions will appear in the same fullscreen container
  };

  const handleQuestionComplete = (responses: any[]) => {
    if (!sessionId || !currentLevelData) return;

    // Process responses and determine next level without loading state
    setTimeout(() => {
      if (currentLevel < (experiment?.totalLevels || 5)) {
        const nextLevel = currentLevel + 1;
        const nextLevelData = levels.find((l) => l.levelNumber === nextLevel);
        
        if (nextLevelData) {
          setCurrentLevel(nextLevel);
          setCurrentLevelData(nextLevelData);
          setCurrentState('welcome');
          setIsVideoLightboxOpen(true);
          
          // Update session
          updateSessionMutation.mutate({
            sessionId,
            updates: { currentLevel: nextLevel }
          });
        }
      } else {
        setCurrentState('completed');
        setIsVideoLightboxOpen(false);
        updateSessionMutation.mutate({
          sessionId,
          updates: { isCompleted: true }
        });
      }
    }, 2000);
  };

  const handleCloseLightbox = () => {
    setIsVideoLightboxOpen(false);
    setCurrentState('welcome');
    setSessionId(null);
    setVisitorNumber(null);
    setCurrentLevel(1);
    setCurrentLevelData(null);
    setBranchingPath('default');
  };

  const handleRestart = () => {
    setCurrentState('welcome');
    setSessionId(null);
    setVisitorNumber(null);
    setCurrentLevel(1);
    setCurrentLevelData(null);
    setBranchingPath('default');
    setIsVideoLightboxOpen(false);
  };

  const handleSelectFrame = () => {
    // Handle "Select a Frame" button action
    console.log("Select a Frame clicked");
    // You can add specific logic here for frame selection
  };

  const handleFindTheLab = () => {
    // Handle "Find The Lab" button action
    console.log("Find The Lab clicked");
    // You can add specific logic here for lab finding
  };

  if (experimentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner rounded-full h-12 w-12 border-2 border-gray-600 border-t-white mx-auto mb-4"></div>
          <p className="experiment-text-primary text-lg">Initializing experiment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen relative overflow-hidden">
      <ProgressTracker 
        currentLevel={currentLevel}
        totalLevels={experiment?.totalLevels || 5}
        progress={((currentLevel - 1) / (experiment?.totalLevels || 5)) * 100}
        onExit={handleRestart}
        visible={!!visitorNumber}
        visitorNumber={visitorNumber}
      />

      {currentState === 'welcome' && (
        <WelcomeScreen
          onStart={handleStartExperiment}
          isLoading={createSessionMutation.isPending}
          experimentTitle={experiment?.title}
          experimentDescription={experiment?.description || undefined}
          totalLevels={experiment?.totalLevels}
        />
      )}

      {/* Video Lightbox - can be shown over any state */}
      {currentLevelData && sessionId && (
        <VideoLightbox
          level={currentLevelData}
          sessionId={sessionId}
          onVideoEnd={handleVideoEnd}
          onQuestionComplete={handleQuestionComplete}
          onClose={handleCloseLightbox}
          isOpen={isVideoLightboxOpen}
          onSelectFrame={handleSelectFrame}
          onFindTheLab={handleFindTheLab}
          visitorNumber={visitorNumber}
        />
      )}

      {currentState === 'loading' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="relative w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl transform transition-all duration-300 scale-100 aspect-video flex items-center justify-center"
            style={{ backgroundColor: '#141414' }}
          >
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center">
              <Play className="w-8 h-8 text-black ml-1 animate-spin" fill="black" />
            </div>
          </div>
        </div>
      )}

      {currentState === 'completed' && (
        <div className="absolute inset-0 flex items-center justify-center p-8">
          <div className="text-center max-w-2xl">
            <h1 className="text-4xl font-light tracking-wider mb-4 experiment-text-primary">
              Experiment Complete
            </h1>
            <p className="experiment-text-secondary text-lg mb-8">
              Thank you for participating in this study on perception. Your responses have been recorded.
            </p>
            <button
              onClick={handleRestart}
              className="experiment-button-primary px-8 py-3 font-medium tracking-wide hover:bg-white transition-colors duration-300"
            >
              Start New Session
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

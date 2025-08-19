import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, RotateCcw, Minimize, ArrowLeft, SkipForward } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type ExperimentLevel } from "@shared/schema";
import ChatInterface from "@/components/chat-interface";
import LevelCompleteScreen from "@/components/level-complete-screen";
import PostSubmissionVideo from "@/components/post-submission-video";

interface FullscreenVideoContainerProps {
  level: ExperimentLevel;
  sessionId: string;
  onVideoEnd: () => void;
  onQuestionComplete: (responses: any[]) => void;
  onExit: () => void;
  onSelectFrame?: () => void;
  onFindTheLab?: () => void;
}

export default function FullscreenVideoContainer({
  level,
  sessionId,
  onVideoEnd,
  onQuestionComplete,
  onExit,
  onSelectFrame,
  onFindTheLab,
}: FullscreenVideoContainerProps) {
  const mainVideoRef = useRef<HTMLVideoElement>(null);
  const backgroundVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [currentPhase, setCurrentPhase] = useState<'video' | 'questions' | 'post-submission' | 'complete' | 'loading'>('video');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  const [isReversePhase, setIsReversePhase] = useState(false);
  const [videoEndTime, setVideoEndTime] = useState(0);
  const { toast } = useToast();
  
  const reverseAnimationRef = useRef<number | null>(null);

  useEffect(() => {
    const video = mainVideoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      setProgress((video.currentTime / video.duration) * 100);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      // Store the end time for reverse playback
      setVideoEndTime(video.duration);
      // Transition to questions phase while staying in fullscreen
      setCurrentPhase('questions');
      // Background video will start automatically via useEffect
      onVideoEnd();
    };

    const handleCanPlay = () => {
      if (!hasStarted) {
        video.play();
        setIsPlaying(true);
        setHasStarted(true);
        enterFullscreen();
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('canplay', handleCanPlay);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, [onVideoEnd, hasStarted]);

  // Start background video when entering questions phase
  useEffect(() => {
    if (currentPhase === 'questions') {
      startBackgroundVideo();
    }
    
    // Cleanup function to cancel reverse animation
    return () => {
      if (reverseAnimationRef.current) {
        cancelAnimationFrame(reverseAnimationRef.current);
      }
      setIsReversePhase(false);
    };
  }, [currentPhase]);

  const startBackgroundVideo = () => {
    const bgVideo = backgroundVideoRef.current;
    if (!bgVideo) {
      console.log('Background video ref not available');
      return;
    }
    
    console.log('Starting background video with reverse effect');
    
    // Use the same video as background
    bgVideo.src = level.backgroundVideoUrl || level.videoUrl;
    bgVideo.muted = true;
    bgVideo.playsInline = true;
    
    // Start reverse playback phase
    setIsReversePhase(true);
    
    const handleLoadedMetadata = () => {
      console.log('Background video metadata loaded, starting reverse from:', videoEndTime || bgVideo.duration);
      
      // Start from the end of the video for reverse effect
      const startTime = videoEndTime || bgVideo.duration;
      bgVideo.currentTime = startTime;
      
      // Create smooth reverse playback effect
      const reversePlayback = () => {
        if (!isReversePhase || bgVideo.currentTime <= 0) {
          // Switch to normal looping
          console.log('Reverse complete, switching to normal loop');
          setIsReversePhase(false);
          bgVideo.currentTime = 0;
          bgVideo.loop = true;
          bgVideo.play().catch(console.error);
          return;
        }
        
        // Step backwards in time
        bgVideo.currentTime = Math.max(0, bgVideo.currentTime - 0.08);
        reverseAnimationRef.current = requestAnimationFrame(reversePlayback);
      };
      
      // Start the reverse animation
      reverseAnimationRef.current = requestAnimationFrame(reversePlayback);
    };
    
    // Set up event listener
    bgVideo.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
    
    // Force load if metadata is already available
    if (bgVideo.readyState >= 1) {
      console.log('Metadata already loaded, starting immediately');
      handleLoadedMetadata();
    }
  };

  const enterFullscreen = async () => {
    const container = containerRef.current;
    if (container && container.requestFullscreen) {
      try {
        await container.requestFullscreen();
      } catch (error) {
        console.log('Fullscreen not supported or denied');
      }
    }
  };

  const exitFullscreen = async () => {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
        onExit();
      } catch (error) {
        console.log('Exit fullscreen failed');
      }
    } else {
      onExit();
    }
  };

  const togglePlay = () => {
    const video = mainVideoRef.current;
    if (!video || currentPhase !== 'video') return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const video = mainVideoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const replay = () => {
    const video = mainVideoRef.current;
    if (!video) return;

    setCurrentPhase('video');
    video.currentTime = 0;
    video.play();
    setIsPlaying(true);
  };

  const skipToEnd = () => {
    const video = mainVideoRef.current;
    if (!video || currentPhase !== 'video') return;

    // Skip to the end which will trigger the transition to questions
    video.currentTime = video.duration;
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };



  const goBackToVideo = () => {
    setCurrentPhase('video');
    const bgVideo = backgroundVideoRef.current;
    if (bgVideo) {
      bgVideo.pause();
    }
  };

  return (
    <div
      ref={containerRef}
      className="fullscreen-container"
      onMouseEnter={() => currentPhase === 'video' && setShowControls(true)}
      onMouseLeave={() => currentPhase === 'video' && setShowControls(false)}
    >
      {/* Main Video (shown during video phase) */}
      {currentPhase === 'video' && (
        <video
          ref={mainVideoRef}
          className="w-full h-full object-cover"
          src={level.videoUrl}
          muted={isMuted}
          playsInline
        />
      )}

      {/* Background Video (shown during questions phase) */}
      {currentPhase === 'questions' && (
        <video
          ref={backgroundVideoRef}
          className="w-full h-full object-cover"
          src="/videos/chat-loop.mp4"
          muted
          loop
          playsInline
          autoPlay
        />
      )}

      {/* Video Controls (only during video phase) */}
      {currentPhase === 'video' && (
        <div className={`video-controls ${showControls || !isPlaying ? 'show' : ''}`}>
          <div className="flex items-center space-x-4">
            <button
              onClick={togglePlay}
              className="experiment-text-primary hover:text-white transition-colors"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </button>
            
            <button
              onClick={toggleMute}
              className="experiment-text-primary hover:text-white transition-colors"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            
            <span className="text-sm experiment-text-secondary">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={replay}
              className="experiment-text-primary hover:text-white transition-colors"
              aria-label="Replay"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            
            <button
              onClick={skipToEnd}
              className="experiment-text-primary hover:text-white transition-colors"
              aria-label="Skip to end"
            >
              <SkipForward className="w-5 h-5" />
            </button>
            
            <button
              onClick={exitFullscreen}
              className="experiment-text-primary hover:text-white transition-colors"
              aria-label="Exit fullscreen"
            >
              <Minimize className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Progress bar (only during video phase) */}
      {currentPhase === 'video' && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
          <div
            className="h-full experiment-text-primary transition-all duration-100 progress-glow"
            style={{ width: `${progress}%`, backgroundColor: 'var(--off-white)' }}
          />
        </div>
      )}

      {/* Chat Interface (shown during questions phase) */}
      {currentPhase === 'questions' && (
        <ChatInterface
          level={level}
          sessionId={sessionId}
          onComplete={(responses) => {
            // Transition to post-submission video phase
            setCurrentPhase('post-submission');
          }}
          onBack={goBackToVideo}
        />
      )}

      {/* Post-Submission Video (shown after chat completion) */}
      {currentPhase === 'post-submission' && level.postSubmissionVideoUrl && (
        <PostSubmissionVideo
          videoUrl={level.postSubmissionVideoUrl}
          onComplete={() => {
            // After post-submission video ends, move to complete phase
            setCurrentPhase('complete');
          }}
        />
      )}

      {/* Level Complete Screen (shown after questions complete) */}
      {currentPhase === 'complete' && (
        <LevelCompleteScreen
          videoUrl={level.backgroundVideoUrl || level.videoUrl}
          completionVideoUrl={level.completionVideoUrl || undefined}
          onSelectFrame={() => {
            if (onSelectFrame) onSelectFrame();
          }}
          onFindTheLab={() => {
            if (onFindTheLab) onFindTheLab();
          }}
        />
      )}

      {/* Loading Animation removed - only welcome screen button spins */}
      {false && currentPhase === 'loading' && (
        <div className="absolute inset-0 bg-black flex items-center justify-center">
          {/* Animated background pattern */}
          <div className="absolute inset-0 opacity-20">
            <div className="w-full h-full relative overflow-hidden">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute border border-white/10"
                  style={{
                    width: `${(i + 1) * 50}px`,
                    height: `${(i + 1) * 50}px`,
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    borderRadius: '50%',
                    animation: `pulse-expand ${2 + i * 0.2}s ease-in-out infinite alternate`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Central loading element */}
          <div className="relative text-center">
            {/* Morphing geometric shape */}
            <div className="relative w-32 h-32 mx-auto mb-8">
              <div 
                className="absolute inset-0 border-2 border-white transition-all duration-1000"
                style={{
                  borderRadius: `${20 + (loadingProgress / 100) * 30}%`,
                  transform: `rotate(${loadingProgress * 3.6}deg) scale(${1 + (loadingProgress / 100) * 0.3})`,
                  borderColor: `hsl(${200 + loadingProgress * 1.6}, 70%, 60%)`,
                }}
              />
              <div 
                className="absolute inset-4 border border-white/50 transition-all duration-1000"
                style={{
                  borderRadius: `${50 - (loadingProgress / 100) * 20}%`,
                  transform: `rotate(-${loadingProgress * 2.4}deg)`,
                  borderColor: `hsl(${280 + loadingProgress * 0.8}, 60%, 70%)`,
                }}
              />
              <div 
                className="absolute inset-8 bg-white/20 transition-all duration-1000"
                style={{
                  borderRadius: `${(loadingProgress / 100) * 50}%`,
                  transform: `scale(${0.5 + (loadingProgress / 100) * 0.5})`,
                  opacity: 0.6 + (loadingProgress / 100) * 0.4,
                }}
              />
            </div>

            {/* Progress text */}
            <div className="space-y-4">
              <h3 className="text-2xl font-light text-white mb-2">
                Processing Your Response
              </h3>
              <div className="text-lg text-white/70">
                {loadingProgress < 30 && "Analyzing perception patterns..."}
                {loadingProgress >= 30 && loadingProgress < 60 && "Integrating experience data..."}
                {loadingProgress >= 60 && loadingProgress < 90 && "Preparing next level..."}
                {loadingProgress >= 90 && "Entering deeper immersion..."}
              </div>
              
              {/* Progress bar */}
              <div className="w-64 h-1 bg-white/20 rounded-full mx-auto overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-400 to-purple-400 transition-all duration-300 ease-out"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
              
              <div className="text-sm text-white/50">
                {Math.round(loadingProgress)}%
              </div>
            </div>
          </div>

          {/* Floating particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(15)].map((_, i) => (
              <div
                key={`particle-${i}`}
                className="absolute w-1 h-1 bg-white rounded-full opacity-60"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animation: `float-particle ${3 + Math.random() * 4}s ease-in-out infinite`,
                  animationDelay: `${Math.random() * 2}s`,
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
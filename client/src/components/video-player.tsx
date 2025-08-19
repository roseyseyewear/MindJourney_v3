import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, RotateCcw, Minimize, SkipForward } from "lucide-react";

interface VideoPlayerProps {
  videoUrl: string;
  thumbnail?: string;
  onVideoEnd: () => void;
  levelNumber: number;
}

export default function VideoPlayer({
  videoUrl,
  thumbnail,
  onVideoEnd,
  levelNumber,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
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
      onVideoEnd();
    };

    const handleCanPlay = () => {
      if (!hasStarted) {
        // Auto-play and go fullscreen
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

  const enterFullscreen = async () => {
    const container = containerRef.current;
    if (container && container.requestFullscreen) {
      try {
        await container.requestFullscreen();
        setIsFullscreen(true);
      } catch (error) {
        console.log('Fullscreen not supported or denied');
      }
    }
  };

  const exitFullscreen = async () => {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } catch (error) {
        console.log('Exit fullscreen failed');
      }
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const replay = () => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = 0;
    video.play();
    setIsPlaying(true);
  };

  const skipToEnd = () => {
    const video = videoRef.current;
    if (!video) return;

    // Skip to the end which will trigger the onVideoEnd callback
    video.currentTime = video.duration;
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 transition-opacity duration-1000 opacity-100"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <div className="relative w-full h-full bg-black">
        {/* Video thumbnail/fallback */}
        {thumbnail && !hasStarted && (
          <div
            className="absolute inset-0 bg-cover bg-center flex items-center justify-center"
            style={{
              backgroundImage: `linear-gradient(rgba(20,20,20,0.7), rgba(20,20,20,0.7)), url(${thumbnail})`,
            }}
          >
            <div className="text-center">
              <Play className="w-16 h-16 mb-4 experiment-text-primary opacity-70" />
              <p className="text-lg experiment-text-primary opacity-90">
                Loading immersive experience...
              </p>
              <p className="text-sm experiment-text-secondary mt-2">
                Level {levelNumber} • Auto-play in fullscreen
              </p>
            </div>
          </div>
        )}

        {/* Video element */}
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          src={videoUrl}
          muted={isMuted}
          playsInline
          style={{ display: hasStarted ? 'block' : 'none' }}
        />

        {/* Video controls */}
        <div
          className={`video-controls ${showControls || !isPlaying ? 'show' : ''}`}
        >
          <div className="flex items-center space-x-4">
            <button
              onClick={togglePlay}
              className="experiment-text-primary hover:text-white transition-colors"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6" />
              )}
            </button>
            
            <button
              onClick={toggleMute}
              className="experiment-text-primary hover:text-white transition-colors"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
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

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
          <div
            className="h-full experiment-text-primary transition-all duration-100 progress-glow"
            style={{ width: `${progress}%`, backgroundColor: 'var(--off-white)' }}
          />
        </div>
      </div>
    </div>
  );
}

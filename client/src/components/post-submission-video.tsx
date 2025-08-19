import { useState, useRef, useEffect } from "react";
import { SkipForward } from "lucide-react";

interface PostSubmissionVideoProps {
  videoUrl: string;
  onComplete: () => void;
  backgroundVideoUrl?: string;
}

export default function PostSubmissionVideo({
  videoUrl,
  onComplete,
  backgroundVideoUrl,
}: PostSubmissionVideoProps) {
  const [isLoading, setIsLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const preloadRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    const preload = preloadRef.current;
    if (!video) return;

    // Preload the video for instant playback
    video.preload = 'auto';
    video.load();

    // Preload background video for seamless transition
    if (backgroundVideoUrl && preload) {
      preload.preload = 'auto';
      preload.src = backgroundVideoUrl;
      preload.load();
    }

    const handleLoadedData = () => {
      console.log('Post-submission video loaded');
      setIsLoading(false);
      // Play immediately for seamless transition
      video.play().catch(console.error);
    };

    const handleEnded = () => {
      console.log('Post-submission video ended, transitioning to background');
      // Start the background video immediately before calling onComplete
      if (backgroundVideoUrl && preload) {
        preload.style.position = 'absolute';
        preload.style.top = '0';
        preload.style.left = '0';
        preload.style.width = '100%';
        preload.style.height = '100%';
        preload.style.objectFit = 'cover';
        preload.style.zIndex = '1';
        preload.classList.remove('hidden');
        preload.currentTime = 0;
        preload.play().catch(console.error);
      }
      
      // Seamless completion - no blink, no delay
      onComplete();
    };

    const handleCanPlay = () => {
      console.log('Post-submission video can play');
      setIsLoading(false);
      // Start playing as soon as it can play
      video.play().catch(console.error);
    };

    const handleError = (e: Event) => {
      console.error('Post-submission video error:', e);
      console.log('Video source:', video.src);
      setIsLoading(false);
    };

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
    };
  }, [onComplete, backgroundVideoUrl]);

  const skipVideo = () => {
    const video = videoRef.current;
    if (!video) return;
    
    // Skip to the end which will trigger onComplete
    video.currentTime = video.duration;
  };

  return (
    <div className="absolute inset-0 w-full h-full bg-black">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
          <div className="text-white text-lg opacity-60">Loading...</div>
        </div>
      )}
      
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        muted={false}
        playsInline
        src={videoUrl}
      />

      {/* Skip button */}
      <button
        onClick={skipVideo}
        className="absolute top-4 right-4 z-10 p-3 rounded-full bg-black/50 hover:bg-black/70 transition-colors experiment-text-primary hover:text-white"
        aria-label="Skip video"
      >
        <SkipForward className="w-6 h-6" />
      </button>

      {/* Hidden preload video for seamless transition */}
      {backgroundVideoUrl && (
        <video
          ref={preloadRef}
          className="hidden"
          muted
          playsInline
        />
      )}
    </div>
  );
}
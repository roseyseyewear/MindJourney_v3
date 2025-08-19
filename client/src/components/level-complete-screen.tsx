import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Bot, Send } from "lucide-react";

interface LevelCompleteScreenProps {
  videoUrl: string;
  completionVideoUrl?: string;
  onSelectFrame: () => void;
  onFindTheLab: () => void;
}

export default function LevelCompleteScreen({
  videoUrl,
  completionVideoUrl,
  onSelectFrame,
  onFindTheLab,
}: LevelCompleteScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showFinalMessage, setShowFinalMessage] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [sms, setSms] = useState('');

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Ensure immediate playback for seamless transition
    video.preload = 'auto';
    
    const handleLoadedData = () => {
      console.log('Level complete video loaded, playing immediately');
      video.play().catch(console.error);
      
      // Show final message after a short delay
      setTimeout(() => {
        setShowFinalMessage(true);
        // Show contact form after message appears
        setTimeout(() => {
          setShowContactForm(true);
        }, 3000);
      }, 2000);
    };

    const handleError = (e: Event) => {
      console.error('Video error:', e);
      console.log('Video source:', video.src);
    };

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('error', handleError);
    
    // Load the video
    video.load();
    
    // Try to play immediately if already loaded
    if (video.readyState >= 3) {
      video.play().catch(console.error);
    }

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('error', handleError);
    };
  }, [completionVideoUrl, videoUrl]);

  return (
    <div className="absolute inset-0 w-full h-full">
      {/* Background Video */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        src={completionVideoUrl || videoUrl}
        muted
        loop
        playsInline
        autoPlay
      />
      
      {/* Final chatbot interface overlay */}
      {showFinalMessage && (
        <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
          <div className="relative w-full max-w-2xl mx-auto">
            {/* Semi-transparent overlay background */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md rounded-lg"></div>
            
            {/* Header */}
            <div className="relative z-10 flex items-center justify-between p-4 border-b border-white/20">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-medium text-white">The Lab</h2>
                  <p className="text-xs text-white/60">Research Assistant</p>
                </div>
              </div>
            </div>

            {/* Message and Form */}
            <div className="relative z-10 p-4 space-y-4">
              {/* Lab Message */}
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-3 h-3 text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-white/90 leading-relaxed">
                    You've unlocked Visitor Benefits, share your contact to unlock...
                  </div>
                </div>
              </div>

              {/* Contact Form */}
              {showContactForm && (
                <div className="space-y-3 ml-9">
                  <div>
                    <input
                      type="text"
                      placeholder="Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 text-sm"
                    />
                  </div>
                  <div>
                    <input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 text-sm"
                    />
                  </div>
                  <div>
                    <input
                      type="tel"
                      placeholder="SMS/Phone Number"
                      value={sms}
                      onChange={(e) => setSms(e.target.value)}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 text-sm"
                    />
                  </div>
                  <button
                    onClick={() => {
                      // Handle form submission
                      console.log('Contact submitted:', { name, email, sms });
                      // You can add API call here to submit the contact details
                    }}
                    className="flex items-center space-x-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-white text-sm"
                  >
                    <Send className="w-4 h-4" />
                    <span>Submit</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Overlay with congratulations message and buttons */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center max-w-2xl mx-4">
          {/* Congratulations Message */}
          <div className="mb-8">
            <div className="text-[#eeeeee] text-base md:text-lg leading-relaxed mb-6 space-y-2">
              <p><strong>UNLOCKED!</strong></p>
              <p>Thank you for Sharing your Hypothesis.</p>
              <p>Screenshot your Visitor Benefits:</p>
              <p>Worldwide Delivery (Use code LEVEL1)</p>
              <p>and Early Access (Check Inbox/SMS)</p>
            </div>
            
            <h3 className="text-[#eeeeee] text-lg md:text-xl font-medium mb-6">
              Choose how to continue:
            </h3>
          </div>
          
          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 justify-center">
            <Button
              onClick={onSelectFrame}
              className="px-8 py-4 text-lg font-medium tracking-wide experiment-button-primary hover:bg-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50 rounded-full"
            >
              Select a Frame
            </Button>
            
            <Button
              onClick={onFindTheLab}
              className="px-8 py-4 text-lg font-medium tracking-wide bg-transparent border-2 border-[#eeeeee] text-[#eeeeee] hover:bg-[#eeeeee] hover:text-black transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#eeeeee]/50 rounded-full"
            >
              Find The Lab
            </Button>
          </div>
        </div>
      </div>

    </div>
  );
}
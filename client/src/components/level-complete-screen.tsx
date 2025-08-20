import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Send, User, ArrowLeft } from "lucide-react";

interface ChatMessage {
  id: string;
  sender: 'lab' | 'user';
  content: string;
  timestamp: Date;
}

interface LevelCompleteScreenProps {
  videoUrl: string;
  completionVideoUrl?: string;
  onSelectFrame: () => void;
  onFindTheLab: () => void;
  visitorNumber?: number | null;
  sessionId?: string;
}

export default function LevelCompleteScreen({
  videoUrl,
  completionVideoUrl,
  onSelectFrame,
  onFindTheLab,
  visitorNumber,
  sessionId,
}: LevelCompleteScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showContactForm, setShowContactForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [sms, setSms] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentStep, setCurrentStep] = useState<'name' | 'email' | 'sms' | 'complete'>('name');
  const { toast } = useToast();

  // Submit contact data to Firebase
  const submitContactMutation = useMutation({
    mutationFn: async ({ name, email, sms }: { name: string; email: string; sms: string }) => {
      const response = await apiRequest('POST', '/api/contact/submit', {
        name,
        email,
        sms,
        sessionId,
        visitorNumber,
        submissionType: 'unlock_benefits'
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Your contact information has been saved. Check your email and SMS for early access details.",
      });
      
      // Add final success message
      setTimeout(() => {
        const successMessage: ChatMessage = {
          id: `success-${Date.now()}`,
          sender: 'lab',
          content: 'Perfect! Your contact information has been saved. Check your email and SMS for your early access benefits. You can now choose how to continue.',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, successMessage]);
        setCurrentStep('complete');
      }, 1000);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save your information. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Ensure immediate playback for seamless transition
    video.preload = 'auto';
    
    const handleLoadedData = () => {
      console.log('Level complete video loaded, playing immediately');
      video.play().catch(console.error);
      
      // Start chat sequence after a short delay
      setTimeout(() => {
        initializeChat();
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

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initializeChat = () => {
    const unlockMessage: ChatMessage = {
      id: 'unlock-message',
      sender: 'lab',
      content: 'UNLOCKED! Thank you for sharing your hypothesis. You\'ve unlocked Visitor Benefits: Worldwide Delivery (Use code LEVEL1) and Early Access.',
      timestamp: new Date(),
    };

    setMessages([unlockMessage]);

    // Show typing indicator
    setTimeout(() => {
      setIsTyping(true);
    }, 1500);

    // Add contact request message
    setTimeout(() => {
      setIsTyping(false);
      const contactMessage: ChatMessage = {
        id: 'contact-request',
        sender: 'lab',
        content: 'Share your contact to unlock these benefits. What name would you like me to use?',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, contactMessage]);
      setShowContactForm(true);
    }, 3000);
  };

  const handleSubmitName = () => {
    if (!name.trim()) return;
    
    const userMessage: ChatMessage = {
      id: `user-name-${Date.now()}`,
      sender: 'user',
      content: name,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setCurrentStep('email');
    
    // Show typing indicator
    setTimeout(() => {
      setIsTyping(true);
    }, 500);
    
    // Add email request
    setTimeout(() => {
      setIsTyping(false);
      const emailMessage: ChatMessage = {
        id: 'email-request',
        sender: 'lab',
        content: 'Perfect! What\'s your email address for your early access benefits?',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, emailMessage]);
    }, 1500);
  };

  const handleSubmitEmail = () => {
    if (!email.trim()) return;
    
    const userMessage: ChatMessage = {
      id: `user-email-${Date.now()}`,
      sender: 'user',
      content: email,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setCurrentStep('sms');
    
    // Show typing indicator
    setTimeout(() => {
      setIsTyping(true);
    }, 500);
    
    // Add SMS request
    setTimeout(() => {
      setIsTyping(false);
      const smsMessage: ChatMessage = {
        id: 'sms-request',
        sender: 'lab',
        content: 'Great! And your phone number for SMS updates?',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, smsMessage]);
    }, 1500);
  };

  const handleSubmitSms = () => {
    if (!sms.trim()) return;
    
    const userMessage: ChatMessage = {
      id: `user-sms-${Date.now()}`,
      sender: 'user',
      content: sms,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Submit all data to Firebase
    submitContactMutation.mutate({ name, email, sms });
  };

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

      {/* Chat Interface - Exact match to chat-interface.tsx */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
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

          {/* Chat Messages - Compact */}
          <div className="relative z-10 max-h-48 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {messages.slice(-4).map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start space-x-2 max-w-[85%] ${
                  message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}>
                  {/* Avatar */}
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.sender === 'lab' 
                      ? 'bg-white/20' 
                      : 'bg-gray-600'
                  }`}>
                    {message.sender === 'lab' ? 
                      <Bot className="w-3 h-3 text-white" /> : 
                      <User className="w-3 h-3 text-white" />
                    }
                  </div>

                  {/* Message Bubble */}
                  <div className={`rounded-xl px-3 py-2 ${
                    message.sender === 'lab'
                      ? 'bg-white/10 text-white border border-white/20'
                      : 'bg-white/20 text-white border border-white/30'
                  }`}>
                    <p className="text-xs leading-relaxed">{message.content}</p>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="flex items-start space-x-2 max-w-[85%]">
                  {/* Avatar */}
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-white/20">
                    <Bot className="w-3 h-3 text-white" />
                  </div>
                  
                  {/* Typing Bubble */}
                  <div className="rounded-xl px-3 py-2 bg-white/10 text-white border border-white/20">
                    <div className="flex space-x-1">
                      <div className="w-1 h-1 bg-white/60 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                      <div className="w-1 h-1 bg-white/60 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                      <div className="w-1 h-1 bg-white/60 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* Input Area - Compact */}
          {showContactForm && currentStep !== 'complete' && (
            <div className="relative z-10 p-3 border-t border-white/20">
              {/* Response Options Header - matching original design */}
              <div className="mb-3">
                <p className="text-xs text-white/80 mb-2">Type your response</p>
              </div>

              {/* Text Input */}
              <div className="flex space-x-2">
                <Input
                  value={currentStep === 'name' ? name : currentStep === 'email' ? email : sms}
                  onChange={(e) => {
                    if (currentStep === 'name') setName(e.target.value);
                    else if (currentStep === 'email') setEmail(e.target.value);
                    else setSms(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (currentStep === 'name') handleSubmitName();
                      else if (currentStep === 'email') handleSubmitEmail();
                      else handleSubmitSms();
                    }
                  }}
                  placeholder={
                    currentStep === 'name' ? 'Enter your name...' :
                    currentStep === 'email' ? 'Enter your email...' :
                    'Enter your phone number...'
                  }
                  type={currentStep === 'email' ? 'email' : currentStep === 'sms' ? 'tel' : 'text'}
                  className="flex-1 bg-black/50 border-white/20 text-white placeholder:text-gray-400 backdrop-blur-sm text-sm h-8"
                  disabled={submitContactMutation.isPending}
                />
                <Button
                  onClick={() => {
                    if (currentStep === 'name') handleSubmitName();
                    else if (currentStep === 'email') handleSubmitEmail();
                    else handleSubmitSms();
                  }}
                  disabled={
                    (currentStep === 'name' && !name.trim()) ||
                    (currentStep === 'email' && !email.trim()) ||
                    (currentStep === 'sms' && !sms.trim()) ||
                    submitContactMutation.isPending
                  }
                  className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white border border-white/30 h-8"
                >
                  {submitContactMutation.isPending ? (
                    <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send className="w-3 h-3" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Continue Buttons - Only show after contact form is complete */}
          {currentStep === 'complete' && (
            <div className="relative z-10 p-4 border-t border-white/20">
              <p className="text-xs text-white/80 mb-3 text-center">Choose how to continue:</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={onSelectFrame}
                  className="px-6 py-2 text-sm font-medium tracking-wide experiment-button-primary hover:bg-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50 rounded-full"
                >
                  Select a Frame
                </Button>
                
                <Button
                  onClick={onFindTheLab}
                  className="px-6 py-2 text-sm font-medium tracking-wide bg-transparent border-2 border-[#eeeeee] text-[#eeeeee] hover:bg-[#eeeeee] hover:text-black transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#eeeeee]/50 rounded-full"
                >
                  Find The Lab
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
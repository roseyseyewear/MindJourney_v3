import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Send, User, ArrowLeft, Mic, Video, Paperclip } from "lucide-react";
import theLabLogo from "@assets/the-lab_logo_white-2_3_1755515290363.png";

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

  // Format visitor number as 4-digit string
  const formatVisitorNumber = (num: number | null) => {
    if (!num) return "0000";
    return num.toString().padStart(4, "0");
  };

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
    console.log('🔥 LevelCompleteScreen mounted with:', { completionVideoUrl, videoUrl, visitorNumber, sessionId });
    
    const video = videoRef.current;
    if (!video) {
      console.log('🔥 No video ref, initializing chat immediately');
      // Initialize chat immediately if no video
      setTimeout(() => {
        initializeChat();
      }, 1000);
      return;
    }

    // Ensure immediate playback for seamless transition
    video.preload = 'auto';
    
    const handleLoadedData = () => {
      console.log('🔥 Level complete video loaded, playing immediately');
      video.play().catch(console.error);
      
      // Start chat sequence after a short delay
      setTimeout(() => {
        initializeChat();
      }, 2000);
    };

    const handleError = (e: Event) => {
      console.error('🔥 Video error:', e);
      console.log('🔥 Video source:', video.src);
      // Initialize chat anyway if video fails
      setTimeout(() => {
        initializeChat();
      }, 1000);
    };

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('error', handleError);
    
    // Load the video
    video.load();
    
    // Try to play immediately if already loaded
    if (video.readyState >= 3) {
      console.log('🔥 Video already loaded, playing now');
      video.play().catch(console.error);
    }

    // Fallback: Initialize chat after 3 seconds regardless
    const fallbackTimer = setTimeout(() => {
      console.log('🔥 Fallback: Initializing chat after 3s timeout');
      initializeChat();
    }, 3000);

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('error', handleError);
      clearTimeout(fallbackTimer);
    };
  }, [completionVideoUrl, videoUrl]);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initializeChat = () => {
    console.log('🔥 initializeChat called');
    
    const unlockMessage: ChatMessage = {
      id: 'unlock-message',
      sender: 'lab',
      content: 'Thank you for sharing your hypothesis. You unlocked The Lab!',
      timestamp: new Date(),
    };

    console.log('🔥 Setting initial unlock message');
    setMessages([unlockMessage]);

    // Show typing indicator
    setTimeout(() => {
      console.log('🔥 Showing typing indicator');
      setIsTyping(true);
    }, 1500);

    // Add contact request message
    setTimeout(() => {
      console.log('🔥 Adding contact request message and showing form');
      setIsTyping(false);
      const contactMessage: ChatMessage = {
        id: 'contact-request',
        sender: 'lab',
        content: 'Share your contact details to receive your Visitor Benefits: Name / Email / SMS / Other',
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
        content: 'Perfect! What is your email address for your early access benefits?',
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
    <div className="absolute inset-0 w-full h-full" style={{ fontFamily: 'Magda Clean, sans-serif' }}>
      {/* Background Video - Using Forest Video */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        src="/videos/level1-forest.mp4"
        muted
        loop
        playsInline
        autoPlay
      />

      {/* Chat Interface - Exact match to futuristic-chat-interface.tsx */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="relative w-full max-w-2xl mx-auto">
          {/* Thin Border */}
          <div className="rounded-xl" style={{ backgroundColor: 'transparent', border: '1px solid #eeeeee' }}>
            <div className="w-full rounded-xl" style={{ backgroundColor: 'transparent' }}>

              {/* Header */}
              <div className="relative z-10 rounded-t-xl overflow-hidden" style={{ backgroundColor: 'rgba(238, 238, 238, 0.2)', borderBottom: '1px solid #eeeeee' }}>
                <div className="flex items-center justify-between px-3 py-3">
                  <div className="flex items-center space-x-3">
                    {/* Circle/Triangle Logo - moved to top left */}
                    <div className="w-5 h-5 relative">
                      <img src={theLabLogo} alt="Lab Logo" className="w-full h-full object-contain" />
                    </div>
                    <span className="font-bold text-xs tracking-wide" style={{ color: '#eeeeee', fontSize: '12px' }}>VISITOR #{formatVisitorNumber(visitorNumber)}</span>
                  </div>
                  <div className="flex items-center space-x-2 h-full">
                    <div className="w-px h-full" style={{ backgroundColor: '#eeeeee' }}></div>
                    <span className="font-bold text-xs" style={{ color: '#eeeeee', fontSize: '10px' }}>LEVEL 1</span>
                  </div>
                </div>
              </div>

              {/* Chat Messages - Compact */}
              <div className="relative z-10 max-h-48 overflow-y-auto p-4 space-y-3 custom-scrollbar" style={{ backgroundColor: 'rgba(20, 20, 20, 0.7)' }}>
                  
                {messages.slice(-4).map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex items-start space-x-2 max-w-[85%] ${
                      message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                    }`}>


                      {/* Message Bubble */}
                      <div className={`rounded-xl px-3 py-2`} style={{ 
                        backgroundColor: message.sender === 'user' ? 'rgba(20, 20, 20, 0.6)' : 'transparent', 
                        border: 'none',
                        color: '#eeeeee'
                      }}>
                        <p className="text-xs leading-relaxed" data-testid={`text-message-${message.id}`}>{message.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
                  
                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="flex items-start space-x-2 max-w-[85%]">

                      {/* Typing Bubble - no background for bot */}
                      <div className="rounded-xl px-3 py-2" style={{ 
                        backgroundColor: 'transparent', 
                        border: 'none',
                        color: '#eeeeee'
                      }}>
                        <div className="flex space-x-1">
                          <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                          <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                          <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                  
                  <div ref={chatEndRef} />
                </div>

              </div>

              {/* Input Area - Always Visible */}
              <div className="relative z-10 px-3 pb-3 rounded-b-xl" style={{ backgroundColor: 'rgba(20, 20, 20, 0.7)' }}>
                {showContactForm && currentStep !== 'complete' && (
                  <>
                    {/* Text Input with Response Options in Single Bar - Pill Shaped */}
                    <div className="flex items-center rounded-full p-2" style={{ backgroundColor: 'rgba(238, 238, 238, 0.2)' }}>
                        {/* Response Options - Always Available */}
                        <>
                          {/* Voice Note Button */}
                            <button
                              className="p-2 transition-all flex items-center justify-center w-7 h-7 rounded-md"
                              style={{ 
                                color: '#eeeeee',
                                backgroundColor: 'transparent'
                              }}
                              disabled={true}
                              data-testid="button-record"
                            >
                              <Mic className="w-3 h-3" />
                            </button>

                            <div className="w-px mx-1" style={{ backgroundColor: '#eeeeee', height: '100%' }}></div>

                            {/* Video Recording Button */}
                            <button
                              className="p-2 transition-all flex items-center justify-center w-7 h-7 rounded-md relative"
                              style={{ 
                                color: '#eeeeee',
                                backgroundColor: 'transparent'
                              }}
                              disabled={true}
                              data-testid="button-video-record"
                            >
                              <Video className="w-3 h-3" />
                            </button>

                            <div className="w-px mx-1" style={{ backgroundColor: '#eeeeee', height: '100%' }}></div>

                            {/* File Upload Button */}
                            <div className="relative">
                              <button
                                className="p-2 transition-all flex items-center justify-center w-7 h-7 rounded-md"
                                style={{ color: '#eeeeee' }}
                                disabled={true}
                                data-testid="button-file"
                              >
                                <Paperclip className="w-3 h-3" />
                              </button>
                            </div>

                            <div className="w-px mx-2" style={{ backgroundColor: '#eeeeee', height: '100%' }}></div>
                          </>

                        {/* Text Input */}
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
                            currentStep === 'name' ? 'Type here...' :
                            currentStep === 'email' ? 'Type here...' :
                            'Type here...'
                          }
                          type={currentStep === 'email' ? 'email' : currentStep === 'sms' ? 'tel' : 'text'}
                          className="flex-1 border-0 bg-transparent text-sm h-8 focus:ring-0 focus:outline-none px-2"
                          style={{ color: '#eeeeee', outline: 'none', boxShadow: 'none' }}
                          disabled={submitContactMutation.isPending}
                          data-testid="input-text-response"
                        />

                        <div className="w-px mx-2" style={{ backgroundColor: '#eeeeee', height: '100%' }}></div>

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
                          className="px-2 py-1 border-0 bg-transparent h-8 rounded-md"
                          style={{ color: '#eeeeee' }}
                          data-testid="button-send"
                        >
                          {submitContactMutation.isPending ? (
                            <div className="w-3 h-3 border rounded-full animate-spin" style={{ borderColor: '#eeeeee', borderTopColor: 'transparent' }} />
                          ) : (
                            <Send className="w-3 h-3" />
                          )}
                        </Button>
                      </div>

                    {/* Continue Buttons - Only show after contact form is complete */}
                    {currentStep === 'complete' && (
                      <div className="px-4 pb-3" style={{ borderTop: '1px solid #eeeeee' }}>
                        <div className="pt-3">
                          <p className="text-xs mb-3 text-center" style={{ color: 'rgba(238, 238, 238, 0.8)' }}>Choose how to continue:</p>
                          <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Button
                              onClick={onSelectFrame}
                              className="px-6 py-2 text-sm font-medium tracking-wide rounded-full transition-all duration-300"
                              style={{ 
                                backgroundColor: '#eeeeee',
                                color: '#000000',
                                border: '1px solid #eeeeee'
                              }}
                            >
                              Select a Frame
                            </Button>
                            
                            <Button
                              onClick={onFindTheLab}
                              className="px-6 py-2 text-sm font-medium tracking-wide rounded-full transition-all duration-300"
                              style={{ 
                                backgroundColor: 'transparent',
                                color: '#eeeeee',
                                border: '2px solid #eeeeee'
                              }}
                            >
                              Find The Lab
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>
  );
}
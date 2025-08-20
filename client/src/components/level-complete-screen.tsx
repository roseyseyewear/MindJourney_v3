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

      {/* Chat Interface - Exact match to futuristic-chat-interface.tsx */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="relative w-full max-w-2xl mx-auto">
          {/* Thin Border */}
          <div className="rounded-xl" style={{ backgroundColor: 'transparent', border: '1px solid #eeeeee' }}>
            <div className="w-full rounded-xl" style={{ backgroundColor: 'transparent' }}>

              {/* Header */}
              <div className="relative z-10 rounded-t-xl overflow-hidden" style={{ backgroundColor: 'rgba(20, 20, 20, 0.7)', borderBottom: '1px solid #eeeeee' }}>
                <div className="flex items-center justify-between px-3 py-3">
                  <div className="flex items-center space-x-3">
                    {/* Circle/Triangle Logo */}
                    <div className="w-5 h-5 relative">
                      <div className="w-full h-full rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(238, 238, 238, 0.2)' }}>
                        <Bot className="w-3 h-3" style={{ color: '#eeeeee' }} />
                      </div>
                    </div>
                    <div>
                      <h2 className="text-sm font-medium" style={{ color: '#eeeeee' }}>The Lab</h2>
                      <p className="text-xs" style={{ color: 'rgba(238, 238, 238, 0.6)' }}>Research Assistant</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat Messages Area */}
              <div className="rounded-b-xl overflow-hidden" style={{ backgroundColor: 'rgba(20, 20, 20, 0.7)' }}>
                <div className="px-4 py-3 max-h-48 overflow-y-auto space-y-3">
                  {messages.slice(-4).map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex items-start space-x-2 max-w-[85%] ${
                        message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                      }`}>
                        {/* Avatar */}
                        <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{
                          backgroundColor: message.sender === 'lab' 
                            ? 'rgba(238, 238, 238, 0.2)' 
                            : '#141414'
                        }}>
                          {message.sender === 'lab' ? 
                            <Bot className="w-3 h-3" style={{ color: '#eeeeee' }} /> : 
                            <User className="w-3 h-3" style={{ color: '#eeeeee' }} />
                          }
                        </div>

                        {/* Message Bubble */}
                        <div className="rounded-xl px-3 py-2" style={{
                          backgroundColor: message.sender === 'lab'
                            ? 'rgba(238, 238, 238, 0.1)'
                            : 'rgba(238, 238, 238, 0.2)',
                          color: '#eeeeee',
                          border: `1px solid rgba(238, 238, 238, ${message.sender === 'lab' ? '0.2' : '0.3'})`
                        }}>
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
                        <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(238, 238, 238, 0.2)' }}>
                          <Bot className="w-3 h-3" style={{ color: '#eeeeee' }} />
                        </div>
                        
                        {/* Typing Bubble */}
                        <div className="rounded-xl px-3 py-2" style={{
                          backgroundColor: 'rgba(238, 238, 238, 0.1)',
                          color: '#eeeeee',
                          border: '1px solid rgba(238, 238, 238, 0.2)'
                        }}>
                          <div className="flex space-x-1">
                            <div className="w-1 h-1 rounded-full animate-bounce" style={{ backgroundColor: 'rgba(238, 238, 238, 0.6)', animationDelay: '0ms' }}></div>
                            <div className="w-1 h-1 rounded-full animate-bounce" style={{ backgroundColor: 'rgba(238, 238, 238, 0.6)', animationDelay: '150ms' }}></div>
                            <div className="w-1 h-1 rounded-full animate-bounce" style={{ backgroundColor: 'rgba(238, 238, 238, 0.6)', animationDelay: '300ms' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={chatEndRef} />
                </div>

                {/* Input Area - Text only */}
                {showContactForm && currentStep !== 'complete' && (
                  <div className="px-4 pb-3" style={{ borderTop: '1px solid #eeeeee' }}>
                    <div className="pt-3">
                      <div className="mb-2">
                        <p className="text-xs mb-2" style={{ color: 'rgba(238, 238, 238, 0.8)' }}>Type your response</p>
                      </div>
                      <div className="flex items-center space-x-2 px-2 py-1 rounded-full" style={{ backgroundColor: 'rgba(20, 20, 20, 0.3)', border: '1px solid rgba(238, 238, 238, 0.2)' }}>
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
                          className="flex-1 text-sm h-7 bg-transparent border-0 focus:outline-none focus:ring-0 px-2"
                          style={{ 
                            color: '#eeeeee',
                            backgroundColor: 'transparent'
                          }}
                          disabled={submitContactMutation.isPending}
                        />
                        <button
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
                          className="p-2 transition-all flex items-center justify-center w-7 h-7 rounded-md"
                          style={{ color: '#eeeeee' }}
                        >
                          {submitContactMutation.isPending ? (
                            <div className="w-3 h-3 border rounded-full animate-spin" style={{
                              borderColor: 'rgba(238, 238, 238, 0.3)',
                              borderTopColor: '#eeeeee'
                            }} />
                          ) : (
                            <Send className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

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
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
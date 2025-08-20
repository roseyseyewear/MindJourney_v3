import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Video, Mic, Send, ArrowLeft, Bot, User } from "lucide-react";
import { type ExperimentLevel, type Question } from "@shared/schema";

interface ChatMessage {
  id: string;
  sender: 'lab' | 'user';
  type: 'text' | 'question' | 'response' | 'options';
  content: string;
  timestamp: Date;
  questionId?: string;
  options?: string[];
  allowedResponses?: ('text' | 'audio' | 'photo' | 'video')[];
}

interface ChatInterfaceProps {
  level: ExperimentLevel;
  sessionId: string;
  onComplete: (responses: any[]) => void;
  onBack: () => void;
}

export default function ChatInterface({
  level,
  sessionId,
  onComplete,
  onBack,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({});
  const [filePreview, setFilePreview] = useState<{ file: File; url: string; type: 'image' | 'video' } | null>(null);
  const [textInput, setTextInput] = useState("");
  const [awaitingResponse, setAwaitingResponse] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const { toast } = useToast();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const recordingChunks = useRef<Blob[]>([]);

  const questions = Array.isArray(level.questions) ? level.questions : [];

  // Setup looping background video
  useEffect(() => {
    const video = videoRef.current;
    if (video && level.backgroundVideoUrl) {
      video.src = level.backgroundVideoUrl;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.play().catch(console.error);
    }
  }, [level.backgroundVideoUrl]);

  // Initialize chat with welcome message sequence
  useEffect(() => {
    const initialMessage: ChatMessage = {
      id: 'hello',
      sender: 'lab',
      type: 'text',
      content: 'Hello Visitor,',
      timestamp: new Date(),
    };

    setMessages([initialMessage]);

    // Show typing indicator after a brief pause
    setTimeout(() => {
      setIsTyping(true);
    }, 800);

    // Hide typing indicator and send the hypothesis message
    setTimeout(() => {
      setIsTyping(false);
      const hypothesisMessage: ChatMessage = {
        id: 'hypothesis-question',
        sender: 'lab',
        type: 'text',
        content: 'Share your hypothesis to continue. What will you see wearing rose colored glasses? What will you feel?',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, {
        ...hypothesisMessage,
        questionId: 'hypothesis-response' // Add a questionId so buttons show
      }]);
      // Set awaiting response after the second message
      setAwaitingResponse(true);
    }, 2000); // 2 second delay total

  }, [level.levelNumber, questions]);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Submit response mutation
  const submitResponseMutation = useMutation({
    mutationFn: async ({ questionId, responseType, responseData, file }: {
      questionId: string;
      responseType: string;
      responseData: any;
      file?: File;
    }) => {
      const formData = new FormData();
      formData.append('sessionId', sessionId);
      formData.append('levelId', level.id);
      formData.append('questionId', questionId);
      formData.append('responseType', responseType);
      formData.append('responseData', JSON.stringify(responseData));
      
      if (file) {
        formData.append('file', file);
      }

      const response = await fetch('/api/response', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to submit response');
      }

      return response.json();
    },
  });

  // Submit customer data to Shopify
  const submitCustomerMutation = useMutation({
    mutationFn: async ({ email, name }: { email: string; name: string }) => {
      const response = await apiRequest('POST', '/api/shopify/customer', {
        email,
        name,
        sessionId,
      });
      return response.json();
    },
  });

  const addLabMessage = (content: string, type: 'text' | 'question' = 'text', questionId?: string) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'lab',
      type,
      content,
      timestamp: new Date(),
      questionId,
      allowedResponses: type === 'question' ? ['text', 'audio', 'photo', 'video'] : undefined,
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const addUserMessage = (content: string, type: 'text' | 'response' = 'response') => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      type,
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleTextResponse = async (questionId: string, value: string) => {
    if (!value.trim()) return;

    // Add user message to chat
    addUserMessage(value);
    setTextInput("");
    setAwaitingResponse(false);

    // Store response
    setResponses(prev => ({ ...prev, [questionId]: value }));

    // Submit response
    try {
      await submitResponseMutation.mutateAsync({
        questionId,
        responseType: 'text',
        responseData: { value },
      });

      // Add acknowledgment from The Lab
      setTimeout(() => {
        addLabMessage("Thank you for sharing that insight. Your hypothesis has been recorded.");
        
        // Immediately transition to post-submission video after hypothesis
        setTimeout(() => {
          onComplete(Object.values(responses));
        }, 1500);
      }, 1000);

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save your response. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (questionId: string, type: 'photo' | 'video', file: File) => {
    // Add user message to chat
    addUserMessage(`Shared a ${type}`);
    setAwaitingResponse(false);

    // Store response
    setUploadedFiles(prev => ({ ...prev, [questionId]: file }));
    setResponses(prev => ({ ...prev, [questionId]: `${type}_upload` }));

    // Submit response
    try {
      await submitResponseMutation.mutateAsync({
        questionId,
        responseType: type,
        responseData: { value: `${type}_upload` },
        file,
      });

      // Add acknowledgment from The Lab
      setTimeout(() => {
        addLabMessage(`I've received your ${type}. Thank you for sharing this visual perspective.`);
        
        // Immediately transition to post-submission video after media upload
        setTimeout(() => {
          onComplete(Object.values(responses));
        }, 1500);
      }, 1000);

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload your file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const startRecording = async (questionId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      recordingChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunks.current.push(event.data);
        }
      };

      mediaRecorder.current.onstop = async () => {
        const blob = new Blob(recordingChunks.current, { type: 'audio/webm' });
        const file = new File([blob], `recording_${questionId}.webm`, { type: 'audio/webm' });
        
        // Add user message to chat
        addUserMessage("Shared a voice message");
        setAwaitingResponse(false);

        // Store and submit response
        setUploadedFiles(prev => ({ ...prev, [questionId]: file }));
        setResponses(prev => ({ ...prev, [questionId]: 'audio_recording' }));

        try {
          await submitResponseMutation.mutateAsync({
            questionId,
            responseType: 'audio',
            responseData: { value: 'audio_recording' },
            file,
          });

          // Add acknowledgment from The Lab
          setTimeout(() => {
            addLabMessage("I've received your voice message. Your spoken insights are valuable to the research.");
            
            // Immediately transition to post-submission video after audio
            setTimeout(() => {
              onComplete(Object.values(responses));
            }, 1500);
          }, 1000);

        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to save your voice message. Please try again.",
            variant: "destructive",
          });
        }
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  const moveToNextQuestion = () => {
    const nextIndex = currentQuestionIndex + 1;
    
    if (nextIndex < questions.length) {
      // Move to next question
      setTimeout(() => {
        const nextQuestion = questions[nextIndex];
        addLabMessage(nextQuestion.text, 'question', nextQuestion.id);
        setCurrentQuestionIndex(nextIndex);
        setAwaitingResponse(true);
      }, 1500);
    } else {
      // All questions answered, ask for contact info
      setTimeout(() => {
        addLabMessage("Thank you for sharing your insights. To personalize your results and create your profile, I'd like to collect some basic information.");
        askForContactInfo();
      }, 1500);
    }
  };

  const askForContactInfo = () => {
    setTimeout(() => {
      addLabMessage("What name would you like me to use? (This is optional)");
      setAwaitingResponse(true);
      // Set a flag to indicate we're collecting name
      setMessages(prev => [...prev.slice(0, -1), {
        ...prev[prev.length - 1],
        questionId: 'collect_name'
      }]);
    }, 1000);
  };

  const handleContactResponse = async (type: 'name' | 'email', value: string) => {
    if (type === 'name') {
      setUserName(value);
      addUserMessage(value || "I prefer to remain anonymous");
      
      setTimeout(() => {
        addLabMessage("Great! Now, what's your email address? This will be used to share your personalized results.");
        setAwaitingResponse(true);
        setMessages(prev => [...prev.slice(0, -1), {
          ...prev[prev.length - 1],
          questionId: 'collect_email'
        }]);
      }, 1000);
    } else if (type === 'email') {
      setUserEmail(value);
      addUserMessage(value);
      
      // Submit customer data and complete
      try {
        if (value) {
          await submitCustomerMutation.mutateAsync({
            email: value,
            name: userName || 'Anonymous',
          });
        }

        setTimeout(() => {
          addLabMessage("Perfect! Your responses have been recorded and your profile has been created. Thank you for participating in this immersive research experience.");
          
          setTimeout(() => {
            onComplete(Object.values(responses));
          }, 2000);
        }, 1000);

      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to create your profile. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleSendMessage = () => {
    if (!awaitingResponse) return;
    
    const hasText = textInput.trim();
    const hasFile = filePreview;
    
    if (!hasText && !hasFile) return;

    const currentMessage = messages[messages.length - 1];
    
    // Handle file upload if present
    if (hasFile) {
      const questionId = getCurrentQuestionId();
      if (questionId) {
        handleFileUpload(questionId, hasFile.type === 'image' ? 'photo' : 'video', hasFile.file);
        // Clean up the preview
        URL.revokeObjectURL(hasFile.url);
        setFilePreview(null);
      }
      return;
    }
    
    // Handle text response
    if (currentMessage.questionId === 'collect_name') {
      handleContactResponse('name', textInput);
    } else if (currentMessage.questionId === 'collect_email') {
      handleContactResponse('email', textInput);
    } else if (currentMessage.questionId) {
      handleTextResponse(currentMessage.questionId, textInput);
    }
  };

  const getCurrentQuestionId = () => {
    // Find the last message that has a questionId
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].questionId) {
        return messages[i].questionId;
      }
    }
    // Default to hypothesis response if we're awaiting response but no questionId found
    return awaitingResponse ? 'hypothesis-response' : null;
  };

  return (
    <div className="absolute inset-0 w-full h-full">
      {/* Background Video */}
      {level.backgroundVideoUrl && (
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          muted
          loop
          playsInline
        />
      )}

      {/* Chat Interface - Compact bottom overlay */}
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
            <button
              onClick={onBack}
              className="p-1 text-white/60 hover:text-white transition-colors"
              aria-label="Back to video"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
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
          {awaitingResponse && (
            <div className="relative z-10 p-3 border-t border-white/20">
              {/* Response Options */}
              <div className="mb-3">
                <p className="text-xs text-white/80 mb-2">Record or Type your response</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {getCurrentQuestionId() && (
                    <>
                      {/* Voice Note Button */}
                      <button
                        onClick={() => isRecording ? stopRecording() : startRecording(getCurrentQuestionId()!)}
                        className={`px-3 py-1 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all text-xs flex items-center space-x-2 ${
                          isRecording ? 'border-white/50 text-white' : 'text-white/70 hover:text-white'
                        }`}
                      >
                        <Mic className="w-3 h-3" />
                        <span>{isRecording ? 'Stop' : 'Voice'}</span>
                      </button>

                      {/* Photo Upload Button */}
                      <div>
                        <input
                          ref={(el) => { fileInputRefs.current[`photo_${getCurrentQuestionId()}`] = el; }}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            console.log('📎 Chat Photo file input changed:', e.target.files);
                            const file = e.target.files?.[0];
                            if (file) {
                              console.log('📎 Selected chat photo file:', file.name, file.size);
                              const url = URL.createObjectURL(file);
                              setFilePreview({ file, url, type: 'image' });
                              toast({
                                title: "Photo ready",
                                description: "Image preview added. Click send to submit.",
                              });
                            }
                          }}
                        />
                        <button
                          onClick={() => {
                            console.log('📎 Chat Photo button clicked for question:', getCurrentQuestionId());
                            console.log('📎 File input ref:', fileInputRefs.current[`photo_${getCurrentQuestionId()}`]);
                            fileInputRefs.current[`photo_${getCurrentQuestionId()}`]?.click();
                          }}
                          className="px-3 py-1 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all text-xs flex items-center space-x-2 text-white/70 hover:text-white"
                          data-testid="button-photo-upload"
                        >
                          <Camera className="w-3 h-3" />
                          <span>Photo</span>
                        </button>
                      </div>

                      {/* Video Upload Button */}
                      <div>
                        <input
                          ref={(el) => { fileInputRefs.current[`video_${getCurrentQuestionId()}`] = el; }}
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={(e) => {
                            console.log('📎 Chat Video file input changed:', e.target.files);
                            const file = e.target.files?.[0];
                            if (file) {
                              console.log('📎 Selected chat video file:', file.name, file.size);
                              const url = URL.createObjectURL(file);
                              setFilePreview({ file, url, type: 'video' });
                              toast({
                                title: "Video ready",
                                description: "Video preview added. Click send to submit.",
                              });
                            }
                          }}
                        />
                        <button
                          onClick={() => {
                            console.log('📎 Chat Video button clicked for question:', getCurrentQuestionId());
                            console.log('📎 File input ref:', fileInputRefs.current[`video_${getCurrentQuestionId()}`]);
                            fileInputRefs.current[`video_${getCurrentQuestionId()}`]?.click();
                          }}
                          className="px-3 py-1 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all text-xs flex items-center space-x-2 text-white/70 hover:text-white"
                          data-testid="button-video-upload"
                        >
                          <Video className="w-3 h-3" />
                          <span>Video</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* File Preview Area */}
              {filePreview && (
                <div className="mb-3 p-2 rounded" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
                  <div className="relative inline-block">
                    {filePreview.type === 'image' ? (
                      <img 
                        src={filePreview.url} 
                        alt="Preview" 
                        className="max-w-32 max-h-32 rounded object-cover"
                      />
                    ) : (
                      <video 
                        src={filePreview.url} 
                        className="max-w-32 max-h-32 rounded object-cover"
                        controls
                      />
                    )}
                    {/* Remove button */}
                    <button
                      onClick={() => {
                        if (filePreview) {
                          URL.revokeObjectURL(filePreview.url);
                          setFilePreview(null);
                        }
                      }}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white"
                    >
                      ×
                    </button>
                  </div>
                  <p className="text-xs mt-1 text-white/70">
                    {filePreview.file.name}
                  </p>
                </div>
              )}

              {/* Text Input */}
              <div className="flex space-x-2">
                <Input
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type here..."
                  className="flex-1 bg-black/50 border-white/20 text-white placeholder:text-gray-400 backdrop-blur-sm text-sm h-8"
                  disabled={submitResponseMutation.isPending}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={(!textInput.trim() && !filePreview) || submitResponseMutation.isPending}
                  className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white border border-white/30 h-8"
                >
                  {submitResponseMutation.isPending ? (
                    <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send className="w-3 h-3" />
                  )}
                </Button>
              </div>

              {/* Skip Button */}
              <div className="flex justify-center mt-2">
                <button
                  onClick={() => onComplete([])}
                  className="text-white/50 hover:text-white/70 transition-colors text-xs"
                >
                  Skip questions
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
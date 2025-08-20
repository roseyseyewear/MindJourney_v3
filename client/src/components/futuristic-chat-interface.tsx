import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Camera, 
  Video, 
  Mic, 
  Send, 
  ArrowLeft, 
  Bot, 
  User, 
  Download,
  Paperclip,
  Film,
  Activity,
  Zap,
  Signal
} from "lucide-react";
import { type ExperimentLevel, type Question } from "@shared/schema";
import theLabLogo from "@assets/the-lab_logo_white-2_3_1755515290363.png";
import visitorBadge from "@assets/generated_images/Futuristic_visitor_badge_polaroid_c4504b6c.png";

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

interface FuturisticChatInterfaceProps {
  level: ExperimentLevel;
  sessionId: string;
  onComplete: (responses: any[]) => void;
  onBack: () => void;
}

export default function FuturisticChatInterface({
  level,
  sessionId,
  onComplete,
  onBack,
}: FuturisticChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({});
  const [filePreviews, setFilePreviews] = useState<Record<string, { file: File; url: string; type: 'image' | 'video' }>>({});
  const [textInput, setTextInput] = useState("");
  const [awaitingResponse, setAwaitingResponse] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [visitorNumber] = useState("0001");
  const [hypothesisCompleted, setHypothesisCompleted] = useState(false);
  const [showNotificationBadge, setShowNotificationBadge] = useState(false);
  const [showVideoLightbox, setShowVideoLightbox] = useState(false);
  const { toast } = useToast();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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

    // Check if hypothesis was completed
    if (questionId === 'hypothesis-response') {
      setHypothesisCompleted(true);
      setShowNotificationBadge(true);
    }

    // Submit response
    try {
      await submitResponseMutation.mutateAsync({
        questionId,
        responseType: 'text',
        responseData: { value },
      });

      // Add acknowledgment from The Lab
      setTimeout(() => {
        addLabMessage("Thank you for sharing that insight. It helps me understand your experience better.");
        moveToNextQuestion();
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
        moveToNextQuestion();
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
        setRecordedBlob(blob);
        setAudioURL(URL.createObjectURL(blob));
        
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

  const sendVoiceNote = async (questionId: string) => {
    if (!recordedBlob) return;

    const file = new File([recordedBlob], `recording_${questionId}.webm`, { type: 'audio/webm' });
    
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
        moveToNextQuestion();
      }, 1000);

      // Clear recording
      setRecordedBlob(null);
      setAudioURL(null);

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save your voice message. Please try again.",
        variant: "destructive",
      });
    }
  };

  const clearVoiceNote = () => {
    setRecordedBlob(null);
    if (audioURL) {
      URL.revokeObjectURL(audioURL);
      setAudioURL(null);
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
    
    const questionId = getCurrentQuestionId();
    if (!questionId) return;
    
    const hasText = textInput.trim();
    const hasFile = filePreviews[questionId];
    
    if (!hasText && !hasFile) return;

    const currentMessage = messages[messages.length - 1];
    const inputValue = textInput;
    setTextInput(''); // Clear input immediately after capturing value
    
    // Handle file upload if present
    if (hasFile) {
      const { file, type } = filePreviews[questionId];
      handleFileUpload(questionId, type === 'image' ? 'photo' : 'video', file);
      // Clean up the preview
      URL.revokeObjectURL(hasFile.url);
      setFilePreviews(prev => {
        const newPreviews = { ...prev };
        delete newPreviews[questionId];
        return newPreviews;
      });
      return;
    }
    
    // Handle text response
    if (currentMessage.questionId === 'collect_name') {
      handleContactResponse('name', inputValue);
    } else if (currentMessage.questionId === 'collect_email') {
      handleContactResponse('email', inputValue);
    } else if (currentMessage.questionId) {
      handleTextResponse(currentMessage.questionId, inputValue);
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

  const downloadVisitorBadge = () => {
    const link = document.createElement('a');
    link.href = visitorBadge;
    link.download = `visitor-badge-${visitorNumber}.png`;
    link.click();
    setShowNotificationBadge(false);
  };

  // Get current stage description
  const getStageDescription = () => {
    if (awaitingResponse) {
      return "Share your hypothesis";
    }
    if (currentQuestionIndex < questions.length) {
      return `Question ${currentQuestionIndex + 1} of ${questions.length}`;
    }
    return "Collecting profile info";
  };

  return (
    <div className="absolute inset-0 w-full h-full" style={{ fontFamily: 'Magda Clean, sans-serif' }}>
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
          {/* Thin Border */}
          <div className="rounded-xl" style={{ backgroundColor: 'transparent', border: '1px solid #eeeeee' }}>
            <div className="w-full rounded-xl" style={{ backgroundColor: 'transparent' }}>
              
              {/* Header */}
              <div className="relative z-10 rounded-t-xl overflow-hidden" style={{ backgroundColor: 'rgba(20, 20, 20, 0.7)', borderBottom: '1px solid #eeeeee' }}>
                <div className="flex items-center justify-between px-3 py-3">
                  <div className="flex items-center space-x-3">
                    {/* Circle/Triangle Logo - moved to top left */}
                    <div className="w-5 h-5 relative">
                      <img src={theLabLogo} alt="Lab Logo" className="w-full h-full object-contain" />
                    </div>
                    <span className="font-bold text-xs tracking-wide" style={{ color: '#eeeeee', fontSize: '12px' }}>VISITOR #{visitorNumber}</span>
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

              {/* Input Area - Always Visible */}
              <div className="relative z-10 px-3 pb-3 rounded-b-xl" style={{ backgroundColor: 'rgba(20, 20, 20, 0.7)' }}>
                {/* Text Input with Response Options in Single Bar - Pill Shaped */}
                <div className="flex items-center rounded-full p-2" style={{ backgroundColor: 'rgba(238, 238, 238, 0.2)' }}>
                    {/* Response Options - Always Available */}
                    <>
                      {/* Voice Recording Controls */}
                      <div className="flex items-center">
                        <button
                          onClick={() => getCurrentQuestionId() && (isRecording ? stopRecording() : startRecording(getCurrentQuestionId()!))}
                          className="p-2 transition-all flex items-center justify-center w-7 h-7 rounded-md relative"
                          style={{ 
                            color: '#eeeeee',
                            backgroundColor: isRecording ? 'rgba(238, 238, 238, 0.2)' : 'transparent'
                          }}
                          disabled={!getCurrentQuestionId()}
                          data-testid="button-record"
                        >
                          <Mic className="w-3 h-3" />
                          {isRecording && (
                            <div className="absolute -inset-1 rounded-full animate-pulse" style={{ 
                              border: '2px solid #eeeeee' 
                            }} />
                          )}
                        </button>
                      </div>

                        <div className="w-px mx-1" style={{ backgroundColor: '#eeeeee', height: '100%' }}></div>

                        {/* Camera Button - Opens Video App */}
                        <button
                          onClick={() => setShowVideoLightbox(true)}
                          className="p-2 transition-all flex items-center justify-center w-7 h-7 rounded-md"
                          style={{ color: '#eeeeee' }}
                          disabled={!getCurrentQuestionId()}
                          data-testid="button-camera"
                        >
                          <Camera className="w-3 h-3" />
                        </button>

                        <div className="w-px mx-1" style={{ backgroundColor: '#eeeeee', height: '100%' }}></div>

                        {/* File Upload Button */}
                        <div className="relative">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,video/*"
                            className="hidden"
                            onChange={(e) => {
                              console.log('📎 Paperclip file input changed:', e.target.files);
                              const file = e.target.files?.[0];
                              if (file) {
                                console.log('📎 Selected file via paperclip:', file.name, file.size, file.type);
                                const isVideo = file.type.startsWith('video/');
                                const isImage = file.type.startsWith('image/');
                                if (isImage || isVideo) {
                                  const questionId = getCurrentQuestionId()!;
                                  const url = URL.createObjectURL(file);
                                  const type = isImage ? 'image' : 'video';
                                  
                                  // Store the preview
                                  setFilePreviews(prev => ({
                                    ...prev,
                                    [questionId]: { file, url, type }
                                  }));
                                  
                                  toast({
                                    title: "File ready",
                                    description: `${type} preview added. Click send to submit.`,
                                  });
                                } else {
                                  toast({
                                    title: "Unsupported file type",
                                    description: "Please select an image or video file.",
                                    variant: "destructive",
                                  });
                                }
                              }
                              // Reset the input value to allow selecting the same file again
                              e.target.value = '';
                            }}
                          />
                          <button
                            onClick={() => {
                              console.log('📎 Paperclip button clicked for question:', getCurrentQuestionId());
                              console.log('📎 File input ref:', fileInputRef.current);
                              fileInputRef.current?.click();
                            }}
                            className="p-2 transition-all flex items-center justify-center w-7 h-7 rounded-md"
                            style={{ color: '#eeeeee' }}
                            disabled={!getCurrentQuestionId()}
                            data-testid="button-file"
                          >
                            <Paperclip className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="w-px mx-2" style={{ backgroundColor: '#eeeeee', height: '100%' }}></div>
                      </>

                    {/* Voice Recording Preview */}
                    {recordedBlob && (
                      <div className="flex items-center space-x-2 px-2 py-1 rounded-full" style={{ backgroundColor: 'rgba(20, 20, 20, 0.3)', border: '1px solid rgba(238, 238, 238, 0.2)' }}>
                        <audio 
                          controls 
                          className="h-6 w-32" 
                          style={{ 
                            filter: 'invert(1)',
                            transform: 'scale(0.8)'
                          }}
                        >
                          <source src={audioURL || ''} type="audio/webm" />
                        </audio>
                        <button
                          onClick={() => getCurrentQuestionId() && sendVoiceNote(getCurrentQuestionId()!)}
                          className="p-1 transition-all flex items-center justify-center w-6 h-6 rounded-md"
                          style={{ color: '#eeeeee', backgroundColor: 'rgba(20, 20, 20, 0.2)' }}
                          disabled={!getCurrentQuestionId()}
                          data-testid="button-send-voice"
                          title="Send voice note"
                        >
                          <Send className="w-3 h-3" />
                        </button>
                        <button
                          onClick={clearVoiceNote}
                          className="p-1 transition-all flex items-center justify-center w-6 h-6 rounded-md"
                          style={{ color: '#eeeeee', backgroundColor: 'rgba(20, 20, 20, 0.2)' }}
                          data-testid="button-clear-voice"
                          title="Clear recording"
                        >
                          ×
                        </button>
                      </div>
                    )}

                    {/* Text Input */}
                    {!recordedBlob && (
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
                        className="flex-1 border-0 bg-transparent text-sm h-8 focus:ring-0 focus:outline-none px-2"
                        style={{ color: '#eeeeee', outline: 'none', boxShadow: 'none' }}
                        disabled={submitResponseMutation.isPending}
                        data-testid="input-text-response"
                      />
                    )}
                    
                    {!recordedBlob && (
                      <>
                        <div className="w-px mx-2" style={{ backgroundColor: '#eeeeee', height: '100%' }}></div>
                        
                        <Button
                          onClick={handleSendMessage}
                          disabled={((!textInput.trim() && (!getCurrentQuestionId() || !filePreviews[getCurrentQuestionId()!])) || submitResponseMutation.isPending || !getCurrentQuestionId())}
                          className="px-2 py-1 border-0 bg-transparent h-8 rounded-md"
                          style={{ color: '#eeeeee' }}
                          data-testid="button-send"
                        >
                          {submitResponseMutation.isPending ? (
                            <div className="w-3 h-3 border rounded-full animate-spin" style={{ borderColor: '#eeeeee', borderTopColor: 'transparent' }} />
                          ) : (
                            <Send className="w-3 h-3" />
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                  
                  {/* File Preview Area */}
                  {getCurrentQuestionId() && filePreviews[getCurrentQuestionId()!] && (
                    <div className="mt-2 p-2 rounded" style={{ backgroundColor: 'rgba(238, 238, 238, 0.1)' }}>
                      <div className="relative inline-block">
                        {filePreviews[getCurrentQuestionId()!].type === 'image' ? (
                          <img 
                            src={filePreviews[getCurrentQuestionId()!].url} 
                            alt="Preview" 
                            className="max-w-32 max-h-32 rounded object-cover"
                            style={{ filter: 'none', background: 'none' }}
                          />
                        ) : (
                          <video 
                            src={filePreviews[getCurrentQuestionId()!].url} 
                            className="max-w-32 max-h-32 rounded object-cover"
                            controls
                            style={{ filter: 'none', background: 'none' }}
                          />
                        )}
                        {/* Remove button - White circle with black X */}
                        <button
                          onClick={() => {
                            const questionId = getCurrentQuestionId()!;
                            URL.revokeObjectURL(filePreviews[questionId].url);
                            setFilePreviews(prev => {
                              const newPreviews = { ...prev };
                              delete newPreviews[questionId];
                              return newPreviews;
                            });
                          }}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-white hover:bg-gray-100 rounded-full flex items-center justify-center shadow-md transition-colors"
                          style={{ 
                            color: 'black',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            border: '1px solid #e5e7eb'
                          }}
                        >
                          ×
                        </button>
                      </div>
                      <p className="text-xs mt-1" style={{ color: '#eeeeee' }}>
                        {filePreviews[getCurrentQuestionId()!].file.name}
                      </p>
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
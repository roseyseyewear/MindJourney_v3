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
  const [isVideoRecording, setIsVideoRecording] = useState(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({});
  const [textInput, setTextInput] = useState("");
  const [awaitingResponse, setAwaitingResponse] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const { toast } = useToast();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const videoMediaRecorder = useRef<MediaRecorder | null>(null);
  const recordingChunks = useRef<Blob[]>([]);
  const videoRecordingChunks = useRef<Blob[]>([]);

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

  const startVideoRecording = async (questionId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      videoMediaRecorder.current = new MediaRecorder(stream);
      videoRecordingChunks.current = [];

      videoMediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          videoRecordingChunks.current.push(event.data);
        }
      };

      videoMediaRecorder.current.onstop = async () => {
        const blob = new Blob(videoRecordingChunks.current, { type: 'video/webm' });
        const file = new File([blob], `video_recording_${questionId}.webm`, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedVideoUrl(url);
        
        // Stop all tracks to turn off camera
        stream.getTracks().forEach(track => track.stop());
      };

      videoMediaRecorder.current.start();
      setIsVideoRecording(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopVideoRecording = () => {
    if (videoMediaRecorder.current && videoMediaRecorder.current.state === 'recording') {
      videoMediaRecorder.current.stop();
      setIsVideoRecording(false);
    }
  };

  const sendRecordedVideo = async (questionId: string) => {
    if (!recordedVideoUrl) return;

    // Convert URL back to file
    const response = await fetch(recordedVideoUrl);
    const blob = await response.blob();
    const file = new File([blob], `video_recording_${questionId}.webm`, { type: 'video/webm' });

    // Handle the file upload
    await handleFileUpload(questionId, 'video', file);
    
    // Clean up
    URL.revokeObjectURL(recordedVideoUrl);
    setRecordedVideoUrl(null);
  };

  const discardRecordedVideo = () => {
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl);
      setRecordedVideoUrl(null);
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
    if (!textInput.trim() || !awaitingResponse) return;

    const currentMessage = messages[messages.length - 1];
    
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
          <div className="absolute inset-0 rounded-lg" style={{ backgroundColor: 'rgba(20, 20, 20, 0.7)' }}></div>
          
          {/* Header */}
          <div className="relative z-10 flex items-center justify-between p-4 border-b" style={{ borderColor: 'rgba(238, 238, 238, 0.2)' }}>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(238, 238, 238, 0.2)' }}>
                <Bot className="w-4 h-4" style={{ color: '#eeeeee' }} />
              </div>
              <div>
                <h2 className="text-base font-medium" style={{ color: '#eeeeee' }}>The Lab</h2>
                <p className="text-xs" style={{ color: 'rgba(238, 238, 238, 0.6)' }}>Research Assistant</p>
              </div>
            </div>
            <button
              onClick={onBack}
              className="p-1 transition-colors"
              style={{ color: 'rgba(238, 238, 238, 0.6)' }}
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
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0`} style={{
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

          {/* Input Area - Compact */}
          {awaitingResponse && (
            <div className="relative z-10 p-3 border-t" style={{ borderColor: 'rgba(238, 238, 238, 0.2)' }}>
              {/* Response Options */}
              <div className="mb-3">
                <p className="text-xs mb-2" style={{ color: 'rgba(238, 238, 238, 0.8)' }}>Record or Type your response</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {getCurrentQuestionId() && (
                    <>
                      {/* Voice Note Button */}
                      <button
                        onClick={() => isRecording ? stopRecording() : startRecording(getCurrentQuestionId()!)}
                        className="px-3 py-1 rounded-full backdrop-blur-sm transition-all text-xs flex items-center space-x-2"
                        style={{
                          border: `1px solid rgba(238, 238, 238, ${isRecording ? '0.5' : '0.2'})`,
                          backgroundColor: 'rgba(238, 238, 238, 0.1)',
                          color: isRecording ? '#eeeeee' : 'rgba(238, 238, 238, 0.7)'
                        }}
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
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(getCurrentQuestionId()!, 'photo', file);
                          }}
                        />
                        <button
                          onClick={() => fileInputRefs.current[`photo_${getCurrentQuestionId()}`]?.click()}
                          className="px-3 py-1 rounded-full backdrop-blur-sm transition-all text-xs flex items-center space-x-2"
                          style={{
                            border: '1px solid rgba(238, 238, 238, 0.2)',
                            backgroundColor: 'rgba(238, 238, 238, 0.1)',
                            color: 'rgba(238, 238, 238, 0.7)'
                          }}
                        >
                          <Camera className="w-3 h-3" />
                          <span>Photo</span>
                        </button>
                      </div>

                      {/* Video Recording/Upload Button */}
                      <div className="flex gap-2">
                        {/* Video Recording Button */}
                        <button
                          onClick={() => isVideoRecording ? stopVideoRecording() : startVideoRecording(getCurrentQuestionId()!)}
                          className="px-3 py-1 rounded-full backdrop-blur-sm transition-all text-xs flex items-center space-x-2"
                          style={{
                            border: `1px solid rgba(238, 238, 238, ${isVideoRecording ? '0.5' : '0.2'})`,
                            backgroundColor: isVideoRecording ? 'rgba(255, 0, 0, 0.2)' : 'rgba(238, 238, 238, 0.1)',
                            color: isVideoRecording ? '#ff4444' : 'rgba(238, 238, 238, 0.7)'
                          }}
                        >
                          <Video className="w-3 h-3" />
                          <span>{isVideoRecording ? 'Stop' : 'Record'}</span>
                        </button>

                        {/* Video Upload Button */}
                        <div>
                          <input
                            ref={(el) => { fileInputRefs.current[`video_${getCurrentQuestionId()}`] = el; }}
                            type="file"
                            accept="video/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(getCurrentQuestionId()!, 'video', file);
                            }}
                          />
                          <button
                            onClick={() => fileInputRefs.current[`video_${getCurrentQuestionId()}`]?.click()}
                            className="px-2 py-1 rounded-full backdrop-blur-sm transition-all text-xs flex items-center"
                            style={{
                              border: '1px solid rgba(238, 238, 238, 0.2)',
                              backgroundColor: 'rgba(238, 238, 238, 0.1)',
                              color: 'rgba(238, 238, 238, 0.7)'
                            }}
                          >
                            📁
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Video Preview */}
              {recordedVideoUrl && (
                <div className="mb-3 p-3 rounded-lg" style={{ backgroundColor: 'rgba(238, 238, 238, 0.1)' }}>
                  <p className="text-xs mb-2" style={{ color: 'rgba(238, 238, 238, 0.8)' }}>Video recorded. Preview and send or discard:</p>
                  <video 
                    src={recordedVideoUrl} 
                    controls 
                    className="w-full max-w-xs rounded-lg mb-2"
                    style={{ maxHeight: '120px' }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => sendRecordedVideo(getCurrentQuestionId()!)}
                      className="px-3 py-1 rounded-full text-xs"
                      style={{
                        backgroundColor: 'rgba(0, 255, 0, 0.2)',
                        border: '1px solid rgba(0, 255, 0, 0.3)',
                        color: '#00ff00'
                      }}
                    >
                      Send Video
                    </button>
                    <button
                      onClick={discardRecordedVideo}
                      className="px-3 py-1 rounded-full text-xs"
                      style={{
                        backgroundColor: 'rgba(255, 0, 0, 0.2)',
                        border: '1px solid rgba(255, 0, 0, 0.3)',
                        color: '#ff4444'
                      }}
                    >
                      Discard
                    </button>
                  </div>
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
                  className="flex-1 backdrop-blur-sm text-sm h-8"
                  style={{
                    backgroundColor: 'rgba(20, 20, 20, 0.5)',
                    borderColor: 'rgba(238, 238, 238, 0.2)',
                    color: '#eeeeee'
                  }}
                  disabled={submitResponseMutation.isPending}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!textInput.trim() || submitResponseMutation.isPending}
                  className="px-3 py-1 h-8"
                  style={{
                    backgroundColor: 'rgba(238, 238, 238, 0.2)',
                    border: '1px solid rgba(238, 238, 238, 0.3)',
                    color: '#eeeeee'
                  }}
                >
                  {submitResponseMutation.isPending ? (
                    <div className="w-3 h-3 border rounded-full animate-spin" style={{
                      borderColor: 'rgba(238, 238, 238, 0.3)',
                      borderTopColor: '#eeeeee'
                    }} />
                  ) : (
                    <Send className="w-3 h-3" />
                  )}
                </Button>
              </div>

              {/* Skip Button */}
              <div className="flex justify-center mt-2">
                <button
                  onClick={() => onComplete([])}
                  className="transition-colors text-xs"
                  style={{ color: 'rgba(238, 238, 238, 0.5)' }}
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
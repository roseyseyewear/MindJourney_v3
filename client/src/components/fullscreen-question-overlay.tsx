import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Camera, Video, Mic, X, ArrowLeft } from "lucide-react";
import { type ExperimentLevel, type Question } from "@shared/schema";

interface FullscreenQuestionOverlayProps {
  level: ExperimentLevel;
  sessionId: string;
  onComplete: (responses: any[]) => void;
  onBack: () => void;
}

export default function FullscreenQuestionOverlay({
  level,
  sessionId,
  onComplete,
  onBack,
}: FullscreenQuestionOverlayProps) {
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({});
  const { toast } = useToast();
  
  const videoRef = useRef<HTMLVideoElement>(null);
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

  const handleTextResponse = (questionId: string, value: string) => {
    setResponses(prev => ({ ...prev, [questionId]: value }));
  };

  const handleFileUpload = (questionId: string, type: 'photo' | 'video', file: File) => {
    setUploadedFiles(prev => ({ ...prev, [questionId]: file }));
    setResponses(prev => ({ ...prev, [questionId]: `${type}_upload` }));
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

      mediaRecorder.current.onstop = () => {
        const blob = new Blob(recordingChunks.current, { type: 'audio/webm' });
        const file = new File([blob], `recording_${questionId}.webm`, { type: 'audio/webm' });
        setUploadedFiles(prev => ({ ...prev, [questionId]: file }));
        setResponses(prev => ({ ...prev, [questionId]: 'audio_recording' }));
        
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

  const handleSubmit = async () => {
    const submissionPromises: Promise<any>[] = [];

    // Submit all responses
    questions.forEach((question: Question) => {
      const response = responses[question.id];
      const file = uploadedFiles[question.id];

      if (response || file) {
        submissionPromises.push(
          submitResponseMutation.mutateAsync({
            questionId: question.id,
            responseType: typeof response === 'string' ? response : 'text',
            responseData: { value: response },
            file,
          })
        );
      }
    });

    // Submit customer data if provided
    if (userEmail) {
      submissionPromises.push(
        submitCustomerMutation.mutateAsync({
          email: userEmail,
          name: userName || 'Anonymous',
        })
      );
    }

    try {
      await Promise.all(submissionPromises);
      
      toast({
        title: "Responses Saved",
        description: "Your responses have been recorded successfully.",
      });

      onComplete(Object.values(responses));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save responses. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="fullscreen-container">
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

      {/* Overlay Content */}
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar">
          {/* Semi-transparent overlay background */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm rounded-lg"></div>
          
          {/* Content */}
          <div className="relative z-10 p-8 text-white">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-light mb-2 experiment-text-primary">
                  {questions[0]?.title || "Reflection Point"}
                </h2>
                <p className="experiment-text-secondary text-sm">
                  Level {level.levelNumber} • Continue your immersive journey
                </p>
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={onBack}
                  className="p-2 experiment-text-secondary hover:experiment-text-primary transition-colors"
                  aria-label="Back to video"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Questions */}
            <div className="space-y-8">
              {questions.map((question: Question) => (
                <div key={question.id} className="space-y-6">
                  <p className="experiment-text-primary text-xl leading-relaxed">
                    {question.text}
                  </p>

                  {/* Text Response */}
                  <div className="space-y-3">
                    <Label className="text-base font-medium experiment-text-primary">
                      Written Response
                    </Label>
                    <Textarea
                      className="w-full p-4 bg-black/50 border-white/20 text-white placeholder:text-gray-400 resize-none backdrop-blur-sm"
                      rows={4}
                      placeholder="Share your thoughts and experiences..."
                      value={responses[question.id] || ''}
                      onChange={(e) => handleTextResponse(question.id, e.target.value)}
                    />
                  </div>

                  {/* Media Upload Options */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Voice Note */}
                    <div className="space-y-3">
                      <Label className="block text-base font-medium experiment-text-primary">
                        Voice Note
                      </Label>
                      <button
                        onClick={() => isRecording ? stopRecording() : startRecording(question.id)}
                        className="w-full p-6 border border-white/20 bg-black/30 hover:bg-black/50 backdrop-blur-sm transition-all text-center group rounded-lg"
                      >
                        <Mic className={`w-10 h-10 mb-3 mx-auto transition-colors ${
                          isRecording ? 'text-red-400' : 'text-white/70 group-hover:text-white'
                        }`} />
                        <p className="text-sm text-white/70 group-hover:text-white">
                          {isRecording ? 'Stop Recording' : 'Record Audio'}
                        </p>
                      </button>
                    </div>

                    {/* Photo Upload */}
                    <div className="space-y-3">
                      <Label className="block text-base font-medium experiment-text-primary">
                        Photo Response
                      </Label>
                      <div className="relative">
                        <input
                          ref={(el) => { fileInputRefs.current[`photo_${question.id}`] = el; }}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(question.id, 'photo', file);
                          }}
                        />
                        <button
                          onClick={() => fileInputRefs.current[`photo_${question.id}`]?.click()}
                          className="w-full p-6 border border-white/20 bg-black/30 hover:bg-black/50 backdrop-blur-sm transition-all text-center group rounded-lg"
                        >
                          <Camera className="w-10 h-10 mb-3 mx-auto text-white/70 group-hover:text-white transition-colors" />
                          <p className="text-sm text-white/70 group-hover:text-white">
                            Upload Photo
                          </p>
                        </button>
                      </div>
                    </div>

                    {/* Video Upload */}
                    <div className="space-y-3">
                      <Label className="block text-base font-medium experiment-text-primary">
                        Video Response
                      </Label>
                      <div className="relative">
                        <input
                          ref={(el) => { fileInputRefs.current[`video_${question.id}`] = el; }}
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(question.id, 'video', file);
                          }}
                        />
                        <button
                          onClick={() => fileInputRefs.current[`video_${question.id}`]?.click()}
                          className="w-full p-6 border border-white/20 bg-black/30 hover:bg-black/50 backdrop-blur-sm transition-all text-center group rounded-lg"
                        >
                          <Video className="w-10 h-10 mb-3 mx-auto text-white/70 group-hover:text-white transition-colors" />
                          <p className="text-sm text-white/70 group-hover:text-white">
                            Upload Video
                          </p>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Contact Information */}
              <div className="border-t border-white/20 pt-8 space-y-6">
                <h3 className="text-xl font-medium experiment-text-primary">
                  Connect Your Experience
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="block text-base font-medium experiment-text-primary">
                      Name (Optional)
                    </Label>
                    <Input
                      type="text"
                      className="bg-black/50 border-white/20 text-white placeholder:text-gray-400 backdrop-blur-sm"
                      placeholder="Your name"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="block text-base font-medium experiment-text-primary">
                      Email
                    </Label>
                    <Input
                      type="email"
                      className="bg-black/50 border-white/20 text-white placeholder:text-gray-400 backdrop-blur-sm"
                      placeholder="your@email.com"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                    />
                  </div>
                </div>
                <p className="text-sm text-white/60">
                  Your email will be used to share personalized results and create your customer profile.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-8 border-t border-white/20">
                <button
                  onClick={() => onComplete([])}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  Skip Questions
                </button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitResponseMutation.isPending}
                  className="px-8 py-3 bg-white text-black hover:bg-gray-200 transition-colors text-lg font-medium"
                >
                  {submitResponseMutation.isPending ? 'Saving...' : 'Continue Journey'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
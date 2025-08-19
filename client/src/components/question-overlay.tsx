import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Camera, Video, Mic, Upload } from "lucide-react";
import { type ExperimentLevel, type Question } from "@shared/schema";

interface QuestionOverlayProps {
  level: ExperimentLevel;
  sessionId: string;
  onComplete: (responses: any[]) => void;
  onBack: () => void;
}

export default function QuestionOverlay({
  level,
  sessionId,
  onComplete,
  onBack,
}: QuestionOverlayProps) {
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({});
  const { toast } = useToast();
  
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const recordingChunks = useRef<Blob[]>([]);

  const questions = Array.isArray(level.questions) ? level.questions : [];

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
    <div className="absolute inset-0 flex items-center justify-center p-4 fade-in">
      <div className="video-overlay-fade backdrop-blur-sm experiment-border border rounded-none max-w-2xl w-full max-h-[80vh] overflow-y-auto custom-scrollbar">
        
        {/* Header */}
        <div className="experiment-border border-b p-6">
          <h2 className="text-2xl font-light mb-2 experiment-text-primary">
            Reflection Point
          </h2>
          <p className="experiment-text-secondary text-sm">
            Level {level.levelNumber} • Question 1 of {questions.length}
          </p>
        </div>

        {/* Questions */}
        <div className="p-6 space-y-6">
          {questions.map((question: Question) => (
            <div key={question.id} className="space-y-4">
              <p className="experiment-text-primary text-lg leading-relaxed">
                {question.text}
              </p>

              {/* Text Response */}
              <div className="space-y-2">
                <Label className="text-sm font-medium experiment-text-primary">
                  Written Response
                </Label>
                <Textarea
                  className="w-full p-4 experiment-input resize-none"
                  rows={4}
                  placeholder="Share your thoughts..."
                  value={responses[question.id] || ''}
                  onChange={(e) => handleTextResponse(question.id, e.target.value)}
                />
              </div>

              {/* Media Upload Options */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Voice Note */}
                <div className="space-y-2">
                  <Label className="block text-sm font-medium experiment-text-primary">
                    Voice Note
                  </Label>
                  <button
                    onClick={() => isRecording ? stopRecording() : startRecording(question.id)}
                    className="w-full p-4 experiment-border border hover:border-white transition-colors text-center group"
                  >
                    <Mic className={`w-8 h-8 mb-2 mx-auto transition-colors ${
                      isRecording ? 'text-red-500' : 'experiment-text-secondary group-hover:experiment-text-primary'
                    }`} />
                    <p className="text-xs experiment-text-secondary group-hover:experiment-text-primary">
                      {isRecording ? 'Stop Recording' : 'Record voice note'}
                    </p>
                  </button>
                </div>

                {/* Photo Upload */}
                <div className="space-y-2">
                  <Label className="block text-sm font-medium experiment-text-primary">
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
                      className="w-full p-4 experiment-border border hover:border-white transition-colors text-center group"
                    >
                      <Camera className="w-8 h-8 mb-2 mx-auto experiment-text-secondary group-hover:experiment-text-primary transition-colors" />
                      <p className="text-xs experiment-text-secondary group-hover:experiment-text-primary">
                        Take photo
                      </p>
                    </button>
                  </div>
                </div>

                {/* Video Upload */}
                <div className="space-y-2">
                  <Label className="block text-sm font-medium experiment-text-primary">
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
                      className="w-full p-4 experiment-border border hover:border-white transition-colors text-center group"
                    >
                      <Video className="w-8 h-8 mb-2 mx-auto experiment-text-secondary group-hover:experiment-text-primary transition-colors" />
                      <p className="text-xs experiment-text-secondary group-hover:experiment-text-primary">
                        Record video
                      </p>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Contact Information */}
          <div className="experiment-border border-t pt-6 space-y-4">
            <h3 className="text-lg font-medium experiment-text-primary">
              Connect Your Experience
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="block text-sm font-medium experiment-text-primary">
                  Name (Optional)
                </Label>
                <Input
                  type="text"
                  className="experiment-input"
                  placeholder="Your name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="block text-sm font-medium experiment-text-primary">
                  Email
                </Label>
                <Input
                  type="email"
                  className="experiment-input"
                  placeholder="your@email.com"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs experiment-text-secondary">
              Your email will be used to share your personalized results and create your customer profile.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-6 experiment-border border-t">
            <button
              onClick={onBack}
              className="experiment-text-secondary hover:experiment-text-primary transition-colors"
            >
              Back to Video
            </button>
            <div className="flex space-x-4">
              <Button
                variant="outline"
                onClick={() => onComplete([])}
                className="px-6 py-3 experiment-border border experiment-text-primary hover:bg-gray-600/20 transition-colors"
              >
                Skip Questions
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitResponseMutation.isPending}
                className="px-6 py-3 experiment-button-primary hover:bg-white transition-colors"
              >
                {submitResponseMutation.isPending ? 'Saving...' : 'Next Level'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

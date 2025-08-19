import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, UserCheck, Users } from "lucide-react";

export interface ParticipationChoice {
  type: 'public' | 'private' | 'anonymous';
  showName: boolean;
  shareResponses: boolean;
}

interface ParticipationSettingsProps {
  onComplete: (settings: ParticipationChoice) => void;
  onSkip: () => void;
}

export default function ParticipationSettings({
  onComplete,
  onSkip,
}: ParticipationSettingsProps) {
  const [participationType, setParticipationType] = useState<'public' | 'private' | 'anonymous'>('private');
  const [showName, setShowName] = useState(true);
  const [shareResponses, setShareResponses] = useState(true);

  const handleContinue = () => {
    onComplete({
      type: participationType,
      showName: participationType !== 'anonymous' ? showName : false,
      shareResponses: participationType !== 'private' ? shareResponses : false,
    });
  };

  const participationOptions = [
    {
      value: 'public' as const,
      title: 'Publicly (let visitors see my name and responses)',
      description: 'Your name and responses will be visible to other visitors of this experience',
      icon: <Users className="w-5 h-5" />,
      color: 'text-blue-400 border-blue-400/30',
    },
    {
      value: 'private' as const,
      title: 'Privately (only let the experiment see my name and responses)',
      description: 'Only the experiment administrators will see your information',
      icon: <EyeOff className="w-5 h-5" />,
      color: 'text-green-400 border-green-400/30',
    },
    {
      value: 'anonymous' as const,
      title: 'Anonymous publicly (exclude name, share responses)',
      description: 'Your responses may be shared publicly, but without your name or personal details',
      icon: <UserCheck className="w-5 h-5" />,
      color: 'text-purple-400 border-purple-400/30',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl experiment-bg experiment-border border-2">
        <CardHeader className="text-center space-y-4">
          <CardTitle className="text-2xl experiment-text-primary">
            Choose How to Participate
          </CardTitle>
          <CardDescription className="text-lg experiment-text-secondary">
            Select your privacy preferences for this experiment
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <RadioGroup
            value={participationType}
            onValueChange={(value) => setParticipationType(value as 'public' | 'private' | 'anonymous')}
            className="space-y-4"
          >
            {participationOptions.map((option) => (
              <div
                key={option.value}
                className={`relative border-2 rounded-lg p-4 transition-all cursor-pointer hover:border-white/30 ${
                  participationType === option.value
                    ? option.color
                    : 'experiment-border'
                }`}
                onClick={() => setParticipationType(option.value)}
              >
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center space-x-2">
                      {option.icon}
                      <Label
                        htmlFor={option.value}
                        className="text-base font-medium experiment-text-primary cursor-pointer"
                      >
                        {option.title}
                      </Label>
                    </div>
                    <p className="text-sm experiment-text-secondary leading-relaxed">
                      {option.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </RadioGroup>

          {/* Advanced Options */}
          {participationType !== 'anonymous' && (
            <div className="space-y-4 pt-4 experiment-border border-t">
              <h4 className="text-lg font-medium experiment-text-primary">
                Privacy Options
              </h4>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="showName"
                    checked={showName}
                    onCheckedChange={(checked) => setShowName(checked as boolean)}
                  />
                  <Label htmlFor="showName" className="text-sm experiment-text-primary cursor-pointer">
                    Include my name with responses
                  </Label>
                </div>
                
                {participationType === 'public' && (
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="shareResponses"
                      checked={shareResponses}
                      onCheckedChange={(checked) => setShareResponses(checked as boolean)}
                    />
                    <Label htmlFor="shareResponses" className="text-sm experiment-text-primary cursor-pointer">
                      Allow my responses to be shared publicly
                    </Label>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Privacy Summary */}
          <div className="experiment-border border rounded-lg p-4 bg-gray-900/20">
            <h5 className="text-sm font-medium experiment-text-primary mb-2">
              Privacy Summary:
            </h5>
            <ul className="text-xs experiment-text-secondary space-y-1">
              {participationType === 'public' && (
                <>
                  <li>• Your {showName ? 'name and ' : ''}responses may be visible to other visitors</li>
                  <li>• You can control sharing settings above</li>
                </>
              )}
              {participationType === 'private' && (
                <>
                  <li>• Only experiment administrators will see your information</li>
                  <li>• Your data will not be shared publicly</li>
                </>
              )}
              {participationType === 'anonymous' && (
                <>
                  <li>• Your name and personal details will be excluded</li>
                  <li>• Responses may be shared publicly without identifying you</li>
                </>
              )}
              <li>• You can always contact us to modify your privacy preferences</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-6 experiment-border border-t">
            <Button
              variant="ghost"
              onClick={onSkip}
              className="experiment-text-secondary hover:experiment-text-primary"
            >
              Skip for now
            </Button>
            <Button
              onClick={handleContinue}
              className="px-8 py-3 experiment-button-primary hover:bg-white transition-colors"
            >
              Continue to Experiment
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
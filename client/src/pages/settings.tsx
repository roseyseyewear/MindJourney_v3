import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, Settings, FileText, FolderOpen } from 'lucide-react';

export default function SettingsPage() {
  const [serviceAccountKey, setServiceAccountKey] = useState('');
  const [folderId, setFolderId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const { toast } = useToast();

  const validateJSON = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      return parsed.type === 'service_account' && parsed.private_key && parsed.client_email;
    } catch {
      return false;
    }
  };

  const handleSave = async () => {
    if (!serviceAccountKey.trim() || !folderId.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both the service account key and folder ID.",
        variant: "destructive",
      });
      return;
    }

    if (!validateJSON(serviceAccountKey)) {
      toast({
        title: "Invalid Service Account Key",
        description: "Please provide a valid JSON service account key.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/settings/google-drive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceAccountKey,
          folderId
        }),
      });

      if (response.ok) {
        setIsConfigured(true);
        toast({
          title: "Settings Saved",
          description: "Google Drive integration is now configured. All responses will be saved to your folder.",
        });
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save Google Drive settings. Please check your credentials.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Settings className="w-8 h-8" />
            Experiment Settings
          </h1>
          <p className="text-gray-400">Configure Google Drive integration for storing user responses</p>
        </div>

        <div className="grid gap-6">
          {/* Status Card */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                {isConfigured ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    Google Drive Configured
                  </>
                ) : (
                  <>
                    <Settings className="w-5 h-5 text-yellow-500" />
                    Configuration Required
                  </>
                )}
              </CardTitle>
              <CardDescription>
                {isConfigured 
                  ? "All user responses will be automatically saved to your Google Drive folder."
                  : "Set up Google Drive integration to store experiment responses."
                }
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Service Account Key */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Service Account Key
              </CardTitle>
              <CardDescription>
                JSON key file from Google Cloud Console → APIs & Services → Credentials
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="serviceKey" className="text-white">Service Account JSON</Label>
                <Textarea
                  id="serviceKey"
                  placeholder="Paste your service account JSON key here..."
                  value={serviceAccountKey}
                  onChange={(e) => setServiceAccountKey(e.target.value)}
                  className="mt-2 bg-gray-700 border-gray-600 text-white min-h-[120px] font-mono text-sm"
                />
              </div>
              
              <Alert className="bg-blue-500/10 border-blue-500/30">
                <AlertDescription className="text-blue-200">
                  <strong>How to get this:</strong> Go to Google Cloud Console → Create a Service Account → Download JSON key
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Folder ID */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <FolderOpen className="w-5 h-5" />
                Google Drive Folder ID
              </CardTitle>
              <CardDescription>
                The ID of the folder where responses will be stored
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="folderId" className="text-white">Folder ID</Label>
                <Input
                  id="folderId"
                  placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                  value={folderId}
                  onChange={(e) => setFolderId(e.target.value)}
                  className="mt-2 bg-gray-700 border-gray-600 text-white"
                />
              </div>
              
              <Alert className="bg-blue-500/10 border-blue-500/30">
                <AlertDescription className="text-blue-200">
                  <strong>How to get this:</strong> Open your Google Drive folder → Copy the ID from the URL after /folders/
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button 
              onClick={handleSave} 
              disabled={isLoading}
              className="bg-white text-black hover:bg-gray-200"
            >
              {isLoading ? "Saving..." : "Save Configuration"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
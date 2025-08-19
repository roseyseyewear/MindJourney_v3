import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Download, FileText, Image, Video, Mic, Calendar, User, ExternalLink } from 'lucide-react';

interface FileResponse {
  id: string;
  sessionId: string;
  responseType: string;
  responseData: any;
  metadata?: {
    firebaseStorage?: {
      downloadURL: string;
      filePath: string;
    }
  };
  createdAt: string;
}

export default function AdminPage() {
  const [responses, setResponses] = useState<FileResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sessions, setSessions] = useState<Record<string, any>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchAllResponses();
  }, []);

  const fetchAllResponses = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/responses');
      if (response.ok) {
        const data = await response.json();
        setResponses(data.responses || []);
        setSessions(data.sessions || {});
      } else {
        throw new Error('Failed to fetch responses');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load experiment responses.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getFileIcon = (responseType: string) => {
    switch (responseType) {
      case 'text': return <FileText className="w-4 h-4" />;
      case 'photo': return <Image className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case 'audio': return <Mic className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getFileTypeColor = (responseType: string) => {
    switch (responseType) {
      case 'text': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'photo': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'video': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'audio': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const downloadFile = (responseId: string, fileName: string) => {
    const downloadUrl = `/api/download/${responseId}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const groupedBySession = responses.reduce((acc, response) => {
    if (!acc[response.sessionId]) {
      acc[response.sessionId] = [];
    }
    acc[response.sessionId].push(response);
    return acc;
  }, {} as Record<string, FileResponse[]>);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6 flex items-center justify-center">
        <div className="text-white">Loading experiment data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Calendar className="w-8 h-8" />
            Experiment Responses
          </h1>
          <p className="text-gray-400">View and download all participant responses from Firebase Storage</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-white">{Object.keys(groupedBySession).length}</div>
              <div className="text-sm text-gray-400">Total Sessions</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-white">{responses.length}</div>
              <div className="text-sm text-gray-400">Total Responses</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-white">
                {responses.filter(r => r.metadata?.firebaseStorage).length}
              </div>
              <div className="text-sm text-gray-400">Files in Storage</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-4">
              <Button onClick={fetchAllResponses} className="w-full bg-white text-black hover:bg-gray-200">
                Refresh Data
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sessions */}
        <div className="space-y-6">
          {Object.entries(groupedBySession).map(([sessionId, sessionResponses]) => {
            const session = sessions[sessionId];
            const sessionData = session?.sessionData as any;
            
            return (
              <Card key={sessionId} className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Session {sessionId.slice(0, 8)}
                  </CardTitle>
                  <CardDescription className="flex flex-wrap gap-4">
                    {sessionData?.userName && (
                      <span>Name: {sessionData.userName}</span>
                    )}
                    {sessionData?.userEmail && (
                      <span>Email: {sessionData.userEmail}</span>
                    )}
                    <span>Created: {new Date(session?.createdAt || '').toLocaleDateString()}</span>
                    <span>{sessionResponses.length} responses</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    {sessionResponses.map((response) => (
                      <div key={response.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge className={getFileTypeColor(response.responseType)}>
                            {getFileIcon(response.responseType)}
                            <span className="ml-1 capitalize">{response.responseType}</span>
                          </Badge>
                          
                          <div className="text-sm text-gray-300">
                            {response.responseType === 'text' ? (
                              <span className="max-w-md truncate">
                                "{typeof response.responseData === 'string' 
                                  ? response.responseData 
                                  : JSON.stringify(response.responseData)}"
                              </span>
                            ) : (
                              <div>
                                <div>{response.fileId?.split('/').pop() || response.metadata?.firebaseStorage?.filePath?.split('/').pop() || 'Media file'}</div>
                                {response.fileUrl ? (
                                  <div className="text-xs text-green-400">✓ Stored in {response.fileUrl.includes('firebase') ? 'Firebase' : 'Cloud'}</div>
                                ) : response.metadata?.firebaseStorage ? (
                                  <div className="text-xs text-green-400">✓ Stored in Firebase</div>
                                ) : (
                                  <div className="text-xs text-yellow-400">⚠ File upload pending</div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            {new Date(response.createdAt).toLocaleTimeString()}
                          </span>
                          
                          {response.responseType !== 'text' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => downloadFile(
                                  response.id,
                                  `${response.responseType}_${response.id.slice(0,8)}.${response.responseType === 'audio' ? 'webm' : response.responseType === 'video' ? 'mp4' : 'png'}`
                                )}
                                className="border-gray-600 hover:bg-gray-700"
                                disabled={!response.fileUrl && !response.metadata?.firebaseStorage}
                              >
                                <Download className="w-3 h-3 mr-1" />
                                Download
                              </Button>
                              {!response.fileUrl && !response.metadata?.firebaseStorage && (
                                <span className="text-xs text-red-400">No file available</span>
                              )}
                            </div>
                          )}
                          
                          {response.metadata?.firebaseStorage?.downloadURL && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(response.metadata!.firebaseStorage!.downloadURL, '_blank')}
                              className="text-gray-400 hover:text-white"
                              title="Open in new tab"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {responses.length === 0 && (
          <Alert className="bg-blue-500/10 border-blue-500/30">
            <AlertDescription className="text-blue-200">
              No experiment responses found yet. Participants will see their submissions appear here after completing the experiment.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
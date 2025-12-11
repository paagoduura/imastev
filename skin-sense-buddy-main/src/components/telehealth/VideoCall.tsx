import { useEffect, useRef, useState, useCallback } from 'react';
import DailyIframe, { DailyCall, DailyParticipant } from '@daily-co/daily-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, MicOff, Video, VideoOff, Phone, PhoneOff, MessageSquare, Monitor } from 'lucide-react';

interface VideoCallProps {
  meetingUrl: string;
  token?: string;
  userName?: string;
  onLeave?: () => void;
}

export function VideoCall({ meetingUrl, token, userName, onLeave }: VideoCallProps) {
  const [callObject, setCallObject] = useState<DailyCall | null>(null);
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [participants, setParticipants] = useState<Record<string, DailyParticipant>>({});
  const [error, setError] = useState<string | null>(null);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleParticipantUpdate = useCallback((event?: { participant?: DailyParticipant }) => {
    if (callObject) {
      setParticipants(callObject.participants());
    }
  }, [callObject]);

  useEffect(() => {
    if (!meetingUrl) return;

    const daily = DailyIframe.createCallObject({
      audioSource: true,
      videoSource: true,
    });

    daily.on('joined-meeting', () => {
      setJoined(true);
      setJoining(false);
      setParticipants(daily.participants());
    });

    daily.on('left-meeting', () => {
      setJoined(false);
      if (onLeave) onLeave();
    });

    daily.on('participant-joined', handleParticipantUpdate);
    daily.on('participant-updated', handleParticipantUpdate);
    daily.on('participant-left', handleParticipantUpdate);

    daily.on('error', (e) => {
      console.error('Daily error:', e);
      setError(e?.errorMsg || 'Connection error occurred');
      setJoining(false);
    });

    setCallObject(daily);

    return () => {
      daily.destroy();
    };
  }, [meetingUrl, handleParticipantUpdate, onLeave]);

  useEffect(() => {
    if (!callObject || !joined) return;

    const localParticipant = participants.local;
    if (localParticipant && localVideoRef.current) {
      const tracks = localParticipant.tracks;
      if (tracks?.video?.persistentTrack) {
        localVideoRef.current.srcObject = new MediaStream([tracks.video.persistentTrack]);
      }
    }

    const remoteParticipants = Object.values(participants).filter(p => !p.local);
    if (remoteParticipants.length > 0 && remoteVideoRef.current) {
      const remote = remoteParticipants[0];
      const tracks = remote.tracks;
      if (tracks?.video?.persistentTrack) {
        remoteVideoRef.current.srcObject = new MediaStream([tracks.video.persistentTrack]);
      }
    }
  }, [callObject, joined, participants]);

  const joinCall = async () => {
    if (!callObject || !meetingUrl) return;
    
    setJoining(true);
    setError(null);
    
    try {
      const joinOptions: { url: string; token?: string; userName?: string } = { url: meetingUrl };
      if (token) joinOptions.token = token;
      if (userName) joinOptions.userName = userName;
      
      await callObject.join(joinOptions);
    } catch (err: any) {
      console.error('Failed to join:', err);
      setError(err.message || 'Failed to join meeting');
      setJoining(false);
    }
  };

  const leaveCall = async () => {
    if (!callObject) return;
    await callObject.leave();
  };

  const toggleAudio = () => {
    if (!callObject) return;
    callObject.setLocalAudio(!audioEnabled);
    setAudioEnabled(!audioEnabled);
  };

  const toggleVideo = () => {
    if (!callObject) return;
    callObject.setLocalVideo(!videoEnabled);
    setVideoEnabled(!videoEnabled);
  };

  const toggleScreenShare = async () => {
    if (!callObject) return;
    const screenTrack = callObject.participants().local?.tracks?.screenVideo;
    if (screenTrack?.state === 'playable') {
      await callObject.stopScreenShare();
    } else {
      await callObject.startScreenShare();
    }
  };

  if (!joined) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardHeader>
          <CardTitle className="text-center">Telehealth Consultation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-center text-gray-500">
              <Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Camera preview will appear here</p>
            </div>
          </div>
          
          <Button 
            onClick={joinCall} 
            disabled={joining}
            className="w-full bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-700 hover:to-amber-600"
          >
            {joining ? (
              <>
                <span className="animate-spin mr-2">...</span>
                Connecting...
              </>
            ) : (
              <>
                <Phone className="w-4 h-4 mr-2" />
                Join Consultation
              </>
            )}
          </Button>
          
          <p className="text-xs text-center text-gray-500">
            Your dermatologist will join shortly after you connect
          </p>
        </CardContent>
      </Card>
    );
  }

  const remoteParticipants = Object.values(participants).filter(p => !p.local);

  return (
    <div ref={containerRef} className="fixed inset-0 bg-gray-900 flex flex-col z-50">
      <div className="flex-1 relative">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
        
        {remoteParticipants.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
            <div className="text-center text-white">
              <div className="w-16 h-16 rounded-full bg-gray-600 mx-auto mb-4 flex items-center justify-center">
                <Video className="w-8 h-8" />
              </div>
              <p>Waiting for clinician to join...</p>
            </div>
          </div>
        )}
        
        <div className="absolute bottom-4 right-4 w-32 md:w-48">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full rounded-lg shadow-lg border-2 border-white"
          />
          {!videoEnabled && (
            <div className="absolute inset-0 bg-gray-800 rounded-lg flex items-center justify-center">
              <VideoOff className="w-6 h-6 text-white" />
            </div>
          )}
        </div>
      </div>
      
      <div className="bg-gray-800 p-4">
        <div className="flex justify-center space-x-4">
          <Button
            variant="outline"
            size="lg"
            onClick={toggleAudio}
            className={`rounded-full w-14 h-14 ${!audioEnabled ? 'bg-red-500 hover:bg-red-600 text-white border-red-500' : 'bg-gray-700 hover:bg-gray-600 text-white border-gray-600'}`}
          >
            {audioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </Button>
          
          <Button
            variant="outline"
            size="lg"
            onClick={toggleVideo}
            className={`rounded-full w-14 h-14 ${!videoEnabled ? 'bg-red-500 hover:bg-red-600 text-white border-red-500' : 'bg-gray-700 hover:bg-gray-600 text-white border-gray-600'}`}
          >
            {videoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
          </Button>
          
          <Button
            variant="outline"
            size="lg"
            onClick={toggleScreenShare}
            className="rounded-full w-14 h-14 bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
          >
            <Monitor className="w-6 h-6" />
          </Button>
          
          <Button
            variant="destructive"
            size="lg"
            onClick={leaveCall}
            className="rounded-full w-14 h-14"
          >
            <PhoneOff className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}

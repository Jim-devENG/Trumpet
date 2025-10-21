import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import io from 'socket.io-client';

interface VideoCallProps {
  isOpen: boolean;
  onClose: () => void;
  callId?: string;
  isIncoming?: boolean;
  callerName?: string;
}

export const VideoCall: React.FC<VideoCallProps> = ({
  isOpen,
  onClose,
  callId,
  isIncoming = false,
  callerName = 'Unknown'
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [participants, setParticipants] = useState<string[]>([]);
  const [callDuration, setCallDuration] = useState(0);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<any>(null);
  const peerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen) {
      initializeCall();
    } else {
      cleanup();
    }

    return () => cleanup();
  }, [isOpen]);

  useEffect(() => {
    if (isConnected) {
      intervalRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isConnected]);

  const initializeCall = async () => {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      streamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Initialize socket connection
      socketRef.current = io('http://localhost:8000');
      
      socketRef.current.on('connect', () => {
        console.log('Connected to video call server');
        if (callId) {
          socketRef.current.emit('join-call', callId);
        }
      });

      socketRef.current.on('user-joined', (userId: string) => {
        setParticipants(prev => [...prev, userId]);
      });

      socketRef.current.on('user-left', (userId: string) => {
        setParticipants(prev => prev.filter(id => id !== userId));
      });

      socketRef.current.on('offer', async (offer: any) => {
        if (!peerRef.current) {
          await createPeer(false);
        }
        await peerRef.current.signal(offer);
      });

      socketRef.current.on('answer', async (answer: any) => {
        if (peerRef.current) {
          await peerRef.current.signal(answer);
        }
      });

      socketRef.current.on('ice-candidate', async (candidate: any) => {
        if (peerRef.current) {
          await peerRef.current.signal(candidate);
        }
      });

      setIsConnected(true);
    } catch (error) {
      console.error('Error initializing call:', error);
    }
  };

  const createPeer = async (initiator: boolean) => {
    const Peer = (await import('simple-peer')).default;
    
    const peer = new Peer({
      initiator,
      trickle: false,
      stream: streamRef.current
    });

    peer.on('signal', (data: any) => {
      if (socketRef.current) {
        socketRef.current.emit('signal', data);
      }
    });

    peer.on('stream', (stream: MediaStream) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
    });

    peer.on('connect', () => {
      console.log('Peer connected');
    });

    peerRef.current = peer;
  };

  const startCall = async () => {
    if (callId && socketRef.current) {
      await createPeer(true);
    }
  };

  const endCall = () => {
    cleanup();
    onClose();
  };

  const toggleMute = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    setIsConnected(false);
    setCallDuration(0);
    setParticipants([]);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full h-[600px] p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            {isIncoming ? `Incoming call from ${callerName}` : 'Video Call'}
            {isConnected && (
              <Badge variant="secondary">
                {formatDuration(callDuration)}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col">
          {/* Video Area */}
          <div className="flex-1 relative bg-black rounded-lg m-4">
            {/* Remote Video */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover rounded-lg"
            />
            
            {/* Local Video */}
            <div className="absolute top-4 right-4 w-32 h-24 bg-gray-800 rounded-lg overflow-hidden">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>

            {/* Participants Count */}
            {participants.length > 0 && (
              <div className="absolute top-4 left-4">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {participants.length + 1} participants
                </Badge>
              </div>
            )}

            {/* Connection Status */}
            {!isConnected && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75 rounded-lg">
                <div className="text-center text-white">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                  <p>Connecting...</p>
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="p-4 border-t bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center justify-center gap-4">
              <Button
                variant={isMuted ? "destructive" : "outline"}
                size="icon"
                onClick={toggleMute}
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>

              <Button
                variant={isVideoOff ? "destructive" : "outline"}
                size="icon"
                onClick={toggleVideo}
                title={isVideoOff ? "Turn on video" : "Turn off video"}
              >
                {isVideoOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
              </Button>

              {!isConnected && !isIncoming && (
                <Button onClick={startCall} className="bg-green-600 hover:bg-green-700">
                  <Phone className="h-4 w-4 mr-2" />
                  Start Call
                </Button>
              )}

              <Button
                variant="destructive"
                size="icon"
                onClick={endCall}
                title="End call"
              >
                <PhoneOff className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};



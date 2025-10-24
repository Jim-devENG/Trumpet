import React, { useState, useEffect, useRef } from 'react';
import { Brain, Users, TrendingUp, Lightbulb, Sparkles, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiService } from '@/services/api';
import io, { Socket } from 'socket.io-client';

interface AIRecommendationsProps {
  userId: string;
}

export const AIRecommendations: React.FC<AIRecommendationsProps> = ({ userId }) => {
  const [contentRecommendations, setContentRecommendations] = useState<string[]>([]);
  const [connectionRecommendations, setConnectionRecommendations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const fetchRecommendations = async () => {
    try {
      setIsRefreshing(true);
      const [contentRes, connectionRes] = await Promise.all([
        apiService.getContentRecommendations(userId),
        apiService.getConnectionRecommendations(userId)
      ]);

      if (contentRes.success) {
        setContentRecommendations(contentRes.data.recommendations);
      }
      if (connectionRes.success) {
        setConnectionRecommendations(connectionRes.data.recommendations);
      }
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching AI recommendations:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [userId]);

  useEffect(() => {
    // Initialize WebSocket connection for real-time AI updates
    const initializeSocket = () => {
      const socket = io('https://trumpet-backend.onrender.com', {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true
      });

      socket.on('connect', () => {
        console.log('🤖 AI Recommendations: Connected to real-time updates');
        setIsConnected(true);
        socket.emit('join_ai_recommendations', { userId });
      });

      socket.on('disconnect', () => {
        console.log('🤖 AI Recommendations: Disconnected from real-time updates');
        setIsConnected(false);
      });

      socket.on('ai_content_recommendations', (data) => {
        console.log('💡 Real-time content recommendations:', data);
        setContentRecommendations(data.recommendations || []);
        setLastUpdate(new Date());
      });

      socket.on('ai_connection_recommendations', (data) => {
        console.log('👥 Real-time connection recommendations:', data);
        setConnectionRecommendations(data.recommendations || []);
        setLastUpdate(new Date());
      });

      socket.on('ai_learning_update', (data) => {
        console.log('🧠 AI learning update:', data);
        // Trigger refresh when AI learns new patterns
        fetchRecommendations();
      });

      socketRef.current = socket;

      return () => {
        socket.disconnect();
      };
    };

    const cleanup = initializeSocket();
    return cleanup;
  }, [userId]);

  if (loading) {
    return (
      <Card className="h-full gradient-card border-border/50 shadow-kingdom">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Brain className="h-4 w-4 text-purple-500" />
            AI Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full gradient-card border-border/50 shadow-kingdom">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Brain className="h-4 w-4 text-purple-500" />
          AI Recommendations
          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchRecommendations}
              disabled={isRefreshing}
              className="h-5 w-5 p-0"
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Badge variant={isConnected ? "default" : "destructive"} className="text-xs">
              {isConnected ? (
                <>
                  <Wifi className="h-2 w-2 mr-1" />
                  Live
                </>
              ) : (
                <>
                  <WifiOff className="h-2 w-2 mr-1" />
                  Offline
                </>
              )}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              <Sparkles className="h-2 w-2 mr-1" />
              AI
            </Badge>
          </div>
        </CardTitle>
        {lastUpdate && (
          <div className="text-xs text-muted-foreground">
            Updated: {lastUpdate.toLocaleTimeString()}
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="content" className="w-full h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-2 text-xs">
            <TabsTrigger value="content" className="text-xs">Content</TabsTrigger>
            <TabsTrigger value="connections" className="text-xs">People</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(100vh-300px)]">
            <TabsContent value="content" className="space-y-2 p-4">
              {contentRecommendations.map((recommendation, index) => (
                <div
                  key={index}
                  className="p-2 rounded-lg border bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800"
                >
                  <div className="flex items-start gap-2">
                    <Lightbulb className="h-3 w-3 text-purple-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs font-medium line-clamp-2">{recommendation}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        AI content idea
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-purple-600 hover:text-purple-700 h-6 w-6 p-0"
                      onClick={() => {
                        // TODO: Implement "Create Post" with this topic
                        console.log('Create post with topic:', recommendation);
                      }}
                    >
                      <TrendingUp className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {contentRecommendations.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <Brain className="h-6 w-6 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No content recommendations</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="connections" className="space-y-2 p-4">
              {connectionRecommendations.map((recommendation, index) => (
                <div
                  key={index}
                  className="p-2 rounded-lg border bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 border-blue-200 dark:border-blue-800"
                >
                  <div className="flex items-start gap-2">
                    <Users className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs font-medium line-clamp-2">{recommendation}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        AI connection suggestion
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-600 hover:text-blue-700 h-6 w-6 p-0"
                      onClick={() => {
                        // TODO: Implement "Connect" functionality
                        console.log('Connect with:', recommendation);
                      }}
                    >
                      <Users className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {connectionRecommendations.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <Users className="h-6 w-6 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No connection recommendations</p>
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </CardContent>
    </Card>
  );
};

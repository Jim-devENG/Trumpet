import React, { useState, useEffect, useRef } from 'react';
import { Heart, MessageSquare, Share, MoreHorizontal, User, Clock, MapPin, Building } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { apiService } from '@/services/api';
import { ImageWithFallback } from './common/ImageWithFallback';
import io, { Socket } from 'socket.io-client';

interface UserFeedProps {
  userId: string;
  currentUser: any;
}

interface Post {
  id: string;
  content: string;
  image_url?: string;
  author_id: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
    occupation: string;
    location: string;
    avatar_url?: string;
  };
  created_at: string;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  is_liked: boolean;
  comments: Comment[];
}

interface Comment {
  id: string;
  content: string;
  author_id: string;
  author: {
    firstName: string;
    lastName: string;
    username: string;
    avatar_url?: string;
  };
  created_at: string;
}

export const UserFeed: React.FC<UserFeedProps> = ({ userId, currentUser }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [newComment, setNewComment] = useState<{ [postId: string]: string }>({});
  const [mountainUsers, setMountainUsers] = useState<any[]>([]);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const fetchFeed = async () => {
    try {
      setLoading(true);
      // Fetch all posts - the backend will handle mountain-based filtering if occupation is provided
      const postsRes = await apiService.getPosts();
      
      if (!postsRes.success) {
        console.error('Failed to fetch posts:', postsRes);
        setPosts([]);
        setLoading(false);
        return;
      }

      const allPosts = Array.isArray(postsRes.data) ? postsRes.data : [];
      
      // Fetch mountain users if currentUser has an occupation
      let usersInMountain: any[] = [];
      if (currentUser?.occupation) {
        const mountainUsersRes = await apiService.getMountainUsers(currentUser.occupation).catch(() => ({ success: false, data: { users: [] } } as any));
        usersInMountain = mountainUsersRes.success ? (mountainUsersRes.data.users || []) : [];
      }
      setMountainUsers(usersInMountain);

      // Remove duplicates and sort by date
      const uniquePosts = allPosts.filter((post, index, self) => 
        index === self.findIndex(p => p.id === post.id)
      ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Fetch comments for each post
      const postsWithComments = await Promise.all(
        uniquePosts.map(async (post) => {
          try {
            // Fetch comments for this post
            const commentsRes = await apiService.request(`/posts/${post.id}/comments`);
            const comments = commentsRes.success ? commentsRes.data.comments : [];
            
            return {
              ...post,
              comments: comments || [],
              comments_count: comments.length || 0,
              likes_count: post.likes_count || 0,
              shares_count: post.shares_count || 0,
              is_liked: post.is_liked || false
            };
          } catch (error) {
            console.error(`Error fetching comments for post ${post.id}:`, error);
            return {
              ...post,
              comments: [],
              comments_count: 0,
              likes_count: post.likes_count || 0,
              shares_count: post.shares_count || 0,
              is_liked: post.is_liked || false
            };
          }
        })
      );

      setPosts(postsWithComments);
    } catch (error) {
      console.error('Error fetching feed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
    
    // Auto-refresh feed every 30 seconds
    const interval = setInterval(fetchFeed, 30000);
    
    return () => clearInterval(interval);
  }, [userId]);

  useEffect(() => {
    // Initialize WebSocket connection for real-time social features
    const initializeSocket = () => {
      const socket = io('http://192.168.1.101:8000', {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true
      });

      socket.on('connect', () => {
        console.log('📱 User Feed: Connected to real-time updates');
        setIsConnected(true);
        socket.emit('join_user_feed', { userId });
        socket.emit('join_mountain', { userId, occupation: currentUser?.occupation });
      });

      socket.on('disconnect', () => {
        console.log('📱 User Feed: Disconnected from real-time updates');
        setIsConnected(false);
      });

      socket.on('new_post', (data) => {
        console.log('📝 New post in feed:', data);
        setPosts(prev => [data.post, ...prev]);
      });

      socket.on('post_liked', (data) => {
        console.log('❤️ Post liked:', data);
        setPosts(prev => prev.map(post => 
          post.id === data.postId 
            ? { 
                ...post, 
                likes_count: post.likes_count + (data.liked ? 1 : -1),
                is_liked: data.liked 
              }
            : post
        ));
      });

      socket.on('new_comment', (data) => {
        console.log('💬 New comment:', data);
        const commentWithDate = {
          ...data.comment,
          created_at: data.comment.created_at || new Date().toISOString()
        };
        
        setPosts(prev => prev.map(post => 
          post.id === data.postId 
            ? { 
                ...post, 
                comments_count: (post.comments_count || 0) + 1,
                comments: [...(post.comments || []), commentWithDate]
              }
            : post
        ));
      });

      socket.on('user_online', (data) => {
        console.log('🟢 User came online:', data);
        setMountainUsers(prev => prev.map(user => 
          user.id === data.userId 
            ? { ...user, is_online: true, last_seen: new Date() }
            : user
        ));
      });

      socket.on('user_offline', (data) => {
        console.log('🔴 User went offline:', data);
        setMountainUsers(prev => prev.map(user => 
          user.id === data.userId 
            ? { ...user, is_online: false, last_seen: new Date() }
            : user
        ));
      });

      socketRef.current = socket;

      return () => {
        socket.disconnect();
      };
    };

    const cleanup = initializeSocket();
    return cleanup;
  }, [userId, currentUser?.occupation]);

  const handleLike = async (postId: string) => {
    try {
      const response = await apiService.likePost(postId);
      if (response.success) {
        // Update local state immediately
        setPosts(prevPosts => 
          prevPosts.map(post => 
            post.id === postId 
              ? { 
                  ...post, 
                  likes_count: post.likes_count + (response.data.liked ? 1 : -1),
                  is_liked: response.data.liked 
                }
              : post
          )
        );
        
        // Emit real-time update
        socketRef.current?.emit('like_post', { 
          postId, 
          userId: currentUser.id, 
          liked: response.data.liked 
        });
      }
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleComment = async (postId: string) => {
    const commentText = newComment[postId];
    if (!commentText.trim()) return;

    try {
      const response = await apiService.commentOnPost(postId, commentText);
      if (response.success) {
        // Update local state immediately
        const newCommentWithDate = {
          ...response.data.comment,
          created_at: response.data.comment.created_at || new Date().toISOString()
        };
        
        setPosts(prevPosts =>
          prevPosts.map(post =>
            post.id === postId
              ? {
                  ...post,
                  comments: [...(post.comments || []), newCommentWithDate],
                  comments_count: (post.comments_count || 0) + 1
                }
              : post
          )
        );

        // Emit real-time update
        socketRef.current?.emit('new_comment', { 
          postId, 
          comment: response.data.comment 
        });
        setNewComment(prev => ({ ...prev, [postId]: '' }));
      }
    } catch (error) {
      console.error('Error commenting on post:', error);
    }
  };

  const handleShare = (postId: string) => {
    setSelectedPostId(postId);
    setShareModalOpen(true);
  };

  const shareToSocialMedia = async (platform: string) => {
    if (!selectedPostId) return;
    
    try {
      const response = await apiService.sharePost(selectedPostId);
      if (response.success) {
        // Emit real-time update
        socketRef.current?.emit('share_post', { postId: selectedPostId, userId: currentUser.id });
        
        // Open social media platform
        const post = posts.find(p => p.id === selectedPostId);
        const shareUrl = `${window.location.origin}/post/${selectedPostId}`;
        const shareText = post?.content ? post.content.substring(0, 100) + '...' : 'Check out this post!';
        
        let shareLink = '';
        switch (platform) {
          case 'twitter':
            shareLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
            break;
          case 'facebook':
            shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
            break;
          case 'linkedin':
            shareLink = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
            break;
          case 'whatsapp':
            shareLink = `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
            break;
          case 'telegram':
            shareLink = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
            break;
        }
        
        if (shareLink) {
          window.open(shareLink, '_blank');
        }
      }
    } catch (error) {
      console.error('Error sharing post:', error);
    } finally {
      setShareModalOpen(false);
      setSelectedPostId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="gradient-card border-border/50 shadow-kingdom">
            <CardContent className="p-4">
              <div className="animate-pulse space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Feed Header with Refresh Button */}
      <Card className="gradient-card border-border/50 shadow-kingdom">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Your Feed
            </CardTitle>
            <Button 
              onClick={fetchFeed} 
              disabled={loading}
              size="sm" 
              variant="outline"
              className="text-xs"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Mountain Users Online */}
      <Card className="gradient-card border-border/50 shadow-kingdom">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building className="h-4 w-4 text-blue-500" />
            Your Mountain Network
            <Badge variant={isConnected ? "default" : "destructive"} className="text-xs">
              {isConnected ? 'Live' : 'Offline'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {mountainUsers.slice(0, 8).map(user => (
              <div key={user.id} className="flex items-center gap-2 p-2 rounded-lg bg-gradient-to-r from-slate-800/30 to-gray-800/30 border border-slate-600/50">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback className="text-xs">
                    {user.firstName?.[0]}{user.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="text-xs">
                  <div className="font-medium">{user.firstName} {user.lastName}</div>
                  <div className="text-muted-foreground">{user.occupation}</div>
                </div>
                <div className={`w-2 h-2 rounded-full ${user.is_online ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Posts Feed */}
      {posts.map(post => (
        <Card key={post.id} className="gradient-card border-border/50 shadow-kingdom">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={post.author?.avatar_url} />
                <AvatarFallback className="text-xs">
                  {post.author?.firstName?.[0]}{post.author?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">
                    {post.author?.firstName} {post.author?.lastName}
                  </span>
                  <span className="text-xs text-muted-foreground">@{post.author?.username}</span>
                  {post.author_id === currentUser.id && (
                    <Badge variant="secondary" className="text-xs">You</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Building className="h-3 w-3" />
                  <span>{post.author?.occupation || 'Not specified'}</span>
                  <MapPin className="h-3 w-3" />
                  <span>{post.author?.location || 'Not specified'}</span>
                  <Clock className="h-3 w-3" />
                  <span>{new Date(post.created_at).toLocaleString()}</span>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-3">
            {/* Post Content */}
            <div 
              className="text-sm"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
            
            {/* Post Image */}
            {post.image_url && (
              <div className="rounded-lg overflow-hidden">
                <ImageWithFallback
                  src={post.image_url}
                  alt="Post image"
                  className="w-full max-w-full h-auto object-contain rounded-md"
                />
              </div>
            )}

            {/* Post Actions */}
            <div className="flex items-center gap-4 pt-2 border-t border-border/50">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleLike(post.id)}
                className={`text-xs ${post.is_liked ? 'text-red-500' : 'text-muted-foreground'}`}
              >
                <Heart className={`h-3 w-3 mr-1 ${post.is_liked ? 'fill-current' : ''}`} />
                {post.likes_count || 0}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className={`text-xs hover:text-primary ${(post.comments_count || 0) > 0 ? 'text-primary' : 'text-muted-foreground'}`}
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                {post.comments_count || 0}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleShare(post.id)}
                className="text-xs text-muted-foreground"
              >
                <Share className="h-3 w-3 mr-1" />
                {post.shares_count || 0}
              </Button>
            </div>

            {/* Comments Section */}
            <div className="space-y-2">
              {post.comments?.slice(0, 3).map(comment => (
                <div key={comment.id} className="flex items-start gap-2 p-2 rounded-lg bg-gradient-to-r from-slate-800/20 to-gray-800/20">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={comment.author?.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {comment.author?.firstName?.[0]}{comment.author?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-xs">{comment.author?.firstName} {comment.author?.lastName}</span>
                      <span className="text-xs text-muted-foreground">
                        {(() => {
                          if (!comment.created_at) return 'Just now';
                          try {
                            const date = new Date(comment.created_at);
                            return isNaN(date.getTime()) ? 'Just now' : date.toLocaleString();
                          } catch {
                            return 'Just now';
                          }
                        })()}
                      </span>
                    </div>
                    <p className="text-xs mt-1">{comment.content}</p>
                  </div>
                </div>
              ))}
              
              {post.comments?.length > 3 && (
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                  View {(post.comments?.length || 0) - 3} more comments
                </Button>
              )}

              {/* Add Comment */}
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={currentUser.avatar_url} />
                  <AvatarFallback className="text-xs">
                    {currentUser.firstName?.[0]}{currentUser.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <Input
                  placeholder="Write a comment..."
                  value={newComment[post.id] || ''}
                  onChange={(e) => setNewComment(prev => ({ ...prev, [post.id]: e.target.value }))}
                  className="flex-1 text-sm"
                />
                <Button
                  size="sm"
                  onClick={() => handleComment(post.id)}
                  disabled={!newComment[post.id]?.trim()}
                  className="text-xs"
                >
                  Comment
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {posts.length === 0 && (
        <Card className="gradient-card border-border/50 shadow-kingdom">
          <CardContent className="p-8 text-center">
            <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-medium mb-2">No posts yet</h3>
            <p className="text-sm text-muted-foreground">
              Start sharing your thoughts with your mountain network!
            </p>
          </CardContent>
        </Card>
      )}

      {/* Share Modal */}
      {shareModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border border-border rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Share to Social Media</h3>
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => shareToSocialMedia('twitter')}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                Twitter
              </Button>
              <Button
                onClick={() => shareToSocialMedia('facebook')}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Facebook
              </Button>
              <Button
                onClick={() => shareToSocialMedia('linkedin')}
                className="bg-blue-700 hover:bg-blue-800 text-white"
              >
                LinkedIn
              </Button>
              <Button
                onClick={() => shareToSocialMedia('whatsapp')}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                WhatsApp
              </Button>
              <Button
                onClick={() => shareToSocialMedia('telegram')}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                Telegram
              </Button>
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/post/${selectedPostId}`);
                  setShareModalOpen(false);
                  setSelectedPostId(null);
                }}
                variant="outline"
              >
                Copy Link
              </Button>
            </div>
            <div className="flex justify-end mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShareModalOpen(false);
                  setSelectedPostId(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

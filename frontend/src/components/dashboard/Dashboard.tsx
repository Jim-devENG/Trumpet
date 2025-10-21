import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Bell, 
  Search, 
  Crown, 
  MapPin, 
  Briefcase, 
  Heart, 
  Calendar, 
  Plus, 
  Send, 
  Image, 
  Video, 
  Smile, 
  MessageCircle, 
  Paperclip,
  LogOut,
  Settings,
  User,
  Users,
  TrendingUp,
  Award,
  Star,
  Zap,
  Target,
  BarChart3,
  Activity,
  ChevronRight,
  ChevronDown,
  CheckCircle,
  Clock,
  Globe,
  Building,
  GraduationCap,
  Stethoscope,
  Wrench,
  Palette,
  Music,
  Camera,
  Code,
  BookOpen,
  Gamepad2,
  Car,
  Plane,
  Ship,
  Truck,
  Bike,
  Home,
  Coffee,
  Utensils,
  ShoppingBag,
  CreditCard,
  Smartphone,
  Laptop,
  Headphones,
  Watch,
  Shirt,
  Glasses,
  Key,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Download,
  Upload,
  Share,
  Copy,
  Edit,
  Trash2,
  Save,
  X,
  Check,
  AlertCircle,
  Info,
  HelpCircle,
  ExternalLink,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  ChevronUp,
  ChevronLeft,
  Menu,
  MoreHorizontal,
  MoreVertical,
  Filter,
  SortAsc,
  SortDesc,
  Grid,
  List,
  Layout,
  Sidebar,
  Maximize,
  Minimize,
  RotateCcw,
  RefreshCw,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  PhoneOff,
  VideoIcon,
  VideoOff,
  CameraOff,
  Monitor,
  MonitorOff,
  Speaker,
  Wifi,
  WifiOff,
  Signal,
  Battery,
  Power,
  Sun,
  Moon,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Wind,
  Droplets,
  Thermometer,
  Gauge,
  Compass,
  Navigation,
  Map,
  Flag,
  Store,
  Factory,
  Hospital,
  School,
  University,
  Church,
  Ambulance,
  Bus,
  Train,
  Rocket,
  Satellite,
  Telescope,
  Microscope,
  FlaskConical,
  TestTube,
  Beaker,
  Atom,
  Brain,
  Ear,
  Bone,
  Fingerprint,
  Frown,
  Meh,
  Laugh,
  Angry,
  Rainbow,
  Snowflake,
  Umbrella,
  Timer,
  Hourglass,
  Lightbulb,
  Flashlight,
  Lamp,
  Flame,
  Link as LinkIcon,
  Pill,
  Bandage,
  Hand,
  Scale,
  Feather,
  Shell,
  Pin,
  Cable,
  Box,
  Container,
  Backpack,
  Luggage,
  Drum,
  Wallet,
  Scan,
  Infinity,
  Tent
} from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { apiService } from '@/services/api';
import { SearchBar } from '@/components/SearchBar';
import { GamificationPanel } from '@/components/GamificationPanel';
import { ThemeToggle } from '@/components/ThemeToggle';
import { RichTextEditor } from '@/components/RichTextEditor';
import { VideoCall } from '@/components/VideoCall';
import { AIRecommendations } from '@/components/AIRecommendations';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { UserFeed } from '@/components/UserFeed';
import { DreamPad } from '@/components/DreamPad';

import kingdomHero from '@/assets/kingdom-hero.jpg';
import { KingdomAvatar } from '@/components/avatar/KingdomAvatar';
import { Link, useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { user: authUser, logout } = useAuth();
  const navigate = useNavigate();

  console.log('Dashboard: Component rendering, authUser:', authUser);

  // State management
  const [userData, setUserData] = useState<any>({});
  const [users, setUsers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [openChatIds, setOpenChatIds] = useState<string[]>([]);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [newMessage, setNewMessage] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPost, setNewPost] = useState({ content: '', imageBase64: '' });
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showCreateJob, setShowCreateJob] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [videoCallId, setVideoCallId] = useState<string | null>(null);
  const [fileInputRef, setFileInputRef] = useState<HTMLInputElement | null>(null);

  // Load dashboard data
  const loadDashboardData = async () => {
    try {
      const [usersRes, postsRes, eventsRes, jobsRes, friendRequestsRes, conversationsRes] = await Promise.all([
        apiService.getUsers(),
        apiService.getPosts(),
        apiService.getEvents(),
        apiService.getJobs(),
        apiService.getFriendRequests(),
        apiService.getConversations()
      ]);

      if (usersRes.success) setUsers(Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data?.users || []));
      if (postsRes.success) setPosts(Array.isArray(postsRes.data) ? postsRes.data : (postsRes.data?.posts || []));
      if (eventsRes.success) setEvents(Array.isArray(eventsRes.data) ? eventsRes.data : (eventsRes.data?.events || []));
      if (jobsRes.success) setJobs(Array.isArray(jobsRes.data) ? jobsRes.data : (jobsRes.data?.jobs || []));
      if (friendRequestsRes.success) setFriendRequests(Array.isArray(friendRequestsRes.data) ? friendRequestsRes.data : (friendRequestsRes.data?.requests || []));
      if (conversationsRes.success) setConversations(Array.isArray(conversationsRes.data) ? conversationsRes.data : (conversationsRes.data?.conversations || []));

      // Set user data
      if (authUser) {
        setUserData({
          occupation: authUser.occupation || 'Professional',
          location: authUser.location || 'Global',
          interests: authUser.interests || []
        });
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  useEffect(() => {
    if (authUser) {
      loadDashboardData();
    }
  }, [authUser]);

  // Event handlers
  const handleCreatePost = async () => {
    if (!newPost.content.trim() && !newPost.imageBase64) return;
    
    try {
      const response = await apiService.createPost({
        content: newPost.content,
        imageBase64: newPost.imageBase64
      });
      
      if (response.success) {
        setNewPost({ content: '', imageBase64: '' });
        setShowCreatePost(false);
        loadDashboardData();
      }
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  const handleCreateEvent = async (eventData: any) => {
    try {
      const response = await apiService.createEvent(eventData);
      if (response.success) {
        setShowCreateEvent(false);
        loadDashboardData();
      }
    } catch (error) {
      console.error('Error creating event:', error);
    }
  };

  const handleCreateJob = async (jobData: any) => {
    try {
      const response = await apiService.createJob(jobData);
      if (response.success) {
        setShowCreateJob(false);
        loadDashboardData();
      }
    } catch (error) {
      console.error('Error creating job:', error);
    }
  };

  const handleAttendEvent = async (eventId: string) => {
    try {
      await apiService.attendEvent(eventId, 'attending');
      loadDashboardData();
    } catch (error) {
      console.error('Error attending event:', error);
    }
  };

  const handleApplyJob = async (jobId: string) => {
    try {
      await apiService.applyForJob(jobId, {});
      loadDashboardData();
    } catch (error) {
      console.error('Error applying for job:', error);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setNewPost(prev => ({ ...prev, imageBase64: event.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const openThread = (partnerId: string) => {
    setSelectedChat(conversations.find(c => c.partnerId === partnerId));
    setShowChatModal(true);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;
    
    try {
      await apiService.sendMessage(selectedChat.partnerId, newMessage);
      setNewMessage('');
      // Refresh conversations
      loadDashboardData();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const getOccupationIcon = (occupation: string) => {
    const icons: { [key: string]: string } = {
      'doctor': '🩺',
      'engineer': '⚙️',
      'teacher': '👨‍🏫',
      'lawyer': '⚖️',
      'artist': '🎨',
      'developer': '💻',
      'designer': '🎨',
      'writer': '✍️',
      'musician': '🎵',
      'chef': '👨‍🍳',
      'scientist': '🔬',
      'pilot': '✈️',
      'sailor': '⛵',
      'driver': '🚗',
      'builder': '🔨',
      'farmer': '🚜',
      'nurse': '👩‍⚕️',
      'police': '👮',
      'firefighter': '👨‍🚒',
      'soldier': '🪖'
    };
    return icons[occupation.toLowerCase()] || '💼';
  };

  if (!authUser) {
    console.log('Dashboard: No authUser, showing login prompt');
    return (
      <div className="min-h-screen gradient-kingdom flex items-center justify-center">
        <div className="text-center">
          <Crown className="h-12 w-12 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Welcome to TRUMPET</h1>
          <p className="text-muted-foreground mb-4">Please sign in to access your kingdom</p>
          <Button onClick={() => navigate('/login')}>
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  console.log('Dashboard: AuthUser exists, rendering dashboard');

  return (
    <div className="min-h-screen gradient-kingdom">
      {/* Header */}
      <header className="border-b border-border/20 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-secondary" />
              <h1 className="text-sm font-bold">TRUMPET</h1>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-2">
              <div className="relative max-w-xs w-full">
                <SearchBar />
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/library">Library</Link>
              </Button>
              <Button variant="ghost" size="sm" title="Notifications">
                <Bell className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" title="Messages" onClick={() => setShowChatModal(true)}>
                <MessageCircle className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" title="Video Call" onClick={() => setShowVideoCall(true)}>
                <Video className="h-4 w-4" />
              </Button>
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={authUser.avatar} />
                      <AvatarFallback>{authUser.firstName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Mobile Navigation */}
            <div className="flex md:hidden items-center gap-1">
              <Button variant="ghost" size="sm" title="Notifications">
                <Bell className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" title="Messages" onClick={() => setShowChatModal(true)}>
                <MessageCircle className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" title="Video Call" onClick={() => setShowVideoCall(true)}>
                <Video className="h-4 w-4" />
              </Button>
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={authUser.avatar} />
                      <AvatarFallback>{authUser.firstName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Mobile Search Bar */}
          <div className="md:hidden mt-4">
            <SearchBar />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Hero Section - Compact */}
        <div className="relative mb-6 rounded-lg overflow-hidden">
          <img 
            src={kingdomHero} 
            alt="Kingdom Hero" 
            className="w-full h-32 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-4 text-white">
            <h2 className="text-lg font-bold">Welcome back, {authUser.firstName}!</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs px-2 py-0.5">
                <Briefcase className="h-2 w-2 mr-1" />
                {userData.occupation}
              </Badge>
              <Badge variant="outline" className="text-xs px-2 py-0.5">
                <MapPin className="h-2 w-2 mr-1" />
                {userData.location}
              </Badge>
            </div>
          </div>
        </div>

        {/* Facebook-like 3 Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-3 space-y-3">
            {/* User Profile Card - Compact */}
            <Card className="gradient-card border-border/50 shadow-kingdom">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={authUser.avatar ? apiService.getImageUrl(authUser.avatar) : undefined} />
                    <AvatarFallback className="text-xs">{(authUser?.firstName || authUser?.first_name || 'U')[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-xs">{(authUser?.firstName || authUser?.first_name || 'You')} {(authUser?.lastName || authUser?.last_name || '')}</p>
                    <p className="text-xs text-muted-foreground capitalize">{(authUser?.occupation || userData.occupation) as string} • {(authUser?.location || userData.location) as string}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div><span className="font-semibold">{Array.isArray(users) ? users.filter(u => u.occupation === userData.occupation).length : 0}</span> in your mountain</div>
                  <div><span className="font-semibold">{Array.isArray(events) ? events.length : 0}</span> events</div>
                </div>
              </CardContent>
            </Card>

            {/* Friend Requests - Compact */}
            <Card className="gradient-card border-border/50 shadow-kingdom">
              <CardHeader>
                <CardTitle className="text-sm">Friend Requests</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-32 overflow-auto">
                {Array.isArray(friendRequests) && friendRequests.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-1 border rounded p-1.5">
                    <div className="truncate text-xs">{r.first_name} {r.last_name} (@{r.username})</div>
                    <Button size="sm" variant="outline" className="text-xs px-1.5 py-0.5" onClick={async () => {
                      try { await apiService.acceptFriendRequest(r.requester_id); setFriendRequests(Array.isArray(friendRequests) ? friendRequests.filter(fr => fr.id !== r.id) : []); loadDashboardData(); } catch {}
                    }}>Accept</Button>
                  </div>
                ))}
                {Array.isArray(friendRequests) && friendRequests.length === 0 && (
                  <p className="text-xs text-muted-foreground">No pending requests</p>
                )}
              </CardContent>
            </Card>

            {/* People You May Know - with pagination */}
            <Card className="gradient-card border-border/50 shadow-kingdom">
              <CardHeader>
                <CardTitle className="text-sm">People You May Know</CardTitle>
                <CardDescription className="text-xs">Connect with members</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {Array.isArray(users) && users.slice(0, 5).map((u) => (
                  <div key={u.id} className="flex items-center justify-between gap-2 border rounded p-2">
                    <div className="truncate text-xs">{u.first_name || u.firstName} {u.last_name || u.lastName} (@{u.username})</div>
                    <Button size="sm" variant="outline" className="text-xs px-2 py-1" onClick={async () => { try { await apiService.sendFriendRequest(u.id); } catch {} }}>Add</Button>
                  </div>
                ))}
                {Array.isArray(users) && users.length === 0 && (
                  <p className="text-xs text-muted-foreground">No suggestions</p>
                )}
                {Array.isArray(users) && users.length > 5 && (
                  <Button variant="ghost" size="sm" className="w-full text-xs">
                    View More ({users.length - 5} more)
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Dream & Vision Pad */}
            {authUser && (
              <DreamPad userId={authUser.id} />
            )}
          </div>

          {/* CENTER COLUMN */}
          <div className="lg:col-span-6 space-y-3">
            {/* Composer */}
            <Card className="gradient-card border-border/50 shadow-kingdom">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-3">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={authUser.avatar} />
                    <AvatarFallback className="text-xs">{authUser.firstName?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <Input 
                    placeholder="What's on your mind?" 
                    value={newPost.content}
                    onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
                    className="flex-1 text-sm"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => document.getElementById('newPostFileInputInline')?.click()}
                    >
                      Upload image
                    </Button>
                  </div>
                  {newPost.imageBase64 && (
                    <div className="rounded-lg overflow-hidden border">
                      <img src={newPost.imageBase64} alt="Post preview" className="w-full max-h-80 object-cover" />
                    </div>
                  )}
                  
                  <div className="flex items-center justify-end">
                    <Button onClick={handleCreatePost} disabled={!newPost.content.trim() && !newPost.imageBase64}>
                      <Send className="h-4 w-4 mr-2" />
                      Post
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Real-time User Feed */}
            {authUser && (
              <UserFeed userId={authUser.id} currentUser={authUser} />
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-3 space-y-3">
            {/* Gamification Panel - Compact */}
            {authUser && (
              <GamificationPanel userId={authUser.id} />
            )}

            {/* Analytics Dashboard */}
            {authUser && (
              <AnalyticsDashboard userId={authUser.id} />
            )}

            {/* Upcoming Events - with pagination */}
            <Card className="gradient-card border-border/50 shadow-kingdom">
              <CardHeader>
                <CardTitle className="text-sm">Upcoming Events</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.isArray(events) && events.slice(0, 5).map((event) => (
                  <div key={event.id} className="border rounded p-2">
                    <div className="font-semibold text-xs truncate">{event.title}</div>
                    <div className="text-xs text-muted-foreground">{event.location} • {new Date(event.date).toLocaleDateString()}</div>
                    <div className="mt-2">
                      <Button size="sm" variant="outline" className="text-xs px-2 py-1" onClick={() => handleAttendEvent(event.id)}>Attend</Button>
                    </div>
                  </div>
                ))}
                {Array.isArray(events) && events.length === 0 && (
                  <p className="text-xs text-muted-foreground">No upcoming events</p>
                )}
                {Array.isArray(events) && events.length > 5 && (
                  <Button variant="ghost" size="sm" className="w-full text-xs">
                    View More ({events.length - 5} more)
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

        {/* Dialog Components */}
        {/* Create Event Dialog */}
        <Dialog open={showCreateEvent} onOpenChange={setShowCreateEvent}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Event</DialogTitle>
              <DialogDescription>Organize an event for your community</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="event-title">Event Title</Label>
                <Input id="event-title" placeholder="Enter event title" />
              </div>
              <div>
                <Label htmlFor="event-description">Description</Label>
                <Textarea id="event-description" placeholder="Describe your event" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="event-date">Date</Label>
                  <Input id="event-date" type="date" />
                </div>
                <div>
                  <Label htmlFor="event-location">Location</Label>
                  <Input id="event-location" placeholder="Event location" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateEvent(false)}>
                  Cancel
                </Button>
                <Button onClick={() => handleCreateEvent({})}>
                  Create Event
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create Job Dialog */}
        <Dialog open={showCreateJob} onOpenChange={setShowCreateJob}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Post a Job</DialogTitle>
              <DialogDescription>Share job opportunities with your network</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="job-title">Job Title</Label>
                <Input id="job-title" placeholder="Enter job title" />
              </div>
              <div>
                <Label htmlFor="job-description">Description</Label>
                <Textarea id="job-description" placeholder="Describe the position" />
              </div>
              <div>
                <Label htmlFor="job-company">Company</Label>
                <Input id="job-company" placeholder="Company name" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateJob(false)}>
                  Cancel
                </Button>
                <Button onClick={() => handleCreateJob({})}>
                  Post Job
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Chat Modal */}
        <Dialog open={showChatModal} onOpenChange={setShowChatModal}>
          <DialogContent className="max-w-4xl p-0 overflow-hidden">
            <div className="grid grid-cols-12 h-[70vh]">
              {/* Left sidebar - Chat list */}
              <div className="col-span-4 bg-gray-50 border-r border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
                </div>
                <div className="overflow-y-auto">
                  {Array.isArray(conversations) && conversations.map((conversation) => (
                    <div
                      key={conversation.partnerId}
                      className="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100"
                      onClick={() => setSelectedChat(conversation)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={conversation.avatar} />
                            <AvatarFallback>{conversation.name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {conversation.name}
                            </p>
                            <p className="text-xs text-gray-500">2m</p>
                          </div>
                          <p className="text-xs text-gray-500 truncate">
                            Hey! How are you doing?
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right side - Chat messages */}
              <div className="col-span-8 flex flex-col">
                {selectedChat ? (
                  <>
                    {/* Chat header */}
                    <div className="p-4 border-b border-gray-200 bg-white">
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={selectedChat.avatar} />
                          <AvatarFallback>{selectedChat.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-medium text-gray-900">{selectedChat.name}</h3>
                          <p className="text-sm text-green-600">Active now</p>
                        </div>
                      </div>
                    </div>

                    {/* Messages area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {/* Sample messages */}
                      <div className="flex justify-start">
                        <div className="max-w-xs lg:max-w-md">
                          <div className="bg-gray-100 rounded-lg p-3">
                            <p className="text-sm text-gray-800">
                              Hey! How are you doing today?
                            </p>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">2 minutes ago</p>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <div className="max-w-xs lg:max-w-md">
                          <div className="bg-blue-500 text-white rounded-lg p-3">
                            <p className="text-sm">
                              I'm doing great! Just working on some new projects.
                            </p>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 text-right">1 minute ago</p>
                        </div>
                      </div>
                    </div>

                    {/* Message input */}
                    <div className="p-4 border-t border-gray-200 bg-white">
                      <div className="flex items-center space-x-2">
                        <button className="p-2 text-gray-500 hover:text-gray-700">
                          <Paperclip className="w-4 h-4" />
                        </button>
                        <input
                          type="text"
                          placeholder="Type a message..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && newMessage.trim()) {
                              sendMessage();
                            }
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button 
                          onClick={sendMessage} 
                          disabled={!newMessage.trim()}
                          className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
                      <p className="text-gray-500">Choose a chat to start messaging</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Video Call Modal */}
        <VideoCall
          isOpen={showVideoCall}
          onClose={() => {
            setShowVideoCall(false);
            setVideoCallId(null);
          }}
          callId={videoCallId || undefined}
        />

        {/* Hidden file input for post images */}
        <input
          type="file"
          id="newPostFileInputInline"
          onChange={handleImageSelect}
          accept="image/*"
          className="hidden"
        />
    </div>
  );
};

export { Dashboard };
export default Dashboard;
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Edit, User, MapPin, Briefcase, Heart, Camera, Upload, X } from "lucide-react";
import { Link } from "react-router-dom";
import { apiService } from "@/services/api";
import { KingdomAvatar } from "@/components/avatar/KingdomAvatar";

const OCCUPATIONS = [
  { id: "government", name: "Government", icon: "🏛️" },
  { id: "family", name: "Family", icon: "👨‍👩‍👧‍👦" },
  { id: "media", name: "Media", icon: "📺" },
  { id: "arts", name: "Arts & Entertainment", icon: "🎭" },
  { id: "economy", name: "Economy", icon: "💼" },
  { id: "education", name: "Education", icon: "🎓" },
  { id: "spirituality", name: "Spirituality", icon: "🙏" },
  { id: "other", name: "Other", icon: "⭐" },
];

const INTERESTS = [
  { id: "music", name: "Music", icon: "🎶" },
  { id: "gaming", name: "Gaming", icon: "🎮" },
  { id: "tech", name: "Technology", icon: "💻" },
  { id: "fashion", name: "Fashion", icon: "👗" },
  { id: "sports", name: "Sports", icon: "⚽" },
  { id: "art", name: "Art", icon: "🎨" },
  { id: "food", name: "Food", icon: "🍽️" },
  { id: "travel", name: "Travel", icon: "✈️" },
  { id: "books", name: "Books", icon: "📚" },
  { id: "fitness", name: "Fitness", icon: "💪" },
  { id: "photography", name: "Photography", icon: "📸" },
  { id: "movies", name: "Movies", icon: "🎬" },
];

export default function Profile() {
  const { user, loading, refresh } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    bio: "",
    occupation: "",
    interests: [] as string[],
    location: "",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || user.first_name || "",
        lastName: user.lastName || user.last_name || "",
        bio: user.bio || "",
        occupation: user.occupation || "",
        interests: Array.isArray(user.interests) ? user.interests : (user.interests ? user.interests.split(',') : []),
        location: user.location || "",
      });
    }
  }, [user]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await apiService.updateProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        bio: formData.bio,
        occupation: formData.occupation,
        interests: formData.interests,
        location: formData.location,
      });

      if (response.success) {
        await refresh();
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleInterestToggle = (interestId: string) => {
    if (formData.interests.includes(interestId)) {
      setFormData(prev => ({
        ...prev,
        interests: prev.interests.filter(id => id !== interestId)
      }));
    } else if (formData.interests.length < 5) {
      setFormData(prev => ({
        ...prev,
        interests: [...prev.interests, interestId]
      }));
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    try {
      setUploadingAvatar(true);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewAvatar(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload the file
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await apiService.uploadProfilePicture(formData);
      
      if (response.success) {
        // Update user data with new avatar URL
        await refresh();
        console.log('Profile picture uploaded successfully');
      } else {
        alert('Failed to upload profile picture');
        setPreviewAvatar(null);
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      alert('Failed to upload profile picture');
      setPreviewAvatar(null);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      setUploadingAvatar(true);
      const response = await apiService.removeProfilePicture();
      
      if (response.success) {
        setPreviewAvatar(null);
        await refresh();
        console.log('Profile picture removed successfully');
      } else {
        alert('Failed to remove profile picture');
      }
    } catch (error) {
      console.error('Error removing profile picture:', error);
      alert('Failed to remove profile picture');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const getAvatarUrl = () => {
    if (previewAvatar) return previewAvatar;
    if (user?.avatar) return apiService.getImageUrl(user.avatar);
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-kingdom flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen gradient-kingdom flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Please log in to view your profile</p>
          <Link to="/" className="text-primary hover:underline">Go to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-kingdom">
      {/* Header */}
      <header className="border-b border-border/20 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">Profile</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Profile Header */}
          <Card className="gradient-card border-border/50 shadow-kingdom mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {getAvatarUrl() ? (
                      <Avatar className="h-20 w-20">
                        <AvatarImage src={getAvatarUrl() || undefined} alt="Profile picture" />
                        <AvatarFallback>
                          {user.firstName?.charAt(0) || user.first_name?.charAt(0) || user.username?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <KingdomAvatar
                        occupation={user.occupation || "other"}
                        interests={Array.isArray(user.interests) ? user.interests : []}
                        location={user.location || "Unknown"}
                        size="lg"
                        showDetails={false}
                      />
                    )}
                    
                    {isEditing && (
                      <div className="absolute -bottom-2 -right-2 flex gap-1">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-8 w-8 p-0 rounded-full"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingAvatar}
                        >
                          {uploadingAvatar ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                          ) : (
                            <Camera className="h-4 w-4" />
                          )}
                        </Button>
                        {getAvatarUrl() && (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-8 w-8 p-0 rounded-full"
                            onClick={handleRemoveAvatar}
                            disabled={uploadingAvatar}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <CardTitle className="text-2xl">
                      {user.firstName || user.first_name || user.username} {user.lastName || user.last_name || ""}
                    </CardTitle>
                    <CardDescription className="text-lg">
                      {user.occupation && OCCUPATIONS.find(o => o.id === user.occupation)?.name}
                    </CardDescription>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary">
                        <MapPin className="h-3 w-3 mr-1" />
                        {user.location}
                      </Badge>
                      <Badge variant="outline">
                        <Briefcase className="h-3 w-3 mr-1" />
                        Level 5
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button onClick={() => setIsEditing(!isEditing)}>
                  <Edit className="h-4 w-4 mr-2" />
                  {isEditing ? "Cancel" : "Edit Profile"}
                </Button>
              </div>
            </CardHeader>
          </Card>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            className="hidden"
          />

          {/* Profile Form */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <Card className="gradient-card border-border/50 shadow-kingdom">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell us about yourself..."
                    value={formData.bio}
                    onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                    disabled={!isEditing}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Professional Information */}
            <Card className="gradient-card border-border/50 shadow-kingdom">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Professional Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="occupation">Occupation</Label>
                  <Select
                    value={formData.occupation}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, occupation: value }))}
                    disabled={!isEditing}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your occupation" />
                    </SelectTrigger>
                    <SelectContent>
                      {OCCUPATIONS.map((occupation) => (
                        <SelectItem key={occupation.id} value={occupation.id}>
                          {occupation.icon} {occupation.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    disabled={!isEditing}
                    placeholder="Your city or region"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Interests */}
            <Card className="gradient-card border-border/50 shadow-kingdom md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  Interests
                </CardTitle>
                <CardDescription>
                  Select up to 5 interests to connect with like-minded people
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {INTERESTS.map((interest) => (
                    <Button
                      key={interest.id}
                      variant={formData.interests.includes(interest.id) ? "default" : "outline"}
                      size="sm"
                      className="flex flex-col items-center gap-1 h-auto p-3"
                      onClick={() => isEditing && handleInterestToggle(interest.id)}
                      disabled={!isEditing && !formData.interests.includes(interest.id)}
                    >
                      <span className="text-lg">{interest.icon}</span>
                      <span className="text-xs">{interest.name}</span>
                    </Button>
                  ))}
                </div>
                {isEditing && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Selected: {formData.interests.length}/5
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Save Button */}
          {isEditing && (
            <div className="flex justify-end mt-6">
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

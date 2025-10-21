import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit3, Trash2, Save, Moon, Star, Heart, Calendar, Tag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiService } from '@/services/api';

interface Dream {
  id: string;
  title: string;
  content: string;
  tags: string[];
  mood: 'peaceful' | 'exciting' | 'mysterious' | 'inspiring' | 'challenging';
  date: string;
  created_at: string;
  updated_at: string;
}

interface DreamPadProps {
  userId: string;
}

export const DreamPad: React.FC<DreamPadProps> = ({ userId }) => {
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDream, setEditingDream] = useState<Dream | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    tags: '',
    mood: 'peaceful' as Dream['mood'],
    date: new Date().toISOString().split('T')[0] // Default to today
  });

  const moodIcons = {
    peaceful: '🌙',
    exciting: '⭐',
    mysterious: '🔮',
    inspiring: '💫',
    challenging: '⚡'
  };

  const moodColors = {
    peaceful: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
    exciting: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
    mysterious: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
    inspiring: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
    challenging: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
  };

  useEffect(() => {
    fetchDreams();
  }, [userId]);

  const fetchDreams = async () => {
    try {
      setLoading(true);
      // For now, we'll use localStorage since we don't have a backend endpoint yet
      const savedDreams = localStorage.getItem(`dreams_${userId}`);
      if (savedDreams) {
        setDreams(JSON.parse(savedDreams));
      }
    } catch (error) {
      console.error('Error fetching dreams:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveDreams = async (dreamsToSave: Dream[]) => {
    try {
      localStorage.setItem(`dreams_${userId}`, JSON.stringify(dreamsToSave));
      // TODO: Add backend API call when endpoint is ready
      // await apiService.saveDreams(userId, dreamsToSave);
    } catch (error) {
      console.error('Error saving dreams:', error);
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim()) return;

    setSaving(true);
    try {
      const tagsArray = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      const newDream: Dream = {
        id: editingDream?.id || Date.now().toString(),
        title: formData.title,
        content: formData.content,
        tags: tagsArray,
        mood: formData.mood,
        date: new Date(formData.date).toLocaleDateString(),
        created_at: editingDream?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      let updatedDreams;
      if (editingDream) {
        updatedDreams = dreams.map(dream => 
          dream.id === editingDream.id ? newDream : dream
        );
      } else {
        updatedDreams = [...dreams, newDream];
      }

      setDreams(updatedDreams);
      await saveDreams(updatedDreams);
      
      // Reset form
      setFormData({ title: '', content: '', tags: '', mood: 'peaceful' });
      setEditingDream(null);
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving dream:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (dream: Dream) => {
    setEditingDream(dream);
    // Convert the dream date back to YYYY-MM-DD format for the input
    const dreamDate = new Date(dream.date).toISOString().split('T')[0];
    setFormData({
      title: dream.title,
      content: dream.content,
      tags: dream.tags.join(', '),
      mood: dream.mood,
      date: dreamDate
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (dreamId: string) => {
    if (!confirm('Are you sure you want to delete this dream?')) return;

    try {
      const updatedDreams = dreams.filter(dream => dream.id !== dreamId);
      setDreams(updatedDreams);
      await saveDreams(updatedDreams);
    } catch (error) {
      console.error('Error deleting dream:', error);
    }
  };

  const filteredDreams = dreams.filter(dream => {
    // Text search filter
    const matchesSearch = !searchQuery || (() => {
      const query = searchQuery.toLowerCase();
      return (
        dream.title.toLowerCase().includes(query) ||
        dream.content.toLowerCase().includes(query) ||
        dream.tags.some(tag => tag.toLowerCase().includes(query))
      );
    })();

    // Date filter
    const matchesDate = (() => {
      if (dateFilter === 'all') return true;
      
      const today = new Date();
      const dreamDate = new Date(dream.date);
      
      switch (dateFilter) {
        case 'today':
          return dreamDate.toDateString() === today.toDateString();
        case 'week':
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          return dreamDate >= weekAgo;
        case 'month':
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          return dreamDate >= monthAgo;
        case 'year':
          const yearAgo = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);
          return dreamDate >= yearAgo;
        default:
          return true;
      }
    })();

    return matchesSearch && matchesDate;
  });

  const resetForm = () => {
    setFormData({ title: '', content: '', tags: '', mood: 'peaceful', date: new Date().toISOString().split('T')[0] });
    setEditingDream(null);
  };

  return (
    <Card className="gradient-card border-border/50 shadow-kingdom">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Moon className="h-5 w-5 text-purple-500" />
          Dream & Vision Pad
          <Badge variant="secondary" className="ml-auto text-xs">
            {dreams.length} dreams
          </Badge>
        </CardTitle>
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search dreams by title, content, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 text-sm"
          />
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="text-sm border rounded-md px-2 py-1 bg-background"
          >
            <option value="all">All time</option>
            <option value="today">Today</option>
            <option value="week">This week</option>
            <option value="month">This month</option>
            <option value="year">This year</option>
          </select>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="max-h-[600px]">
          <div className="p-4 space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : filteredDreams.length === 0 ? (
              <div className="text-center py-8">
                <Moon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? 'No dreams match your search' : 'No dreams recorded yet'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {searchQuery ? 'Try different keywords' : 'Start recording your dreams and visions'}
                </p>
              </div>
            ) : (
              filteredDreams.map((dream) => (
                <div
                  key={dream.id}
                  className="p-3 rounded-lg border bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-900/20 dark:to-blue-900/20 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-sm line-clamp-1">{dream.title}</h4>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(dream)}
                        className="h-6 w-6 p-0"
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(dream.id)}
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                    {dream.content}
                  </p>
                  
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${moodColors[dream.mood]}`}
                    >
                      {moodIcons[dream.mood]} {dream.mood}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{dream.date}</span>
                    </div>
                  </div>
                  
                  {dream.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {dream.tags.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          <Tag className="h-2 w-2 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                      {dream.tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{dream.tags.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Add Dream Button - Now inside ScrollArea, right after dreams */}
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="w-full" size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  {editingDream ? 'Edit Dream' : 'Record New Dream'}
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Moon className="h-5 w-5 text-purple-500" />
                  {editingDream ? 'Edit Dream' : 'Record New Dream'}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Dream Title</label>
                  <Input
                    placeholder="Give your dream a title..."
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="text-sm"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Dream Content</label>
                  <Textarea
                    placeholder="Describe your dream or vision in detail..."
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    className="min-h-[200px] text-sm"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Date</label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                      className="text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Tags</label>
                    <Input
                      placeholder="success, career, family (comma separated)"
                      value={formData.tags}
                      onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                      className="text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Mood</label>
                    <select
                      value={formData.mood}
                      onChange={(e) => setFormData(prev => ({ ...prev, mood: e.target.value as Dream['mood'] }))}
                      className="w-full p-2 border rounded-md text-sm"
                    >
                      <option value="peaceful">🌙 Peaceful</option>
                      <option value="exciting">⭐ Exciting</option>
                      <option value="mysterious">🔮 Mysterious</option>
                      <option value="inspiring">💫 Inspiring</option>
                      <option value="challenging">⚡ Challenging</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleSave}
                    disabled={!formData.title.trim() || !formData.content.trim() || saving}
                    className="flex-1"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Dream'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

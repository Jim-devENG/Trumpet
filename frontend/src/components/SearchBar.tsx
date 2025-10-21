import React, { useState, useEffect } from 'react';
import { Search, X, User, MessageSquare, Calendar, Briefcase } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { apiService } from '@/services/api';

interface SearchResult {
  id: string;
  type: 'user' | 'post' | 'event' | 'job';
  title: string;
  description: string;
  author?: string;
  date?: string;
  location?: string;
  occupation?: string;
}

export const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      // Search users
      const usersResponse = await apiService.searchUsers(searchQuery, 1, 5);
      const userResults: SearchResult[] = usersResponse.success 
        ? usersResponse.data.users.map((user: any) => ({
            id: user.id,
            type: 'user' as const,
            title: `${user.first_name || user.firstName || ''} ${user.last_name || user.lastName || ''}`.trim() || user.username,
            description: user.bio || `${user.occupation} • ${user.location}`,
            occupation: user.occupation,
            location: user.location
          }))
        : [];

      // Search posts (we'll need to implement this endpoint)
      const postsResponse = await apiService.getHomeFeed();
      const postResults: SearchResult[] = postsResponse.success 
        ? postsResponse.data.posts
            .filter((post: any) => 
              post.content?.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .slice(0, 3)
            .map((post: any) => ({
              id: post.id,
              type: 'post' as const,
              title: post.content?.substring(0, 50) + (post.content?.length > 50 ? '...' : ''),
              description: `By ${post.first_name || post.firstName || ''} ${post.last_name || post.lastName || ''}`,
              author: `${post.first_name || post.firstName || ''} ${post.last_name || post.lastName || ''}`,
              date: post.created_at
            }))
        : [];

      // Search events
      const eventsResponse = await apiService.getEvents();
      const eventResults: SearchResult[] = eventsResponse.success 
        ? eventsResponse.data.events
            .filter((event: any) => 
              event.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              event.description?.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .slice(0, 3)
            .map((event: any) => ({
              id: event.id,
              type: 'event' as const,
              title: event.title,
              description: event.description,
              location: event.location,
              date: event.date
            }))
        : [];

      // Search jobs
      const jobsResponse = await apiService.getJobs();
      const jobResults: SearchResult[] = jobsResponse.success 
        ? jobsResponse.data.jobs
            .filter((job: any) => 
              job.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              job.description?.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .slice(0, 3)
            .map((job: any) => ({
              id: job.id,
              type: 'job' as const,
              title: job.title,
              description: job.description,
              location: job.location,
              date: job.created_at
            }))
        : [];

      setResults([...userResults, ...postResults, ...eventResults, ...jobResults]);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim()) {
        handleSearch(query);
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'user':
        return <User className="h-4 w-4" />;
      case 'post':
        return <MessageSquare className="h-4 w-4" />;
      case 'event':
        return <Calendar className="h-4 w-4" />;
      case 'job':
        return <Briefcase className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  const getResultBadge = (type: string) => {
    switch (type) {
      case 'user':
        return <Badge variant="secondary" className="text-xs">User</Badge>;
      case 'post':
        return <Badge variant="outline" className="text-xs">Post</Badge>;
      case 'event':
        return <Badge variant="default" className="text-xs">Event</Badge>;
      case 'job':
        return <Badge variant="destructive" className="text-xs">Job</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search trumpet..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="pl-10 pr-10"
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setQuery('');
              setResults([]);
            }}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (query || results.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Searching...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="p-2">
              {results.map((result) => (
                <div
                  key={`${result.type}-${result.id}`}
                  className="p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getResultIcon(result.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm truncate">{result.title}</h4>
                        {getResultBadge(result.type)}
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">{result.description}</p>
                      {result.location && (
                        <p className="text-xs text-muted-foreground">{result.location}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : query ? (
            <div className="p-4 text-center text-muted-foreground">
              <p className="text-sm">No results found for "{query}"</p>
            </div>
          ) : null}
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};



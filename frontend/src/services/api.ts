export const API_BASE_URL =
  (typeof window !== 'undefined' && (import.meta as any)?.env?.VITE_API_BASE_URL) ||
  (typeof window !== 'undefined'
    ? `http://${window.location.hostname}:8000/api`
    : 'http://localhost:8000/api');

class ApiService {
  private token: string | null = null;
  private pendingRequests: Map<string, Promise<any>> = new Map();
  private lastRequestTime: number = 0;
  private readonly MIN_REQUEST_INTERVAL = 100; // 100ms between requests

  constructor() {
    this.token = localStorage.getItem('trumpet_token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('trumpet_token', token);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('trumpet:auth-changed', { detail: { token } }));
    }
  }

  getToken() {
    return this.token;
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('trumpet_token');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('trumpet:auth-changed', { detail: { token: null } }));
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    
    // Create a unique key for this request to prevent duplicates
    const bodyKey = isFormData ? '[formdata]' : JSON.stringify(options.body || '');
    const requestKey = `${options.method || 'GET'}:${endpoint}:${bodyKey}`;
    
    // If this request is already pending, return the existing promise
    if (this.pendingRequests.has(requestKey)) {
      console.log('Request already pending, returning existing promise:', requestKey);
      return this.pendingRequests.get(requestKey)!;
    }
    
    const baseHeaders: Record<string, string> = {
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...(options.headers as Record<string, string> | undefined),
    };

    const config: RequestInit = {
      headers: isFormData ? baseHeaders : { 'Content-Type': 'application/json', ...baseHeaders },
      ...options,
    };

    // Ensure body is properly formatted
    if (config.body && !isFormData) {
      if (typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
      }
    }

    console.log('API Request:', { 
      url, 
      method: config.method,
      headers: config.headers,
      body: isFormData ? '[formdata]' : (config.body as any),
      bodyType: isFormData ? 'formdata' : typeof config.body,
      bodyLength: isFormData ? -1 : (config.body ? (config.body as any).length : 0),
      token: this.token 
    });
    
    // Create the request promise
    const requestPromise = (async () => {
      try {
        // Add throttling to prevent rapid requests
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
          const delay = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
          console.log(`Throttling request by ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        this.lastRequestTime = Date.now();
        
        const response = await fetch(url, config);
        console.log('API Response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error Response:', errorText);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        console.log('API Response data:', data);
        return data;
      } catch (error) {
        console.error('API Request failed:', error);
        throw error;
      } finally {
        // Remove from pending requests when done
        this.pendingRequests.delete(requestKey);
      }
    })();
    
    // Store the promise to prevent duplicate requests
    this.pendingRequests.set(requestKey, requestPromise);
    
    return requestPromise;
  }

  // Auth endpoints
  async register(userData: {
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    occupation: string;
    interests: string[];
    location: string;
    password: string;
  }) {
    console.log('API: Registering user with data:', userData);
    
    const response = await this.request<{
      success: boolean;
      message: string;
      data: { user: any; token: string };
    }>('/auth/register', {
      method: 'POST',
      body: userData,
    });

    console.log('API: Registration response:', response);
    if (response.success) {
      this.setToken(response.data.token);
      console.log('API: Token set successfully');
    }

    return response;
  }

  async login(credentials: { email: string; password: string }) {
    const response = await this.request<{
      success: boolean;
      message: string;
      data: { user: any; token: string };
    }>('/auth/login', {
      method: 'POST',
      body: credentials,
    });

    if (response.success) {
      this.setToken(response.data.token);
    }

    return response;
  }

  async getCurrentUser() {
    return this.request<{
      success: boolean;
      data: { user: any };
    }>('/auth/me');
  }

  async updateProfile(profileData: {
    firstName?: string;
    lastName?: string;
    bio?: string;
    interests?: string[];
    location?: string;
  }) {
    return this.request<{
      success: boolean;
      message: string;
      data: { user: any };
    }>('/auth/profile', {
      method: 'PUT',
      body: profileData,
    });
  }

  async uploadProfilePicture(formData: FormData) {
    return this.request<{
      success: boolean;
      message: string;
      data: { avatar_url: string };
    }>('/auth/avatar', {
      method: 'POST',
      body: formData,
      bodyType: 'form',
    });
  }

  async removeProfilePicture() {
    return this.request<{
      success: boolean;
      message: string;
    }>('/auth/avatar', {
      method: 'DELETE',
    });
  }

  // Users endpoints
  async getUsers(params?: {
    page?: number;
    limit?: number;
    occupation?: string;
    location?: string;
    interests?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }

    return this.request<{
      success: boolean;
      data: { users: any[]; pagination: any };
    }>(`/users?${searchParams.toString()}`);
  }

  async getUserById(id: string) {
    return this.request<{
      success: boolean;
      data: { user: any };
    }>(`/users/${id}`);
  }

  // Friends endpoints
  async sendFriendRequest(userId: string) {
    return this.request<{ success: boolean; message: string }>(`/friends/request`, {
      method: 'POST',
      body: { userId }
    });
  }

  async acceptFriendRequest(requesterId: string) {
    return this.request<{ success: boolean; message: string }>(`/friends/accept`, {
      method: 'POST',
      body: { requesterId }
    });
  }

  async getFriendRequests() {
    return this.request<{ success: boolean; data: { requests: any[] } }>(`/friends/requests`);
  }

  async searchUsers(query: string, page = 1, limit = 20) {
    return this.request<{
      success: boolean;
      data: { users: any[]; pagination: any };
    }>(`/users/search/${encodeURIComponent(query)}?page=${page}&limit=${limit}`);
  }

  // Posts endpoints
  async createPost(postData: { content: string; imageUrl?: string; imageBase64?: string }) {
    console.log('API: Creating post with data:', postData);
    console.log('API: Current token:', this.token);
    return this.request<{
      success: boolean;
      message: string;
      data: { post: any };
    }>('/posts', {
      method: 'POST',
      body: postData,
    });
  }


  async getPosts(params?: {
    page?: number;
    limit?: number;
    occupation?: string;
    location?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }

    return this.request<{
      success: boolean;
      data: { posts: any[]; pagination: any };
    }>(`/posts?${searchParams.toString()}`);
  }

  async getHomeFeed() {
    return this.request<{
      success: boolean;
      data: { posts: any[] };
    }>(`/feed`);
  }

  async getPostById(id: string) {
    return this.request<{
      success: boolean;
      data: { post: any };
    }>(`/posts/${id}`);
  }


  async addComment(postId: string, content: string) {
    return this.request<{
      success: boolean;
      message: string;
      data: { comment: any };
    }>(`/posts/${postId}/comments`, {
      method: 'POST',
      body: { content },
    });
  }

  async getComments(postId: string, page = 1, limit = 20) {
    return this.request<{
      success: boolean;
      data: { comments: any[] };
    }>(`/posts/${postId}/comments?page=${page}&limit=${limit}`);
  }

  // Events endpoints
  async createEvent(eventData: {
    title: string;
    description: string;
    location: string;
    date: string;
    maxAttendees?: number;
    imageUrl?: string;
  }) {
    return this.request<{
      success: boolean;
      message: string;
      data: { event: any };
    }>('/events', {
      method: 'POST',
      body: eventData,
    });
  }

  async getEvents(params?: {
    page?: number;
    limit?: number;
    location?: string;
    occupation?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }

    return this.request<{
      success: boolean;
      data: { events: any[]; pagination: any };
    }>(`/events?${searchParams.toString()}`);
  }

  async getEventById(id: string) {
    return this.request<{
      success: boolean;
      data: { event: any };
    }>(`/events/${id}`);
  }

  async attendEvent(id: string, status: 'attending' | 'maybe' | 'not_attending') {
    return this.request<{
      success: boolean;
      message: string;
      data: { attendee: any };
    }>(`/events/${id}/attend`, {
      method: 'POST',
      body: { status },
    });
  }

  // Jobs endpoints
  async createJob(jobData: {
    title: string;
    description: string;
    company: string;
    location: string;
    type: 'full-time' | 'part-time' | 'contract' | 'internship';
    salary?: string;
    requirements?: string[];
    benefits?: string[];
  }) {
    return this.request<{
      success: boolean;
      message: string;
      data: { job: any };
    }>('/jobs', {
      method: 'POST',
      body: jobData,
    });
  }

  async getJobs(params?: {
    page?: number;
    limit?: number;
    location?: string;
    type?: string;
    occupation?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }

    return this.request<{
      success: boolean;
      data: { jobs: any[]; pagination: any };
    }>(`/jobs?${searchParams.toString()}`);
  }

  async getJobById(id: string) {
    return this.request<{
      success: boolean;
      data: { job: any };
    }>(`/jobs/${id}`);
  }

  async applyForJob(id: string, applicationData: {
    coverLetter?: string;
    resumeUrl?: string;
  }) {
    return this.request<{
      success: boolean;
      message: string;
      data: { application: any };
    }>(`/jobs/${id}/apply`, {
      method: 'POST',
      body: applicationData,
    });
  }

  // Messages endpoints
  async sendMessage(receiverId: string, content: string) {
    return this.request<{
      success: boolean;
      message: string;
      data: { message: any };
    }>('/messages', {
      method: 'POST',
      body: { receiverId, content },
    });
  }

  async getConversations() {
    return this.request<{
      success: boolean;
      data: { conversations: any[] };
    }>('/messages/conversations');
  }

  async getMessages(userId: string, page = 1, limit = 50) {
    return this.request<{
      success: boolean;
      data: { messages: any[] };
    }>(`/messages/${userId}?page=${page}&limit=${limit}`);
  }

  // Notifications endpoints
  async getNotifications(params?: {
    page?: number;
    limit?: number;
    unread?: boolean;
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }

    return this.request<{
      success: boolean;
      data: { notifications: any[]; unreadCount: number; pagination: any };
    }>(`/notifications?${searchParams.toString()}`);
  }

  async markNotificationAsRead(id: string) {
    return this.request<{
      success: boolean;
      message: string;
      data: { notification: any };
    }>(`/notifications/${id}/read`, {
      method: 'PUT',
    });
  }

  async markAllNotificationsAsRead() {
    return this.request<{
      success: boolean;
      message: string;
    }>('/notifications/read-all', {
      method: 'PUT',
    });
  }

  // Prophecy Library endpoints
  async createProphecy(payload: {
    title: string;
    body?: string;
    videoUrl?: string;
    audioUrl?: string;
    tags?: string[];
    mountain?: string;
  }) {
    return this.request<{
      success: boolean;
      data: { prophecy: any };
    }>('/prophecies', {
      method: 'POST',
      body: payload,
    });
  }

  async listProphecies(params?: {
    page?: number;
    limit?: number;
    q?: string;
    mountain?: string;
    tag?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    return this.request<{
      success: boolean;
      data: { prophecies: any[] };
    }>(`/prophecies?${searchParams.toString()}`);
  }

  async getProphecy(id: string) {
    return this.request<{
      success: boolean;
      data: { prophecy: any };
    }>(`/prophecies/${id}`);
  }


  async getUnreadNotificationCount() {
    return this.request<{
      success: boolean;
      data: { count: number };
    }>('/notifications/unread-count');
  }

  // Gamification
  async getUserLevel(userId: string) {
    return this.request<{
      success: boolean;
      data: any;
    }>(`/gamification/level/${userId}`);
  }

  async getUserAchievements(userId: string) {
    return this.request<{
      success: boolean;
      data: { achievements: any[] };
    }>(`/gamification/achievements/${userId}`);
  }

  async getUserBadges(userId: string) {
    return this.request<{
      success: boolean;
      data: { badges: any[] };
    }>(`/gamification/badges/${userId}`);
  }

  async getLeaderboard(type = 'level', limit = 10) {
    return this.request<{
      success: boolean;
      data: { leaderboard: any[] };
    }>(`/gamification/leaderboard?type=${type}&limit=${limit}`);
  }

  // AI Recommendations
  async getContentRecommendations(userId: string) {
    return this.request<{
      success: boolean;
      data: { recommendations: string[] };
    }>(`/ai/content-recommendations/${userId}`);
  }

  async getConnectionRecommendations(userId: string) {
    return this.request<{
      success: boolean;
      data: { recommendations: string[] };
    }>(`/ai/connection-recommendations/${userId}`);
  }

  async analyzePost(postId: string) {
    return this.request<{
      success: boolean;
      data: { analysis: string };
    }>(`/ai/analyze-post/${postId}`, {
      method: 'POST',
    });
  }

  // ==================== IMAGE MANAGEMENT METHODS ====================

  // Upload image
  async uploadImage(file: File, metadata?: { altText?: string; description?: string; tags?: string[] }) {
    const formData = new FormData();
    formData.append('image', file);
    
    if (metadata?.altText) formData.append('altText', metadata.altText);
    if (metadata?.description) formData.append('description', metadata.description);
    if (metadata?.tags) formData.append('tags', JSON.stringify(metadata.tags));

    return this.request<{
      success: boolean;
      message: string;
      data: {
        imageId: string;
        filename: string;
        originalName: string;
        filePath: string;
        fileSize: number;
        mimeType: string;
        url: string;
      };
    }>('/images/upload', {
      method: 'POST',
      body: formData,
    });
  }

  // Get image by ID
  async getImage(imageId: string) {
    return this.request<{
      success: boolean;
      data: {
        id: string;
        filename: string;
        originalName: string;
        filePath: string;
        fileSize: number;
        mimeType: string;
        width: number;
        height: number;
        altText: string;
        description: string;
        isPublic: boolean;
        uploadedBy: {
          id: string;
          name: string;
          username: string;
        };
        createdAt: string;
        url: string;
      };
    }>(`/images/${imageId}`);
  }

  // Get images with filtering and pagination
  async getImages(params?: {
    page?: number;
    limit?: number;
    uploadedBy?: string;
    mimeType?: string;
    tag?: string;
    isPublic?: boolean;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }) {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.uploadedBy) queryParams.append('uploadedBy', params.uploadedBy);
    if (params?.mimeType) queryParams.append('mimeType', params.mimeType);
    if (params?.tag) queryParams.append('tag', params.tag);
    if (params?.isPublic !== undefined) queryParams.append('isPublic', params.isPublic.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/images?${queryString}` : '/images';

    return this.request<{
      success: boolean;
      data: {
        images: Array<{
          id: string;
          filename: string;
          originalName: string;
          fileSize: number;
          mimeType: string;
          width: number;
          height: number;
          altText: string;
          description: string;
          isPublic: boolean;
          viewCount: number;
          uploadedBy: {
            id: string;
            name: string;
            username: string;
          };
          createdAt: string;
          url: string;
        }>;
        pagination: {
          page: number;
          limit: number;
          total: number;
          pages: number;
        };
      };
    }>(endpoint);
  }

  // Create image relationship (link image to post, event, etc.)
  async createImageRelationship(imageId: string, entityType: string, entityId: string, relationshipType: string = 'primary', displayOrder: number = 0) {
    return this.request<{
      success: boolean;
      message: string;
      data: {
        relationshipId: string;
        imageId: string;
        entityType: string;
        entityId: string;
        relationshipType: string;
        displayOrder: number;
      };
    }>(`/images/${imageId}/relationships`, {
      method: 'POST',
      body: JSON.stringify({
        entityType,
        entityId,
        relationshipType,
        displayOrder,
      }),
    });
  }

  // Get images for a specific entity (post, event, etc.)
  async getEntityImages(entityType: string, entityId: string) {
    return this.request<{
      success: boolean;
      data: {
        entityType: string;
        entityId: string;
        images: Array<{
          id: string;
          filename: string;
          originalName: string;
          fileSize: number;
          mimeType: string;
          width: number;
          height: number;
          altText: string;
          description: string;
          relationshipType: string;
          displayOrder: number;
          uploadedBy: {
            id: string;
            name: string;
            username: string;
          };
          createdAt: string;
          url: string;
        }>;
      };
    }>(`/images/entity/${entityType}/${entityId}`);
  }

  // Add tags to image
  async addImageTags(imageId: string, tags: string[]) {
    return this.request<{
      success: boolean;
      message: string;
      data: {
        imageId: string;
        tags: string[];
      };
    }>(`/images/${imageId}/tags`, {
      method: 'POST',
      body: JSON.stringify({ tags }),
    });
  }

  // Get image analytics
  async getImageAnalytics(imageId: string, action?: string, days: number = 30) {
    const queryParams = new URLSearchParams();
    queryParams.append('days', days.toString());
    if (action) queryParams.append('action', action);

    return this.request<{
      success: boolean;
      data: {
        imageId: string;
        period: string;
        analytics: Array<{
          action: string;
          count: number;
          date: string;
        }>;
      };
    }>(`/images/${imageId}/analytics?${queryParams.toString()}`);
  }

  // Delete image
  async deleteImage(imageId: string) {
    return this.request<{
      success: boolean;
      message: string;
    }>(`/images/${imageId}`, {
      method: 'DELETE',
    });
  }

  // Helper method to get image URL
  getImageUrl(imagePath: string): string {
    if (!imagePath) return '';
    if (imagePath.startsWith('http')) return imagePath;
    
    // Extract filename from path (remove /uploads/ prefix if present)
    const filename = imagePath.replace(/^\/uploads\//, '');
    
    // Use the same hostname as the frontend but port 8000 for backend
    const baseUrl = typeof window !== 'undefined' 
      ? `http://${window.location.hostname}:8000` 
      : 'http://192.168.1.101:8000';
    
    // Use the dedicated image endpoint
    const fullUrl = `${baseUrl}/api/image/${filename}`;
    
    console.log('🔧 API SERVICE IMAGE URL (DEDICATED ENDPOINT):', {
      original: imagePath,
      filename,
      baseUrl,
      fullUrl,
      windowHostname: typeof window !== 'undefined' ? window.location.hostname : 'N/A'
    });
    
    return fullUrl;
  }

  // Helper method to get base64 image URL (fallback for CORS issues)
  async getImageUrlBase64(imagePath: string): Promise<string> {
    if (!imagePath) return '';
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('data:')) return imagePath;

    // Extract filename from path (remove /uploads/ prefix if present)
    const filename = imagePath.replace(/^\/uploads\//, '');

    try {
      const response = await this.request<{
        success: boolean;
        dataUrl: string;
        mimeType: string;
        size: number;
      }>(`/image-base64/${filename}`);

      if (response.success) {
        console.log('🔧 API SERVICE BASE64 IMAGE URL:', {
          original: imagePath,
          filename,
          dataUrl: response.dataUrl.substring(0, 50) + '...',
          mimeType: response.mimeType,
          size: response.size
        });
        return response.dataUrl;
      }
    } catch (error) {
      console.error('❌ ERROR GETTING BASE64 IMAGE:', error);
    }

    // Fallback to regular URL
    return this.getImageUrl(imagePath);
  }

  // User Feed API Methods
  async getUserPosts(userId: string) {
    return this.request(`/users/${userId}/posts`);
  }

  async getMountainFeed(userId: string) {
    return this.request(`/users/${userId}/mountain-feed`);
  }

  async getMountainUsers(userId: string) {
    return this.request(`/users/${userId}/mountain-users`);
  }

  async getUserAnalytics(userId: string) {
    return this.request(`/users/${userId}/analytics`);
  }

  async likePost(postId: string) {
    return this.request(`/posts/${postId}/like`, { method: 'POST' });
  }

  async commentOnPost(postId: string, content: string) {
    return this.request(`/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content })
    });
  }

  async sharePost(postId: string) {
    return this.request(`/posts/${postId}/share`, { method: 'POST' });
  }

  // Helper method to get optimized image URL (for thumbnails, etc.)
  getOptimizedImageUrl(imagePath: string, width?: number, height?: number, quality?: number): string {
    const baseUrl = this.getImageUrl(imagePath);
    
    if (!width && !height && !quality) {
      return baseUrl;
    }
    
    // For now, return the base URL. In a production system, you'd want to implement
    // image optimization service that can resize/compress images on demand
    return baseUrl;
  }

}

export const apiService = new ApiService();
export default apiService;

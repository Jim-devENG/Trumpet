import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { apiService } from '@/services/api';
import { useAuth } from './AuthContext';

interface Notification {
  id: number;
  user_id: string;
  type: string;
  message: string;
  data: any;
  is_read: boolean;
  created_at: string;
}

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  socket: Socket | null;
  markAsRead: (notificationId: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const { user } = useAuth();

  // Initialize socket connection
  useEffect(() => {
    if (user && apiService.getToken()) {
      try {
        const API_BASE = (import.meta as any)?.env?.VITE_API_BASE_URL || 'http://localhost:8000/api';
        const SOCKET_URL = API_BASE.replace('/api', '');
        
        console.log('Connecting to socket:', SOCKET_URL);
        
        const newSocket = io(SOCKET_URL, {
          auth: {
            token: apiService.getToken()
          }
        });

        newSocket.on('connect', () => {
          console.log('Socket connected');
        });

        newSocket.on('disconnect', () => {
          console.log('Socket disconnected');
        });

        newSocket.on('notification', (notification: Notification) => {
          console.log('Received notification:', notification);
          setNotifications(prev => [notification, ...prev]);
          setUnreadCount(prev => prev + 1);
        });

        newSocket.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
        });

        setSocket(newSocket);

        return () => {
          newSocket.close();
        };
      } catch (error) {
        console.error('Error initializing socket:', error);
      }
    }
  }, [user]);

  // Load initial notifications
  const refreshNotifications = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const [notificationsRes, unreadRes] = await Promise.all([
        apiService.getNotifications(),
        apiService.getUnreadNotificationCount()
      ]);

      if (notificationsRes.success) {
        setNotifications(notificationsRes.data.notifications);
      }

      if (unreadRes.success) {
        setUnreadCount(unreadRes.data.count);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  const markAsRead = useCallback(async (notificationId: number) => {
    try {
      await apiService.markNotificationAsRead(notificationId.toString());
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, is_read: true }
            : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await apiService.markAllNotificationsAsRead();
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, is_read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, []);

  const value = {
    notifications,
    unreadCount,
    loading,
    socket,
    markAsRead,
    markAllAsRead,
    refreshNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextValue => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const DashboardTest: React.FC = () => {
  const { user: authUser, logout } = useAuth();

  if (!authUser) {
    return (
      <div className="min-h-screen gradient-kingdom flex items-center justify-center">
        <div className="text-center">
          <Crown className="h-12 w-12 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Welcome to TRUMPET</h1>
          <p className="text-muted-foreground mb-4">Please sign in to access your kingdom</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-kingdom">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Welcome to TRUMPET Dashboard</h1>
          <p className="text-lg text-muted-foreground mb-8">
            Hello, {authUser.firstName}! This is a test dashboard.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <Card className="gradient-card border-border/50 shadow-kingdom">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                User Info
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p><strong>Name:</strong> {authUser.firstName} {authUser.lastName}</p>
                <p><strong>Email:</strong> {authUser.email}</p>
                <p><strong>Username:</strong> {authUser.username}</p>
                <p><strong>Occupation:</strong> {authUser.occupation || 'Not specified'}</p>
                <p><strong>Location:</strong> {authUser.location || 'Not specified'}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="gradient-card border-border/50 shadow-kingdom">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" variant="outline">
                Create Post
              </Button>
              <Button className="w-full" variant="outline">
                View Feed
              </Button>
              <Button className="w-full" variant="outline">
                Settings
              </Button>
            </CardContent>
          </Card>

          <Card className="gradient-card border-border/50 shadow-kingdom">
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p className="text-green-500">✅ Backend Connected</p>
                <p className="text-green-500">✅ Frontend Loaded</p>
                <p className="text-green-500">✅ User Authenticated</p>
                <Button onClick={logout} variant="outline" className="w-full mt-4">
                  Logout
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardTest;



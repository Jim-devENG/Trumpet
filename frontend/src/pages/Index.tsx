import { useState, useEffect } from "react";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { Dashboard } from "@/components/dashboard/Dashboard";
import ErrorBoundary from "@/components/ErrorBoundary";
import { LoadingScreen } from "@/components/LoadingScreen";
import { apiService, API_BASE_URL } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, LogIn, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";

interface UserData {
  occupation: string;
  interests: string[];
  location: string;
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
}

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Debug: Log user state changes
  console.log('Index: Current user state:', { user, authLoading, isLoading });

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      try {
        const response = await apiService.getCurrentUser();
        if (response.success) {
          // User is authenticated, will be handled by AuthContext
          console.log('User is authenticated:', response.data.user);
        }
      } catch (error) {
        // not authenticated
        console.log('User not authenticated');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleOnboardingComplete = async (data: UserData) => {
    try {
      console.log('Starting registration with data:', data);
      
      // Test connectivity first
      try {
        const dynamicHealthUrl = `${API_BASE_URL}/health`;
        console.log('Connectivity test. API_BASE_URL:', API_BASE_URL);
        console.log('Trying health check at:', dynamicHealthUrl);
        let healthCheck = await fetch(dynamicHealthUrl, { method: 'GET' });
        console.log('Health check response (dynamic):', healthCheck.status);
        if (!healthCheck.ok) {
          const fallbackHealthUrl = 'http://localhost:8000/api/health';
          console.log('Dynamic health failed. Trying fallback:', fallbackHealthUrl);
          healthCheck = await fetch(fallbackHealthUrl, { method: 'GET' });
          console.log('Health check response (fallback):', healthCheck.status);
          if (!healthCheck.ok) {
            throw new Error(`Backend not responding at ${dynamicHealthUrl} or fallback localhost`);
          }
        }
      } catch (connectError) {
        console.error('Backend connectivity test failed:', connectError);
        alert(`Cannot connect to backend server. Checked: ${API_BASE_URL}/health and http://localhost:8000/api/health`);
        return;
      }
      
      // Register user with backend using actual credentials
      const response = await apiService.register({
        email: data.email,
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
        occupation: data.occupation,
        interests: data.interests,
        location: data.location,
        password: data.password
      });

      console.log('Registration response:', response);
      if (response.success) {
        console.log('Registration successful');
        // AuthContext will handle the rest
        setShowOnboarding(false);
      } else {
        console.error('Registration failed:', response.message);
        alert('Registration failed: ' + response.message);
      }
    } catch (error) {
      console.error('Registration failed:', error);
      alert('Registration failed: ' + error.message);
    }
  };

  if (isLoading || authLoading) {
    return <LoadingScreen />;
  }

  // If user is authenticated, show dashboard
  if (user) {
    console.log('Index: User is authenticated, showing dashboard for user:', user);
    return (
      <ErrorBoundary>
        <Dashboard />
      </ErrorBoundary>
    );
  }

  // If showing onboarding, show the flow
  if (showOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  // Show login/signup options
  return (
    <div className="min-h-screen gradient-kingdom flex items-center justify-center p-4 animate-in fade-in duration-500">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Crown className="h-12 w-12 text-secondary" />
            <h1 className="text-5xl font-bold">TRUMPET</h1>
          </div>
          <p className="text-xl text-muted-foreground mb-2">
            Welcome to your Kingdom
          </p>
          <p className="text-lg text-muted-foreground">
            Connect • Create • Conquer
          </p>
        </div>

        {/* Login/Signup Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
          {/* Login Card */}
          <Card className="gradient-card border-border/50 shadow-kingdom">
            <CardHeader className="text-center">
              <LogIn className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle className="text-2xl">Welcome Back</CardTitle>
              <CardDescription>
                Sign in to your existing account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Already have an account? Sign in to continue your journey.
              </p>
              <Button asChild className="w-full" size="lg">
                <Link to="/login">
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Signup Card */}
          <Card className="gradient-card border-border/50 shadow-kingdom">
            <CardHeader className="text-center">
              <UserPlus className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle className="text-2xl">Join the Kingdom</CardTitle>
              <CardDescription>
                Create your account and choose your path
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                New to Trumpet? Create an account and discover your mountain.
              </p>
              <Button 
                onClick={() => setShowOnboarding(true)}
                className="w-full" 
                size="lg"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Create Account
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold mb-8">What awaits you in your Kingdom?</h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="p-6 rounded-lg bg-background/50 border border-border/50">
              <h3 className="font-semibold mb-2">Your Mountain</h3>
              <p className="text-sm text-muted-foreground">
                Connect with others in your occupation and build your professional network.
              </p>
            </div>
            <div className="p-6 rounded-lg bg-background/50 border border-border/50">
              <h3 className="font-semibold mb-2">Prophecy Library</h3>
              <p className="text-sm text-muted-foreground">
                Share and discover prophecies, visions, and spiritual insights.
              </p>
            </div>
            <div className="p-6 rounded-lg bg-background/50 border border-border/50">
              <h3 className="font-semibold mb-2">Events & Jobs</h3>
              <p className="text-sm text-muted-foreground">
                Find opportunities and events tailored to your mountain.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
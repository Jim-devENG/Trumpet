import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Crown, MapPin, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";

interface OnboardingFlowProps {
  onComplete: (data: { occupation: string; interests: string[]; location: string; email: string; username: string; password: string; firstName: string; lastName: string }) => void;
}

const OCCUPATIONS = [
  { id: "government", name: "Government", icon: "🏛️", description: "Public Service & Policy", color: "text-red-500" },
  { id: "family", name: "Family", icon: "👨‍👩‍👧‍👦", description: "Family & Relationships", color: "text-orange-500" },
  { id: "media", name: "Media", icon: "📺", description: "Media & Communications", color: "text-yellow-500" },
  { id: "arts", name: "Arts & Entertainment", icon: "🎭", description: "Creative & Performance", color: "text-green-500" },
  { id: "economy", name: "Economy", icon: "💼", description: "Business & Economics", color: "text-sky-500" },
  { id: "education", name: "Education", icon: "🎓", description: "Learning & Teaching", color: "text-indigo-500" },
  { id: "spirituality", name: "Spirituality", icon: "🙏", description: "Faith & Spiritual Growth", color: "text-violet-500" },
  { id: "other", name: "Other", icon: "⭐", description: "Various & Diverse", color: "text-foreground" },
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

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(1);
  const [selectedOccupation, setSelectedOccupation] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      onComplete({
        occupation: selectedOccupation,
        interests: selectedInterests,
        location: selectedLocation,
        email,
        username,
        password,
        firstName,
        lastName,
      });
    }
  };

  const handleInterestToggle = (interestId: string) => {
    if (selectedInterests.includes(interestId)) {
      setSelectedInterests(selectedInterests.filter(id => id !== interestId));
    } else if (selectedInterests.length < 5) {
      setSelectedInterests([...selectedInterests, interestId]);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return selectedOccupation !== "";
      case 2: return selectedInterests.length >= 3;
      case 3: return selectedLocation !== "" && firstName.trim().length >= 2 && lastName.trim().length >= 2 && email.includes("@") && username.trim().length >= 3 && password.trim().length >= 6;
      default: return false;
    }
  };

  return (
    <div className="min-h-screen gradient-kingdom flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl gradient-card border-border/50 shadow-kingdom">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Crown className="h-8 w-8 text-secondary" />
            <h1 className="text-3xl font-bold gradient-royal bg-clip-text text-transparent">
              TRUMPET
            </h1>
          </div>
          <CardTitle className="text-2xl">
            {step === 1 && "Choose Your Field"}
            {step === 2 && "Select Your Interests"}
            {step === 3 && "Set Your Kingdom & Create Account"}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {step === 1 && "Select your primary occupation to join the right professional field"}
            {step === 2 && "Pick 3-5 interests to connect with like-minded communities"}
            {step === 3 && "Share your location and create your account to enter the kingdom"}
          </CardDescription>
          <div className="flex justify-center mt-4">
            <div className="flex gap-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`h-2 w-8 rounded-full transition-royal ${
                    i <= step ? "bg-primary glow-royal" : "bg-muted"
                  }`}
                />
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {step === 1 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {OCCUPATIONS.map((occupation) => (
                <Card
                  key={occupation.id}
                  className={`cursor-pointer transition-royal hover:shadow-kingdom ${
                    selectedOccupation === occupation.id
                      ? "border-primary glow-royal"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedOccupation(occupation.id)}
                >
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl mb-2">{occupation.icon}</div>
                    <h3 className={`font-semibold ${occupation.color}`}>{occupation.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {occupation.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Heart className="h-5 w-5 text-secondary" />
                <span className="text-sm text-muted-foreground">
                  Selected: {selectedInterests.length}/5
                </span>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {INTERESTS.map((interest) => (
                  <Badge
                    key={interest.id}
                    variant={selectedInterests.includes(interest.id) ? "default" : "outline"}
                    className={`cursor-pointer p-3 text-center flex flex-col items-center gap-1 transition-royal ${
                      selectedInterests.includes(interest.id)
                        ? "bg-primary hover:bg-primary/90 glow-royal"
                        : "hover:border-primary/50"
                    }`}
                    onClick={() => handleInterestToggle(interest.id)}
                  >
                    <span className="text-lg">{interest.icon}</span>
                    <span className="text-xs">{interest.name}</span>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="h-5 w-5 text-secondary" />
                <span className="text-sm text-muted-foreground">
                  Choose your kingdom location & create your login
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {["New York", "London", "Tokyo", "Lagos", "Sydney", "Berlin", "Other"].map((location) => (
                  <Card
                    key={location}
                    className={`cursor-pointer transition-royal hover:shadow-kingdom ${
                      selectedLocation === location
                        ? "border-primary glow-royal"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => setSelectedLocation(location)}
                  >
                    <CardContent className="p-4 text-center">
                      <h3 className="font-semibold">{location}</h3>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {selectedLocation === "Other" && (
                <Input
                  type="text"
                  placeholder="Enter your city..."
                  className="w-full"
                  onChange={(e) => setSelectedLocation(e.target.value)}
                />
              )}
              <div className="grid md:grid-cols-2 gap-3 pt-2">
                <Input type="text" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                <Input type="text" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <Input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
                <Input type="password" placeholder="Password (min 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            </div>
          )}

          <div className="flex justify-end pt-6">
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="gradient-royal hover:opacity-90 glow-royal transition-royal"
              variant="royal"
            >
              {step === 3 ? "Enter Kingdom" : "Continue"}
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
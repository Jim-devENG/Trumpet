import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Crown, Star } from "lucide-react";

interface KingdomAvatarProps {
  occupation: string;
  interests: string[];
  location: string;
  size?: "sm" | "md" | "lg";
  showDetails?: boolean;
}

export function KingdomAvatar({ 
  occupation, 
  interests, 
  location, 
  size = "md", 
  showDetails = false 
}: KingdomAvatarProps) {
  const getOccupationIcon = (occupation: string) => {
    const icons: Record<string, string> = {
      government: "🏛️", family: "👨‍👩‍👧‍👦", media: "📺", arts: "🎭",
      economy: "💼", education: "🎓", spirituality: "🙏", other: "⭐"
    };
    return icons[occupation] || "👤";
  };

  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-12 w-12", 
    lg: "h-16 w-16"
  };

  const getLocationFlag = (location: string) => {
    const flags: Record<string, string> = {
      "New York": "🇺🇸", "London": "🇬🇧", "Tokyo": "🇯🇵", 
      "Lagos": "🇳🇬", "Sydney": "🇦🇺", "Berlin": "🇩🇪"
    };
    return flags[location] || "🌍";
  };

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <Avatar className={`${sizeClasses[size]} border-2 border-primary/20 glow-royal`}>
          <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-lg">
            {getOccupationIcon(occupation)}
          </AvatarFallback>
        </Avatar>
        
        {/* Crown overlay for premium users */}
        <div className="absolute -top-1 -right-1">
          <div className="bg-gold text-black rounded-full p-1">
            <Crown className="h-3 w-3" />
          </div>
        </div>
        
        {/* Location flag overlay */}
        <div className="absolute -bottom-1 -right-1 text-xs">
          {getLocationFlag(location)}
        </div>
      </div>

      {showDetails && (
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold capitalize">{occupation} Avatar</h3>
            <Badge variant="secondary" className="text-xs">
              <Star className="h-3 w-3 mr-1" />
              Level 5
            </Badge>
          </div>
          <div className="flex flex-wrap gap-1">
            {interests.slice(0, 3).map((interest) => (
              <Badge key={interest} variant="outline" className="text-xs">
                {interest}
              </Badge>
            ))}
            {interests.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{interests.length - 3}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{location}</p>
        </div>
      )}
    </div>
  );
}
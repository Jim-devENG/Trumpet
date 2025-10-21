import React, { useState, useEffect } from 'react';
import { Trophy, Star, Target, Users, TrendingUp, Award, Crown, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiService } from '@/services/api';

interface GamificationPanelProps {
  userId: string;
}

export const GamificationPanel: React.FC<GamificationPanelProps> = ({ userId }) => {
  const [userLevel, setUserLevel] = useState<any>(null);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGamificationData = async () => {
      try {
        const [levelRes, achievementsRes, badgesRes, leaderboardRes] = await Promise.all([
          apiService.getUserLevel(userId),
          apiService.getUserAchievements(userId),
          apiService.getUserBadges(userId),
          apiService.getLeaderboard('level', 10)
        ]);

        if (levelRes.success) setUserLevel(levelRes.data);
        if (achievementsRes.success) setAchievements(achievementsRes.data.achievements);
        if (badgesRes.success) setBadges(badgesRes.data.badges);
        if (leaderboardRes.success) setLeaderboard(leaderboardRes.data.leaderboard);
      } catch (error) {
        console.error('Error fetching gamification data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGamificationData();
  }, [userId]);

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-gray-100 text-gray-800';
      case 'rare': return 'bg-blue-100 text-blue-800';
      case 'epic': return 'bg-purple-100 text-purple-800';
      case 'legendary': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLevelProgress = () => {
    if (!userLevel) return 0;
    const currentLevel = userLevel.level;
    const currentXP = userLevel.experience_points;
    const xpForCurrentLevel = (currentLevel - 1) * 100;
    const xpForNextLevel = currentLevel * 100;
    const progress = ((currentXP - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100;
    return Math.max(0, Math.min(100, progress));
  };

  if (loading) {
    return (
      <Card className="gradient-card border-border/50 shadow-kingdom">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Kingdom Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-2 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="gradient-card border-border/50 shadow-kingdom">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Trophy className="h-4 w-4 text-yellow-500" />
          Kingdom Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Tabs defaultValue="progress" className="w-full">
          <TabsList className="grid w-full grid-cols-3 text-xs">
            <TabsTrigger value="progress" className="text-xs">Progress</TabsTrigger>
            <TabsTrigger value="achievements" className="text-xs">Achievements</TabsTrigger>
            <TabsTrigger value="leaderboard" className="text-xs">Leaderboard</TabsTrigger>
          </TabsList>

          <TabsContent value="progress" className="space-y-2">
            {userLevel && (
              <>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Crown className="h-4 w-4 text-yellow-500" />
                    <span className="text-lg font-bold">Level {userLevel.level}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {userLevel.experience_points} XP
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Progress to Level {userLevel.level + 1}</span>
                    <span>{Math.round(getLevelProgress())}%</span>
                  </div>
                  <Progress value={getLevelProgress()} className="h-1.5" />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <Target className="h-3 w-3 text-blue-500" />
                    <span>{userLevel.total_posts} Posts</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-yellow-500" />
                    <span>{userLevel.total_likes_received} Likes</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3 text-green-500" />
                    <span>{userLevel.total_connections} Connections</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Zap className="h-3 w-3 text-orange-500" />
                    <span>{userLevel.streak_days} Day Streak</span>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="achievements" className="space-y-3">
            <div className="grid gap-2">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={`p-3 rounded-lg border transition-all duration-200 ${
                    achievement.earned_at 
                      ? 'bg-gradient-to-r from-green-900/20 to-emerald-900/20 border-green-500/50 shadow-green-500/20 shadow-sm' 
                      : 'bg-gradient-to-r from-slate-800/30 to-gray-800/30 border-slate-600/50 hover:border-slate-500/70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl filter drop-shadow-sm">{achievement.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className={`font-medium ${
                          achievement.earned_at 
                            ? 'text-green-100' 
                            : 'text-slate-200'
                        }`}>
                          {achievement.name}
                        </h4>
                        {achievement.earned_at && (
                          <Badge variant="secondary" className="text-xs bg-green-600 text-green-100 border-green-500">
                            Earned
                          </Badge>
                        )}
                      </div>
                      <p className={`text-sm ${
                        achievement.earned_at 
                          ? 'text-green-200' 
                          : 'text-slate-300'
                      }`}>
                        {achievement.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs ${
                          achievement.earned_at 
                            ? 'text-green-300' 
                            : 'text-slate-400'
                        }`}>
                          {achievement.points} XP
                        </span>
                        <Badge variant="outline" className={`text-xs ${
                          achievement.earned_at 
                            ? 'border-green-400 text-green-200' 
                            : 'border-slate-500 text-slate-300'
                        }`}>
                          {achievement.category}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="leaderboard" className="space-y-3">
            <div className="space-y-2">
              {leaderboard.map((user, index) => (
                <div
                  key={user.user_id}
                  className={`p-3 rounded-lg border transition-all duration-200 ${
                    user.user_id === userId 
                      ? 'bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border-blue-500/50 shadow-blue-500/20 shadow-sm' 
                      : 'bg-gradient-to-r from-slate-800/30 to-gray-800/30 border-slate-600/50 hover:border-slate-500/70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                      index === 0 
                        ? 'bg-yellow-500 text-yellow-900' 
                        : index === 1 
                        ? 'bg-gray-400 text-gray-900' 
                        : index === 2 
                        ? 'bg-orange-500 text-orange-900' 
                        : 'bg-primary text-primary-foreground'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className={`font-medium ${
                          user.user_id === userId 
                            ? 'text-blue-100' 
                            : 'text-slate-200'
                        }`}>
                          {user.first_name} {user.last_name}
                        </h4>
                        {user.user_id === userId && (
                          <Badge variant="default" className="text-xs bg-blue-600 text-blue-100 border-blue-500">
                            You
                          </Badge>
                        )}
                      </div>
                      <p className={`text-sm ${
                        user.user_id === userId 
                          ? 'text-blue-200' 
                          : 'text-slate-300'
                      }`}>
                        {user.occupation} • {user.location}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${
                        user.user_id === userId 
                          ? 'text-blue-100' 
                          : 'text-slate-200'
                      }`}>
                        Level {user.level}
                      </div>
                      <div className={`text-xs ${
                        user.user_id === userId 
                          ? 'text-blue-300' 
                          : 'text-slate-400'
                      }`}>
                        {user.experience_points} XP
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

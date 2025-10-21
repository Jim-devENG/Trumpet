const OpenAI = require('openai');

// Initialize OpenAI (you'll need to set OPENAI_API_KEY in your environment)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'your-openai-api-key-here'
});

class AIRecommendationService {
  constructor() {
    this.isAvailable = !!process.env.OPENAI_API_KEY;
  }

  async getContentRecommendations(userProfile, posts, limit = 5) {
    if (!this.isAvailable) {
      return this.getFallbackContentRecommendations(userProfile, posts, limit);
    }

    try {
      const prompt = `
        Based on this user profile and their recent posts, suggest 5 relevant content topics they might be interested in:
        
        User Profile:
        - Occupation: ${userProfile.occupation}
        - Interests: ${userProfile.interests}
        - Location: ${userProfile.location}
        
        Recent Posts: ${posts.slice(0, 3).map(p => p.content).join('\n')}
        
        Return only the topic suggestions as a JSON array of strings.
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
        temperature: 0.7
      });

      const suggestions = JSON.parse(response.choices[0].message.content);
      return suggestions.slice(0, limit);
    } catch (error) {
      console.error('AI recommendation error:', error);
      return this.getFallbackContentRecommendations(userProfile, posts, limit);
    }
  }

  async getConnectionRecommendations(userProfile, existingConnections, allUsers, limit = 5) {
    if (!this.isAvailable) {
      return this.getFallbackConnectionRecommendations(userProfile, existingConnections, allUsers, limit);
    }

    try {
      const prompt = `
        Based on this user profile, suggest 5 people they should connect with:
        
        User Profile:
        - Occupation: ${userProfile.occupation}
        - Interests: ${userProfile.interests}
        - Location: ${userProfile.location}
        
        Available Users: ${allUsers.slice(0, 10).map(u => `${u.first_name} ${u.last_name} - ${u.occupation} in ${u.location}`).join('\n')}
        
        Return only the user names as a JSON array of strings.
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 150,
        temperature: 0.7
      });

      const suggestions = JSON.parse(response.choices[0].message.content);
      return suggestions.slice(0, limit);
    } catch (error) {
      console.error('AI connection recommendation error:', error);
      return this.getFallbackConnectionRecommendations(userProfile, existingConnections, allUsers, limit);
    }
  }

  getFallbackContentRecommendations(userProfile, posts, limit) {
    const occupation = userProfile.occupation?.toLowerCase() || '';
    const interests = userProfile.interests?.toLowerCase() || '';
    
    const suggestions = [
      `Latest trends in ${occupation}`,
      `Professional development tips`,
      `Industry insights and news`,
      `Networking opportunities`,
      `Career growth strategies`,
      `Technology updates`,
      `Leadership insights`,
      `Team collaboration tips`,
      `Remote work best practices`,
      `Innovation in ${occupation}`
    ];

    return suggestions.slice(0, limit);
  }

  getFallbackConnectionRecommendations(userProfile, existingConnections, allUsers, limit) {
    const occupation = userProfile.occupation?.toLowerCase() || '';
    const location = userProfile.location?.toLowerCase() || '';
    
    // Filter out existing connections and current user
    const connectionIds = new Set(existingConnections.map(c => c.user_id));
    const availableUsers = allUsers.filter(u => 
      u.id !== userProfile.id && 
      !connectionIds.has(u.id)
    );

    // Simple matching based on occupation and location
    const scored = availableUsers.map(user => {
      let score = 0;
      
      if (user.occupation?.toLowerCase().includes(occupation) || 
          occupation.includes(user.occupation?.toLowerCase())) {
        score += 3;
      }
      
      if (user.location?.toLowerCase().includes(location) || 
          location.includes(user.location?.toLowerCase())) {
        score += 2;
      }
      
      return { ...user, score };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(u => `${u.first_name} ${u.last_name}`);
  }

  async analyzePostEngagement(post) {
    if (!this.isAvailable) {
      return this.getFallbackEngagementAnalysis(post);
    }

    try {
      const prompt = `
        Analyze this social media post and suggest improvements for better engagement:
        
        Post: "${post.content}"
        Current likes: ${post.likes_count || 0}
        Current comments: ${post.comments_count || 0}
        
        Provide 3 specific suggestions for improvement.
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
        temperature: 0.7
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('AI engagement analysis error:', error);
      return this.getFallbackEngagementAnalysis(post);
    }
  }

  getFallbackEngagementAnalysis(post) {
    const suggestions = [
      "Add a compelling headline or question",
      "Include relevant hashtags",
      "Ask for opinions or experiences",
      "Share personal insights or stories",
      "Use engaging visuals or media"
    ];

    return suggestions.slice(0, 3).join('\n');
  }
}

module.exports = new AIRecommendationService();



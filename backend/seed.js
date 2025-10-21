const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const db = new sqlite3.Database('./trumpet.db');

console.log('🌱 Starting database seeding...');

// Create sample users
const users = [
  {
    id: uuidv4(),
    email: 'john@example.com',
    username: 'john_doe',
    first_name: 'John',
    last_name: 'Doe',
    password_hash: bcrypt.hashSync('password123', 12),
    occupation: 'government',
    interests: JSON.stringify(['music', 'tech', 'fitness']),
    location: 'New York',
    bio: 'Government official passionate about technology and music.',
    is_verified: 1,
    is_premium: 1,
    level: 5,
    experience: 2500
  },
  {
    id: uuidv4(),
    email: 'jane@example.com',
    username: 'jane_smith',
    first_name: 'Jane',
    last_name: 'Smith',
    password_hash: bcrypt.hashSync('password123', 12),
    occupation: 'arts',
    interests: JSON.stringify(['art', 'music', 'photography']),
    location: 'London',
    bio: 'Creative artist exploring new forms of expression.',
    is_verified: 1,
    is_premium: 1,
    level: 3,
    experience: 1200
  },
  {
    id: uuidv4(),
    email: 'mike@example.com',
    username: 'mike_wilson',
    first_name: 'Mike',
    last_name: 'Wilson',
    password_hash: bcrypt.hashSync('password123', 12),
    occupation: 'economy',
    interests: JSON.stringify(['tech', 'fitness', 'books']),
    location: 'Tokyo',
    bio: 'Business professional with a passion for technology and fitness.',
    is_verified: 1,
    is_premium: 0,
    level: 2,
    experience: 800
  }
];

// Insert users
let userCount = 0;
users.forEach(user => {
  db.run(
    `INSERT OR IGNORE INTO users (id, email, username, first_name, last_name, password_hash, occupation, interests, location, bio, is_verified, is_premium, level, experience) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [user.id, user.email, user.username, user.first_name, user.last_name, user.password_hash, user.occupation, user.interests, user.location, user.bio, user.is_verified, user.is_premium, user.level, user.experience],
    function(err) {
      if (err) {
        console.error('Error inserting user:', err);
      } else {
        userCount++;
        if (userCount === users.length) {
          console.log(`✅ Created ${userCount} users`);
          createPosts();
        }
      }
    }
  );
});

function createPosts() {
  const posts = [
    {
      id: uuidv4(),
      content: 'Excited to announce our new government tech initiative! Looking forward to connecting with fellow tech enthusiasts.',
      author_id: users[0].id
    },
    {
      id: uuidv4(),
      content: 'Just finished my latest art piece. The creative process never ceases to amaze me!',
      author_id: users[1].id
    },
    {
      id: uuidv4(),
      content: 'Great networking event today. Met some amazing people in the business community!',
      author_id: users[2].id
    }
  ];

  let postCount = 0;
  posts.forEach(post => {
    db.run(
      'INSERT OR IGNORE INTO posts (id, content, author_id) VALUES (?, ?, ?)',
      [post.id, post.content, post.author_id],
      function(err) {
        if (err) {
          console.error('Error inserting post:', err);
        } else {
          postCount++;
          if (postCount === posts.length) {
            console.log(`✅ Created ${postCount} posts`);
            createEvents();
          }
        }
      }
    );
  });
}

function createEvents() {
  const events = [
    {
      id: uuidv4(),
      title: 'Tech Innovation Summit',
      description: 'Join us for a day of discussions about the future of technology in government.',
      location: 'New York Convention Center',
      date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      max_attendees: 100,
      organizer_id: users[0].id
    },
    {
      id: uuidv4(),
      title: 'Art Gallery Opening',
      description: 'Come celebrate the opening of our new contemporary art exhibition.',
      location: 'London Art Gallery',
      date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 days from now
      max_attendees: 50,
      organizer_id: users[1].id
    }
  ];

  let eventCount = 0;
  events.forEach(event => {
    db.run(
      'INSERT OR IGNORE INTO events (id, title, description, location, date, max_attendees, organizer_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [event.id, event.title, event.description, event.location, event.date, event.max_attendees, event.organizer_id],
      function(err) {
        if (err) {
          console.error('Error inserting event:', err);
        } else {
          eventCount++;
          if (eventCount === events.length) {
            console.log(`✅ Created ${eventCount} events`);
            createJobs();
          }
        }
      }
    );
  });
}

function createJobs() {
  const jobs = [
    {
      id: uuidv4(),
      title: 'Senior Software Engineer',
      description: 'We are looking for an experienced software engineer to join our government tech team.',
      company: 'Government Tech Department',
      location: 'New York',
      type: 'full-time',
      salary: '$80,000 - $120,000',
      requirements: JSON.stringify(['5+ years experience', 'React/Node.js', 'Government clearance']),
      benefits: JSON.stringify(['Health insurance', 'Pension plan', 'Flexible hours']),
      poster_id: users[0].id
    },
    {
      id: uuidv4(),
      title: 'Creative Director',
      description: 'Lead our creative team in developing innovative art projects.',
      company: 'Creative Studio London',
      location: 'London',
      type: 'full-time',
      salary: '£50,000 - £70,000',
      requirements: JSON.stringify(['Art degree', '5+ years experience', 'Portfolio required']),
      benefits: JSON.stringify(['Creative freedom', 'Health insurance', 'Professional development']),
      poster_id: users[1].id
    }
  ];

  let jobCount = 0;
  jobs.forEach(job => {
    db.run(
      'INSERT OR IGNORE INTO jobs (id, title, description, company, location, type, salary, requirements, benefits, poster_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [job.id, job.title, job.description, job.company, job.location, job.type, job.salary, job.requirements, job.benefits, job.poster_id],
      function(err) {
        if (err) {
          console.error('Error inserting job:', err);
        } else {
          jobCount++;
          if (jobCount === jobs.length) {
            console.log(`✅ Created ${jobCount} jobs`);
            console.log('🎉 Database seeding completed successfully!');
            db.close();
          }
        }
      }
    );
  });
}

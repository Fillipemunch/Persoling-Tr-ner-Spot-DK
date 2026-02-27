import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { createServer } from "http";
import fs from "fs";
import path from "path";
import serverless from "serverless-http";
import { createClient } from "@supabase/supabase-js";
import { User, ClientProfile, TrainingPlan, DietPlan, ChatMessage, HireRequest } from "./types";

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "db.json");

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", isServiceRole });
});

// Supabase Configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("CRITICAL: Supabase URL or Key is missing. Authentication will fail.");
  console.log("Required variables: SUPABASE_URL, SUPABASE_ANON_KEY, and optionally SUPABASE_SERVICE_ROLE_KEY");
}

let supabase: any;
try {
  supabase = createClient(supabaseUrl || '', supabaseKey || '', {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  console.log("Supabase client initialized successfully");
} catch (e: any) {
  console.error("CRITICAL: Failed to initialize Supabase client:", e.message);
  // Create a mock supabase client to prevent crashes if it's used
  supabase = {
    auth: {
      admin: { createUser: async () => ({ data: {}, error: { message: 'Supabase not initialized' } }) },
      signUp: async () => ({ data: {}, error: { message: 'Supabase not initialized' } }),
      signInWithPassword: async () => ({ data: {}, error: { message: 'Supabase not initialized' } })
    },
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: null, error: { message: 'Supabase not initialized' } }) }) }),
      insert: async () => ({ error: { message: 'Supabase not initialized' } })
    })
  };
}

// Helper to check if we are using the service role key
const isServiceRole = (supabaseKey || '').includes('service_role') || (process.env.SUPABASE_SERVICE_ROLE_KEY && supabaseKey === process.env.SUPABASE_SERVICE_ROLE_KEY);

// --- DATABASE PERSISTENCE NOTE ---
// We are now using Supabase for persistence.
// ---------------------------------

// Mock Database (Fallback for non-auth data if tables aren't ready, but we'll try to use Supabase)
let db = {
  users: [],
  clientProfiles: [],
  trainingPlans: [],
  dietPlans: [],
  chatMessages: [],
  hireRequests: [],
  activities: []
};

// Persistence Helpers
function loadDB() {
  if (process.env.DATABASE_URL) {
    console.log("DATABASE_URL detected. In a real app, you would connect to your DB here.");
    // Example: const client = new MongoClient(process.env.DATABASE_URL);
    // return await client.db().collection('state').findOne({});
  }
  
  if (fs.existsSync(DB_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    } catch (e) {
      console.error("Error loading DB:", e);
    }
  }
  return db;
}

db = loadDB();
const users: User[] = db.users;
const clientProfiles: ClientProfile[] = db.clientProfiles;
const trainingPlans: TrainingPlan[] = db.trainingPlans;
const dietPlans: DietPlan[] = db.dietPlans;
const chatMessages: ChatMessage[] = db.chatMessages;
const hireRequests: HireRequest[] = db.hireRequests;
const activities: { id: string; type: string; description: string; timestamp: string }[] = db.activities || [];

function saveDB() {
  if (process.env.DATABASE_URL) {
    // In a real app: await db.collection('state').updateOne({}, { $set: { ... } }, { upsert: true });
    console.log("Saving to external database (simulated)...");
  }

  try {
    // Only write to file if NOT in a serverless environment
    if (!process.env.NETLIFY && process.env.NODE_ENV !== "production") {
      fs.writeFileSync(DB_FILE, JSON.stringify({
        users,
        clientProfiles,
        trainingPlans,
        dietPlans,
        chatMessages,
        hireRequests,
        activities
      }, null, 2));
    }
  } catch (e) {
    console.error("Error saving DB:", e);
  }
}

function logActivity(type: string, description: string) {
  activities.unshift({
    id: Math.random().toString(36).substr(2, 9),
    type,
    description,
    timestamp: new Date().toISOString()
  });
  if (activities.length > 50) activities.pop();
  saveDB();
}

// WebSocket Server (Only in non-serverless)
let wss: any;
if (process.env.NODE_ENV !== "production" && !process.env.NETLIFY) {
  // We'll initialize this inside startServer to share the httpServer
}

// Auth Routes
app.post("/api/register", async (req, res) => {
  const { email, name, role, password } = req.body;
  
  console.log("--- REGISTRATION START ---");
  console.log(`Email: ${email}, Role: ${role}`);
  console.log(`Supabase URL: ${supabaseUrl ? 'Configured' : 'MISSING'}`);
  console.log(`Supabase Key Type: ${isServiceRole ? 'SERVICE_ROLE (Admin)' : 'ANON (Limited)'}`);

  if (!supabaseUrl || !supabaseKey) {
    console.error("ERROR: Supabase configuration missing");
    return res.status(500).json({ message: "Server configuration error: Supabase keys missing" });
  }

  let authResponse;
  
  try {
    if (isServiceRole) {
      console.log("Attempting admin.createUser...");
      authResponse = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name,
          role,
          imageUrl: `https://picsum.photos/seed/${email}/200`,
          trainerStatus: 'none'
        }
      });
    } else {
      console.log("Attempting auth.signUp (Non-Admin)...");
      authResponse = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role,
            imageUrl: `https://picsum.photos/seed/${email}/200`,
            trainerStatus: 'none'
          }
        }
      });
    }

    const { data, error } = authResponse;

    if (error) {
      console.error(`AUTH ERROR: ${error.message} (Status: ${error.status})`);
      return res.status(400).json({ message: `Auth Error: ${error.message}` });
    }

    const userId = data.user?.id;
    if (!userId) {
      console.error("ERROR: User created but no ID returned");
      return res.status(500).json({ message: "User ID not generated by Supabase" });
    }

    console.log(`User created successfully in Auth: ${userId}`);

    // Insert into profiles table
    console.log("Attempting to insert into 'profiles' table...");
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([
        {
          id: userId,
          email: email,
          name: name,
          role: role,
          image_url: `https://picsum.photos/seed/${email}/200`,
          trainer_status: 'none'
        }
      ]);

    if (profileError) {
      console.error(`DATABASE ERROR (profiles table): ${profileError.message}`);
      console.error(`Details: ${JSON.stringify(profileError)}`);
      // We return 201 anyway because the user was created in Auth, 
      // but we warn about the profile.
      return res.status(201).json({ 
        message: "User created, but profile table update failed. Check table permissions/schema.",
        user: { id: userId, email, name, role },
        warning: profileError.message
      });
    }

    console.log("Profile created successfully in 'profiles' table");
    
    const newUser: User = {
      id: userId,
      email: data.user?.email || email,
      name,
      role,
      imageUrl: `https://picsum.photos/seed/${email}/200`,
      trainerStatus: 'none'
    };

    logActivity('USER_REGISTER', `New user registered: ${name} (${role})`);
    console.log("--- REGISTRATION SUCCESS ---");
    res.status(201).json(newUser);

  } catch (err: any) {
    console.error("UNEXPECTED REGISTRATION ERROR:", err.message);
    res.status(500).json({ message: `Internal Server Error: ${err.message}` });
  }
});

// Alias for backward compatibility
app.post("/api/auth/register", (req, res) => {
  res.redirect(307, "/api/register");
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  console.log(`Login attempt: ${email}`);

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.log(`Login failed for ${email}: ${error.message} (Status: ${error.status})`);
      return res.status(error.status || 401).json({ message: error.message });
    }

    if (!data.user) {
      return res.status(401).json({ message: "Invalid login credentials" });
    }

    // Fetch profile from profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      console.warn(`Could not fetch profile for ${email}: ${profileError.message}`);
    }

    const user: User = {
      id: data.user.id,
      email: data.user.email || email,
      name: profile?.name || data.user.user_metadata?.name || 'User',
      role: profile?.role || data.user.user_metadata?.role || 'client',
      imageUrl: profile?.image_url || data.user.user_metadata?.imageUrl,
      trainerStatus: profile?.trainer_status || data.user.user_metadata?.trainerStatus || 'none',
      trainerId: profile?.trainer_id || data.user.user_metadata?.trainerId
    };

    console.log(`Login successful: ${email}`);
    logActivity('USER_LOGIN', `User logged in: ${user.name}`);
    res.json(user);
  } catch (err: any) {
    console.error("UNEXPECTED LOGIN ERROR:", err.message);
    res.status(500).json({ message: `Internal Server Error: ${err.message}` });
  }
});

// Alias for backward compatibility
app.post("/api/auth/login", (req, res) => {
  res.redirect(307, "/api/login");
});

// Profile Routes
app.post("/api/users/profile", async (req, res) => {
  const { userId, ...updates } = req.body;
  
  // Map frontend field names to database column names
  const dbUpdates: any = {};
  if (updates.name) dbUpdates.name = updates.name;
  if (updates.role) dbUpdates.role = updates.role;
  if (updates.imageUrl) dbUpdates.image_url = updates.imageUrl;
  if (updates.bio) dbUpdates.bio = updates.bio;
  if (updates.specialties) dbUpdates.specialties = updates.specialties;
  if (updates.certifications) dbUpdates.certifications = updates.certifications;
  if (updates.trainerId) dbUpdates.trainer_id = updates.trainerId;
  if (updates.trainerStatus) dbUpdates.trainer_status = updates.trainerStatus;
  
  dbUpdates.updated_at = new Date().toISOString();

  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(dbUpdates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    const mappedUser = {
      id: data.id,
      email: data.email,
      name: data.name,
      role: data.role,
      imageUrl: data.image_url,
      trainerStatus: data.trainer_status,
      trainerId: data.trainer_id,
      bio: data.bio,
      specialties: data.specialties,
      certifications: data.certifications
    };

    res.json(mappedUser);
  } catch (err: any) {
    console.error("Error updating profile:", err);
    res.status(500).json({ message: err.message });
  }
});

// Client Routes
app.post("/api/clients/profile", async (req, res) => {
  const profile = req.body;
  
  try {
    const { data, error } = await supabase
      .from('client_profiles')
      .upsert({
        user_id: profile.userId,
        weight: profile.weight,
        height: profile.height,
        goal: profile.goal,
        activity_level: profile.activityLevel,
        medical_conditions: profile.medicalConditions,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      userId: data.user_id,
      weight: data.weight,
      height: data.height,
      goal: data.goal,
      activityLevel: data.activity_level,
      medicalConditions: data.medical_conditions
    });
  } catch (err: any) {
    console.error("Error updating client profile:", err);
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/clients/profile/:userId", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('client_profiles')
      .select('*')
      .eq('user_id', req.params.userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (!data) return res.json(null);

    res.json({
      userId: data.user_id,
      weight: data.weight,
      height: data.height,
      goal: data.goal,
      activityLevel: data.activity_level,
      medicalConditions: data.medical_conditions
    });
  } catch (err: any) {
    console.error("Error fetching client profile:", err);
    res.status(500).json({ message: err.message });
  }
});

// Trainer Routes
app.get("/api/trainers", (req, res) => {
  try {
    const trainers = Array.isArray(users) ? users.filter(u => u.role === 'trainer') : [];
    res.json(trainers);
  } catch (err) {
    console.error("Error fetching trainers:", err);
    res.json([]);
  }
});

app.get("/api/trainers/clients/:trainerId", (req, res) => {
  try {
    const trainerClients = Array.isArray(users) ? users.filter(u => u.trainerId === req.params.trainerId && u.trainerStatus === 'accepted') : [];
    res.json(trainerClients);
  } catch (err) {
    console.error("Error fetching trainer clients:", err);
    res.json([]);
  }
});

app.post("/api/trainers/request-hire", (req, res) => {
  const { clientId, trainerId } = req.body;
  const clientIndex = users.findIndex(u => u.id === clientId);
  
  if (clientIndex === -1) return res.status(404).json({ message: "Client not found" });
  if (users[clientIndex].trainerStatus !== 'none') {
    return res.status(400).json({ message: "You already have a trainer or a pending request" });
  }

  const request: HireRequest = {
    id: Math.random().toString(36).substr(2, 9),
    clientId,
    trainerId,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  
  hireRequests.push(request);
  users[clientIndex].trainerId = trainerId;
  users[clientIndex].trainerStatus = 'pending';
  saveDB();
  logActivity('HIRE_REQUEST', `Client requested to hire a trainer`);
  
  res.json({ user: users[clientIndex], request });
});

app.get("/api/trainers/requests/:trainerId", (req, res) => {
  try {
    const requests = Array.isArray(hireRequests) ? hireRequests.filter(r => r.trainerId === req.params.trainerId && r.status === 'pending') : [];
    const clientsWithRequests = requests.map(r => {
      const client = Array.isArray(users) ? users.find(u => u.id === r.clientId) : null;
      return { ...client, requestId: r.id };
    }).filter(c => c !== null);
    res.json(clientsWithRequests);
  } catch (err) {
    console.error("Error fetching trainer requests:", err);
    res.json([]);
  }
});

app.post("/api/trainers/respond-request", (req, res) => {
  const { requestId, status } = req.body; // status: 'accepted' or 'rejected'
  const requestIndex = hireRequests.findIndex(r => r.id === requestId);
  
  if (requestIndex === -1) return res.status(404).json({ message: "Request not found" });
  
  const request = hireRequests[requestIndex];
  request.status = status;
  
  const clientIndex = users.findIndex(u => u.id === request.clientId);
  if (clientIndex !== -1) {
    if (status === 'accepted') {
      users[clientIndex].trainerStatus = 'accepted';
    } else {
      users[clientIndex].trainerId = undefined;
      users[clientIndex].trainerStatus = 'none';
    }
  }
  
  res.json({ message: `Request ${status}`, client: users[clientIndex] });
  saveDB();
});

// Plan Routes
app.post("/api/plans/training", (req, res) => {
  const plan: TrainingPlan = {
    ...req.body,
    id: Math.random().toString(36).substr(2, 9),
    createdAt: new Date().toISOString()
  };
  trainingPlans.push(plan);
  saveDB();
  logActivity('PLAN_CREATED', `Training plan created for client`);
  res.json(plan);
});

app.post("/api/plans/diet", (req, res) => {
  const plan: DietPlan = {
    ...req.body,
    id: Math.random().toString(36).substr(2, 9),
    createdAt: new Date().toISOString()
  };
  dietPlans.push(plan);
  saveDB();
  logActivity('PLAN_CREATED', `Diet plan created for client`);
  res.json(plan);
});

app.get("/api/plans/:clientId", (req, res) => {
  try {
    const training = Array.isArray(trainingPlans) ? trainingPlans.filter(p => p.clientId === req.params.clientId) : [];
    const diet = Array.isArray(dietPlans) ? dietPlans.filter(p => p.clientId === req.params.clientId) : [];
    res.json({ training, diet });
  } catch (err) {
    console.error("Error fetching plans:", err);
    res.json({ training: [], diet: [] });
  }
});

// Chat Routes
app.get("/api/chat/:userId/:otherId", (req, res) => {
  try {
    const { userId, otherId } = req.params;
    
    // Check if they are connected
    const user = Array.isArray(users) ? users.find(u => u.id === userId) : null;
    const other = Array.isArray(users) ? users.find(u => u.id === otherId) : null;
    
    if (!user || !other) return res.status(404).json({ message: "User not found" });
    
    const isConnected = 
      (user.role === 'client' && user.trainerId === otherId && user.trainerStatus === 'accepted') ||
      (user.role === 'trainer' && other.trainerId === userId && other.trainerStatus === 'accepted');
      
    if (!isConnected) {
      return res.status(403).json({ message: "You are not connected to this user" });
    }

    const messages = Array.isArray(chatMessages) ? chatMessages.filter(m => 
      (m.senderId === userId && m.receiverId === otherId) ||
      (m.senderId === otherId && m.receiverId === userId)
    ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) : [];
    res.json(messages);
  } catch (err) {
    console.error("Error fetching chat messages:", err);
    res.json([]);
  }
});

app.post("/api/chat", (req, res) => {
  const { senderId, receiverId, text } = req.body;
  const chatMsg: ChatMessage = {
    id: Math.random().toString(36).substr(2, 9),
    senderId,
    receiverId,
    text,
    timestamp: new Date().toISOString()
  };
  chatMessages.push(chatMsg);
  saveDB();
  res.json(chatMsg);
});

// Admin Routes
app.get("/api/admin/stats", async (req, res) => {
  try {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase not configured");
    }

    const [
      { count: totalUsers },
      { count: totalTrainers },
      { count: totalClients },
      { count: pendingRequests },
      { count: acceptedRequests },
      { data: recentProfiles }
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'trainer'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'client'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('trainer_status', 'pending'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('trainer_status', 'accepted'),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(5)
    ]);

    const stats = {
      totalUsers: totalUsers || 0,
      totalTrainers: totalTrainers || 0,
      totalClients: totalClients || 0,
      totalPlans: 0, // We could count these too if needed
      totalTrainingPlans: 0,
      totalDietPlans: 0,
      totalRequests: (pendingRequests || 0) + (acceptedRequests || 0),
      pendingRequests: pendingRequests || 0,
      acceptedRequests: acceptedRequests || 0,
      totalMessages: 0,
      recentActivities: (recentProfiles || []).map((p: any) => ({
        id: p.id,
        type: 'USER_REGISTER',
        description: `Novo usuário ${p.name} registrado como ${p.role}`,
        timestamp: p.created_at || new Date().toISOString()
      })),
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage()
      }
    };
    res.json(stats);
  } catch (err: any) {
    console.error("Error fetching admin stats:", err);
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/admin/users", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) throw error;
    
    const mappedUsers = data.map((p: any) => ({
      id: p.id,
      email: p.email,
      name: p.name,
      role: p.role,
      imageUrl: p.image_url,
      trainerStatus: p.trainer_status,
      lastSeen: p.updated_at // Using updated_at as a proxy for "online"
    }));
    
    res.json(mappedUsers);
  } catch (err: any) {
    console.error("Error fetching admin users:", err);
    res.status(500).json({ message: err.message });
  }
});

app.patch("/api/admin/users/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, trainerStatus } = req.body;

    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        role, 
        trainer_status: trainerStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    logActivity('USER_UPDATE', `Admin updated user ${data.name} (${data.role})`);
    res.json(data);
  } catch (err: any) {
    console.error("Error updating user:", err);
    res.status(500).json({ message: err.message });
  }
});

app.delete("/api/admin/users/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Delete from profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) throw profileError;

    // If we have service role, we should also delete from Auth
    if (isServiceRole) {
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      if (authError) console.error("Error deleting user from Auth:", authError.message);
    }

    logActivity('USER_DELETE', `Admin deleted user ${userId}`);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Error deleting user:", err);
    res.status(500).json({ message: err.message });
  }
});

async function startServer() {
  const httpServer = createServer(app);

  if (process.env.NODE_ENV !== "production" && !process.env.NETLIFY) {
    // Initialize WebSockets
    try {
      const { WebSocketServer, WebSocket } = await import("ws");
      const wss = new WebSocketServer({ server: httpServer });
      const clients = new Map<string, any>();

      wss.on("connection", (ws, req) => {
        let userId: string | null = null;
        ws.on("message", (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === "auth") {
            userId = message.userId;
            if (userId) clients.set(userId, ws);
          }
          if (message.type === "chat") {
            const chatMsg: ChatMessage = {
              id: Math.random().toString(36).substr(2, 9),
              senderId: message.senderId,
              receiverId: message.receiverId,
              text: message.text,
              timestamp: new Date().toISOString()
            };
            chatMessages.push(chatMsg);
            saveDB();
            const receiverWs = clients.get(message.receiverId);
            if (receiverWs && receiverWs.readyState === 1) { // 1 is OPEN
              receiverWs.send(JSON.stringify({ type: "chat", message: chatMsg }));
            }
            ws.send(JSON.stringify({ type: "chat", message: chatMsg }));
          }
        });
        ws.on("close", () => {
          if (userId) clients.delete(userId);
        });
      });
    } catch (e) {
      console.log("WebSocket support not available");
    }

    // Initialize Vite for local development
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { 
          middlewareMode: true,
          hmr: false
        },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("Vite middleware initialized (HMR disabled)");
    } catch (e) {
      console.log("Vite not found or failed to load, skipping Vite middleware");
    }
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (process.env.NODE_ENV !== "production" || !process.env.NETLIFY) {
  startServer();
}

export const handler = serverless(app);

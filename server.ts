import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { createServer as createViteServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import fs from "fs";
import path from "path";
import { User, ClientProfile, TrainingPlan, DietPlan, ChatMessage, HireRequest } from "./types";

const app = express();
const httpServer = createServer(app);
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), 'db.json');

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// Persistence Helpers
function loadDB() {
  if (fs.existsSync(DB_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      return data;
    } catch (e) {
      console.error("Error loading DB:", e);
    }
  }
  return {
    users: [
      {
        id: 'admin-001',
        email: 'fillipeferreiramunch@gmail.com',
        name: 'Fillipe Ferreira (Admin)',
        role: 'admin',
        password: 'admin', // Default password for your first login
        imageUrl: 'https://picsum.photos/seed/admin/200',
        trainerStatus: 'accepted'
      }
    ],
    clientProfiles: [],
    trainingPlans: [],
    dietPlans: [],
    chatMessages: [],
    hireRequests: []
  };
}

const db = loadDB();
const users: User[] = db.users;
const clientProfiles: ClientProfile[] = db.clientProfiles;
const trainingPlans: TrainingPlan[] = db.trainingPlans;
const dietPlans: DietPlan[] = db.dietPlans;
const chatMessages: ChatMessage[] = db.chatMessages;
const hireRequests: HireRequest[] = db.hireRequests;

function saveDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify({
      users,
      clientProfiles,
      trainingPlans,
      dietPlans,
      chatMessages,
      hireRequests
    }, null, 2));
  } catch (e) {
    console.error("Error saving DB:", e);
  }
}

// WebSocket Server
const wss = new WebSocketServer({ server: httpServer });
const clients = new Map<string, WebSocket>();

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

      // Send to receiver if online
      const receiverWs = clients.get(message.receiverId);
      if (receiverWs && receiverWs.readyState === WebSocket.OPEN) {
        receiverWs.send(JSON.stringify({ type: "chat", message: chatMsg }));
      }
      // Send back to sender for confirmation
      ws.send(JSON.stringify({ type: "chat", message: chatMsg }));
    }
  });

  ws.on("close", () => {
    if (userId) clients.delete(userId);
  });
});

// Auth Routes
app.post("/api/auth/register", (req, res) => {
  const { email, name, role, password } = req.body;
  console.log(`Registration attempt: ${email}, role: ${role}`);
  if (users.find(u => u.email === email)) {
    console.log(`Registration failed: Email ${email} already exists`);
    return res.status(400).json({ message: "Email already exists" });
  }
  const newUser: User = {
    id: Math.random().toString(36).substr(2, 9),
    email,
    name,
    role,
    password, // In a real app, hash this!
    imageUrl: `https://picsum.photos/seed/${email}/200`,
    trainerStatus: 'none'
  };
  users.push(newUser);
  saveDB();
  console.log(`Registration successful: ${email}`);
  res.json(newUser);
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  console.log(`Login attempt: ${email}`);
  const user = users.find(u => u.email === email && u.password === password);
  if (user) {
    console.log(`Login successful: ${email}`);
    res.json(user);
  } else {
    console.log(`Login failed: Invalid credentials for ${email}`);
    res.status(401).json({ message: "Invalid credentials" });
  }
});

// Profile Routes
app.post("/api/users/profile", (req, res) => {
  const { userId, ...updates } = req.body;
  const index = users.findIndex(u => u.id === userId);
  if (index !== -1) {
    users[index] = { ...users[index], ...updates };
    saveDB();
    res.json(users[index]);
  } else {
    res.status(404).json({ message: "User not found" });
  }
});

// Client Routes
app.post("/api/clients/profile", (req, res) => {
  const profile: ClientProfile = req.body;
  const index = clientProfiles.findIndex(p => p.userId === profile.userId);
  if (index !== -1) {
    clientProfiles[index] = profile;
  } else {
    clientProfiles.push(profile);
  }
  saveDB();
  res.json(profile);
});

app.get("/api/clients/profile/:userId", (req, res) => {
  const profile = clientProfiles.find(p => p.userId === req.params.userId);
  res.json(profile || null);
});

// Trainer Routes
app.get("/api/trainers", (req, res) => {
  const trainers = users.filter(u => u.role === 'trainer');
  res.json(trainers);
});

app.get("/api/trainers/clients/:trainerId", (req, res) => {
  const trainerClients = users.filter(u => u.trainerId === req.params.trainerId && u.trainerStatus === 'accepted');
  res.json(trainerClients);
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
  
  res.json({ user: users[clientIndex], request });
});

app.get("/api/trainers/requests/:trainerId", (req, res) => {
  const requests = hireRequests.filter(r => r.trainerId === req.params.trainerId && r.status === 'pending');
  const clientsWithRequests = requests.map(r => {
    const client = users.find(u => u.id === r.clientId);
    return { ...client, requestId: r.id };
  });
  res.json(clientsWithRequests);
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
  res.json(plan);
});

app.get("/api/plans/:clientId", (req, res) => {
  const training = trainingPlans.filter(p => p.clientId === req.params.clientId);
  const diet = dietPlans.filter(p => p.clientId === req.params.clientId);
  res.json({ training, diet });
});

// Chat Routes
app.get("/api/chat/:userId/:otherId", (req, res) => {
  const { userId, otherId } = req.params;
  
  // Check if they are connected
  const user = users.find(u => u.id === userId);
  const other = users.find(u => u.id === otherId);
  
  if (!user || !other) return res.status(404).json({ message: "User not found" });
  
  const isConnected = 
    (user.role === 'client' && user.trainerId === otherId && user.trainerStatus === 'accepted') ||
    (user.role === 'trainer' && other.trainerId === userId && other.trainerStatus === 'accepted');
    
  if (!isConnected) {
    return res.status(403).json({ message: "You are not connected to this user" });
  }

  const messages = chatMessages.filter(m => 
    (m.senderId === userId && m.receiverId === otherId) ||
    (m.senderId === otherId && m.receiverId === userId)
  ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  res.json(messages);
});

// Admin Routes
app.get("/api/admin/users", (req, res) => {
  res.json(users);
});

app.delete("/api/admin/users/:userId", (req, res) => {
  const index = users.findIndex(u => u.id === req.params.userId);
  if (index !== -1) {
    users.splice(index, 1);
    saveDB();
    res.json({ success: true });
  } else {
    res.status(404).json({ message: "User not found" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
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

startServer();

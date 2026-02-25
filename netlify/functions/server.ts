import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import serverless from "serverless-http";
import { createClient } from "@supabase/supabase-js";
import { User } from "../../types";

const app = express();

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// Supabase Configuration
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Helper to check if we are using the service role key
const isServiceRole = supabaseKey.includes('service_role') || (process.env.SUPABASE_SERVICE_ROLE_KEY && supabaseKey === process.env.SUPABASE_SERVICE_ROLE_KEY);

// Auth Routes
app.post("/api/register", async (req, res) => {
  const { email, name, role, password } = req.body;
  
  console.log("--- NETLIFY REGISTRATION START ---");
  
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ message: "Supabase configuration missing" });
  }

  try {
    let authResponse;
    
    // Always try to use admin if possible, as requested by user
    if (isServiceRole) {
      console.log("Using admin.createUser...");
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
      console.log("Using auth.signUp (No Service Role Key found)...");
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
      console.error("Auth Error:", error.message);
      return res.status(400).json({ message: error.message });
    }

    const userId = data.user?.id;
    if (!userId) {
      return res.status(500).json({ message: "User ID not generated" });
    }

    // Insert into profiles table
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
      console.error("Profile Table Error:", profileError.message);
      // Return 201 because user is created in Auth
      return res.status(201).json({ 
        message: "User created, but profile table failed",
        user: { id: userId, email, name, role },
        error: profileError.message
      });
    }

    const newUser: User = {
      id: userId,
      email: data.user?.email || email,
      name,
      role,
      imageUrl: `https://picsum.photos/seed/${email}/200`,
      trainerStatus: 'none'
    };

    res.status(201).json(newUser);
  } catch (err: any) {
    console.error("Unexpected Error:", err.message);
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(error.status || 401).json({ message: error.message });
    }

    if (!data.user) {
      return res.status(401).json({ message: "Invalid login credentials" });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    const user: User = {
      id: data.user.id,
      email: data.user.email || email,
      name: profile?.name || data.user.user_metadata?.name || 'User',
      role: profile?.role || data.user.user_metadata?.role || 'client',
      imageUrl: profile?.image_url || data.user.user_metadata?.imageUrl,
      trainerStatus: profile?.trainer_status || data.user.user_metadata?.trainerStatus || 'none',
      trainerId: profile?.trainer_id || data.user.user_metadata?.trainerId
    };

    res.json(user);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Trainer Routes
app.get("/api/trainers", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'trainer');
    
    if (error) throw error;
    
    // Map to frontend User type
    const trainers = data.map(p => ({
      id: p.id,
      email: p.email,
      name: p.name,
      role: p.role,
      imageUrl: p.image_url,
      trainerStatus: p.trainer_status,
      bio: p.bio,
      specialties: p.specialties
    }));
    
    res.json(trainers);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/trainers/clients/:trainerId", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('trainer_id', req.params.trainerId)
      .eq('trainer_status', 'accepted');
    
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Plan Routes
app.get("/api/plans/:clientId", async (req, res) => {
  try {
    const { data: training } = await supabase
      .from('training_plans')
      .select('*')
      .eq('client_id', req.params.clientId);
    
    const { data: diet } = await supabase
      .from('diet_plans')
      .select('*')
      .eq('client_id', req.params.clientId);
    
    res.json({ training: training || [], diet: diet || [] });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", environment: "netlify", isServiceRole });
});

export const handler = serverless(app);

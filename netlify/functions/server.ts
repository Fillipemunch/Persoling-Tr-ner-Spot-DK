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

let supabase: any;
try {
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  console.log("Netlify: Supabase client initialized successfully");
} catch (e: any) {
  console.error("Netlify CRITICAL: Failed to initialize Supabase client:", e.message);
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

// Auth Routes
app.post("/api/register", async (req, res) => {
  const { email, name, role, password } = req.body;
  
  console.log("--- NETLIFY REGISTRATION START ---");
  console.log("Supabase URL present:", !!supabaseUrl);
  console.log("Supabase Key present:", !!supabaseKey);
  console.log("Is Service Role:", isServiceRole);
  
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
    console.log("Attempting to insert into 'profiles' table for user:", userId);
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
      console.error("Profile Table Error:", profileError.message, profileError.details, profileError.hint);
      // Return 201 because user is created in Auth, but warn about profile
      return res.status(201).json({ 
        message: "User created in Auth, but profile table failed. This usually means the 'profiles' table is missing or has RLS enabled without proper policies.",
        user: { id: userId, email, name, role },
        error: profileError.message,
        details: profileError.details
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

// Profile Routes
app.post("/api/users/profile", async (req, res) => {
  const { userId, ...updates } = req.body;
  
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

    res.json({
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
    });
  } catch (err: any) {
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

// Admin Routes
app.get("/api/admin/stats", async (req, res) => {
  try {
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

    res.json({
      totalUsers: totalUsers || 0,
      totalTrainers: totalTrainers || 0,
      totalClients: totalClients || 0,
      pendingRequests: pendingRequests || 0,
      acceptedRequests: acceptedRequests || 0,
      recentActivities: (recentProfiles || []).map((p: any) => ({
        id: p.id,
        type: 'USER_REGISTER',
        description: `Novo usuário ${p.name} registrado como ${p.role}`,
        timestamp: p.created_at || new Date().toISOString()
      }))
    });
  } catch (err: any) {
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
    
    res.json(data.map((p: any) => ({
      id: p.id,
      email: p.email,
      name: p.name,
      role: p.role,
      imageUrl: p.image_url,
      trainerStatus: p.trainer_status,
      lastSeen: p.updated_at
    })));
  } catch (err: any) {
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
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

app.delete("/api/admin/users/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    await supabase.from('profiles').delete().eq('id', userId);
    if (isServiceRole) {
      await supabase.auth.admin.deleteUser(userId);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", environment: "netlify", isServiceRole });
});

export const handler = serverless(app);


export interface Trainer {
  id: string;
  name: string;
  specialty: string[];
  location: string;
  rating: number;
  reviewCount: number;
  bio: string;
  imageUrl: string;
  certified: boolean;
}

export type UserRole = 'client' | 'trainer' | 'admin';
export type TrainerStatus = 'none' | 'pending' | 'accepted';

export interface User {
  id: string;
  email: string;
  password?: string;
  name: string;
  role: UserRole;
  imageUrl?: string;
  trainerId?: string;
  trainerStatus?: TrainerStatus; // Added status
  bio?: string;
  specialties?: string[];
  certifications?: string[];
  lastSeen?: string;
}

export interface HireRequest {
  id: string;
  clientId: string;
  trainerId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: string;
}

export interface ClientProfile {
  userId: string;
  weight: number;
  height: number;
  goal: string;
  activityLevel: string;
  medicalConditions: string;
}

export interface TrainingPlan {
  id: string;
  clientId: string;
  trainerId: string;
  exercises: {
    name: string;
    sets: number;
    reps: string;
    notes: string;
    link?: string;
    imageUrl?: string;
  }[];
  createdAt: string;
}

export interface DietPlan {
  id: string;
  clientId: string;
  trainerId: string;
  meals: {
    time: string;
    description: string;
    calories: number;
    link?: string;
    imageUrl?: string;
  }[];
  createdAt: string;
}

export interface Message {
  role: 'user' | 'model';
  text: string;
}

export interface FilterOptions {
  search: string;
  specialty: string;
  location: string;
}

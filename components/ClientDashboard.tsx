import React, { useState, useEffect } from 'react';
import { User, ClientProfile, TrainingPlan, DietPlan } from '../types';
import { Activity, Target, Weight, Ruler, Dumbbell, Utensils, MessageSquare, Camera, User as UserIcon, ExternalLink } from 'lucide-react';
import Chat from './Chat';
import { useLanguage } from '../LanguageContext';

interface ClientDashboardProps {
  user: User;
}

const ClientDashboard: React.FC<ClientDashboardProps> = ({ user: initialUser }) => {
  const { t } = useLanguage();
  const [user, setUser] = useState<User>(initialUser);
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [plans, setPlans] = useState<{ training: TrainingPlan[]; diet: DietPlan[] }>({ training: [], diet: [] });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [trainer, setTrainer] = useState<User | null>(null);
  const [formData, setFormData] = useState<ClientProfile>({
    userId: user.id,
    weight: 0,
    height: 0,
    goal: '',
    activityLevel: '',
    medicalConditions: ''
  });

  const fetchProfile = async () => {
    try {
      const res = await fetch(`/api/clients/profile/${user.id}`);
      if (!res.ok) throw new Error('Failed to fetch profile');
      const data = await res.json();
      if (data) {
        setProfile(data);
        setFormData(data);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const fetchPlans = async () => {
    try {
      const res = await fetch(`/api/plans/${user.id}`);
      if (!res.ok) throw new Error('Failed to fetch plans');
      const data = await res.json();
      setPlans({
        training: Array.isArray(data?.training) ? data.training : [],
        diet: Array.isArray(data?.diet) ? data.diet : []
      });
    } catch (err) {
      console.error(err);
      setPlans({ training: [], diet: [] });
    }
  };

  const fetchTrainer = async () => {
    try {
      const res = await fetch('/api/trainers');
      if (!res.ok) throw new Error('Failed to fetch trainers');
      const trainers: User[] = await res.json();
      if (Array.isArray(trainers)) {
        const myTrainer = trainers.find(t => t.id === user.trainerId);
        if (myTrainer) setTrainer(myTrainer);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchPlans();
    if (user.trainerId) {
      fetchTrainer();
    }
  }, [user.id, user.trainerId]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/clients/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setProfile(formData);
        setIsEditingProfile(false);
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      alert('Failed to update profile. Please try again.');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        const res = await fetch('/api/users/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, imageUrl: base64String }),
        });
        if (res.ok) {
          const updatedUser = await res.json();
          setUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
        } else {
          throw new Error('Failed to upload image');
        }
      } catch (err) {
        console.error('Error uploading image:', err);
        alert('Failed to upload image. Please try again.');
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-black">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
        <div className="flex items-center gap-6">
          <div className="relative group">
            <div className="w-24 h-24 rounded-3xl bg-slate-900 border-2 border-white/5 overflow-hidden shadow-2xl">
              {user.imageUrl ? (
                <img src={user.imageUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-700">
                  <UserIcon size={40} />
                </div>
              )}
            </div>
            <label className="absolute bottom-0 right-0 p-2 bg-neon-cyan rounded-xl cursor-pointer hover:bg-white transition-colors shadow-neon-cyan text-black">
              <Camera size={16} />
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
            </label>
          </div>
          <div>
            <h1 className="text-4xl font-black font-heading mb-2">{t.dashboard.welcome} <span className="neon-text-cyan">{user.name}</span></h1>
            <p className="text-slate-500 uppercase tracking-widest text-xs font-bold">{t.dashboard.trackProgress}</p>
          </div>
        </div>
        {trainer && user.trainerStatus === 'accepted' && (
          <button 
            onClick={() => setShowChat(!showChat)}
            className="flex items-center gap-2 bg-neon-cyan hover:bg-white text-black px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-neon-cyan"
          >
            <MessageSquare size={20} />
            {showChat ? t.dashboard.closeChat : t.dashboard.chatWithTrainer}
          </button>
        )}
        {user.trainerStatus === 'pending' && (
          <div className="bg-neon-cyan/10 border border-neon-cyan/30 px-6 py-3 rounded-2xl flex items-center gap-3">
            <div className="w-2 h-2 bg-neon-cyan rounded-full animate-pulse shadow-neon-cyan" />
            <span className="text-neon-cyan font-black uppercase tracking-widest text-[10px]">{t.dashboard.waitingApproval}</span>
          </div>
        )}
      </div>

      {showChat && trainer && user.trainerStatus === 'accepted' && (
        <div className="mb-12 animate-in slide-in-from-top-5 duration-300">
          <Chat currentUser={user} otherUser={trainer} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-slate-900/50 rounded-3xl p-8 border border-white/5 backdrop-blur-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black uppercase tracking-widest text-xs flex items-center gap-2">
                <Activity className="text-neon-cyan" /> {t.dashboard.stats}
              </h2>
              <button 
                onClick={() => setIsEditingProfile(!isEditingProfile)}
                className="text-neon-cyan text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors"
              >
                {isEditingProfile ? t.dashboard.cancel : t.dashboard.edit}
              </button>
            </div>

            {isEditingProfile ? (
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{t.dashboard.weight} (kg)</label>
                    <input 
                      type="number" 
                      className="w-full bg-black border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-neon-cyan"
                      value={formData.weight}
                      onChange={e => setFormData({...formData, weight: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{t.dashboard.height} (cm)</label>
                    <input 
                      type="number" 
                      className="w-full bg-black border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-neon-cyan"
                      value={formData.height}
                      onChange={e => setFormData({...formData, height: Number(e.target.value)})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{t.dashboard.goal}</label>
                  <input 
                    type="text" 
                    className="w-full bg-black border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-neon-cyan"
                    value={formData.goal}
                    onChange={e => setFormData({...formData, goal: e.target.value})}
                    placeholder={t.dashboard.goalPlaceholder}
                  />
                </div>
                <button type="submit" className="w-full bg-neon-cyan text-black font-black py-3 rounded-lg mt-4 uppercase tracking-widest text-xs shadow-neon-cyan">{t.dashboard.saveProfile}</button>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black p-4 rounded-2xl border border-white/5">
                    <Weight className="w-5 h-5 text-neon-cyan mb-2" />
                    <div className="text-2xl font-black">{profile?.weight || '--'} <span className="text-sm font-normal text-slate-500">kg</span></div>
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t.dashboard.weight}</div>
                  </div>
                  <div className="bg-black p-4 rounded-2xl border border-white/5">
                    <Ruler className="w-5 h-5 text-neon-cyan mb-2" />
                    <div className="text-2xl font-black">{profile?.height || '--'} <span className="text-sm font-normal text-slate-500">cm</span></div>
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t.dashboard.height}</div>
                  </div>
                </div>
                <div className="bg-black p-4 rounded-2xl border border-white/5">
                  <Target className="w-5 h-5 text-neon-pink mb-2" />
                  <div className="text-lg font-black neon-text-pink">{profile?.goal || t.dashboard.noGoal}</div>
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t.dashboard.goal}</div>
                </div>
              </div>
            )}
          </div>
          
          {trainer && (
            <div className="mt-8 bg-slate-900/50 rounded-3xl p-8 border border-white/5 backdrop-blur-xl">
              <h2 className="text-xl font-black uppercase tracking-widest text-xs flex items-center gap-2 mb-6">
                <UserIcon className="text-neon-cyan" /> {t.dashboard.myTrainer}
              </h2>
              <div className="flex items-center gap-4">
                <img src={trainer.imageUrl} alt={trainer.name} className="w-16 h-16 rounded-2xl object-cover border border-white/10" />
                <div>
                  <div className="font-black text-white uppercase tracking-widest text-sm">{trainer.name}</div>
                  <div className="text-[10px] text-neon-cyan font-black uppercase tracking-widest">{trainer.specialties?.join(', ')}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Plans Section */}
        <div className="lg:col-span-2 space-y-8">
          {/* Training Plans */}
          <div className="bg-slate-900/50 rounded-3xl p-8 border border-white/5 backdrop-blur-xl">
            <h2 className="text-xl font-black uppercase tracking-widest text-xs flex items-center gap-2 mb-6">
              <Dumbbell className="text-neon-cyan" /> {t.dashboard.trainingSeries}
            </h2>
            {Array.isArray(plans.training) && plans.training.length > 0 ? (
              <div className="space-y-4">
                {plans.training.map(plan => (
                  <div key={plan.id} className="bg-black rounded-2xl p-6 border border-white/5">
                    <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4">{t.dashboard.createdOn} {new Date(plan.createdAt).toLocaleDateString()}</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Array.isArray(plan.exercises) && plan.exercises.map((ex, i) => (
                        <div key={i} className="flex flex-col p-4 bg-slate-900 rounded-xl border border-white/5 space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="flex gap-3">
                              {ex.imageUrl && (
                                <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/10 flex-shrink-0">
                                  <img src={ex.imageUrl} className="w-full h-full object-cover" alt={ex.name} />
                                </div>
                              )}
                              <div>
                                <div className="font-black text-slate-200 flex items-center gap-2 uppercase tracking-widest text-xs">
                                  {ex.name}
                                  {ex.link && (
                                    <a href={ex.link} target="_blank" rel="noopener noreferrer" className="text-neon-cyan hover:text-white">
                                      <ExternalLink size={12} />
                                    </a>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-500 font-bold">{ex.notes}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-neon-cyan font-black text-xs">{ex.sets} x {ex.reps}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-black/50 rounded-2xl border border-dashed border-slate-800">
                <p className="text-slate-600 font-black uppercase tracking-widest text-[10px]">{t.dashboard.noTrainingPlan}</p>
              </div>
            )}
          </div>

          {/* Diet Plans */}
          <div className="bg-slate-900/50 rounded-3xl p-8 border border-white/5 backdrop-blur-xl">
            <h2 className="text-xl font-black uppercase tracking-widest text-xs flex items-center gap-2 mb-6">
              <Utensils className="text-neon-pink" /> {t.dashboard.nutritionPlan}
            </h2>
            {Array.isArray(plans.diet) && plans.diet.length > 0 ? (
              <div className="space-y-4">
                {plans.diet.map(plan => (
                  <div key={plan.id} className="bg-black rounded-2xl p-6 border border-white/5">
                    <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4">{t.dashboard.createdOn} {new Date(plan.createdAt).toLocaleDateString()}</div>
                    <div className="space-y-3">
                      {Array.isArray(plan.meals) && plan.meals.map((meal, i) => (
                        <div key={i} className="flex flex-col p-4 bg-slate-900 rounded-xl border border-white/5 space-y-3">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              {meal.imageUrl && (
                                <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 flex-shrink-0">
                                  <img src={meal.imageUrl} className="w-full h-full object-cover" alt={meal.description} />
                                </div>
                              )}
                              <div className="w-16 text-[10px] font-black text-neon-pink uppercase tracking-widest">{meal.time}</div>
                              <div className="font-black text-slate-200 flex items-center gap-2 uppercase tracking-widest text-xs">
                                {meal.description}
                                {meal.link && (
                                  <a href={meal.link} target="_blank" rel="noopener noreferrer" className="text-neon-pink hover:text-white">
                                    <ExternalLink size={12} />
                                  </a>
                                )}
                              </div>
                            </div>
                            <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{meal.calories} kcal</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-black/50 rounded-2xl border border-dashed border-slate-800">
                <p className="text-slate-600 font-black uppercase tracking-widest text-[10px]">{t.dashboard.noDietPlan}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;

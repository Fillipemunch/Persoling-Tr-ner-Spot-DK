import React, { useState, useEffect } from 'react';
import { User, ClientProfile, TrainingPlan, DietPlan } from '../types';
import { Users, Plus, ChevronRight, Dumbbell, Utensils, Info, Camera, User as UserIcon, MessageSquare, Award, Briefcase, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';
import Chat from './Chat';
import { useLanguage } from '../LanguageContext';

interface TrainerDashboardProps {
  user: User;
}

const TrainerDashboard: React.FC<TrainerDashboardProps> = ({ user: initialUser }) => {
  const { t } = useLanguage();
  const [user, setUser] = useState<User>(initialUser);
  const [clients, setClients] = useState<User[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<User | null>(null);
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [showPlanForm, setShowPlanForm] = useState<'training' | 'diet' | 'chat' | 'profile' | null>(null);

  // Form states
  const [exercises, setExercises] = useState([{ name: '', sets: 3, reps: '12', notes: '', link: '', imageUrl: '' }]);
  const [meals, setMeals] = useState([{ time: '08:00', description: '', calories: 500, link: '', imageUrl: '' }]);
  
  // Trainer Profile Form
  const [trainerBio, setTrainerBio] = useState(user.bio || '');
  const [trainerSpecialties, setTrainerSpecialties] = useState(user.specialties?.join(', ') || '');
  const [trainerCerts, setTrainerCerts] = useState(user.certifications?.join(', ') || '');

  const fetchClients = async () => {
    try {
      const res = await fetch(`/api/trainers/clients/${user.id}`);
      if (!res.ok) throw new Error('Failed to fetch clients');
      const data = await res.json();
      setClients(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setClients([]);
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await fetch(`/api/trainers/requests/${user.id}`);
      if (!res.ok) throw new Error('Failed to fetch requests');
      const data = await res.json();
      setPendingRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setPendingRequests([]);
    }
  };

  const fetchClientProfile = async (clientId: string) => {
    try {
      const res = await fetch(`/api/clients/profile/${clientId}`);
      if (!res.ok) throw new Error('Failed to fetch client profile');
      const data = await res.json();
      setClientProfile(data);
    } catch (err) {
      console.error('Error fetching client profile:', err);
    }
  };

  const handleRespondRequest = async (requestId: string, status: 'accepted' | 'rejected') => {
    try {
      const res = await fetch('/api/trainers/respond-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, status }),
      });
      if (res.ok) {
        alert(`Request ${status}`);
        fetchRequests();
        fetchClients();
      } else {
        throw new Error('Failed to respond to request');
      }
    } catch (err) {
      console.error('Error responding to request:', err);
      alert('Failed to respond to request. Please try again.');
    }
  };

  useEffect(() => {
    fetchClients();
    fetchRequests();
  }, [user.id]);

  useEffect(() => {
    if (selectedClient) {
      fetchClientProfile(selectedClient.id);
    }
  }, [selectedClient]);

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

  const handleUpdateProfile = async () => {
    try {
      const res = await fetch('/api/users/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          bio: trainerBio,
          specialties: trainerSpecialties.split(',').map(s => s.trim()),
          certifications: trainerCerts.split(',').map(s => s.trim())
        }),
      });
      if (res.ok) {
        const updatedUser = await res.json();
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        alert('Profile updated!');
        setShowPlanForm(null);
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      alert('Failed to update profile. Please try again.');
    }
  };

  const handleAddTrainingPlan = async () => {
    if (!selectedClient) return;
    try {
      const res = await fetch('/api/plans/training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClient.id,
          trainerId: user.id,
          exercises
        }),
      });
      if (res.ok) {
        alert('Training plan created!');
        setShowPlanForm(null);
        setExercises([{ name: '', sets: 3, reps: '12', notes: '', link: '', imageUrl: '' }]);
      } else {
        throw new Error('Failed to create training plan');
      }
    } catch (err) {
      console.error('Error creating training plan:', err);
      alert('Failed to create training plan. Please try again.');
    }
  };

  const handleAddDietPlan = async () => {
    if (!selectedClient) return;
    try {
      const res = await fetch('/api/plans/diet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClient.id,
          trainerId: user.id,
          meals
        }),
      });
      if (res.ok) {
        alert('Diet plan created!');
        setShowPlanForm(null);
        setMeals([{ time: '08:00', description: '', calories: 500, link: '', imageUrl: '' }]);
      } else {
        throw new Error('Failed to create diet plan');
      }
    } catch (err) {
      console.error('Error creating diet plan:', err);
      alert('Failed to create diet plan. Please try again.');
    }
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
            <h1 className="text-4xl font-black font-heading mb-2">{t.dashboard.trainerDashboard.split(' ')[0]} <span className="neon-text-cyan">{t.dashboard.trainerDashboard.split(' ')[1]}</span></h1>
            <p className="text-slate-500 uppercase tracking-widest text-xs font-bold">{t.dashboard.manageClients}</p>
          </div>
        </div>
        <button 
          onClick={() => setShowPlanForm('profile')}
          className="bg-slate-900 hover:bg-white text-slate-400 hover:text-black px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs border border-white/5 transition-all"
        >
          {t.dashboard.editProfile}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-8">
          {/* Pending Requests */}
          {pendingRequests.length > 0 && (
            <div className="bg-slate-900/80 rounded-3xl p-6 border border-neon-cyan/30 shadow-2xl shadow-neon-cyan/10 backdrop-blur-xl">
              <h2 className="text-xs font-black mb-4 flex items-center gap-2 text-neon-cyan uppercase tracking-widest">
                <Plus className="w-4 h-4" /> {t.dashboard.newRequests}
              </h2>
              <div className="space-y-4">
                {Array.isArray(pendingRequests) && pendingRequests.map(req => (
                  <div key={req.requestId} className="bg-black p-4 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-900 overflow-hidden border border-white/5">
                        {req.imageUrl ? <img src={req.imageUrl} className="w-full h-full object-cover" /> : <UserIcon size={20} />}
                      </div>
                      <div className="font-black text-xs uppercase tracking-widest">{req.name}</div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleRespondRequest(req.requestId, 'accepted')}
                        className="flex-1 bg-neon-cyan hover:bg-white text-black text-[10px] font-black py-2 rounded uppercase tracking-widest transition-all shadow-neon-cyan"
                      >
                        {t.dashboard.accept}
                      </button>
                      <button 
                        onClick={() => handleRespondRequest(req.requestId, 'rejected')}
                        className="flex-1 bg-slate-900 hover:bg-slate-800 text-slate-500 text-[10px] font-black py-2 rounded uppercase tracking-widest transition-all"
                      >
                        {t.dashboard.decline}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Client List */}
          <div className="bg-slate-900/50 rounded-3xl p-6 border border-white/5 backdrop-blur-xl">
            <h2 className="text-xs font-black mb-6 flex items-center gap-2 uppercase tracking-widest">
              <Users className="text-neon-cyan w-4 h-4" /> {t.dashboard.myClients}
            </h2>
            <div className="space-y-2">
              {Array.isArray(clients) && clients.length > 0 ? (
                clients.map(client => (
                  <button
                    key={client.id}
                    onClick={() => {
                      setSelectedClient(client);
                      setShowPlanForm(null);
                    }}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all border ${
                      selectedClient?.id === client.id 
                        ? 'bg-neon-cyan text-black border-neon-cyan shadow-neon-cyan' 
                        : 'bg-black text-slate-500 border-white/5 hover:border-neon-cyan/50 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-900 overflow-hidden border border-white/10">
                        {client.imageUrl ? <img src={client.imageUrl} className="w-full h-full object-cover" /> : <UserIcon size={16} />}
                      </div>
                      <span className="font-black uppercase tracking-widest text-[10px]">{client.name}</span>
                    </div>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ))
              ) : (
                <div className="text-center py-8 text-slate-700 font-black uppercase tracking-widest text-[10px]">{t.dashboard.noClients}</div>
              )}
            </div>
          </div>
        </div>

        {/* Client Details & Plan Creation */}
        <div className="lg:col-span-3">
          {showPlanForm === 'profile' ? (
            <div className="bg-slate-900/50 rounded-3xl p-8 border border-white/5 backdrop-blur-xl animate-in slide-in-from-right-5 duration-300">
              <h2 className="text-xl font-black mb-8 flex items-center gap-2 uppercase tracking-widest">
                <Briefcase className="text-neon-cyan" /> {t.dashboard.profProfile}
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{t.dashboard.bio}</label>
                  <textarea 
                    className="w-full bg-black border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neon-cyan min-h-[120px]"
                    value={trainerBio}
                    onChange={e => setTrainerBio(e.target.value)}
                    placeholder={t.dashboard.bioPlaceholder}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{t.dashboard.specialties}</label>
                  <input 
                    type="text" 
                    className="w-full bg-black border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neon-cyan"
                    value={trainerSpecialties}
                    onChange={e => setTrainerSpecialties(e.target.value)}
                    placeholder={t.dashboard.specialtiesPlaceholder}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{t.dashboard.certifications}</label>
                  <input 
                    type="text" 
                    className="w-full bg-black border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neon-cyan"
                    value={trainerCerts}
                    onChange={e => setTrainerCerts(e.target.value)}
                    placeholder={t.dashboard.certsPlaceholder}
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button onClick={handleUpdateProfile} className="bg-neon-cyan text-black font-black px-8 py-3 rounded-xl uppercase tracking-widest text-xs shadow-neon-cyan">{t.dashboard.saveProfile}</button>
                  <button onClick={() => setShowPlanForm(null)} className="text-slate-600 font-black px-8 py-3 uppercase tracking-widest text-xs">{t.dashboard.cancel}</button>
                </div>
              </div>
            </div>
          ) : selectedClient ? (
            <div className="space-y-8">
              {/* Client Info Header */}
              <div className="bg-slate-900/50 rounded-3xl p-8 border border-white/5 backdrop-blur-xl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="flex items-center gap-4">
                    <img src={selectedClient.imageUrl} className="w-16 h-16 rounded-2xl object-cover border border-white/10" />
                    <div>
                      <h2 className="text-2xl font-black mb-1 uppercase tracking-widest">{selectedClient.name}</h2>
                      <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest">{selectedClient.email}</p>
                    </div>
                  </div>
                    <div className="flex flex-wrap gap-3">
                    <button 
                      onClick={() => setShowPlanForm('chat')}
                      className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border border-white/5"
                    >
                      <MessageSquare className="w-4 h-4 text-neon-cyan" /> {t.dashboard.chat}
                    </button>
                    <button 
                      onClick={() => setShowPlanForm('training')}
                      className="flex items-center gap-2 bg-neon-cyan hover:bg-white text-black px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-neon-cyan"
                    >
                      <Plus className="w-4 h-4" /> {t.dashboard.training}
                    </button>
                    <button 
                      onClick={() => setShowPlanForm('diet')}
                      className="flex items-center gap-2 bg-neon-pink hover:bg-white text-black px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-neon-pink"
                    >
                      <Plus className="w-4 h-4" /> {t.dashboard.diet}
                    </button>
                  </div>
                </div>

                {clientProfile && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-white/5">
                    <div>
                      <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">{t.dashboard.weight}</div>
                      <div className="text-xl font-black">{clientProfile.weight} kg</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">{t.dashboard.height}</div>
                      <div className="text-xl font-black">{clientProfile.height} cm</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">{t.dashboard.goal}</div>
                      <div className="text-xl font-black text-neon-cyan uppercase tracking-widest">{clientProfile.goal}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Interface */}
              {showPlanForm === 'chat' && (
                <div className="animate-in slide-in-from-top-5 duration-300">
                  <Chat currentUser={user} otherUser={selectedClient} />
                </div>
              )}

              {/* Plan Forms */}
              {showPlanForm === 'training' && (
                <div className="bg-slate-900/50 rounded-3xl p-8 border border-neon-cyan/30 shadow-2xl shadow-neon-cyan/10 backdrop-blur-xl">
                  <h3 className="text-xl font-black mb-6 flex items-center gap-2 uppercase tracking-widest">
                    <Dumbbell className="text-neon-cyan" /> {t.dashboard.createTraining}
                  </h3>
                  <div className="space-y-4">
                    {Array.isArray(exercises) && exercises.map((ex, i) => (
                      <div key={i} className="p-6 bg-black rounded-2xl border border-white/5 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">{t.dashboard.exerciseName}</label>
                            <input 
                              type="text" 
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-neon-cyan"
                              value={ex.name}
                              onChange={e => {
                                const newEx = [...exercises];
                                newEx[i].name = e.target.value;
                                setExercises(newEx);
                              }}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">{t.dashboard.sets}</label>
                            <input 
                              type="number" 
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-neon-cyan"
                              value={ex.sets}
                              onChange={e => {
                                const newEx = [...exercises];
                                newEx[i].sets = Number(e.target.value);
                                setExercises(newEx);
                              }}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">{t.dashboard.repsNotes}</label>
                            <input 
                              type="text" 
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-neon-cyan"
                              value={ex.reps}
                              onChange={e => {
                                const newEx = [...exercises];
                                newEx[i].reps = e.target.value;
                                setExercises(newEx);
                              }}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1 flex items-center gap-1">
                              <LinkIcon size={10} /> {t.dashboard.videoLink}
                            </label>
                            <input 
                              type="url" 
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-neon-cyan"
                              value={ex.link}
                              onChange={e => {
                                const newEx = [...exercises];
                                newEx[i].link = e.target.value;
                                setExercises(newEx);
                              }}
                              placeholder={t.dashboard.urlPlaceholder}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1 flex items-center gap-1">
                              <ImageIcon size={10} /> {t.dashboard.photo}
                            </label>
                            <div className="flex gap-2">
                              <input 
                                type="text" 
                                className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-neon-cyan"
                                value={ex.imageUrl}
                                onChange={e => {
                                  const newEx = [...exercises];
                                  newEx[i].imageUrl = e.target.value;
                                  setExercises(newEx);
                                }}
                                placeholder={t.dashboard.imagePlaceholder}
                              />
                              <label className="bg-slate-800 hover:bg-white p-2 rounded-lg cursor-pointer text-slate-400 hover:text-black transition-colors">
                                <Camera size={16} />
                                <input 
                                  type="file" 
                                  className="hidden" 
                                  accept="image/*"
                                  onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onloadend = () => {
                                        const newEx = [...exercises];
                                        newEx[i].imageUrl = reader.result as string;
                                        setExercises(newEx);
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                />
                              </label>
                            </div>
                          </div>
                        </div>
                        {ex.imageUrl && (
                          <div className="mt-2 w-20 h-20 rounded-lg overflow-hidden border border-white/10">
                            <img src={ex.imageUrl} className="w-full h-full object-cover" alt="Exercise preview" />
                          </div>
                        )}
                      </div>
                    ))}
                    <button 
                      onClick={() => setExercises([...exercises, { name: '', sets: 3, reps: '12', notes: '', link: '', imageUrl: '' }])}
                      className="text-neon-cyan text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:text-white"
                    >
                      <Plus className="w-4 h-4" /> {t.dashboard.addExercise}
                    </button>
                    <div className="flex gap-4 mt-8">
                      <button onClick={handleAddTrainingPlan} className="bg-neon-cyan text-black font-black px-8 py-3 rounded-xl uppercase tracking-widest text-xs shadow-neon-cyan">{t.dashboard.savePlan}</button>
                      <button onClick={() => setShowPlanForm(null)} className="text-slate-600 font-black px-8 py-3 uppercase tracking-widest text-xs">{t.dashboard.cancel}</button>
                    </div>
                  </div>
                </div>
              )}

              {showPlanForm === 'diet' && (
                <div className="bg-slate-900/50 rounded-3xl p-8 border border-neon-pink/30 shadow-2xl shadow-neon-pink/10 backdrop-blur-xl">
                  <h3 className="text-xl font-black mb-6 flex items-center gap-2 uppercase tracking-widest">
                    <Utensils className="text-neon-pink" /> {t.dashboard.createDiet}
                  </h3>
                  <div className="space-y-4">
                    {Array.isArray(meals) && meals.map((meal, i) => (
                      <div key={i} className="p-6 bg-black rounded-2xl border border-white/5 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">{t.dashboard.time}</label>
                            <input 
                              type="text" 
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-neon-pink"
                              value={meal.time}
                              onChange={e => {
                                const newMeals = [...meals];
                                newMeals[i].time = e.target.value;
                                setMeals(newMeals);
                              }}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">{t.dashboard.description}</label>
                            <input 
                              type="text" 
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-neon-pink"
                              value={meal.description}
                              onChange={e => {
                                const newMeals = [...meals];
                                newMeals[i].description = e.target.value;
                                setMeals(newMeals);
                              }}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">{t.dashboard.calories}</label>
                            <input 
                              type="number" 
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-neon-pink"
                              value={meal.calories}
                              onChange={e => {
                                const newMeals = [...meals];
                                newMeals[i].calories = Number(e.target.value);
                                setMeals(newMeals);
                              }}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1 flex items-center gap-1">
                              <LinkIcon size={10} /> {t.dashboard.videoLink}
                            </label>
                            <input 
                              type="url" 
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-neon-pink"
                              value={meal.link}
                              onChange={e => {
                                const newMeals = [...meals];
                                newMeals[i].link = e.target.value;
                                setMeals(newMeals);
                              }}
                              placeholder={t.dashboard.urlPlaceholder}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1 flex items-center gap-1">
                              <ImageIcon size={10} /> {t.dashboard.photo}
                            </label>
                            <div className="flex gap-2">
                              <input 
                                type="text" 
                                className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-neon-pink"
                                value={meal.imageUrl}
                                onChange={e => {
                                  const newMeals = [...meals];
                                  newMeals[i].imageUrl = e.target.value;
                                  setMeals(newMeals);
                                }}
                                placeholder={t.dashboard.imagePlaceholder}
                              />
                              <label className="bg-slate-800 hover:bg-white p-2 rounded-lg cursor-pointer text-slate-400 hover:text-black transition-colors">
                                <Camera size={16} />
                                <input 
                                  type="file" 
                                  className="hidden" 
                                  accept="image/*"
                                  onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onloadend = () => {
                                        const newMeals = [...meals];
                                        newMeals[i].imageUrl = reader.result as string;
                                        setMeals(newMeals);
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                />
                              </label>
                            </div>
                          </div>
                        </div>
                        {meal.imageUrl && (
                          <div className="mt-2 w-20 h-20 rounded-lg overflow-hidden border border-white/10">
                            <img src={meal.imageUrl} className="w-full h-full object-cover" alt="Meal preview" />
                          </div>
                        )}
                      </div>
                    ))}
                    <button 
                      onClick={() => setMeals([...meals, { time: '12:00', description: '', calories: 500, link: '', imageUrl: '' }])}
                      className="text-neon-pink text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:text-white"
                    >
                      <Plus className="w-4 h-4" /> {t.dashboard.addMeal}
                    </button>
                    <div className="flex gap-4 mt-8">
                      <button onClick={handleAddDietPlan} className="bg-neon-pink text-black font-black px-8 py-3 rounded-xl uppercase tracking-widest text-xs shadow-neon-pink">{t.dashboard.savePlan}</button>
                      <button onClick={() => setShowPlanForm(null)} className="text-slate-600 font-black px-8 py-3 uppercase tracking-widest text-xs">{t.dashboard.cancel}</button>
                    </div>
                  </div>
                </div>
              )}

              {!showPlanForm && (
                <div className="bg-black/50 rounded-3xl p-12 border border-dashed border-slate-800 text-center">
                  <div className="w-12 h-12 text-slate-800 mx-auto mb-4">
                    <Info size={48} />
                  </div>
                  <h4 className="text-xl font-black mb-2 uppercase tracking-widest">{t.dashboard.selectAction}</h4>
                  <p className="text-slate-600 max-w-sm mx-auto font-black uppercase tracking-widest text-[10px]">{t.dashboard.clickButtons} {selectedClient.name}.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-black/30 rounded-3xl border border-dashed border-slate-800 p-12">
              <Users className="w-16 h-16 text-slate-800 mb-6" />
              <h3 className="text-2xl font-black mb-2 uppercase tracking-widest">{t.dashboard.noClientSelected}</h3>
              <p className="text-slate-600 font-black uppercase tracking-widest text-[10px]">{t.dashboard.selectClientMsg}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrainerDashboard;

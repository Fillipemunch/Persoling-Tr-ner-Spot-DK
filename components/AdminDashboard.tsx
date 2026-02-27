import React, { useState, useEffect } from 'react';
import { User, UserRole, TrainerStatus } from '../types';
import { Users, Shield, Trash2, CheckCircle, XCircle, Activity, BarChart3, MessageSquare, Briefcase, Utensils, Dumbbell, Cpu, HardDrive, Clock, Edit2, Save, RotateCcw } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

interface AdminStats {
  totalUsers: number;
  totalTrainers: number;
  totalClients: number;
  totalPlans: number;
  totalTrainingPlans: number;
  totalDietPlans: number;
  totalRequests: number;
  pendingRequests: number;
  acceptedRequests: number;
  totalMessages: number;
  recentActivities: { id: string; type: string; description: string; timestamp: string }[];
  system: {
    nodeVersion: string;
    platform: string;
    uptime: number;
    memoryUsage: { rss: number; heapTotal: number; heapUsed: number };
  };
}

const AdminDashboard: React.FC = () => {
  const { t } = useLanguage();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ role: UserRole; trainerStatus: TrainerStatus }>({
    role: 'client',
    trainerStatus: 'none'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, statsRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/stats')
      ]);
      
      const usersData = usersRes.ok ? await usersRes.json() : [];
      const statsData = statsRes.ok ? await statsRes.json() : null;
      
      setUsers(Array.isArray(usersData) ? usersData : []);
      setStats(statsData);
    } catch (err) {
      console.error(err);
      setUsers([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        setUsers(users.filter(u => u.id !== userId));
        // Refresh stats after deletion
        const statsRes = await fetch('/api/admin/stats');
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const startEditing = (user: User) => {
    setEditingUser(user.id);
    setEditForm({
      role: user.role,
      trainerStatus: user.trainerStatus || 'none'
    });
  };

  const handleUpdateUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });

      if (res.ok) {
        const updatedUser = await res.json();
        setUsers(users.map(u => u.id === userId ? { ...u, ...updatedUser } : u));
        setEditingUser(null);
        // Refresh stats
        const statsRes = await fetch('/api/admin/stats');
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return (
    <div className="flex-1 flex flex-col items-center justify-center bg-black">
      <div className="w-12 h-12 border-4 border-neon-purple border-t-transparent rounded-full animate-spin mb-4 shadow-neon-purple"></div>
      <p className="text-slate-500 font-black uppercase tracking-widest text-xs">Loading Admin Panel...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-black min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-neon-purple rounded-2xl shadow-neon-purple">
            <Shield className="text-black" size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-black font-heading uppercase tracking-tighter">Admin <span className="neon-text-purple">Control</span></h1>
            <p className="text-slate-500 uppercase tracking-widest text-[10px] font-black">System Management & User Oversight</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-slate-900/50 px-4 py-2 rounded-xl border border-white/5">
          <Activity size={14} className="text-neon-green animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">System Online</span>
        </div>
      </div>

      {/* System Info */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-slate-900/30 p-4 rounded-2xl border border-white/5 flex items-center gap-4">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Cpu className="text-blue-400" size={16} />
            </div>
            <div>
              <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Environment</div>
              <div className="text-xs font-bold text-slate-300">{stats.system.nodeVersion} on {stats.system.platform}</div>
            </div>
          </div>
          <div className="bg-slate-900/30 p-4 rounded-2xl border border-white/5 flex items-center gap-4">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <HardDrive className="text-green-400" size={16} />
            </div>
            <div>
              <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Memory Usage</div>
              <div className="text-xs font-bold text-slate-300">{(stats.system.memoryUsage.rss / 1024 / 1024).toFixed(2)} MB RSS</div>
            </div>
          </div>
          <div className="bg-slate-900/30 p-4 rounded-2xl border border-white/5 flex items-center gap-4">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Clock className="text-yellow-400" size={16} />
            </div>
            <div>
              <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Uptime</div>
              <div className="text-xs font-bold text-slate-300">{(stats.system.uptime / 3600).toFixed(2)} hours</div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-slate-900/50 p-6 rounded-3xl border border-white/5 backdrop-blur-xl group hover:border-neon-purple/30 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-neon-purple/10 rounded-lg">
                <Users className="text-neon-purple" size={20} />
              </div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Users</span>
            </div>
            <div className="text-3xl font-black mb-1">{stats.totalUsers}</div>
            <div className="text-[8px] font-black uppercase tracking-widest text-slate-500">Platform reach</div>
          </div>

          <div className="bg-slate-900/50 p-6 rounded-3xl border border-white/5 backdrop-blur-xl group hover:border-neon-cyan/30 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-neon-cyan/10 rounded-lg">
                <Briefcase className="text-neon-cyan" size={20} />
              </div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Trainers</span>
            </div>
            <div className="text-3xl font-black mb-1">{stats.totalTrainers}</div>
            <div className="text-[8px] font-black uppercase tracking-widest text-neon-cyan">Active professionals</div>
          </div>

          <div className="bg-slate-900/50 p-6 rounded-3xl border border-white/5 backdrop-blur-xl group hover:border-neon-pink/30 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-neon-pink/10 rounded-lg">
                <Users className="text-neon-pink" size={20} />
              </div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Clients</span>
            </div>
            <div className="text-3xl font-black mb-1">{stats.totalClients}</div>
            <div className="text-[8px] font-black uppercase tracking-widest text-neon-pink">Active students</div>
          </div>

          <div className="bg-slate-900/50 p-6 rounded-3xl border border-white/5 backdrop-blur-xl group hover:border-yellow-500/30 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Clock className="text-yellow-500" size={20} />
              </div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pending Approval</span>
            </div>
            <div className="text-3xl font-black mb-1">{stats.pendingRequests}</div>
            <div className="text-[8px] font-black uppercase tracking-widest text-yellow-500">Awaiting trainer response</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        {/* User Table */}
        <div className="lg:col-span-2 bg-slate-900/50 rounded-3xl border border-white/5 backdrop-blur-xl overflow-hidden">
          <div className="p-8 border-b border-white/5 flex justify-between items-center">
            <h2 className="text-xl font-black uppercase tracking-widest text-xs flex items-center gap-2">
              <Users className="text-neon-purple" /> User Directory
            </h2>
            <button 
              onClick={fetchData}
              className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
            >
              Refresh Data
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black/20">
                  <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">User</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Role</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {Array.isArray(users) && users.map(user => (
                  <tr key={user.id} className="group hover:bg-white/5 transition-colors">
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-black border border-white/10 overflow-hidden">
                          {user.imageUrl ? (
                            <img src={user.imageUrl} alt={user.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-700 font-black italic">
                              {user.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-black text-white uppercase tracking-widest text-xs">{user.name}</div>
                          <div className="text-[10px] text-slate-500 lowercase">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      {editingUser === user.id ? (
                        <select 
                          className="bg-black border border-white/10 text-[8px] font-black uppercase tracking-widest text-white rounded px-2 py-1 focus:outline-none focus:border-neon-cyan"
                          value={editForm.role}
                          onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value as UserRole }))}
                        >
                          <option value="client">Client</option>
                          <option value="trainer">Trainer</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        <span className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest border ${
                          user.role === 'trainer' ? 'border-neon-cyan text-neon-cyan bg-neon-cyan/10' : 
                          user.role === 'admin' ? 'border-neon-purple text-neon-purple bg-neon-purple/10' :
                          'border-neon-pink text-neon-pink bg-neon-pink/10'
                        }`}>
                          {user.role}
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-4">
                      {editingUser === user.id ? (
                        <select 
                          className="bg-black border border-white/10 text-[8px] font-black uppercase tracking-widest text-white rounded px-2 py-1 focus:outline-none focus:border-neon-cyan"
                          value={editForm.trainerStatus}
                          onChange={(e) => setEditForm(prev => ({ ...prev, trainerStatus: e.target.value as TrainerStatus }))}
                        >
                          <option value="none">None</option>
                          <option value="pending">Pending</option>
                          <option value="accepted">Accepted</option>
                        </select>
                      ) : (
                        <div className="flex items-center gap-2">
                          {(() => {
                            const lastSeen = user.lastSeen ? new Date(user.lastSeen).getTime() : 0;
                            const isOnline = Date.now() - lastSeen < 300000; // Online if active in last 5 mins
                            return (
                              <>
                                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-neon-green shadow-neon-green' : 'bg-slate-600'}`}></div>
                                <span className={`text-[8px] font-black uppercase tracking-widest ${isOnline ? 'text-neon-green' : 'text-slate-500'}`}>
                                  {isOnline ? 'Online' : 'Offline'}
                                </span>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {editingUser === user.id ? (
                          <>
                            <button 
                              onClick={() => handleUpdateUser(user.id)}
                              className="p-2 text-neon-green hover:scale-110 transition-transform"
                              title="Save Changes"
                            >
                              <Save size={16} />
                            </button>
                            <button 
                              onClick={() => setEditingUser(null)}
                              className="p-2 text-slate-500 hover:scale-110 transition-transform"
                              title="Cancel"
                            >
                              <RotateCcw size={16} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              onClick={() => startEditing(user)}
                              className="p-2 text-slate-600 hover:text-neon-cyan transition-colors"
                              title="Edit User"
                            >
                              <Edit2 size={16} />
                            </button>
                            {user.role !== 'admin' && (
                              <button 
                                onClick={() => handleDeleteUser(user.id)}
                                className="p-2 text-slate-600 hover:text-neon-pink transition-colors"
                                title="Delete User"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-slate-900/50 rounded-3xl border border-white/5 backdrop-blur-xl p-8">
          <h2 className="text-xl font-black uppercase tracking-widest text-xs flex items-center gap-2 mb-8">
            <Activity className="text-neon-green" /> Recent Activity
          </h2>
          <div className="space-y-6">
            {stats?.recentActivities && Array.isArray(stats.recentActivities) && stats.recentActivities.length > 0 ? (
              stats.recentActivities.map((activity) => (
                <div key={activity.id} className="relative pl-6 border-l border-white/10">
                  <div className="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-neon-green shadow-neon-green"></div>
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                    {new Date(activity.timestamp).toLocaleTimeString()} - {activity.type.replace('_', ' ')}
                  </div>
                  <div className="text-xs text-slate-300 font-medium">{activity.description}</div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-slate-600 font-black uppercase tracking-widest text-[10px]">
                No recent activity recorded
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { Users, Shield, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

const AdminDashboard: React.FC = () => {
  const { t } = useLanguage();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error(err);
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
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="flex-1 flex items-center justify-center text-slate-500">Loading Admin Panel...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-black">
      <div className="flex items-center gap-4 mb-12">
        <div className="p-3 bg-neon-purple rounded-2xl shadow-neon-purple">
          <Shield className="text-black" size={32} />
        </div>
        <div>
          <h1 className="text-4xl font-black font-heading uppercase tracking-tighter">Admin <span className="neon-text-purple">Control</span></h1>
          <p className="text-slate-500 uppercase tracking-widest text-[10px] font-black">System Management & User Oversight</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <div className="bg-slate-900/50 rounded-3xl p-8 border border-white/5 backdrop-blur-xl">
          <h2 className="text-xl font-black uppercase tracking-widest text-xs flex items-center gap-2 mb-8">
            <Users className="text-neon-purple" /> User Directory ({users.length})
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">User</th>
                  <th className="pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Role</th>
                  <th className="pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                  <th className="pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map(user => (
                  <tr key={user.id} className="group hover:bg-white/5 transition-colors">
                    <td className="py-4">
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
                    <td className="py-4">
                      <span className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest border ${
                        user.role === 'trainer' ? 'border-neon-cyan text-neon-cyan bg-neon-cyan/10' : 'border-neon-pink text-neon-pink bg-neon-pink/10'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-4">
                      {user.role === 'trainer' ? (
                        <div className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-slate-400">
                          {user.trainerStatus === 'accepted' ? (
                            <CheckCircle size={10} className="text-neon-green" />
                          ) : (
                            <XCircle size={10} className="text-neon-pink" />
                          )}
                          {user.trainerStatus || 'N/A'}
                        </div>
                      ) : (
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-600">Active</span>
                      )}
                    </td>
                    <td className="py-4 text-right">
                      <button 
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-2 text-slate-600 hover:text-neon-pink transition-colors"
                        title="Delete User"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

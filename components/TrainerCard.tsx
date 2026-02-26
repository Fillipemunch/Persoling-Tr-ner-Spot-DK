
import React from 'react';
import { Link } from 'react-router-dom';
import { Trainer } from '../types';
import { useLanguage } from '../LanguageContext';

interface TrainerCardProps {
  trainer: Trainer;
}

const TrainerCard: React.FC<TrainerCardProps> = ({ trainer }) => {
  const { t } = useLanguage();
  const savedUser = localStorage.getItem('user');
  let savedUserObj = null;
  try {
    savedUserObj = savedUser ? JSON.parse(savedUser) : null;
  } catch (e) {
    console.error('Failed to parse user in TrainerCard', e);
  }

  return (
    <div className="bg-slate-900/50 rounded-2xl overflow-hidden border border-white/5 hover:border-neon-cyan/50 transition-all duration-300 group backdrop-blur-sm">
      <div className="relative h-64 overflow-hidden">
        <img 
          src={trainer.imageUrl} 
          alt={trainer.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute top-4 right-4 bg-neon-cyan text-black text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest shadow-neon-cyan">
          {trainer.location}
        </div>
      </div>
      
      <div className="p-6">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-bold font-heading group-hover:text-neon-cyan transition-colors">{trainer.name}</h3>
          <div className="flex items-center text-neon-yellow">
            <span className="text-sm font-bold mr-1">{trainer.rating}</span>
            <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {trainer.specialty.map(s => (
            <span key={s} className="bg-black text-neon-cyan text-[10px] px-2 py-1 rounded uppercase tracking-widest font-black border border-neon-cyan/20">
              {s}
            </span>
          ))}
        </div>

        <p className="text-slate-400 text-sm mb-6 line-clamp-2">
          {trainer.bio}
        </p>

        <div className="flex items-center justify-between border-t border-white/5 pt-4">
          <div className="flex items-center gap-1 text-neon-green font-black text-[10px] uppercase tracking-widest">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
            <span>{t.dashboard.neonVerified}</span>
          </div>
          {!savedUserObj ? (
            <Link 
              to="/login"
              className="bg-neon-cyan hover:bg-white text-black text-xs font-black py-2 px-4 rounded transition-all shadow-neon-cyan uppercase tracking-widest"
            >
              {t.dashboard.loginToHire}
            </Link>
          ) : savedUserObj?.trainerId === trainer.id ? (
            <div className={`px-4 py-2 rounded font-black text-[10px] uppercase tracking-widest ${
              savedUserObj.trainerStatus === 'accepted' ? 'bg-neon-green/10 text-neon-green border border-neon-green/20' : 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20'
            }`}>
              {savedUserObj.trainerStatus === 'accepted' ? t.dashboard.yourTrainer : t.dashboard.requestPending}
            </div>
          ) : (
            <button 
              onClick={async () => {
                const user = savedUserObj;
                if (!user) return;
                if (user?.role !== 'client') {
                  alert('Only clients can hire trainers');
                  return;
                }
                if (user?.trainerStatus !== 'none') {
                  alert('You already have a trainer or a pending request');
                  return;
                }
                const res = await fetch('/api/trainers/request-hire', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ clientId: user.id, trainerId: trainer.id }),
                });
                if (res.ok) {
                  const data = await res.json();
                  localStorage.setItem('user', JSON.stringify(data.user));
                  alert(`Request sent to ${trainer.name}! Wait for their approval.`);
                  window.location.reload(); // Refresh to update UI state
                } else {
                  const data = await res.json();
                  alert(data.message || 'Failed to send request');
                }
              }}
              className="bg-neon-cyan hover:bg-white text-black text-xs font-black py-2 px-4 rounded transition-all shadow-neon-cyan uppercase tracking-widest"
            >
              {t.dashboard.requestToHire}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrainerCard;

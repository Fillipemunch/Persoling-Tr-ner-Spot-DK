
import React, { useState, useMemo, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { Menu, X, Globe, LogOut, LayoutDashboard, Search, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPECIALTIES, LOCATIONS } from './constants';
import { FilterOptions, User } from './types';
import TrainerCard from './components/TrainerCard';
import Login from './components/Login';
import ClientDashboard from './components/ClientDashboard';
import TrainerDashboard from './components/TrainerDashboard';
import AdminDashboard from './components/AdminDashboard';

import { LanguageProvider, useLanguage } from './LanguageContext';

const Marketplace: React.FC<{ filters: FilterOptions; setFilters: React.Dispatch<React.SetStateAction<FilterOptions>> }> = ({ filters, setFilters }) => {
  const { t } = useLanguage();
  const [trainers, setTrainers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrainers();
  }, []);

  const fetchTrainers = async () => {
    try {
      const res = await fetch('/api/trainers');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setTrainers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setTrainers([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredTrainers = useMemo(() => {
    const trainersList = Array.isArray(trainers) ? trainers : [];
    const allTrainers = trainersList.map(t => ({
      ...t,
      name: t.name || 'Unknown Trainer',
      rating: 5.0,
      reviewCount: 0,
      certified: true,
      specialty: Array.isArray(t.specialties) ? t.specialties : [],
      location: 'Remote'
    }));

    return allTrainers.filter(trainer => {
      const searchLower = filters.search.toLowerCase();
      const name = String(trainer.name || '').toLowerCase();
      const bio = String(trainer.bio || '').toLowerCase();
      const specialties = Array.isArray(trainer.specialty) ? trainer.specialty : [];
      
      const matchesSearch = name.includes(searchLower) || 
                           bio.includes(searchLower) ||
                           specialties.some(s => String(s).toLowerCase().includes(searchLower));
      
      const matchesSpecialty = filters.specialty === '' || specialties.includes(filters.specialty);
      const matchesLocation = filters.location === '' || trainer.location === filters.location;
      return matchesSearch && matchesSpecialty && matchesLocation;
    });
  }, [filters, trainers]);

  const isSearching = filters.search !== '' || filters.specialty !== '' || filters.location !== '';

  if (loading) return (
    <div className="flex-1 flex flex-col items-center justify-center py-20">
      <div className="w-12 h-12 border-4 border-neon-cyan border-t-transparent rounded-full animate-spin mb-4"></div>
      <div className="text-slate-500 font-black uppercase tracking-widest text-xs">{t.filters.showing}...</div>
    </div>
  );

  return (
    <>
      <section className="relative py-24 overflow-hidden bg-black">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-full opacity-30 pointer-events-none">
          <div className="absolute top-0 left-0 w-72 h-72 bg-neon-cyan rounded-full blur-[120px]"></div>
          <div className="absolute bottom-0 right-0 w-72 h-72 bg-neon-purple rounded-full blur-[120px]"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
          <h1 className="text-5xl md:text-7xl font-black font-heading mb-6 leading-tight">
            {t.hero.title.includes(t.hero.perfectMatch) ? (
              <>
                {t.hero.title.split(t.hero.perfectMatch)[0]}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-neon-green neon-text-cyan">{t.hero.perfectMatch}</span>
                {t.hero.title.split(t.hero.perfectMatch)[1]}
              </>
            ) : (
              t.hero.title
            )}
          </h1>
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            {t.hero.subtitle}
          </p>
          
          {/* Search Box */}
          <div className="max-w-4xl mx-auto bg-slate-900/80 p-2 rounded-2xl shadow-2xl border border-neon-cyan/30 flex flex-col md:flex-row gap-2 backdrop-blur-xl">
            <div className="flex-[2] relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neon-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input 
                type="text" 
                placeholder={t.hero.searchPlaceholder} 
                className="w-full bg-transparent pl-12 pr-4 py-4 focus:outline-none text-white font-medium placeholder:text-slate-600"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({...prev, search: e.target.value}))}
              />
            </div>
            
            <div className="flex-1 flex gap-2">
              <select 
                className="flex-1 bg-black/40 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-4 focus:outline-none focus:border-neon-cyan appearance-none cursor-pointer"
                value={filters.specialty}
                onChange={(e) => setFilters(prev => ({...prev, specialty: e.target.value}))}
              >
                <option value="">{t.filters.allSpecialties}</option>
                {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              
              <select 
                className="flex-1 bg-black/40 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-4 focus:outline-none focus:border-neon-cyan appearance-none cursor-pointer"
                value={filters.location}
                onChange={(e) => setFilters(prev => ({...prev, location: e.target.value}))}
              >
                <option value="">{t.filters.allLocations}</option>
                {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            <button className="bg-neon-cyan hover:bg-white text-black font-bold px-8 py-4 rounded-xl transition-all active:scale-95 shadow-neon-cyan">
              {t.hero.exploreBtn}
            </button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full">
        {isSearching && trainers.length > 0 && (
          <div className="flex justify-between items-center mb-8">
            <p className="text-slate-500 text-sm font-medium">
              {t.filters.showing} <span className="text-neon-cyan">{filteredTrainers.length}</span> {t.filters.trainers}
            </p>
          </div>
        )}

        {/* Grid */}
        {Array.isArray(filteredTrainers) && filteredTrainers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredTrainers.map(trainer => (
              <TrainerCard key={trainer.id} trainer={trainer} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-slate-900/30 rounded-3xl border border-dashed border-slate-800">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="text-slate-600" size={32} />
            </div>
            <h3 className="text-xl font-black uppercase tracking-widest mb-2">{t.filters.noTrainers}</h3>
            <p className="text-slate-500 text-sm font-medium max-w-xs mx-auto">
              {isSearching ? t.filters.adjustFilters : "We are currently onboarding new trainers. Check back soon!"}
            </p>
            {isSearching && (
              <button 
                onClick={() => setFilters({search: '', location: '', specialty: ''})}
                className="mt-6 text-neon-cyan hover:text-white font-black uppercase tracking-widest text-xs transition-colors"
              >
                {t.filters.clearFilters}
              </button>
            )}
          </div>
        )}
      </main>
    </>
  );
};

const AppContent: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    specialty: '',
    location: ''
  });

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (e) {
      console.error('Failed to parse user from localStorage', e);
      localStorage.removeItem('user');
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col selection:bg-neon-cyan/30 bg-black">
        {/* Navbar */}
        <nav className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-20">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-10 h-10 bg-neon-cyan rounded-lg flex items-center justify-center font-black text-xl italic tracking-tighter text-black shadow-neon-cyan">PS</div>
                <span className="text-2xl font-black font-heading tracking-tight">PERSOLING<span className="text-neon-cyan neon-text-cyan"> TRÆNER SPOT</span><span className="text-slate-500 text-sm ml-1"> DK</span></span>
              </Link>

              {/* Desktop Menu */}
              <div className="hidden md:flex items-center space-x-8 text-sm font-semibold text-slate-300">
                <div className="flex items-center gap-2 bg-slate-900 rounded-lg p-1 border border-white/5">
                  <button 
                    onClick={() => setLanguage('en')}
                    className={`px-2 py-1 rounded text-[10px] uppercase tracking-widest transition-all ${language === 'en' ? 'bg-neon-cyan text-black font-black' : 'text-slate-500 hover:text-white'}`}
                  >
                    EN
                  </button>
                  <button 
                    onClick={() => setLanguage('da')}
                    className={`px-2 py-1 rounded text-[10px] uppercase tracking-widest transition-all ${language === 'da' ? 'bg-neon-cyan text-black font-black' : 'text-slate-500 hover:text-white'}`}
                  >
                    DA
                  </button>
                </div>
                <Link to="/" className="hover:text-neon-cyan transition-colors">{t.nav.findTrainers}</Link>
                {user ? (
                  <>
                    <Link 
                      to={user.email.toLowerCase() === 'fillipeferreiramunch@gmail.com' ? "/admin" : "/dashboard"} 
                      className="hover:text-neon-cyan transition-colors"
                    >
                      {user.email.toLowerCase() === 'fillipeferreiramunch@gmail.com' 
                        ? t.nav.admin 
                        : (user.role === 'trainer' ? t.dashboard.trainerDashboard : t.nav.dashboard)}
                    </Link>
                    <button onClick={handleLogout} className="text-slate-400 hover:text-white transition-colors">{t.nav.logout}</button>
                  </>
                ) : (
                  <Link to="/login" className="bg-neon-cyan hover:bg-white text-black px-6 py-2.5 rounded-full transition-all border border-neon-cyan shadow-neon-cyan">
                    {t.nav.loginRegister}
                  </Link>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button 
                className="md:hidden text-slate-300 hover:text-neon-cyan transition-colors"
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <Menu size={28} />
              </button>
            </div>
          </div>
        </nav>

        {/* Mobile Sidebar */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              {/* Overlay */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 md:hidden"
              />
              
              {/* Sidebar */}
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed top-0 right-0 bottom-0 w-[80%] max-w-sm bg-slate-900 border-l border-white/10 z-50 md:hidden flex flex-col"
              >
                <div className="p-6 flex justify-between items-center border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-neon-cyan rounded-lg flex items-center justify-center font-black text-lg italic tracking-tighter text-black">PS</div>
                    <span className="font-black uppercase tracking-widest text-xs">Menu</span>
                  </div>
                  <button 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                  {/* Language Switch */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                      <Globe size={14} /> Language / Sprog
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => setLanguage('en')}
                        className={`py-3 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${language === 'en' ? 'bg-neon-cyan text-black border-neon-cyan shadow-neon-cyan' : 'bg-black text-slate-500 border-white/5'}`}
                      >
                        English
                      </button>
                      <button 
                        onClick={() => setLanguage('da')}
                        className={`py-3 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${language === 'da' ? 'bg-neon-cyan text-black border-neon-cyan shadow-neon-cyan' : 'bg-black text-slate-500 border-white/5'}`}
                      >
                        Dansk
                      </button>
                    </div>
                  </div>

                  {/* Navigation Links */}
                  <div className="space-y-4">
                    <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Navigation</div>
                    <div className="space-y-2">
                      <Link 
                        to="/" 
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 p-4 bg-black rounded-2xl border border-white/5 text-slate-300 hover:text-neon-cyan transition-all"
                      >
                        <Search size={18} />
                        <span className="font-black uppercase tracking-widest text-xs">{t.nav.findTrainers}</span>
                      </Link>
                      
                      {user ? (
                        <>
                          <Link 
                            to={user.email.toLowerCase() === 'fillipeferreiramunch@gmail.com' ? "/admin" : "/dashboard"} 
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center gap-3 p-4 bg-black rounded-2xl border border-white/5 text-slate-300 hover:text-neon-cyan transition-all"
                          >
                            {user.email.toLowerCase() === 'fillipeferreiramunch@gmail.com' ? <Shield size={18} /> : <LayoutDashboard size={18} />}
                            <span className="font-black uppercase tracking-widest text-xs">
                              {user.email.toLowerCase() === 'fillipeferreiramunch@gmail.com' 
                                ? t.nav.admin 
                                : (user.role === 'trainer' ? t.dashboard.trainerDashboard : t.nav.dashboard)}
                            </span>
                          </Link>
                          <button 
                            onClick={() => {
                              handleLogout();
                              setIsMobileMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 p-4 bg-black rounded-2xl border border-white/5 text-slate-500 hover:text-white transition-all"
                          >
                            <LogOut size={18} />
                            <span className="font-black uppercase tracking-widest text-xs">{t.nav.logout}</span>
                          </button>
                        </>
                      ) : (
                        <Link 
                          to="/login" 
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center gap-3 p-4 bg-neon-cyan rounded-2xl text-black font-black transition-all shadow-neon-cyan"
                        >
                          <LogOut size={18} className="rotate-180" />
                          <span className="uppercase tracking-widest text-xs">{t.nav.loginRegister}</span>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-white/5 text-center">
                  <p className="text-[8px] text-slate-600 font-black uppercase tracking-widest">Persoling Træner Spot DK © 2026</p>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <Routes>
          <Route path="/" element={<Marketplace filters={filters} setFilters={setFilters} />} />
          <Route path="/login" element={
            user ? (
              user.email.toLowerCase() === 'fillipeferreiramunch@gmail.com' 
                ? <Navigate to="/admin" /> 
                : <Navigate to="/dashboard" />
            ) : <Login onLogin={setUser} />
          } />
          <Route path="/dashboard" element={
            user ? (
              user.role === 'client' ? <ClientDashboard user={user} /> : <TrainerDashboard user={user} />
            ) : <Navigate to="/login" />
          } />
          <Route path="/admin" element={
            user?.email.toLowerCase() === 'fillipeferreiramunch@gmail.com' ? <AdminDashboard /> : <Navigate to="/" />
          } />
        </Routes>

        <footer className="bg-black border-t border-white/5 py-6 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-neon-cyan rounded-lg flex items-center justify-center font-black text-[10px] italic tracking-tighter text-black shadow-neon-cyan">PS</div>
                  <span className="text-sm font-black font-heading tracking-tight uppercase">PERSOLING<span className="text-neon-cyan neon-text-cyan"> TRÆNER SPOT</span></span>
                </div>
                <p className="text-slate-600 text-[10px] font-medium hidden sm:block">
                  {t.footer.description}
                </p>
              </div>
              <div className="text-slate-600 text-[10px] font-black uppercase tracking-widest">
                © {new Date().getFullYear()} Persoling Træner Spot DK.
              </div>
            </div>
          </div>
        </footer>

        {/* Floating Elements */}
      </div>
    </BrowserRouter>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
};

export default App;

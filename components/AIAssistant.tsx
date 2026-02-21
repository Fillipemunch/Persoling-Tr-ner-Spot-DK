
import React, { useState, useRef, useEffect } from 'react';
import { getGeminiResponse } from '../services/geminiService';
import { Message } from '../types';
import { useLanguage } from '../LanguageContext';

const AIAssistant: React.FC = () => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{ role: 'model', text: t.ai.greeting }]);
    }
  }, [t.ai.greeting, messages.length]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const response = await getGeminiResponse(input);
    setMessages(prev => [...prev, { role: 'model', text: response }]);
    setIsLoading(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen ? (
        <div className="bg-black w-80 sm:w-96 h-[500px] rounded-2xl border border-neon-cyan/30 shadow-2xl shadow-neon-cyan/10 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300 backdrop-blur-xl">
          <div className="bg-neon-cyan p-4 flex justify-between items-center shadow-neon-cyan">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center">
                <svg className="w-5 h-5 text-neon-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-black text-black uppercase tracking-widest text-xs">{t.ai.consultant}</h3>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-black/80 hover:text-black">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-4 bg-black">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                  m.role === 'user' 
                  ? 'bg-neon-cyan text-black rounded-br-none shadow-neon-cyan' 
                  : 'bg-slate-900 text-neon-cyan rounded-bl-none border border-neon-cyan/20'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-900 p-3 rounded-xl border border-neon-cyan/10 animate-pulse text-slate-500 text-[10px] font-black uppercase tracking-widest">
                  {t.ai.thinking}
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-white/5 bg-slate-900/50 flex gap-2">
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={t.ai.askAnything}
              className="flex-1 bg-black border border-slate-800 rounded-lg px-4 py-2 text-xs font-black uppercase tracking-widest text-white focus:outline-none focus:border-neon-cyan transition-colors"
            />
            <button 
              onClick={handleSend}
              disabled={isLoading}
              className="bg-neon-cyan text-black p-2 rounded-lg hover:bg-white disabled:opacity-50 shadow-neon-cyan"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-neon-cyan hover:bg-white text-black p-4 rounded-full shadow-neon-cyan transition-all duration-300 hover:scale-110 active:scale-95 flex items-center gap-2"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <span className="font-black uppercase tracking-widest text-xs pr-1">{t.ai.askAi}</span>
        </button>
      )}
    </div>
  );
};

export default AIAssistant;

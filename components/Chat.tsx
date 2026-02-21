import React, { useState, useEffect, useRef } from 'react';
import { User, ChatMessage } from '../types';
import { Send, User as UserIcon } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

interface ChatProps {
  currentUser: User;
  otherUser: User;
}

const Chat: React.FC<ChatProps> = ({ currentUser, otherUser }) => {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const ws = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    const res = await fetch(`/api/chat/${currentUser.id}/${otherUser.id}`);
    const data = await res.json();
    setMessages(data);
  };

  const setupWebSocket = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws.current = new WebSocket(`${protocol}//${window.location.host}`);
    
    ws.current.onopen = () => {
      ws.current?.send(JSON.stringify({ type: 'auth', userId: currentUser.id }));
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'chat') {
        const msg = data.message;
        if (
          (msg.senderId === currentUser.id && msg.receiverId === otherUser.id) ||
          (msg.senderId === otherUser.id && msg.receiverId === currentUser.id)
        ) {
          setMessages(prev => [...prev, msg]);
        }
      }
    };
  };

  useEffect(() => {
    fetchMessages();
    setupWebSocket();
    return () => ws.current?.close();
  }, [otherUser.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    ws.current?.send(JSON.stringify({
      type: 'chat',
      senderId: currentUser.id,
      receiverId: otherUser.id,
      text: input
    }));
    setInput('');
  };

  return (
    <div className="flex flex-col h-[500px] bg-black rounded-3xl border border-white/5 overflow-hidden backdrop-blur-xl">
      <div className="p-4 bg-slate-900/50 border-b border-white/5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden border border-white/10">
          {otherUser.imageUrl ? (
            <img src={otherUser.imageUrl} alt={otherUser.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-700">
              <UserIcon size={20} />
            </div>
          )}
        </div>
        <div>
          <div className="font-black text-white uppercase tracking-widest text-xs">{otherUser.name}</div>
          <div className="text-[10px] text-neon-cyan font-black uppercase tracking-widest">
            {otherUser.role === 'trainer' ? t.auth.trainer : t.auth.client}
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-4 bg-black">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl text-[10px] font-black uppercase tracking-widest ${
              m.senderId === currentUser.id 
                ? 'bg-neon-cyan text-black rounded-br-none shadow-neon-cyan' 
                : 'bg-slate-900 text-neon-cyan rounded-bl-none border border-neon-cyan/20'
            }`}>
              {m.text}
              <div className="text-[8px] opacity-50 mt-1 text-right">
                {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-slate-900/50 border-t border-white/5 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={t.ai.typeMessage}
          className="flex-1 bg-black border border-slate-800 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest text-white focus:outline-none focus:border-neon-cyan transition-colors"
        />
        <button
          onClick={handleSend}
          className="bg-neon-cyan text-black p-2 rounded-xl hover:bg-white transition-colors shadow-neon-cyan"
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
};

export default Chat;

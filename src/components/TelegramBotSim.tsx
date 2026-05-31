import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, CheckCheck, Smile, Paperclip, MoreVertical, Mic, Keyboard, Info, HelpCircle } from 'lucide-react';
import { TelegramMessage, IoTState } from '../types';

interface TelegramBotSimProps {
  state: IoTState;
  messages: TelegramMessage[];
  onSendMessage: (text: string, isVoice?: boolean) => void;
  onClearHistory: () => void;
}

export const TelegramBotSim: React.FC<TelegramBotSimProps> = ({ state, messages, onSendMessage, onClearHistory }) => {
  const [inputText, setInputText] = useState('');
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom of chat when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const simulateAndSendVoice = (voiceCommand: string) => {
    onSendMessage(voiceCommand, true);
  };

  // Preset slash commands for easy clicking
  const slashCommands = [
    { cmd: '/start', desc: 'Menu Utama' },
    { cmd: '/status', desc: 'Monitor Seluruh' },
    { cmd: '/sensor', desc: 'Suhu & Kelembaban' },
    { cmd: '/lampu1_on', desc: 'Lampu 1 ON' },
    { cmd: '/lampu1_off', desc: 'Lampu 1 OFF' },
    { cmd: '/lampu2_on', desc: 'Lampu 2 ON' },
    { cmd: '/all_off', desc: 'Semua Relay OFF' },
  ];

  // Voice commands that can be simulated
  const voiceCommands = [
    'Nyalakan lampu 1',
    'Matikan lampu 1',
    'Berapa Temperatur',
    'Berapa Kelembapan',
    'Nyalakan Variasi 1',
    'Nyalakan Variasi 2',
    'Nyalakan semua lampu',
    'Matikan semua lampu'
  ];

  return (
    <div className="bg-white border-2 border-slate-900 rounded-none flex flex-col h-[650px] shadow-[6px_6px_0px_rgba(15,23,42,1)] overflow-hidden relative" id="telegram-simulator">
      {/* Background Telegram Classic Light Pattern */}
      <div className="absolute inset-0 bg-[#F1F5F9] opacity-100 pointer-events-none z-0" />
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] bg-[size:16px_16px] opacity-70 pointer-events-none z-0" />

      {/* Blue Header (Telegram Bar) */}
      <div className="bg-slate-900 text-white border-b-2 border-slate-900 px-4 py-3 flex items-center justify-between relative z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-none bg-amber-400 border-2 border-slate-900 flex items-center justify-center font-bold text-slate-900 text-lg shadow">
              🤖
            </div>
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-slate-900" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-sm tracking-tight text-white uppercase font-sans">Smart Home BOT</span>
              <span className="text-[9px] bg-amber-400 text-slate-900 border border-slate-900 font-mono font-black px-1.5 py-0.5 uppercase">bot</span>
            </div>
            <span className="text-[11px] text-emerald-400 font-mono">online • esp32_client active</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={onClearHistory}
            className="text-[10px] font-mono font-bold text-slate-900 border-2 border-slate-900 bg-white hover:bg-slate-50 px-2.5 py-1 rounded-none transition-colors"
          >
            Clear Chat
          </button>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-grow overflow-y-auto px-4 py-4 space-y-3 flex flex-col relative z-10">
        {messages.length === 0 ? (
          <div className="my-auto text-center max-w-xs mx-auto space-y-3 bg-white border-2 border-slate-900 p-5 rounded-none shadow-[4px_4px_0px_rgba(15,23,42,1)]">
            <div className="w-12 h-12 rounded-none bg-blue-100 border-2 border-slate-900 flex items-center justify-center text-slate-900 mx-auto text-xl font-bold">
              💬
            </div>
            <h5 className="text-xs font-black text-slate-900 uppercase tracking-wider">Telegram Bot Simulator</h5>
            <p className="text-[11px] text-slate-600 font-mono leading-relaxed">
              Bot ini simulasi chat C++ sketch ESP32 Anda. Silakan klik tombol di bawah atau ketik pesan Anda!
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={msg.id}
              className={`flex flex-col max-w-[85%] ${msg.sender === 'user' ? 'align-self-end ml-auto items-end' : 'align-self-start mr-auto items-start'}`}
            >
              {/* Sender label */}
              <span className="text-[10px] text-slate-500 font-mono font-bold mb-0.5 px-1 uppercase">
                {msg.sender === 'user' ? 'Anda' : 'Smart Home Bot'}
              </span>

              {/* Message bubble */}
              <div 
                className={`px-3.5 py-2.5 rounded-none text-xs leading-normal shadow-[3px_3px_0px_rgba(15,23,42,1)] whitespace-pre-wrap flex flex-col gap-1 border-2 border-slate-900 ${
                  msg.sender === 'user'
                    ? msg.isVoiceSim 
                      ? 'bg-emerald-100 text-slate-900'
                      : 'bg-indigo-100 text-slate-900' 
                    : 'bg-white text-slate-900'
                }`}
              >
                {msg.isVoiceSim && (
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-800 font-black mb-1 border-b-2 border-slate-900 pb-1 uppercase font-mono">
                    <Mic className="w-3 h-3 text-emerald-700 animate-pulse" />
                    <span>SUARA (SIMULASI)</span>
                  </div>
                )}
                
                {/* Format Telegram Markdown highlights if present */}
                <div className="font-sans">
                  {msg.text.split('\n').map((line, idx) => {
                    // Check bold markdown *bold*
                    const formatted = line.replace(/\*(.*?)\*/g, '$1');
                    return (
                      <div key={idx} className={line.startsWith('══') ? 'text-slate-400 text-[10px] font-mono' : 'font-medium'}>
                        {line}
                      </div>
                    );
                  })}
                </div>

                {/* Time stamp and double ticks */}
                <div className="flex items-center justify-end gap-1 text-[9px] text-slate-500 font-mono mt-1 select-none">
                  <span>{msg.timestamp}</span>
                  {msg.sender === 'user' && <CheckCheck className="w-3 h-3 text-blue-600" />}
                </div>
              </div>
            </motion.div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Slash Commands Quick Bars */}
      <div className="bg-slate-100 border-t-2 border-slate-900 p-2 shrink-0 relative z-10">
        <div className="flex items-center gap-1 mb-2 px-1">
          <Keyboard className="w-3.5 h-3.5 text-slate-900" />
          <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest font-mono">Quick Commands</span>
        </div>
        
        {/* Scrollable quick button lists */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {slashCommands.map((item, idx) => (
            <button
              key={idx}
              onClick={() => onSendMessage(item.cmd)}
              className="bg-white hover:bg-slate-50 text-slate-900 border-2 border-slate-900 text-[10px] font-bold px-2.5 py-1 rounded-none whitespace-nowrap transition-colors flex items-center gap-1.5 shadow-[2px_2px_0px_rgba(15,23,42,1)]"
            >
              <span className="font-black text-slate-900">{item.cmd}</span>
              <span className="text-slate-500 font-normal">{item.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Voice Command Simulator quick list */}
      <div className="bg-white border-t-2 border-slate-900 p-2 shrink-0 relative z-10">
        <div className="flex items-center gap-1 mb-2 px-1">
          <Mic className="w-3.5 h-3.5 text-slate-900" />
          <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest font-mono">SIMULATE VOICE SPEECH (ID)</span>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {voiceCommands.map((command, idx) => (
            <button
              key={idx}
              onClick={() => simulateAndSendVoice(command)}
              className="bg-emerald-50 hover:bg-emerald-100 text-slate-900 border-2 border-slate-900 text-[10px] font-black px-2.5 py-1 rounded-none whitespace-nowrap transition-colors flex items-center gap-1.5 shadow-[2px_2px_0px_rgba(15,23,42,1)]"
            >
              <Mic className="w-3 h-3 text-emerald-600 animate-pulse" />
              <span>"{command}"</span>
            </button>
          ))}
        </div>
      </div>

      {/* Input controls bottom */}
      <div className="bg-slate-100 border-t-2 border-slate-900 p-3 flex items-center gap-2 relative z-10 shrink-0">
        <button 
          onClick={() => setIsVoiceMode(!isVoiceMode)}
          className={`p-2 border-2 border-slate-900 rounded-none cursor-pointer transition-colors ${isVoiceMode ? 'bg-emerald-300 text-slate-900' : 'bg-white text-slate-900 hover:bg-slate-50'}`}
          title="Tukar Mode Input"
        >
          {isVoiceMode ? <Mic className="w-4 h-4 text-slate-900 animate-pulse" /> : <Keyboard className="w-4 h-4 text-slate-900" />}
        </button>

        <div className="relative flex-grow">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={isVoiceMode ? "Mulai bersuara dengan mengetuk perintah di atas..." : "Tulis perintah pesan di sini... (Contoh: /start)"}
            disabled={isVoiceMode}
            className="w-full bg-white text-slate-900 placeholder-slate-400 text-xs rounded-none px-4 py-2.5 outline-none border-2 border-slate-900 font-medium disabled:opacity-40"
          />
        </div>

        <button
          onClick={handleSend}
          disabled={!inputText.trim()}
          className="bg-amber-400 hover:bg-amber-300 border-2 border-slate-900 text-slate-900 p-2.5 rounded-none font-black cursor-pointer transition-colors disabled:opacity-45 disabled:cursor-not-allowed shadow-[2px_2px_0px_rgba(15,23,42,1)]"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, Cpu, Activity, Download, Radio
} from 'lucide-react';
import { IoTState, TelegramMessage } from './types';
import { HardwareSimulator } from './components/HardwareSimulator';
import { TelegramBotSim } from './components/TelegramBotSim';
import { WebDashboardSim } from './components/WebDashboardSim';
import { CodeViewer } from './components/CodeViewer';
import { HardwareControls } from './components/HardwareControls';
import { MQTTBridge } from './components/MQTTBridge';

// ================================================================
//  App.tsx — Smart Home IoT Simulator + MQTT Bridge
//  Sesuai dengan Azka_IoT.ino:
//    - Relay 1..4 (pin 25,26,27,14)
//    - DHT11 (pin 4)
//    - Telegram bot (token & chatId sama)
//    - Variasi 1 (relay 1&2 bergantian 500ms)
//    - Variasi 2 (relay 3&4 bergantian 700ms)
//    - Web server /relay?n=N&s=S, /all_on, /all_off, /variasi1_on, dll
//  + MQTT Bridge tab baru untuk koneksi ke hardware fisik
// ================================================================

export default function App() {
  // ── State global (sesuai IoTState di types.ts) ───────────────
  const [state, setState] = useState<IoTState>({
    temperature: 27.5,
    humidity: 62.0,
    relay1: false,
    relay2: false,
    relay3: false,
    relay4: false,
    variasi1: false,
    variasi2: false,
    wifiConnected: true,
    ipAddress: '192.168.1.135',
    botToken: '8894584427:AAGpWAZklMgGn7e4FZT-JfqCgjvAvGPN7V4',
    chatId: '6127805495',
    lastUpdateTime: '--:--:--',
  });

  // ── Tab aktif ─────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'simulator' | 'mqtt'>('simulator');

  // ── Pesan Telegram ────────────────────────────────────────────
  const [messages, setMessages] = useState<TelegramMessage[]>([{
    id: 'init-1',
    sender: 'bot',
    senderName: 'Smart Home BOT',
    text: '🚀 *Smart Home IoT Online!*\nIP: `192.168.1.135`\nKetik /start untuk menu.',
    timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  }]);

  const [showNotification, setShowNotification] = useState({ show: false, message: '' });
  const variasiToggleRef = useRef<boolean>(false);

  // ── Update jam setiap detik ───────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => {
      const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setState(prev => ({ ...prev, lastUpdateTime: timeStr }));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // ── Variasi 1: relay 1 & 2 bergantian 500ms (cocok dengan .ino) ──
  useEffect(() => {
    if (!state.variasi1) return;
    const t = setInterval(() => {
      variasiToggleRef.current = !variasiToggleRef.current;
      setState(prev => ({ ...prev, relay1: variasiToggleRef.current, relay2: !variasiToggleRef.current }));
    }, 500);
    return () => clearInterval(t);
  }, [state.variasi1]);

  // ── Variasi 2: relay 3 & 4 bergantian 700ms (cocok dengan .ino) ──
  useEffect(() => {
    if (!state.variasi2) return;
    const t = setInterval(() => {
      variasiToggleRef.current = !variasiToggleRef.current;
      setState(prev => ({ ...prev, relay3: variasiToggleRef.current, relay4: !variasiToggleRef.current }));
    }, 700);
    return () => clearInterval(t);
  }, [state.variasi2]);

  // ── Toast ─────────────────────────────────────────────────────
  const triggerToast = (msg: string) => {
    setShowNotification({ show: true, message: msg });
    setTimeout(() => setShowNotification({ show: false, message: '' }), 3000);
  };

  const handleUpdateState = (newState: Partial<IoTState>) => {
    setState(prev => ({ ...prev, ...newState }));
  };

  // ── Helper (sama dengan C++ di .ino) ─────────────────────────
  const getStatusEmoji = (s: boolean) => s ? "✅" : "❌";
  const getStatusText  = (s: boolean) => s ? "ON" : "OFF";

  // ── Tambah pesan bot dari MQTT (dipanggil MQTTBridge) ────────
  const handleAddBotMessage = useCallback((text: string) => {
    const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setMessages(prev => [...prev, { id: `mqtt-${Date.now()}`, sender: 'bot', senderName: 'Smart Home BOT', text, timestamp: timeStr }]);
    triggerToast('📡 Perintah MQTT diterima!');
  }, []);

  // ── Toggle relay dari klik fisik di simulator ─────────────────
  // Cocok dengan handleToggleRelayFromHardware di kode lama
  const handleToggleRelayFromHardware = (relayNum: number) => {
    if (!state.wifiConnected) { triggerToast('Board bermasalah: WiFi Terputus!'); return; }
    let resetVariasi = {};
    if ((relayNum === 1 || relayNum === 2) && state.variasi1) resetVariasi = { variasi1: false };
    if ((relayNum === 3 || relayNum === 4) && state.variasi2) resetVariasi = { variasi2: false };
    setState(prev => {
      const field = `relay${relayNum}` as keyof IoTState;
      const target = !prev[field];
      const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setTimeout(() => {
        setMessages(pm => [...pm, {
          id: `notif-${Date.now()}`, sender: 'bot', senderName: 'Smart Home BOT',
          text: `💡 *Lampu ${relayNum}*\nStatus: ${target ? "🟢 MENYALA" : "🔴 MATI"}\nWaktu: ${timeStr}`,
          timestamp: timeStr
        }]);
        triggerToast(`Telegram: Lampu ${relayNum} ${target ? 'Menyala' : 'Padam'}`);
      }, 300);
      return { ...prev, [field]: target, ...resetVariasi };
    });
  };

  // ── Set relay dari web dashboard (cocok dengan /relay?n=N&s=S) ──
  const handleSetRelayFromWeb = (relayNum: number, targetState: boolean) => {
    if (!state.wifiConnected) { triggerToast('Koneksi gagal: ESP32 offline!'); return; }
    let resetVariasi = {};
    if ((relayNum === 1 || relayNum === 2) && state.variasi1) resetVariasi = { variasi1: false };
    if ((relayNum === 3 || relayNum === 4) && state.variasi2) resetVariasi = { variasi2: false };
    setState(prev => {
      const field = `relay${relayNum}` as keyof IoTState;
      if (prev[field] !== targetState) {
        const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setTimeout(() => {
          setMessages(pm => [...pm, {
            id: `web-${Date.now()}`, sender: 'bot', senderName: 'Smart Home BOT',
            text: `💡 *Lampu ${relayNum}*\nStatus: ${targetState ? "🟢 MENYALA" : "🔴 MATI"}\nWaktu: ${timeStr}`,
            timestamp: timeStr
          }]);
          triggerToast(`Web: Lampu ${relayNum} ${targetState ? 'ON' : 'OFF'}`);
        }, 300);
      }
      return { ...prev, [field]: targetState, ...resetVariasi };
    });
  };

  // ── All ON/OFF (cocok dengan /all_on, /all_off) ───────────────
  const handleSetAllRelays = (targetState: boolean) => {
    const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setState(prev => ({ ...prev, relay1: targetState, relay2: targetState, relay3: targetState, relay4: targetState, variasi1: false, variasi2: false }));
    setTimeout(() => {
      setMessages(pm => [...pm, {
        id: `all-${Date.now()}`, sender: 'bot', senderName: 'Smart Home BOT',
        text: targetState ? '⚡ Semua lampu *MENYALA*! 💡💡💡💡' : '🔌 Semua lampu *MATI*!',
        timestamp: timeStr
      }]);
      triggerToast(targetState ? 'Semua lampu dinyalakan!' : 'Semua lampu dimatikan!');
    }, 200);
  };

  // ── Variasi ON/OFF dari web (cocok dengan /variasi1_on dll) ───
  const handleToggleVariasiFromWeb = (varNum: number, targetState: boolean) => {
    const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    if (varNum === 1) {
      setState(prev => ({ ...prev, variasi1: targetState, ...(targetState ? { variasi2: false, relay3: false, relay4: false } : { relay1: false, relay2: false }) }));
      setTimeout(() => setMessages(pm => [...pm, { id: `v1-${Date.now()}`, sender: 'bot', senderName: 'Smart Home BOT', text: targetState ? '✨ *Variasi 1 aktif!*\nLampu 1 & 2 bergantian menyala 🔄' : '⏹️ Variasi 1 *nonaktif*.', timestamp: timeStr }]), 250);
    } else {
      setState(prev => ({ ...prev, variasi2: targetState, ...(targetState ? { variasi1: false, relay1: false, relay2: false } : { relay3: false, relay4: false }) }));
      setTimeout(() => setMessages(pm => [...pm, { id: `v2-${Date.now()}`, sender: 'bot', senderName: 'Smart Home BOT', text: targetState ? '✨ *Variasi 2 aktif!*\nLampu 3 & 4 bergantian menyala 🔄' : '⏹️ Variasi 2 *nonaktif*.', timestamp: timeStr }]), 250);
    }
  };

  // ── Proses perintah Telegram (identik dengan handleTelegramMessages di .ino) ──
  const handleSendTelegramMessage = (text: string, isVoice: boolean = false) => {
    const userTs = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setMessages(prev => [...prev, { id: `user-${Date.now()}`, sender: 'user', senderName: 'Anda', text, timestamp: userTs, isVoiceSim: isVoice }]);
    if (!state.wifiConnected) {
      setTimeout(() => {
        const ts = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setMessages(prev => [...prev, { id: `offline-${Date.now()}`, sender: 'bot', senderName: 'Smart Home BOT', text: '⚠️ *Koneksi Gagal!*\nBot tidak mendapat respon dari ESP32 karena modul sedang Offline / Kehilangan jaringan.', timestamp: ts }]);
      }, 500);
      return;
    }
    setTimeout(() => {
      const botTs = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const tl = text.toLowerCase();
      let reply = '';
      if (text === '/start') {
        reply = "🏠 *Smart Home Control Panel*\n\n══════════════════\n💡 *Kontrol Lampu:*\n/lampu1\\_on - Nyalakan Lampu 1\n/lampu1\\_off - Matikan Lampu 1\n/lampu2\\_on - Nyalakan Lampu 2\n/lampu2\\_off - Matikan Lampu 2\n/lampu3\\_on - Nyalakan Lampu 3\n/lampu3\\_off - Matikan Lampu 3\n/lampu4\\_on - Nyalakan Lampu 4\n/lampu4\\_off - Matikan Lampu 4\n\n══════════════════\n🌡️ *Sensor:*\n/sensor - Suhu & Kelembaban\n\n══════════════════\n✨ *Variasi Lampu:*\n/variasi1\\_on - Nyalakan Variasi 1\n/variasi1\\_off - Matikan Variasi 1\n/variasi2\\_on - Nyalakan Variasi 2\n/variasi2\\_off - Matikan Variasi 2\n\n══════════════════\n⚡ *Lainnya:*\n/status - Lihat semua status\n/all\\_on - Nyalakan semua\n/all\\_off - Matikan semua";
      } else if (text === '/status') {
        reply = `📊 *Status Sistem Smart Home*\n\n══════════════════\n💡 *Relay / Lampu:*\n${getStatusEmoji(state.relay1)} Lampu 1: *${getStatusText(state.relay1)}*\n${getStatusEmoji(state.relay2)} Lampu 2: *${getStatusText(state.relay2)}*\n${getStatusEmoji(state.relay3)} Lampu 3: *${getStatusText(state.relay3)}*\n${getStatusEmoji(state.relay4)} Lampu 4: *${getStatusText(state.relay4)}*\n\n══════════════════\n🌡️ *Sensor DHT:*\nSuhu     : *${state.temperature.toFixed(1)} °C*\nKelembaban: *${state.humidity.toFixed(1)} %*\n\n══════════════════\n✨ *Variasi:*\n${state.variasi1 ? '✅' : '❌'} Variasi 1: ${state.variasi1 ? 'Aktif' : 'Nonaktif'}\n${state.variasi2 ? '✅' : '❌'} Variasi 2: ${state.variasi2 ? 'Aktif' : 'Nonaktif'}\n\n🕐 Update: ${botTs}`;
      } else if (text === '/sensor') {
        reply = `🌡️ *Data Sensor DHT*\n\nSuhu      : *${state.temperature.toFixed(1)} °C*\nKelembaban: *${state.humidity.toFixed(1)} %*\nWaktu     : ${botTs}`;
      } else if (text === '/lampu1_on')  { setState(p => ({...p, relay1: true,  variasi1: false})); reply = `💡 *Lampu 1*\nStatus: 🟢 MENYALA\nWaktu: ${botTs}`;
      } else if (text === '/lampu1_off') { setState(p => ({...p, relay1: false, variasi1: false})); reply = `💡 *Lampu 1*\nStatus: 🔴 MATI\nWaktu: ${botTs}`;
      } else if (text === '/lampu2_on')  { setState(p => ({...p, relay2: true,  variasi1: false})); reply = `💡 *Lampu 2*\nStatus: 🟢 MENYALA\nWaktu: ${botTs}`;
      } else if (text === '/lampu2_off') { setState(p => ({...p, relay2: false, variasi1: false})); reply = `💡 *Lampu 2*\nStatus: 🔴 MATI\nWaktu: ${botTs}`;
      } else if (text === '/lampu3_on')  { setState(p => ({...p, relay3: true,  variasi2: false})); reply = `💡 *Lampu 3*\nStatus: 🟢 MENYALA\nWaktu: ${botTs}`;
      } else if (text === '/lampu3_off') { setState(p => ({...p, relay3: false, variasi2: false})); reply = `💡 *Lampu 3*\nStatus: 🔴 MATI\nWaktu: ${botTs}`;
      } else if (text === '/lampu4_on')  { setState(p => ({...p, relay4: true,  variasi2: false})); reply = `💡 *Lampu 4*\nStatus: 🟢 MENYALA\nWaktu: ${botTs}`;
      } else if (text === '/lampu4_off') { setState(p => ({...p, relay4: false, variasi2: false})); reply = `💡 *Lampu 4*\nStatus: 🔴 MATI\nWaktu: ${botTs}`;
      } else if (text === '/all_on')  { setState(p => ({...p, relay1:true, relay2:true, relay3:true, relay4:true, variasi1:false, variasi2:false})); reply = '⚡ Semua lampu *MENYALA*! 💡💡💡💡';
      } else if (text === '/all_off') { setState(p => ({...p, relay1:false,relay2:false,relay3:false,relay4:false,variasi1:false,variasi2:false})); reply = '🔌 Semua lampu *MATI*!';
      } else if (text === '/variasi1_on')  { setState(p => ({...p, variasi1:true, variasi2:false, relay3:false, relay4:false})); reply = '✨ *Variasi 1 aktif!*\nLampu 1 & 2 bergantian menyala 🔄';
      } else if (text === '/variasi1_off') { setState(p => ({...p, variasi1:false, relay1:false, relay2:false})); reply = '⏹️ Variasi 1 *nonaktif*.';
      } else if (text === '/variasi2_on')  { setState(p => ({...p, variasi2:true, variasi1:false, relay1:false, relay2:false})); reply = '✨ *Variasi 2 aktif!*\nLampu 3 & 4 bergantian menyala 🔄';
      } else if (text === '/variasi2_off') { setState(p => ({...p, variasi2:false, relay3:false, relay4:false})); reply = '⏹️ Variasi 2 *nonaktif*.';
      } else if (tl.indexOf("nyalakan lampu") >= 0 || tl.indexOf("hidupkan lampu") >= 0) {
        if      (tl.indexOf("1") >= 0) { setState(p => ({...p, relay1:true,  variasi1:false})); reply = "🗣️ Lampu 1 *dinyalakan* ✅"; }
        else if (tl.indexOf("2") >= 0) { setState(p => ({...p, relay2:true,  variasi1:false})); reply = "🗣️ Lampu 2 *dinyalakan* ✅"; }
        else if (tl.indexOf("3") >= 0) { setState(p => ({...p, relay3:true,  variasi2:false})); reply = "🗣️ Lampu 3 *dinyalakan* ✅"; }
        else if (tl.indexOf("4") >= 0) { setState(p => ({...p, relay4:true,  variasi2:false})); reply = "🗣️ Lampu 4 *dinyalakan* ✅"; }
        else { setState(p => ({...p, relay1:true,relay2:true,relay3:true,relay4:true,variasi1:false,variasi2:false})); reply = "🗣️ Semua lampu *dinyalakan* ✅"; }
      } else if (tl.indexOf("matikan lampu") >= 0 || tl.indexOf("padamkan lampu") >= 0) {
        if      (tl.indexOf("1") >= 0) { setState(p => ({...p, relay1:false, variasi1:false})); reply = "🗣️ Lampu 1 *dimatikan* ❌"; }
        else if (tl.indexOf("2") >= 0) { setState(p => ({...p, relay2:false, variasi1:false})); reply = "🗣️ Lampu 2 *dimatikan* ❌"; }
        else if (tl.indexOf("3") >= 0) { setState(p => ({...p, relay3:false, variasi2:false})); reply = "🗣️ Lampu 3 *dimatikan* ❌"; }
        else if (tl.indexOf("4") >= 0) { setState(p => ({...p, relay4:false, variasi2:false})); reply = "🗣️ Lampu 4 *dimatikan* ❌"; }
        else { setState(p => ({...p, relay1:false,relay2:false,relay3:false,relay4:false,variasi1:false,variasi2:false})); reply = "🗣️ Semua lampu *dimatikan* ❌"; }
      } else if (tl.indexOf("berapa temperatur") >= 0 || tl.indexOf("berapa suhu") >= 0 || tl.indexOf("cek suhu") >= 0) {
        reply = `🗣️ 🌡️ Suhu saat ini: *${state.temperature.toFixed(1)} °C*`;
      } else if (tl.indexOf("berapa kelembapan") >= 0 || tl.indexOf("berapa kelembaban") >= 0 || tl.indexOf("cek kelembaban") >= 0) {
        reply = `🗣️ 💧 Kelembaban saat ini: *${state.humidity.toFixed(1)} %*`;
      } else if (tl.indexOf("nyalakan variasi 1") >= 0) {
        setState(p => ({...p, variasi1:true, variasi2:false, relay3:false, relay4:false})); reply = "🗣️ ✨ *Variasi 1* aktif!";
      } else if (tl.indexOf("nyalakan variasi 2") >= 0) {
        setState(p => ({...p, variasi2:true, variasi1:false, relay1:false, relay2:false})); reply = "🗣️ ✨ *Variasi 2* aktif!";
      } else {
        reply = "❓ Perintah tidak dikenal.\nKetik /start untuk melihat menu.";
      }
      setMessages(prev => [...prev, { id: `bot-${Date.now()}`, sender: 'bot', senderName: 'Smart Home BOT', text: reply, timestamp: botTs }]);
      triggerToast('Telegram Command Berhasil Diproses!');
    }, 450);
  };

  const clearChatHistory = () => { setMessages([]); triggerToast('Riwayat chat dibersihkan.'); };

  const handleResetBoard = () => {
    setState(prev => ({ ...prev, temperature: 28.0, humidity: 60.0, relay1: false, relay2: false, relay3: false, relay4: false, variasi1: false, variasi2: false, wifiConnected: true }));
    triggerToast('Board ESP32 berhasil di-hard reset!');
  };

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-900 py-8 px-4 sm:px-6 lg:px-8 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] bg-[size:24px_24px]">

      {/* Toast */}
      <AnimatePresence>
        {showNotification.show && (
          <motion.div initial={{ opacity: 0, y: -55 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -55 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-white border-2 border-slate-900 px-5 py-3 rounded-none shadow-[4px_4px_0px_rgba(15,23,42,1)] flex items-center gap-3">
            <Activity className="w-4 h-4 text-slate-900 animate-pulse shrink-0" />
            <span className="text-xs font-mono font-black text-slate-900 uppercase tracking-widest">{showNotification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white border-2 border-slate-900 p-6 rounded-none shadow-[6px_6px_0px_rgba(15,23,42,1)] relative overflow-hidden">
          <div className="space-y-1 z-10">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-400 opacity-75"></span>
                <span className="relative inline-flex rounded-none h-2.5 w-2.5 bg-slate-900"></span>
              </span>
              <span className="text-[10px] text-slate-500 tracking-widest font-mono font-black uppercase">IoT Practical Quiz Sandbox</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2 uppercase font-sans tracking-tight">
              <Home className="w-6 h-6 text-slate-900" />
              Smart Home IoT - ESP32 Virtual Simulator
            </h1>
            <p className="text-xs text-slate-600 max-w-2xl font-mono leading-relaxed">
              Platform simulasi interaktif yang dirancang khusus menyelaraskan dengan <strong className="text-slate-950 font-black uppercase">source-code Arduino C++ Anda</strong>. Hubungkan Telegram chat, manipulasi sensor DHT, kontrol 4 relay, dan monitor web server lokal dalam satu visualizer terpadu.
            </p>
          </div>
          <div className="flex gap-2 z-10 shrink-0">
            <a href="#code-viewer-panel"
              className="bg-amber-400 hover:bg-amber-300 text-slate-900 border-2 border-slate-900 text-xs px-4 py-2.5 font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-[2px_2px_0px_rgba(15,23,42,1)] active:shadow-none active:translate-y-[2px]">
              <Download className="w-4 h-4" /> Lihat & Salin Kode Kuis
            </a>
          </div>
        </div>

        {/* ── Tab Navigator ──────────────────────────────────────── */}
        <div className="flex gap-0 border-b-2 border-slate-900">
          <button onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-2 px-6 py-3 text-xs font-black border-2 border-b-0 border-slate-900 -mb-0.5 transition-all ${activeTab === 'simulator' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}>
            <Cpu className="w-3.5 h-3.5" /> Simulator
          </button>
          <button onClick={() => setActiveTab('mqtt')}
            className={`flex items-center gap-2 px-6 py-3 text-xs font-black border-2 border-b-0 border-slate-900 -mb-0.5 ml-1 transition-all ${activeTab === 'mqtt' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}>
            <Radio className="w-3.5 h-3.5" />
            MQTT Bridge
            <span className="bg-sky-500 text-white text-[9px] font-mono px-1.5 py-0.5 tracking-wider">KONEKSI ESP32</span>
          </button>
        </div>

        {/* ── Panel Simulator ────────────────────────────────────── */}
        {activeTab === 'simulator' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 flex flex-col gap-8">
              <HardwareSimulator state={state} onToggleRelay={handleToggleRelayFromHardware} />
              <WebDashboardSim
                state={state}
                onToggleRelay={handleSetRelayFromWeb}
                onSetAllRelays={handleSetAllRelays}
                onToggleVariasi={handleToggleVariasiFromWeb}
                onRefresh={() => triggerToast('Sinkronisasi web dashboard diperbarui.')}
              />
            </div>
            <div className="lg:col-span-4 flex flex-col gap-8">
              <TelegramBotSim state={state} messages={messages} onSendMessage={handleSendTelegramMessage} onClearHistory={clearChatHistory} />
              <HardwareControls state={state} onStateChange={handleUpdateState} onReset={handleResetBoard} />
            </div>
          </div>
        )}

        {/* ── Panel MQTT Bridge ──────────────────────────────────── */}
        {activeTab === 'mqtt' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8">
              <MQTTBridge
                state={state}
                onStateChange={handleUpdateState}
                onAddBotMessage={handleAddBotMessage}
              />
            </div>
            <div className="lg:col-span-4 flex flex-col gap-6">
              {/* Status relay realtime */}
              <div className="bg-white border-2 border-slate-900 shadow-[4px_4px_0px_rgba(15,23,42,1)] p-5">
                <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase mb-4">Status Relay Realtime</p>
                <div className="space-y-2">
                  {[1,2,3,4].map(n => {
                    const on = state[`relay${n}` as keyof IoTState] as boolean;
                    return (
                      <div key={n} className={`flex items-center justify-between px-3 py-2 border-2 border-slate-900 ${on ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                        <span className="text-xs font-black text-slate-700">Lampu {n}</span>
                        <span className={`text-[10px] font-black px-2 py-0.5 border border-slate-900 ${on ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>{on ? '● ON' : '○ OFF'}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 pt-4 border-t-2 border-slate-200 space-y-1.5">
                  <div className="flex justify-between text-xs"><span className="text-slate-500 font-mono">Suhu</span><span className="font-black">{state.temperature.toFixed(1)} °C</span></div>
                  <div className="flex justify-between text-xs"><span className="text-slate-500 font-mono">Kelembaban</span><span className="font-black">{state.humidity.toFixed(1)} %</span></div>
                  <div className="flex justify-between text-xs"><span className="text-slate-500 font-mono">Variasi 1</span><span className={`font-black ${state.variasi1 ? 'text-emerald-600' : 'text-slate-400'}`}>{state.variasi1 ? 'Aktif' : 'Nonaktif'}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-slate-500 font-mono">Variasi 2</span><span className={`font-black ${state.variasi2 ? 'text-emerald-600' : 'text-slate-400'}`}>{state.variasi2 ? 'Aktif' : 'Nonaktif'}</span></div>
                </div>
              </div>
              {/* Telegram mini tetap tampil di tab MQTT */}
              <TelegramBotSim state={state} messages={messages} onSendMessage={handleSendTelegramMessage} onClearHistory={clearChatHistory} />
            </div>
          </div>
        )}

        {/* Source Code Viewer */}
        <div className="pt-4"><CodeViewer /></div>

        {/* Footer */}
        <div className="text-center text-[11px] text-slate-600 font-mono py-4 border-t-2 border-slate-900 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>Smart Home IoT Project Sandbox © 2026</span>
          <span className="flex items-center gap-1.5 text-slate-700">
            <Radio className="w-3.5 h-3.5 text-slate-900 animate-pulse" />
            Teruji penuh di NodeMCU ESP8266 & ESP32 DevKit v1
          </span>
        </div>

      </div>
    </div>
  );
}

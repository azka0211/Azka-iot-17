import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, 
  Smartphone, 
  Cpu, 
  Terminal, 
  Wifi, 
  ShieldCheck, 
  Layers, 
  Activity, 
  Bot, 
  AlertTriangle, 
  Download, 
  HelpCircle,
  Lightbulb,
  Radio
} from 'lucide-react';
import { IoTState, TelegramMessage } from './types';
import { HardwareSimulator } from './components/HardwareSimulator';
import { TelegramBotSim } from './components/TelegramBotSim';
import { WebDashboardSim } from './components/WebDashboardSim';
import { CodeViewer } from './components/CodeViewer';
import { HardwareControls } from './components/HardwareControls';

export default function App() {
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

  const [messages, setMessages] = useState<TelegramMessage[]>([
    {
      id: 'init-1',
      sender: 'bot',
      senderName: 'Smart Home BOT',
      text: '🚀 *Smart Home IoT Online!*\nIP: `192.168.1.135`\nKetik /start untuk menu.',
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    }
  ]);

  const [showNotification, setShowNotification] = useState<{show: boolean, message: string}>({
    show: false,
    message: ''
  });

  // Keep track of variasi state index for toggling
  const variasiToggleRef = useRef<boolean>(false);

  // Time ticks update
  useEffect(() => {
    const timer = setInterval(() => {
      const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setState(prev => ({
        ...prev,
        lastUpdateTime: timeStr
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Mode Variasi 1: Relay 1 & 2 bergantian tiap 500ms
  useEffect(() => {
    if (!state.variasi1) return;

    const interval = setInterval(() => {
      variasiToggleRef.current = !variasiToggleRef.current;
      setState(prev => ({
        ...prev,
        relay1: variasiToggleRef.current,
        relay2: !variasiToggleRef.current
      }));
    }, 500);

    return () => clearInterval(interval);
  }, [state.variasi1]);

  // Mode Variasi 2: Relay 3 & 4 bergantian tiap 700ms
  useEffect(() => {
    if (!state.variasi2) return;

    const interval = setInterval(() => {
      variasiToggleRef.current = !variasiToggleRef.current;
      setState(prev => ({
        ...prev,
        relay3: variasiToggleRef.current,
        relay4: !variasiToggleRef.current
      }));
    }, 700);

    return () => clearInterval(interval);
  }, [state.variasi2]);

  const [sliderTemp, setSliderTemp] = useState<number>(27.5);
  const [sliderHum, setSliderHum] = useState<number>(62.0);
  const [isDhtReading, setIsDhtReading] = useState<boolean>(false);
  const [dhtLogs, setDhtLogs] = useState<Array<{ time: string; temp: number; hum: number; status: string }>>([]);

  // Simulasi pembacaan data sensor DHT11 berkala secara real-time (setiap 4 detik)
  useEffect(() => {
    let active = true;
    const intervalId = setInterval(() => {
      if (!state.wifiConnected) return;

      // Nyalakan indikator active reading (pulse/flash di UI)
      setIsDhtReading(true);

      setTimeout(() => {
        if (!active) return;
        setIsDhtReading(false);

        // Hitung nilai fluktuasi alami di sekitar target slider (drift sine wave + micro-noise)
        const timeAccent = Date.now() / 6000;
        const driftT = Math.sin(timeAccent) * 0.2 + (Math.random() * 0.08 - 0.04);
        const driftH = Math.cos(timeAccent) * 0.4 + (Math.random() * 0.16 - 0.08);

        const currentT = parseFloat((sliderTemp + driftT).toFixed(1));
        const currentH = parseFloat((sliderHum + driftH).toFixed(1));

        const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        // Update state
        setState(prev => ({
          ...prev,
          temperature: currentT,
          humidity: currentH
        }));

        // Log reading event ke stream logger
        setDhtLogs(prevLogs => {
          const nextLogs = [
            ...prevLogs,
            {
              time: timeStr,
              temp: currentT,
              hum: currentH,
              status: `Sukses membaca data sensor GPIO4: Suhu ${currentT}°C | Lembab ${currentH}%`
            }
          ];
          return nextLogs.slice(-15); // limit ke 15 baris logs paling baru
        });
      }, 600); // Durasi pulse visual bacaan sensor selama 600ms
    }, 4000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [state.wifiConnected, sliderTemp, sliderHum]);

  // Toast notification system helper
  const triggerToast = (msg: string) => {
    setShowNotification({ show: true, message: msg });
    setTimeout(() => {
      setShowNotification({ show: false, message: '' });
    }, 3000);
  };

  // State Mutator helper for hardware
  const handleUpdateState = (newState: Partial<IoTState>) => {
    if (newState.temperature !== undefined) {
      setSliderTemp(newState.temperature);
    }
    if (newState.humidity !== undefined) {
      setSliderHum(newState.humidity);
    }
    setState(prev => ({ ...prev, ...newState }));
  };

  // Helper inside ESP32 code to get emojis for states
  const getStatusEmoji = (s: boolean) => s ? "✅" : "❌";
  const getStatusText = (s: boolean) => s ? "ON" : "OFF";

  // Simulate set single relay - matching `setRelay` behavior in ESP32
  const handleToggleRelayFromHardware = (relayNum: number) => {
    if (!state.wifiConnected) {
      triggerToast('Board bermasalah: WiFi Terputus!');
      return;
    }

    // Deactivate variasi if changing corresponding relays
    let isVariasiAffect = false;
    let newVariasiState = {};
    if (relayNum === 1 || relayNum === 2) {
      if (state.variasi1) {
        newVariasiState = { variasi1: false };
        isVariasiAffect = true;
      }
    }
    if (relayNum === 3 || relayNum === 4) {
      if (state.variasi2) {
        newVariasiState = { variasi2: false };
        isVariasiAffect = true;
      }
    }

    setState(prev => {
      const field = `relay${relayNum}` as keyof IoTState;
      const targetState = !prev[field];
      
      // Send bot telegram notification exactly matches C++ "sendRelayNotification"
      const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const botMsg = `💡 *Lampu ${relayNum}*\nStatus: ${targetState ? "🟢 MENYALA" : "🔴 MATI"}\nWaktu: ${timeStr}`;
      
      // Delay appending notification message slightly
      setTimeout(() => {
        setMessages(prevMsgs => [
          ...prevMsgs,
          {
            id: `notif-${Date.now()}`,
            sender: 'bot',
            senderName: 'Smart Home BOT',
            text: botMsg,
            timestamp: timeStr
          }
        ]);
        triggerToast(`Telegram Notifikasi Dikirim: Lampu ${relayNum} ${targetState ? 'Menyala' : 'Padam'}`);
      }, 300);

      return {
        ...prev,
        [field]: targetState,
        ...newVariasiState
      };
    });
  };

  // Toggle relay specifically from Web Interface (ON/OFF buttons)
  const handleSetRelayFromWeb = (relayNum: number, targetState: boolean) => {
    if (!state.wifiConnected) {
      triggerToast('Koneksi gagal: ESP32 offline!');
      return;
    }

    let resetVariasi = {};
    if ((relayNum === 1 || relayNum === 2) && state.variasi1) {
      resetVariasi = { variasi1: false };
    }
    if ((relayNum === 3 || relayNum === 4) && state.variasi2) {
      resetVariasi = { variasi2: false };
    }

    setState(prev => {
      const field = `relay${relayNum}` as keyof IoTState;
      
      // Trigger Bot Notification if state changes
      if (prev[field] !== targetState) {
        const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const botMsg = `💡 *Lampu ${relayNum}*\nStatus: ${targetState ? "🟢 MENYALA" : "🔴 MATI"}\nWaktu: ${timeStr}`;
        
        setTimeout(() => {
          setMessages(prevMsgs => [
            ...prevMsgs,
            {
              id: `notif-web-${Date.now()}`,
              sender: 'bot',
              senderName: 'Smart Home BOT',
              text: botMsg,
              timestamp: timeStr
            }
          ]);
          triggerToast(`Web Control: Lampu ${relayNum} diset ${targetState ? 'ON' : 'OFF'}`);
        }, 300);
      }

      return {
        ...prev,
        [field]: targetState,
        ...resetVariasi
      };
    });
  };

  // Toggle all relays
  const handleSetAllRelays = (targetState: boolean) => {
    const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    setState(prev => ({
      ...prev,
      relay1: targetState,
      relay2: targetState,
      relay3: targetState,
      relay4: targetState,
      variasi1: false,
      variasi2: false
    }));

    const botMsg = targetState 
      ? '⚡ Semua lampu *MENYALA*! 💡💡💡💡' 
      : '🔌 Semua lampu *MATI*!';

    setTimeout(() => {
      setMessages(prevMsgs => [
        ...prevMsgs,
        {
          id: `all-relays-${Date.now()}`,
          sender: 'bot',
          senderName: 'Smart Home BOT',
          text: botMsg,
          timestamp: timeStr
        }
      ]);
      triggerToast(targetState ? 'Semua lampu dinyalakan!' : 'Semua lampu dimatikan!');
    }, 200);
  };

  // Toggle Variasi modes from Web Dashboard
  const handleToggleVariasiFromWeb = (varNum: number, targetState: boolean) => {
    const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    if (varNum === 1) {
      setState(prev => ({
        ...prev,
        variasi1: targetState,
        ...(targetState ? { variasi2: false, relay3: false, relay4: false } : { relay1: false, relay2: false })
      }));

      const botMsg = targetState 
        ? '✨ *Variasi 1 aktif!*\nLampu 1 & 2 bergantian menyala 🔄'
        : '⏹️ Variasi 1 *nonaktif*.';

      setTimeout(() => {
        setMessages(prevMsgs => [
          ...prevMsgs,
          {
            id: `v1-web-${Date.now()}`,
            sender: 'bot',
            senderName: 'Smart Home BOT',
            text: botMsg,
            timestamp: timeStr
          }
        ]);
      }, 250);
    } else {
      setState(prev => ({
        ...prev,
        variasi2: targetState,
        ...(targetState ? { variasi1: false, relay1: false, relay2: false } : { relay3: false, relay4: false })
      }));

      const botMsg = targetState
        ? '✨ *Variasi 2 aktif!*\nLampu 3 & 4 bergantian menyala 🔄'
        : '⏹️ Variasi 2 *nonaktif*.';

      setTimeout(() => {
        setMessages(prevMsgs => [
          ...prevMsgs,
          {
            id: `v2-web-${Date.now()}`,
            sender: 'bot',
            senderName: 'Smart Home BOT',
            text: botMsg,
            timestamp: timeStr
          }
        ]);
      }, 250);
    }
  };

  // Telegram messaging handler - replicates parsing inside `handleTelegramMessages` of ESP32 code
  const handleSendTelegramMessage = (text: string, isVoice: boolean = false) => {
    const userTimestamp = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    // 1. Add user message
    const userMsgId = `user-${Date.now()}`;
    const newUserMsg: TelegramMessage = {
      id: userMsgId,
      sender: 'user',
      senderName: 'Anda',
      text: text,
      timestamp: userTimestamp,
      isVoiceSim: isVoice
    };

    setMessages(prev => [...prev, newUserMsg]);

    if (!state.wifiConnected) {
      setTimeout(() => {
        const botTimestamp = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setMessages(prev => [
          ...prev,
          {
            id: `bot-offline-${Date.now()}`,
            sender: 'bot',
            senderName: 'Smart Home BOT',
            text: '⚠️ *Koneksi Gagal!*\nBot tidak mendapat respon dari ESP32 karena modul sedang Offline / Kehilangan jaringan.',
            timestamp: botTimestamp
          }
        ]);
      }, 500);
      return;
    }

    // 2. Process message using exactly lowerCase/indexes defined in C++ code
    setTimeout(() => {
      const botTimestamp = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const textLower = text.toLowerCase();
      let replyText = '';

      // Direct checks
      if (text === '/start') {
        replyText = "🏠 *Smart Home Control Panel*\n\n══════════════════\n💡 *Kontrol Lampu:*\n/lampu1\\_on - Nyalakan Lampu 1\n/lampu1\\_off - Matikan Lampu 1\n/lampu2\\_on - Nyalakan Lampu 2\n/lampu2\\_off - Matikan Lampu 2\n/lampu3\\_on - Nyalakan Lampu 3\n/lampu3\\_off - Matikan Lampu 3\n/lampu4\\_on - Nyalakan Lampu 4\n/lampu4\\_off - Matikan Lampu 4\n\n══════════════════\n🌡️ *Sensor:*\n/sensor - Suhu & Kelembaban\n\n══════════════════\n✨ *Variasi Lampu:*\n/variasi1\\_on - Nyalakan Variasi 1\n/variasi1\\_off - Matikan Variasi 1\n/variasi2\\_on - Nyalakan Variasi 2\n/variasi2\\_off - Matikan Variasi 2\n\n══════════════════\n⚡ *Lainnya:*\n/status - Lihat semua status\n/all\\_on - Nyalakan semua\n/all\\_off - Matikan semua";

      } else if (text === '/status') {
        replyText = `📊 *Status Sistem Smart Home*\n\n══════════════════\n💡 *Relay / Lampu:*\n${getStatusEmoji(state.relay1)} Lampu 1: *${getStatusText(state.relay1)}*\n${getStatusEmoji(state.relay2)} Lampu 2: *${getStatusText(state.relay2)}*\n${getStatusEmoji(state.relay3)} Lampu 3: *${getStatusText(state.relay3)}*\n${getStatusEmoji(state.relay4)} Lampu 4: *${getStatusText(state.relay4)}*\n\n══════════════════\n🌡️ *Sensor DHT:*\nSuhu     : *${state.temperature.toFixed(1)} °C*\nKelembaban: *${state.humidity.toFixed(1)} %*\n\n══════════════════\n✨ *Variasi:*\n${state.variasi1 ? '✅' : '❌'} Variasi 1: ${state.variasi1 ? 'Aktif' : 'Nonaktif'}\n${state.variasi2 ? '✅' : '❌'} Variasi 2: ${state.variasi2 ? 'Aktif' : 'Nonaktif'}\n\n🕐 Update: ${botTimestamp}`;

      } else if (text === '/sensor') {
        replyText = `🌡️ *Data Sensor DHT*\n\nSuhu      : *${state.temperature.toFixed(1)} °C*\nKelembaban: *${state.humidity.toFixed(1)} %*\nWaktu     : ${botTimestamp}`;

      } else if (text === '/lampu1_on') {
        setState(prev => ({ ...prev, relay1: true, variasi1: false }));
        replyText = `💡 *Lampu 1*\nStatus: 🟢 MENYALA\nWaktu: ${botTimestamp}`;

      } else if (text === '/lampu1_off') {
        setState(prev => ({ ...prev, relay1: false, variasi1: false }));
        replyText = `💡 *Lampu 1*\nStatus: 🔴 MATI\nWaktu: ${botTimestamp}`;

      } else if (text === '/lampu2_on') {
        setState(prev => ({ ...prev, relay2: true, variasi1: false }));
        replyText = `💡 *Lampu 2*\nStatus: 🟢 MENYALA\nWaktu: ${botTimestamp}`;

      } else if (text === '/lampu2_off') {
        setState(prev => ({ ...prev, relay2: false, variasi1: false }));
        replyText = `💡 *Lampu 2*\nStatus: 🔴 MATI\nWaktu: ${botTimestamp}`;

      } else if (text === '/lampu3_on') {
        setState(prev => ({ ...prev, relay3: true, variasi2: false }));
        replyText = `💡 *Lampu 3*\nStatus: 🟢 MENYALA\nWaktu: ${botTimestamp}`;

      } else if (text === '/lampu3_off') {
        setState(prev => ({ ...prev, relay3: false, variasi2: false }));
        replyText = `💡 *Lampu 3*\nStatus: 🔴 MATI\nWaktu: ${botTimestamp}`;

      } else if (text === '/lampu4_on') {
        setState(prev => ({ ...prev, relay4: true, variasi2: false }));
        replyText = `💡 *Lampu 4*\nStatus: 🟢 MENYALA\nWaktu: ${botTimestamp}`;

      } else if (text === '/lampu4_off') {
        setState(prev => ({ ...prev, relay4: false, variasi2: false }));
        replyText = `💡 *Lampu 4*\nStatus: 🔴 MATI\nWaktu: ${botTimestamp}`;

      } else if (text === '/all_on') {
        setState(prev => ({ ...prev, relay1: true, relay2: true, relay3: true, relay4: true, variasi1: false, variasi2: false }));
        replyText = '⚡ Semua lampu *MENYALA*! 💡💡💡💡';

      } else if (text === '/all_off') {
        setState(prev => ({ ...prev, relay1: false, relay2: false, relay3: false, relay4: false, variasi1: false, variasi2: false }));
        replyText = '🔌 Semua lampu *MATI*!';

      } else if (text === '/variasi1_on') {
        setState(prev => ({ ...prev, variasi1: true, variasi2: false, relay3: false, relay4: false }));
        replyText = '✨ *Variasi 1 aktif!*\nLampu 1 & 2 bergantian menyala 🔄';

      } else if (text === '/variasi1_off') {
        setState(prev => ({ ...prev, variasi1: false, relay1: false, relay2: false }));
        replyText = '⏹️ Variasi 1 *nonaktif*.';

      } else if (text === '/variasi2_on') {
        setState(prev => ({ ...prev, variasi2: true, variasi1: false, relay1: false, relay2: false }));
        replyText = '✨ *Variasi 2 aktif!*\nLampu 3 & 4 bergantian menyala 🔄';

      } else if (text === '/variasi2_off') {
        setState(prev => ({ ...prev, variasi2: false, relay3: false, relay4: false }));
        replyText = '⏹️ Variasi 2 *nonaktif*.';

      // VOICES / TEXT SUBSTRING CHECKS (Exactly as C++ code does)
      } else if (textLower.indexOf("nyalakan lampu") >= 0 || textLower.indexOf("hidupkan lampu") >= 0) {
        if (textLower.indexOf("1") >= 0) {
          setState(prev => ({ ...prev, relay1: true, variasi1: false }));
          replyText = "🗣️ Lampu 1 *dinyalakan* ✅";
        } else if (textLower.indexOf("2") >= 0) {
          setState(prev => ({ ...prev, relay2: true, variasi1: false }));
          replyText = "🗣️ Lampu 2 *dinyalakan* ✅";
        } else if (textLower.indexOf("3") >= 0) {
          setState(prev => ({ ...prev, relay3: true, variasi2: false }));
          replyText = "🗣️ Lampu 3 *dinyalakan* ✅";
        } else if (textLower.indexOf("4") >= 0) {
          setState(prev => ({ ...prev, relay4: true, variasi2: false }));
          replyText = "🗣️ Lampu 4 *dinyalakan* ✅";
        } else {
          // Turn everything on
          setState(prev => ({ ...prev, relay1: true, relay2: true, relay3: true, relay4: true, variasi1: false, variasi2: false }));
          replyText = "🗣️ Semua lampu *dinyalakan* ✅";
        }

      } else if (textLower.indexOf("matikan lampu") >= 0 || textLower.indexOf("padamkan lampu") >= 0) {
        if (textLower.indexOf("1") >= 0) {
          setState(prev => ({ ...prev, relay1: false, variasi1: false }));
          replyText = "🗣️ Lampu 1 *dimatikan* ❌";
        } else if (textLower.indexOf("2") >= 0) {
          setState(prev => ({ ...prev, relay2: false, variasi1: false }));
          replyText = "🗣️ Lampu 2 *dimatikan* ❌";
        } else if (textLower.indexOf("3") >= 0) {
          setState(prev => ({ ...prev, relay3: false, variasi2: false }));
          replyText = "🗣️ Lampu 3 *dimatikan* ❌";
        } else if (textLower.indexOf("4") >= 0) {
          setState(prev => ({ ...prev, relay4: false, variasi2: false }));
          replyText = "🗣️ Lampu 4 *dimatikan* ❌";
        } else {
          // Turn everything off
          setState(prev => ({ ...prev, relay1: false, relay2: false, relay3: false, relay4: false, variasi1: false, variasi2: false }));
          replyText = "🗣️ Semua lampu *dimatikan* ❌";
        }

      } else if (textLower.indexOf("berapa temperatur") >= 0 || textLower.indexOf("berapa suhu") >= 0 || textLower.indexOf("cek suhu") >= 0) {
        replyText = `🗣️ 🌡️ Suhu saat ini: *${state.temperature.toFixed(1)} °C*`;

      } else if (textLower.indexOf("berapa kelembapan") >= 0 || textLower.indexOf("berapa kelembaban") >= 0 || textLower.indexOf("cek kelembaban") >= 0) {
        replyText = `🗣️ 💧 Kelembaban saat ini: *${state.humidity.toFixed(1)} %*`;

      } else if (textLower.indexOf("nyalakan variasi 1") >= 0) {
        setState(prev => ({ ...prev, variasi1: true, variasi2: false, relay3: false, relay4: false }));
        replyText = "🗣️ ✨ *Variasi 1* aktif!";

      } else if (textLower.indexOf("nyalakan variasi 2") >= 0) {
        setState(prev => ({ ...prev, variasi2: true, variasi1: false, relay1: false, relay2: false }));
        replyText = "🗣️ ✨ *Variasi 2* aktif!";

      } else {
        replyText = "❓ Perintah tidak dikenal.\nKetik /start untuk melihat menu.";
      }

      // Add Bot reply
      setMessages(prev => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          senderName: 'Smart Home BOT',
          text: replyText,
          timestamp: botTimestamp
        }
      ]);

      triggerToast('Telegram Command Berhasil Diproses!');
    }, 450);
  };

  const clearChatHistory = () => {
    setMessages([]);
    triggerToast('Riwayat chat dibersihkan.');
  };

  const handleResetBoard = () => {
    setSliderTemp(28.0);
    setSliderHum(60.0);
    setDhtLogs([]);
    setState(prev => ({
      ...prev,
      temperature: 28.0,
      humidity: 60.0,
      relay1: false,
      relay2: false,
      relay3: false,
      relay4: false,
      variasi1: false,
      variasi2: false,
      wifiConnected: true
    }));
    triggerToast('Board ESP32 berhasil di-hard reset!');
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-900 py-8 px-4 sm:px-6 lg:px-8 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] bg-[size:24px_24px]">
      {/* Dynamic Alert Banner */}
      <AnimatePresence>
        {showNotification.show && (
          <motion.div
            initial={{ opacity: 0, y: -55 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -55 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-55 bg-white border-2 border-slate-900 px-5 py-3 rounded-none shadow-[4px_4px_0px_rgba(15,23,42,1)] flex items-center gap-3"
          >
            <Activity className="w-4 h-4 text-slate-900 animate-pulse shrink-0" />
            <span className="text-xs font-mono font-black text-slate-900 uppercase tracking-widest">{showNotification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Welcome Section */}
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
            <a 
              href="#code-viewer-panel" 
              className="bg-amber-400 hover:bg-amber-300 text-slate-900 border-2 border-slate-900 text-xs px-4 py-2.5 font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-[2px_2px_0px_rgba(15,23,42,1)] active:shadow-none active:translate-y-[2px]"
            >
              <Download className="w-4 h-4 cursor-pointer" />
              Lihat & Salin Kode Kuis
            </a>
          </div>
        </div>

        {/* Outer 3-Column main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Column 1: Hardware simulator and Ambient controls (Left side) */}
          <div className="lg:col-span-8 flex flex-col gap-8">
            {/* Visual breadboard map of modules */}
            <div className="h-auto">
              <HardwareSimulator 
                state={state} 
                onToggleRelay={handleToggleRelayFromHardware} 
                isDhtReading={isDhtReading}
              />
            </div>

            {/* Simulated browser window pane showing actual handleRoot source dashboard */}
            <div>
              <WebDashboardSim 
                state={state}
                onToggleRelay={handleSetRelayFromWeb}
                onSetAllRelays={handleSetAllRelays}
                onToggleVariasi={handleToggleVariasiFromWeb}
                onRefresh={() => triggerToast('Sinkronisasi web dashboard diperbarui.')}
                isDhtReading={isDhtReading}
                dhtLogs={dhtLogs}
              />
            </div>
          </div>

          {/* Column 2: Telegram Bot and Quick Controllers (Right side) */}
          <div className="lg:col-span-4 flex flex-col gap-8">
            {/* Telegram simulated client */}
            <TelegramBotSim 
              state={state}
              messages={messages}
              onSendMessage={handleSendTelegramMessage}
              onClearHistory={clearChatHistory}
            />

            {/* Environmental parameter inputs controls */}
            <HardwareControls 
              state={state}
              onStateChange={handleUpdateState}
              onReset={handleResetBoard}
              sliderTemp={sliderTemp}
              sliderHum={sliderHum}
              setSliderTemp={setSliderTemp}
              setSliderHum={setSliderHum}
            />
          </div>

        </div>

        {/* Source Code Viewer Bottom section */}
        <div className="pt-4">
          <CodeViewer />
        </div>

        {/* Bottom Credits Footer */}
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

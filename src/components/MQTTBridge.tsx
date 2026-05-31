import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Radio, Wifi, WifiOff, Send, Terminal, RefreshCw, CheckCircle, XCircle, ChevronDown, ChevronUp, Zap, Activity } from 'lucide-react';
import { IoTState } from '../types';

// ================================================================
//  MQTTBridge.tsx
//  Komponen koneksi MQTT antara Web Simulator <-> ESP32 fisik
//  Cocok dengan Azka_IoT.ino (pin relay 25,26,27,14 / DHT pin 4)
//  Topik:
//    SUBSCRIBE: smarthome/relay/+/set, smarthome/all/set,
//               smarthome/variasi/+/set
//    PUBLISH:   smarthome/relay/+/state, smarthome/sensor/temp,
//               smarthome/sensor/humi, smarthome/lwt
// ================================================================

interface MQTTBridgeProps {
  state: IoTState;
  onStateChange: (newState: Partial<IoTState>) => void;
  onAddBotMessage: (text: string) => void;
}

interface MQTTLog {
  id: string;
  time: string;
  direction: 'in' | 'out' | 'sys';
  topic: string;
  payload: string;
}

// Broker publik gratis — sama persis yang bisa dipakai di ESP32
const BROKERS = [
  { label: 'HiveMQ',     ws: 'wss://broker.hivemq.com:8884/mqtt',  tcp: 'broker.hivemq.com' },
  { label: 'EMQX',       ws: 'wss://broker.emqx.io:8084/mqtt',     tcp: 'broker.emqx.io' },
  { label: 'Mosquitto',  ws: 'wss://test.mosquitto.org:8081/mqtt',  tcp: 'test.mosquitto.org' },
];

// Topik — harus sama persis antara web & firmware
const RELAY_STATE_TOPICS = ['smarthome/relay/1/state','smarthome/relay/2/state','smarthome/relay/3/state','smarthome/relay/4/state'];
const RELAY_SET_TOPICS   = ['smarthome/relay/1/set',  'smarthome/relay/2/set',  'smarthome/relay/3/set',  'smarthome/relay/4/set'];

function nowTime() {
  return new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export const MQTTBridge: React.FC<MQTTBridgeProps> = ({ state, onStateChange, onAddBotMessage }) => {
  const [brokerIdx, setBrokerIdx]   = useState(0);
  const [connected, setConnected]   = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [logs, setLogs]             = useState<MQTTLog[]>([]);
  const [pubTopic, setPubTopic]     = useState('smarthome/relay/1/set');
  const [pubPayload, setPubPayload] = useState('1');
  const [showLog, setShowLog]       = useState(true);
  const mqttRef                     = useRef<any>(null);
  const prevStateRef                = useRef(state);
  const logEndRef                   = useRef<HTMLDivElement>(null);

  const addLog = useCallback((direction: 'in'|'out'|'sys', topic: string, payload: string) => {
    setLogs(p => [...p.slice(-99), { id: Date.now()+Math.random().toString(36).slice(2), time: nowTime(), direction, topic, payload }]);
  }, []);

  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

  // ── Publish state ke broker setiap kali relay/sensor berubah ──
  useEffect(() => {
    if (!mqttRef.current || !connected) return;
    const prev = prevStateRef.current;
    const keys = ['relay1','relay2','relay3','relay4'] as const;
    keys.forEach((k, i) => {
      if (state[k] !== prev[k]) {
        const payload = state[k] ? '1' : '0';
        try { mqttRef.current.publish(RELAY_STATE_TOPICS[i], payload, { retain: true, qos: 1 }); } catch {}
        addLog('out', RELAY_STATE_TOPICS[i], payload);
      }
    });
    if (Math.abs(state.temperature - prev.temperature) > 0.01) {
      try { mqttRef.current.publish('smarthome/sensor/temp', state.temperature.toFixed(2), { retain: true }); } catch {}
      addLog('out', 'smarthome/sensor/temp', state.temperature.toFixed(2));
    }
    if (Math.abs(state.humidity - prev.humidity) > 0.01) {
      try { mqttRef.current.publish('smarthome/sensor/humi', state.humidity.toFixed(2), { retain: true }); } catch {}
      addLog('out', 'smarthome/sensor/humi', state.humidity.toFixed(2));
    }
    prevStateRef.current = state;
  }, [state, connected, addLog]);

  // ── Proses pesan masuk dari broker (dari ESP32 fisik) ──
  const handleIncoming = useCallback((topic: string, payload: string) => {
    addLog('in', topic, payload);
    const val = payload === '1';
    const timeStr = nowTime();

    // smarthome/relay/N/set  → ubah state relay + munculkan notif telegram
    const m = topic.match(/^smarthome\/relay\/(\d)\/set$/);
    if (m) {
      const key = `relay${m[1]}` as keyof IoTState;
      onStateChange({ [key]: val });
      onAddBotMessage(`💡 *Lampu ${m[1]}*\nStatus: ${val ? '🟢 MENYALA' : '🔴 MATI'}\nSumber: 📡 MQTT\nWaktu: ${timeStr}`);
      return;
    }
    // smarthome/all/set
    if (topic === 'smarthome/all/set') {
      onStateChange({ relay1: val, relay2: val, relay3: val, relay4: val, variasi1: false, variasi2: false });
      onAddBotMessage(val ? '⚡ [MQTT] Semua lampu *MENYALA*! 💡💡💡💡' : '🔌 [MQTT] Semua lampu *MATI*!');
    }
    // smarthome/variasi/1/set — cocok dengan variasiMode1 di Arduino
    if (topic === 'smarthome/variasi/1/set') {
      onStateChange(val
        ? { variasi1: true,  variasi2: false, relay3: false, relay4: false }
        : { variasi1: false, relay1:  false, relay2: false });
    }
    // smarthome/variasi/2/set — cocok dengan variasiMode2 di Arduino
    if (topic === 'smarthome/variasi/2/set') {
      onStateChange(val
        ? { variasi2: true,  variasi1: false, relay1: false, relay2: false }
        : { variasi2: false, relay3:  false, relay4: false });
    }
  }, [onStateChange, onAddBotMessage, addLog]);

  const publishCurrentState = useCallback((client: any) => {
    const keys = ['relay1','relay2','relay3','relay4'] as const;
    keys.forEach((k, i) => {
      try { client.publish(RELAY_STATE_TOPICS[i], state[k] ? '1' : '0', { retain: true }); } catch {}
      addLog('out', RELAY_STATE_TOPICS[i], state[k] ? '1' : '0');
    });
    try {
      client.publish('smarthome/sensor/temp', state.temperature.toFixed(2), { retain: true });
      client.publish('smarthome/sensor/humi', state.humidity.toFixed(2), { retain: true });
      client.publish('smarthome/lwt', 'online', { retain: true });
    } catch {}
    addLog('out', 'smarthome/sensor/temp', state.temperature.toFixed(2));
    addLog('out', 'smarthome/sensor/humi', state.humidity.toFixed(2));
  }, [state, addLog]);

  const handleConnect = async () => {
    const broker = BROKERS[brokerIdx];
    setConnecting(true);
    addLog('sys', 'SYSTEM', `Menghubungkan ke ${broker.label} (${broker.ws})...`);
    try {
      // @ts-ignore — mqtt.js di-load dari CDN agar tidak perlu npm install
      const mqtt = await import('https://unpkg.com/mqtt@5/dist/mqtt.esm.js');
      const client = mqtt.connect(broker.ws, {
        clientId: 'SmartHome_WebSim_' + Math.random().toString(16).slice(2, 8),
        clean: true,
        reconnectPeriod: 0,
        connectTimeout: 10000,
      });
      client.on('connect', () => {
        setConnected(true);
        setConnecting(false);
        mqttRef.current = client;
        addLog('sys', 'SYSTEM', `✅ Terhubung ke ${broker.label}`);
        // Subscribe semua topik perintah (sama dengan yang di-subscribe ESP32)
        [
          'smarthome/relay/+/set',
          'smarthome/all/set',
          'smarthome/variasi/+/set',
          'smarthome/relay/+/state',
          'smarthome/sensor/#',
          'smarthome/lwt',
        ].forEach((t: string) => { try { client.subscribe(t); } catch {} });
        addLog('sys', 'SUBSCRIBE', 'smarthome/#');
        publishCurrentState(client);
      });
      client.on('message', (topic: string, payload: Buffer) => handleIncoming(topic, payload.toString()));
      client.on('error', (err: Error) => { addLog('sys', 'ERROR', err.message); setConnected(false); setConnecting(false); });
      client.on('close', () => { addLog('sys', 'SYSTEM', '🔴 Koneksi terputus'); setConnected(false); setConnecting(false); mqttRef.current = null; });
    } catch (e) {
      addLog('sys', 'ERROR', 'Gagal load mqtt.js: ' + String(e));
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    if (mqttRef.current) {
      try { mqttRef.current.publish('smarthome/lwt', 'offline', { retain: true }); mqttRef.current.end(true); } catch {}
      mqttRef.current = null;
    }
    setConnected(false);
    addLog('sys', 'SYSTEM', '🔴 Terputus dari broker');
  };

  const handlePublish = () => {
    if (!pubTopic.trim()) return;
    if (mqttRef.current && connected) {
      try { mqttRef.current.publish(pubTopic, pubPayload); } catch {}
    }
    // Terapkan juga ke state lokal supaya preview langsung kelihatan
    handleIncoming(pubTopic, pubPayload);
  };

  const quickPublish = (relay: number, val: boolean) => {
    const topic   = RELAY_SET_TOPICS[relay - 1];
    const payload = val ? '1' : '0';
    if (mqttRef.current && connected) {
      try { mqttRef.current.publish(topic, payload); } catch {}
    }
    handleIncoming(topic, payload);
  };

  const dirColor = { in: 'text-emerald-400', out: 'text-sky-400', sys: 'text-amber-400' };
  const dirLabel = { in: '▼ IN ', out: '▲ OUT', sys: '◆ SYS' };

  return (
    <div className="bg-white border-2 border-slate-900 rounded-none shadow-[6px_6px_0px_rgba(15,23,42,1)] overflow-hidden">

      {/* Header */}
      <div className="border-b-2 border-slate-900 px-5 py-3 flex items-center justify-between bg-slate-900 text-white">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-black tracking-widest uppercase">MQTT Bridge</span>
          <span className="text-[10px] font-mono text-slate-400">— Koneksi ke ESP32 Fisik</span>
        </div>
        {connected
          ? <span className="flex items-center gap-1 text-emerald-400 text-[10px] font-mono font-bold"><CheckCircle className="w-3.5 h-3.5" /> ONLINE</span>
          : <span className="flex items-center gap-1 text-rose-400 text-[10px] font-mono font-bold"><XCircle className="w-3.5 h-3.5" /> OFFLINE</span>}
      </div>

      <div className="p-5 space-y-5">

        {/* Info */}
        <div className="bg-sky-50 border-2 border-sky-300 px-4 py-3 flex gap-3 items-start">
          <Activity className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
          <p className="text-[10px] text-sky-800 font-mono leading-relaxed">
            Simulator dan ESP32 fisik terhubung ke broker MQTT yang <strong>sama</strong>.
            Kontrol di sini → relay fisik ikut berubah. Relay fisik ON → simulator ikut update. Notifikasi Telegram otomatis muncul di kedua arah.
          </p>
        </div>

        {/* Pilih Broker */}
        <div>
          <label className="text-[10px] font-black tracking-widest text-slate-500 uppercase block mb-2">Pilih Broker MQTT</label>
          <div className="flex gap-2 flex-wrap">
            {BROKERS.map((b, i) => (
              <button key={i} onClick={() => setBrokerIdx(i)}
                className={`text-[10px] font-mono px-3 py-1.5 border-2 border-slate-900 transition-all ${brokerIdx === i ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 shadow-[2px_2px_0px_rgba(15,23,42,1)] hover:bg-slate-100'}`}>
                {b.label}
              </button>
            ))}
          </div>
          <div className="mt-2 p-3 bg-slate-50 border-2 border-slate-200 text-[10px] font-mono space-y-1">
            <div>Web  (WSS): <span className="text-sky-600">{BROKERS[brokerIdx].ws}</span></div>
            <div className="text-amber-700">ESP32 (TCP port 1883): <span className="font-bold">{BROKERS[brokerIdx].tcp}</span>
              <span className="text-slate-500"> ← set ini di MQTT_SERVER firmware</span>
            </div>
          </div>
        </div>

        {/* Connect / Disconnect */}
        <div className="flex gap-3">
          {!connected
            ? <button onClick={handleConnect} disabled={connecting}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-xs font-black border-2 border-slate-900 shadow-[3px_3px_0px_rgba(15,23,42,1)] hover:bg-emerald-700 active:shadow-none active:translate-y-[2px] transition-all disabled:opacity-50">
                <Wifi className={`w-3.5 h-3.5 ${connecting ? 'animate-spin' : ''}`} />
                {connecting ? 'Menghubungkan...' : 'Hubungkan ke Broker'}
              </button>
            : <button onClick={handleDisconnect}
                className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 text-white text-xs font-black border-2 border-slate-900 shadow-[3px_3px_0px_rgba(15,23,42,1)] hover:bg-rose-700 active:shadow-none active:translate-y-[2px] transition-all">
                <WifiOff className="w-3.5 h-3.5" /> Putuskan
              </button>}
          <button onClick={() => setLogs([])}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-white text-slate-700 text-xs font-bold border-2 border-slate-900 shadow-[2px_2px_0px_rgba(15,23,42,1)] hover:bg-slate-50 active:shadow-none transition-all">
            <RefreshCw className="w-3 h-3" /> Clear Log
          </button>
        </div>

        {/* Quick Relay Control */}
        <div>
          <label className="text-[10px] font-black tracking-widest text-slate-500 uppercase block mb-2">
            Kontrol Relay via MQTT
            {!connected && <span className="text-rose-400 normal-case font-normal ml-2">(hubungkan broker dulu)</span>}
          </label>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {[1,2,3,4].map(n => {
              const on = state[`relay${n}` as keyof IoTState] as boolean;
              return (
                <div key={n} className={`border-2 border-slate-900 p-3 flex flex-col items-center gap-2 transition-colors ${on ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                  <span className="text-[10px] font-black text-slate-600 tracking-wider">RELAY {n}</span>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 border-slate-900 transition-all ${on ? 'bg-emerald-400 shadow-[0_0_14px_rgba(34,197,94,0.5)]' : 'bg-slate-200'}`}>
                    <Zap className={`w-4 h-4 ${on ? 'text-white' : 'text-slate-400'}`} />
                  </div>
                  <span className={`text-[9px] font-black tracking-widest ${on ? 'text-emerald-600' : 'text-rose-500'}`}>{on ? 'ON ●' : 'OFF ○'}</span>
                  <div className="flex gap-1 w-full">
                    <button onClick={() => quickPublish(n, true)}
                      className="flex-1 text-[10px] font-black py-1 bg-emerald-500 text-white border border-slate-900 hover:bg-emerald-600 transition-colors">ON</button>
                    <button onClick={() => quickPublish(n, false)}
                      className="flex-1 text-[10px] font-black py-1 bg-rose-500 text-white border border-slate-900 hover:bg-rose-600 transition-colors">OFF</button>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Tombol all & variasi — sesuai endpoint di firmware */}
          <div className="grid grid-cols-2 gap-2 mt-2 md:grid-cols-4">
            <button onClick={() => handleIncoming('smarthome/all/set','1')}
              className="text-[10px] font-black py-2 bg-slate-900 text-white border-2 border-slate-900 hover:bg-slate-700 col-span-1">⚡ All ON</button>
            <button onClick={() => handleIncoming('smarthome/all/set','0')}
              className="text-[10px] font-black py-2 bg-slate-200 text-slate-800 border-2 border-slate-900 hover:bg-slate-300 col-span-1">🔌 All OFF</button>
            <button onClick={() => handleIncoming('smarthome/variasi/1/set', state.variasi1 ? '0' : '1')}
              className={`text-[10px] font-black py-2 border-2 border-slate-900 col-span-1 ${state.variasi1 ? 'bg-violet-500 text-white' : 'bg-white text-slate-700'}`}>✨ Variasi 1</button>
            <button onClick={() => handleIncoming('smarthome/variasi/2/set', state.variasi2 ? '0' : '1')}
              className={`text-[10px] font-black py-2 border-2 border-slate-900 col-span-1 ${state.variasi2 ? 'bg-violet-500 text-white' : 'bg-white text-slate-700'}`}>✨ Variasi 2</button>
          </div>
        </div>

        {/* Manual Publish */}
        <div>
          <label className="text-[10px] font-black tracking-widest text-slate-500 uppercase block mb-2">Publish Manual</label>
          <div className="flex gap-2 flex-wrap">
            <input value={pubTopic} onChange={e => setPubTopic(e.target.value)} placeholder="topic"
              className="flex-1 min-w-[160px] text-xs font-mono border-2 border-slate-900 px-2 py-2 bg-slate-50 outline-none focus:bg-white" />
            <input value={pubPayload} onChange={e => setPubPayload(e.target.value)} placeholder="payload"
              className="w-20 text-xs font-mono border-2 border-slate-900 px-2 py-2 bg-slate-50 outline-none focus:bg-white" />
            <button onClick={handlePublish}
              className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 text-white text-xs font-black border-2 border-slate-900 shadow-[2px_2px_0px_rgba(15,23,42,1)] hover:bg-sky-700 active:shadow-none transition-all">
              <Send className="w-3.5 h-3.5" /> Publish
            </button>
          </div>
          <p className="text-[10px] text-slate-400 font-mono mt-1">
            Contoh: <span className="text-sky-600">smarthome/relay/3/set</span> → <span className="text-emerald-600">1</span>
          </p>
        </div>

        {/* Referensi Topik */}
        <div className="border-2 border-slate-200 p-3 bg-slate-50">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">📡 Topik MQTT (sama antara Web & ESP32)</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-[10px] font-mono">
            <div><span className="text-sky-600">SET</span>   smarthome/relay/1..4/set <span className="text-slate-400">1|0</span></div>
            <div><span className="text-emerald-600">STATE</span> smarthome/relay/1..4/state</div>
            <div><span className="text-sky-600">SET</span>   smarthome/all/set <span className="text-slate-400">1|0</span></div>
            <div><span className="text-emerald-600">SENSOR</span> smarthome/sensor/temp|humi</div>
            <div><span className="text-sky-600">SET</span>   smarthome/variasi/1..2/set <span className="text-slate-400">1|0</span></div>
            <div><span className="text-amber-600">LWT</span>   smarthome/lwt <span className="text-slate-400">online|offline</span></div>
          </div>
        </div>

        {/* Log Terminal */}
        <div>
          <button onClick={() => setShowLog(v => !v)}
            className="flex items-center gap-2 text-[10px] font-black tracking-widest text-slate-500 uppercase mb-2 hover:text-slate-800">
            <Terminal className="w-3.5 h-3.5" />
            Log MQTT ({logs.length})
            {showLog ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {showLog && (
            <div className="bg-slate-950 border-2 border-slate-900 h-44 overflow-y-auto font-mono text-[10px] p-3 space-y-0.5">
              {logs.length === 0 && <span className="text-slate-500">— belum ada pesan —</span>}
              {logs.map(l => (
                <div key={l.id} className="flex gap-2 leading-5">
                  <span className="text-slate-500 shrink-0">{l.time}</span>
                  <span className={`shrink-0 ${dirColor[l.direction]}`}>{dirLabel[l.direction]}</span>
                  <span className="text-violet-300 shrink-0 truncate max-w-[150px]">{l.topic}</span>
                  <span className="text-slate-300 truncate">{l.payload}</span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

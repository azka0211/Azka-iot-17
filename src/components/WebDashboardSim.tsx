import React from 'react';
import { Monitor, RefreshCw, Layout, Smartphone, Globe, AlertCircle } from 'lucide-react';
import { IoTState } from '../types';

interface WebDashboardSimProps {
  state: IoTState;
  onToggleRelay: (relayNum: number, state: boolean) => void;
  onSetAllRelays: (state: boolean) => void;
  onToggleVariasi: (varNum: number, state: boolean) => void;
  onRefresh: () => void;
  isDhtReading?: boolean;
  dhtLogs?: Array<{ time: string; temp: number; hum: number; status: string }>;
}

export const WebDashboardSim: React.FC<WebDashboardSimProps> = ({
  state,
  onToggleRelay,
  onSetAllRelays,
  onToggleVariasi,
  onRefresh,
  isDhtReading,
  dhtLogs,
}) => {
  return (
    <div className="bg-white border-2 border-slate-900 rounded-none flex flex-col h-full overflow-hidden shadow-[6px_6px_0px_rgba(15,23,42,1)] relative" id="web-dashboard-simulator">
      {/* Browser Chrome Header bar */}
      <div className="bg-slate-100 border-b-2 border-slate-900 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          {/* Traffic lights */}
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-slate-950" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-slate-950" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-slate-950" />
          </div>
          <div className="h-4 w-px bg-slate-400 mx-1" />
          <span className="text-[11px] font-mono text-slate-800 font-bold flex items-center gap-1.5 uppercase">
            <Globe className="w-3.5 h-3.5 text-slate-800" />
            ESP32 Web Server Host
          </span>
        </div>

        {/* Address bar URL input */}
        <div className="bg-white border-2 border-slate-900 px-3 py-1 text-[11px] font-mono text-slate-800 w-72 flex items-center justify-between select-all shadow-[2px_2px_0px_rgba(15,23,42,1)]">
          <span className="truncate font-bold">http://{state.ipAddress}/</span>
          <RefreshCw 
            className="w-3.5 h-3.5 text-slate-700 hover:text-slate-950 cursor-pointer transition-colors"
            onClick={onRefresh}
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[9px] bg-amber-400 text-slate-900 border border-slate-900 px-2 py-0.5 rounded-none font-black font-mono">
            PORT 80
          </span>
        </div>
      </div>

      {/* Embedded Render of the Custom ESP32 web interface */}
      <div className="bg-[#F8FAFC] text-slate-900 p-6 flex-grow overflow-y-auto space-y-6">
        {/* Banner */}
        <div className="text-center pb-4 border-b-2 border-slate-900">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
            🏠 Smart Home IoT Web Server
          </h1>
          <p className="text-xs text-slate-500 mt-1.5 font-mono">
            {state.lastUpdateTime === '--:--:--' ? 'Memuat data...' : `Last Sync: ${state.lastUpdateTime}`}
          </p>
        </div>

        {/* Sensor Section */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-black">Sensor Readings (DHT11)</p>
            {isDhtReading && (
              <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-600 font-black animate-pulse bg-emerald-50 border-2 border-emerald-500 px-2.5 py-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                DITELUSURI (READING...)
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border-2 border-slate-900 rounded-none p-4 shadow-[4px_4px_0px_rgba(15,23,42,1)]">
              <div className="text-[9px] text-slate-500 uppercase tracking-widest font-mono font-bold mb-1">🌡️ Temperatur</div>
              <div className="text-3xl font-black text-slate-900 font-mono">{state.temperature.toFixed(1)}°C</div>
              <div className="text-[9px] text-slate-400 mt-1 font-mono flex justify-between">
                <span>GPIO4 pin data bus</span>
                {isDhtReading && <span className="text-emerald-600 animate-pulse">● Live Read</span>}
              </div>
            </div>

            <div className="bg-white border-2 border-slate-900 rounded-none p-4 shadow-[4px_4px_0px_rgba(15,23,42,1)]">
              <div className="text-[9px] text-slate-500 uppercase tracking-widest font-mono font-bold mb-1">💧 Kelembaban</div>
              <div className="text-3xl font-black text-slate-900 font-mono">{state.humidity.toFixed(1)}%</div>
              <div className="text-[9px] text-slate-400 mt-1 font-mono flex justify-between">
                <span>relative humidity</span>
                {isDhtReading && <span className="text-emerald-600 animate-pulse">● Live Read</span>}
              </div>
            </div>
          </div>

          {/* Real-time Logger Stream */}
          {dhtLogs && dhtLogs.length > 0 && (
            <div className="mt-4 bg-slate-900 text-slate-200 p-4 border-2 border-slate-900 font-mono text-[11px] space-y-2 rounded-none shadow-[4px_4px_0px_rgba(15,23,42,1)]">
              <div className="text-emerald-400 font-black border-b border-slate-800 pb-1.5 flex justify-between uppercase text-[10px] tracking-wider">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  REAL-TIME DHT11 LOGGER (ESP32)
                </span>
                <span className="animate-pulse">● LIVE STREAMING</span>
              </div>
              <div className="max-h-[100px] overflow-y-auto space-y-1.5 pr-2 custom-scrollbar">
                {dhtLogs.slice().reverse().map((log, index) => (
                  <div key={index} className="flex justify-between hover:bg-slate-800 px-1.5 py-0.5 transition-colors border-l-2 border-emerald-500 pl-2">
                    <span className="text-slate-300">[{log.time}] <span className="text-amber-300 font-bold">DHT11:</span> {log.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Relay Section */}
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-black mb-3">Relay Output Controls</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { num: 1, name: 'Lampu 1', state: state.relay1 },
              { num: 2, name: 'Lampu 2', state: state.relay2 },
              { num: 3, name: 'Lampu 3', state: state.relay3 },
              { num: 4, name: 'Lampu 4', state: state.relay4 }
            ].map((relay) => (
              <div 
                key={relay.num} 
                className={`bg-white border-2 border-slate-900 rounded-none p-4 flex flex-col items-center gap-3 shadow-[3px_3px_0px_rgba(15,23,42,1)] transition-all duration-200 cursor-pointer select-none group hover:border-amber-400 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_rgba(15,23,42,1)]`}
                onClick={() => onToggleRelay(relay.num, !relay.state)}
                title={`Klik untuk men-toggle ${relay.name}`}
              >
                <span className="text-[10px] text-slate-900 font-black uppercase tracking-wider group-hover:text-amber-500 transition-colors">{relay.name}</span>
                
                {/* Visual Indicator ball */}
                <div 
                  className={`w-12 h-12 rounded-none border-2 border-slate-900 flex items-center justify-center text-xl transition-all duration-300 ${
                    relay.state ? 'bg-amber-400 shadow-[2px_2px_0px_rgba(15,23,42,1)]' : 'bg-slate-100 group-hover:bg-slate-50'
                  }`}
                >
                  {relay.state ? '💡' : '🌑'}
                </div>

                <div className="text-xs font-black tracking-wider">
                  <span className={relay.state ? 'text-emerald-700 bg-emerald-50 px-1 border border-emerald-500 font-mono' : 'text-slate-400 font-mono'}>
                    {relay.state ? 'STATUS: ACTIVE' : 'STATUS: INACTIVE'}
                  </span>
                </div>

                {/* ON / OFF Actions */}
                <div className="flex gap-2 w-full mt-1">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleRelay(relay.num, true);
                    }}
                    className={`flex-grow py-1 border-2 border-slate-900 text-xs font-black transition-all cursor-pointer shadow-[2px_2px_0px_rgba(15,23,42,1)] uppercase active:shadow-none active:translate-y-[2px] ${
                      relay.state ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-900' : 'bg-slate-100 hover:bg-emerald-50 text-slate-600'
                    }`}
                  >
                    ON
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleRelay(relay.num, false);
                    }}
                    className={`flex-grow py-1 border-2 border-slate-900 text-xs font-black transition-all cursor-pointer shadow-[2px_2px_0px_rgba(15,23,42,1)] uppercase active:shadow-none active:translate-y-[2px] ${
                      !relay.state ? 'bg-rose-400 hover:bg-rose-300 text-slate-900' : 'bg-slate-100 hover:bg-rose-50 text-slate-600'
                    }`}
                  >
                    OFF
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Global actions */}
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-black mb-3">Bulk Output Command</p>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <button 
              onClick={() => onSetAllRelays(true)}
              className="flex-1 bg-amber-400 hover:brightness-105 text-slate-900 font-black py-3 px-4 border-2 border-slate-900 text-xs uppercase tracking-wide transition-all cursor-pointer shadow-[4px_4px_0px_rgba(15,23,42,1)] active:shadow-none active:translate-y-[4px]"
            >
              ⚡ Nyalakan Semua Lampu
            </button>
            <button 
              onClick={() => onSetAllRelays(false)}
              className="flex-1 bg-slate-900 text-white font-black py-3 px-4 border-2 border-slate-900 text-xs uppercase tracking-wide transition-all cursor-pointer shadow-[4px_4px_0px_rgba(15,23,42,1)] active:shadow-none active:translate-y-[4px]"
            >
              🔌 Padamkan Semua Lampu
            </button>
          </div>
        </div>

        {/* Variations Control */}
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-black mb-3">Onboard Variasi Efek</p>
          <div className="bg-white border-2 border-slate-900 rounded-none p-4 shadow-[4px_4px_0px_rgba(15,23,42,1)]">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button 
                onClick={() => onToggleVariasi(1, true)}
                className="bg-indigo-300 hover:bg-indigo-250 text-slate-900 text-[10px] font-black py-2 px-3 border-2 border-slate-900 uppercase transition-all cursor-pointer"
              >
                ✨ Variasi 1 ON
              </button>
              <button 
                onClick={() => onToggleVariasi(1, false)}
                className="bg-slate-200 hover:bg-slate-100 text-slate-900 text-[10px] font-black py-2 px-3 border-2 border-slate-900 uppercase transition-all cursor-pointer"
              >
                ⏹ Variasi 1 OFF
              </button>
              <button 
                onClick={() => onToggleVariasi(2, true)}
                className="bg-indigo-300 hover:bg-indigo-250 text-slate-900 text-[10px] font-black py-2 px-3 border-2 border-slate-900 uppercase transition-all cursor-pointer"
              >
                ✨ Variasi 2 ON
              </button>
              <button 
                onClick={() => onToggleVariasi(2, false)}
                className="bg-slate-200 hover:bg-slate-100 text-slate-900 text-[10px] font-black py-2 px-3 border-2 border-slate-900 uppercase transition-all cursor-pointer"
              >
                ⏹ Variasi 2 OFF
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Simulation Info Banner */}
      <div className="bg-slate-900 border-t-2 border-slate-900 p-2.5 text-center flex justify-center items-center gap-1.5 shrink-0 text-white">
        <AlertCircle className="w-3.5 h-3.5" />
        <span className="text-[10px] font-mono">
          Representasi fungsional dari callback web server <code>handleRoot()</code> sketch C++ Anda.
        </span>
      </div>
    </div>
  );
};

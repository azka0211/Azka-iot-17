import React from 'react';
import { Thermometer, Droplets, Sliders, RefreshCw, Server, ShieldCheck } from 'lucide-react';
import { IoTState } from '../types';

interface HardwareControlsProps {
  state: IoTState;
  onStateChange: (newState: Partial<IoTState>) => void;
  onReset: () => void;
}

export const HardwareControls: React.FC<HardwareControlsProps> = ({ state, onStateChange, onReset }) => {
  return (
    <div className="bg-white border-2 border-slate-900 rounded-none p-6 shadow-[6px_6px_0px_rgba(15,23,42,1)] relative" id="hardware-simulator-controls">
      <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3 mb-5">
        <h3 className="text-xs uppercase font-black tracking-widest text-slate-900 flex items-center gap-1.5">
          <Sliders className="w-4 h-4 text-slate-900" />
          AMBIENT SENSOR ADJUSTMENT
        </h3>
        <button
          onClick={onReset}
          className="text-[10.5px] font-mono font-black text-slate-900 flex items-center gap-1 bg-white hover:bg-slate-50 px-2.5 py-1 border-2 border-slate-900 shadow-[2px_2px_0px_rgba(15,23,42,1)] active:shadow-none active:translate-y-[2px] transition-all cursor-pointer"
          title="Reset Sensor"
        >
          <RefreshCw className="w-3 h-3" />
          Reset ESP32
        </button>
      </div>

      <p className="text-xs text-slate-500 leading-relaxed font-mono mb-5">
        Gunakan penggeser (sliders) di bawah untuk mengubah nilai suhu & kelembaban ambient secara real-time. Perubahan langsung sinkron dengan Telegram bot dan dashboard.
      </p>

      <div className="space-y-6">
        {/* Temperature slider */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-900 font-bold flex items-center gap-1.5">
              <Thermometer className="w-4 h-4 text-amber-600" />
              Suhu Ruangan (°C)
            </span>
            <span className="font-mono text-slate-900 font-black bg-amber-200 px-2 py-0.5 border border-slate-900">
              {state.temperature.toFixed(1)} °C
            </span>
          </div>
          <input
            type="range"
            min="-10"
            max="60"
            step="0.5"
            value={state.temperature}
            onChange={(e) => onStateChange({ temperature: parseFloat(e.target.value) })}
            className="w-full h-2 bg-slate-205 border border-slate-900 rounded-none appearance-none cursor-pointer accent-slate-900"
          />
          <div className="flex justify-between text-[9px] text-slate-500 font-mono">
            <span>Dingin (-10°C)</span>
            <span>Panas (60°C)</span>
          </div>
        </div>

        {/* Humidity slider */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-900 font-bold flex items-center gap-1.5">
              <Droplets className="w-4 h-4 text-blue-600" />
              Kelembaban Udara (% RH)
            </span>
            <span className="font-mono text-slate-900 font-black bg-blue-200 px-2 py-0.5 border border-slate-900">
              {state.humidity.toFixed(1)} %
            </span>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            step="1"
            value={state.humidity}
            onChange={(e) => onStateChange({ humidity: parseFloat(e.target.value) })}
            className="w-full h-2 bg-slate-205 border border-slate-900 rounded-none appearance-none cursor-pointer accent-slate-900"
          />
          <div className="flex justify-between text-[9px] text-slate-500 font-mono">
            <span>Kering (10%)</span>
            <span>Lembab (100%)</span>
          </div>
        </div>

        <div className="border-t-2 border-slate-900 pt-5 space-y-3.5">
          <span className="block text-[10px] uppercase font-black tracking-wider text-slate-500 font-mono">Status Sistem & WiFi</span>
          
          <div className="grid grid-cols-2 gap-3">
            {/* WiFi Toggle */}
            <button
              onClick={() => onStateChange({ wifiConnected: !state.wifiConnected })}
              className={`py-2 px-3 border-2 border-slate-900 rounded-none text-xs font-black transition-all flex flex-col items-center justify-center gap-1 cursor-pointer shadow-[2px_2px_0px_rgba(15,23,42,1)] active:shadow-none active:translate-y-[2px] ${
                state.wifiConnected 
                  ? 'bg-emerald-100 text-emerald-950 hover:bg-emerald-200' 
                  : 'bg-rose-100 text-rose-955 hover:bg-rose-200'
              }`}
            >
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wide">WiFi Connection</span>
              <span className="text-xs uppercase">{state.wifiConnected ? 'WiFi Online' : 'WiFi Offline'}</span>
            </button>

            {/* Board Selector Info */}
            <div className="py-2 px-3 bg-indigo-50 border-2 border-slate-900 rounded-none flex flex-col items-center justify-center text-indigo-950 font-bold">
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wide">Target Board</span>
              <span className="text-xs uppercase font-black flex items-center gap-1 font-mono text-slate-900">
                <Server className="w-3.5 h-3.5" />
                NodeMCU ESP32
              </span>
            </div>
          </div>
        </div>

        {/* Credentials Customizer */}
        <div className="border-t-2 border-slate-900 pt-4 space-y-3">
          <span className="block text-[10px] uppercase font-black tracking-wider text-slate-500 font-mono">Informasi Token & Chat ID</span>
          <div className="grid grid-cols-1 gap-2 bg-slate-50 p-3 border-2 border-slate-900 font-mono text-[10px] space-y-1 text-slate-700">
            <div className="flex justify-between">
              <span>ESP32 IP Address:</span>
              <span className="text-slate-900 font-black">{state.ipAddress}</span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="shrink-0">Telegram Bot Token:</span>
              <span className="text-slate-900 truncate text-right w-40 font-black" title={state.botToken}>{state.botToken}</span>
            </div>
            <div className="flex justify-between">
              <span>Chat ID / User ID:</span>
              <span className="text-slate-900 font-black">{state.chatId}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

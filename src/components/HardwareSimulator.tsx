import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cpu, Power, Wifi, Layers, Lightbulb, Thermometer, Droplets } from 'lucide-react';
import { IoTState } from '../types';

interface HardwareSimulatorProps {
  state: IoTState;
  onToggleRelay: (relayNum: number) => void;
}

export const HardwareSimulator: React.FC<HardwareSimulatorProps> = ({ state, onToggleRelay }) => {
  const [pulse, setPulse] = useState(false);

  // Sparkle/heartbeat pulse effect for the ESP32 active state
  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(p => !p);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white border-2 border-slate-900 rounded-none p-6 shadow-[6px_6px_0px_rgba(15,23,42,1)] relative overflow-hidden flex flex-col h-full" id="hardware-simulator">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:16px_16px] opacity-100 pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-6">
        <div>
          <h2 className="text-sm font-black tracking-wider text-slate-900 uppercase flex items-center gap-2">
            <Cpu className="w-4 h-4 text-slate-900" />
            ESP32 Microcontroller Simulation Board
          </h2>
          <p className="text-xs text-slate-500 font-mono mt-1">SIMULASI PHYSICAL BOARD / ARDUINO COMPATIBLE</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 border-2 border-slate-900 font-mono">
            <Wifi className={`w-3.5 h-3.5 ${state.wifiConnected ? 'text-emerald-600 animate-pulse' : 'text-rose-600'}`} />
            <span className="text-[10px] font-black text-slate-900">
              {state.wifiConnected ? 'WIFI: CONNECTED' : 'WIFI: OFFLINE'}
            </span>
          </div>
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-1 xl:grid-cols-12 gap-6 flex-1">
        {/* ESP32 Chip Graphic */}
        <div className="xl:col-span-5 bg-slate-50 p-5 border-2 border-slate-900 relative flex flex-col justify-between overflow-hidden">
          {/* Internal circuitry lines */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <svg width="100%" height="100%" className="stroke-slate-900" strokeWidth="1.5">
              <path d="M 0,20 L 50,20 L 80,50 L 150,50" fill="none" />
              <path d="M 120,0 L 120,40 L 160,80 L 160,150" fill="none" />
              <path d="M 0,160 L 100,160 L 140,120 L 250,120" fill="none" />
            </svg>
          </div>

          <div className="flex justify-between items-start relative z-10">
            <div>
              <span className="text-[9px] font-mono text-slate-900 font-black tracking-widest bg-amber-400 px-2 py-0.5 border-2 border-slate-900">ESP32-WROOM-32D</span>
              <h3 className="text-xs font-mono font-bold text-slate-800 mt-2">PIN IO BUS</h3>
            </div>
            {/* Status Onboard LEDs */}
            <div className="flex gap-2 bg-white p-1 border-2 border-slate-900">
              <div className="flex flex-col items-center px-1">
                <div className={`w-2.5 h-2.5 rounded-full ${state.wifiConnected ? 'bg-blue-600' : 'bg-slate-300'}`} />
                <span className="text-[7px] font-bold text-slate-600 mt-0.5">WiFi</span>
              </div>
              <div className="flex flex-col items-center px-1">
                <div className={`w-2.5 h-2.5 rounded-full ${pulse ? 'bg-rose-600' : 'bg-slate-300'}`} />
                <span className="text-[7px] font-bold text-slate-600 mt-0.5">PWR</span>
              </div>
            </div>
          </div>

          {/* Graphic Chip Representation */}
          <div className="my-6 mx-auto w-32 h-44 bg-slate-900 border-2 border-slate-950 flex flex-col justify-between p-2 font-mono relative text-white">
            {/* Left Pins */}
            <div className="absolute -left-2 top-4 bottom-4 flex flex-col justify-between">
              {[...Array(10)].map((_, i) => (
                <div key={`pinl-${i}`} className="w-2.5 h-1 bg-amber-400 border border-slate-900 rounded-r" />
              ))}
            </div>
            {/* Right Pins */}
            <div className="absolute -right-2 top-4 bottom-4 flex flex-col justify-between">
              {[...Array(10)].map((_, i) => (
                <div key={`pinr-${i}`} className="w-2.5 h-1 bg-amber-400 border border-slate-900 rounded-l" />
              ))}
            </div>

            {/* ESP32 Shield Panel */}
            <div className="w-full h-8 bg-zinc-800 border border-zinc-700 text-center flex flex-col justify-center items-center">
              <span className="text-[7px] text-zinc-300 font-bold uppercase tracking-tighter">WIFI ANTENNA</span>
              <div className="w-10 h-1 bg-amber-500 mt-1 rounded-sm" />
            </div>

            <div className="bg-zinc-800 border border-zinc-700 p-2 flex-grow my-2 flex flex-col justify-center items-center font-bold text-zinc-100 uppercase text-[9px] relative">
              <Cpu className="w-6 h-6 text-amber-400 mb-1" />
              <span>ESPRESSIF</span>
              <span className="text-[7px] text-zinc-400 lowercase font-normal">esp_32_core</span>
            </div>

            <div className="flex justify-between text-[6px] text-zinc-400">
              <span>GND</span>
              <span>D4</span>
              <span>RELAYS</span>
              <span>3V3</span>
            </div>
          </div>

          {/* Live Data readout on Board */}
          <div className="bg-white border-2 border-slate-900 p-2 flex items-center justify-between font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[9px] font-black text-slate-800">STATE: ACTIVE</span>
            </div>
            <span className="text-[9px] font-black text-slate-900">IP: {state.ipAddress}</span>
          </div>
        </div>

        {/* Dynamic Connected Circuit components */}
        <div className="xl:col-span-7 flex flex-col justify-between gap-6">
          {/* DHT Sensor widget and 4 relays container */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* DHT11/DHT22 Sensor Box */}
            <div className="bg-white p-4 border-2 border-slate-900 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[8px] font-mono text-slate-900 font-black tracking-widest bg-yellow-400 px-1.5 py-0.5 border-2 border-slate-900 uppercase">Sensors</span>
                  <h4 className="text-xs font-black text-slate-900 leading-tight mt-1">DHT11 Temp & Humidity</h4>
                </div>
                <div className="w-7 h-10 bg-blue-100 rounded-none flex flex-col justify-around p-1 border-2 border-slate-900">
                  <div className="grid grid-cols-3 gap-0.5 bg-blue-600 h-5 p-0.5">
                    {[...Array(9)].map((_, i) => <div key={i} className="bg-blue-200" />)}
                  </div>
                  <div className="text-[6px] font-mono text-slate-900 text-center font-bold">DHT11</div>
                </div>
              </div>

              {/* Graphical Air flow circle */}
              <div className="my-4 flex items-center justify-around bg-slate-50 p-3 border-2 border-slate-900">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-amber-400 border border-slate-900">
                    <Thermometer className="w-4 h-4 text-slate-900" />
                  </div>
                  <div>
                    <span className="block text-[8px] text-slate-500 font-mono tracking-wider uppercase">Suhu</span>
                    <span className="text-base font-black font-mono text-slate-900">{state.temperature.toFixed(1)}°C</span>
                  </div>
                </div>

                <div className="h-6 w-0.5 bg-slate-900" />

                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-blue-400 border border-slate-900">
                    <Droplets className="w-4 h-4 text-slate-900" />
                  </div>
                  <div>
                    <span className="block text-[8px] text-slate-500 font-mono tracking-wider uppercase">Lembab</span>
                    <span className="text-base font-black font-mono text-slate-900">{state.humidity.toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              <div className="text-[8px] font-mono text-slate-600 flex justify-between items-center">
                <span>Pin: GPIO4 / D4</span>
                <span className="text-emerald-700 flex items-center gap-1 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
                  Monitoring
                </span>
              </div>
            </div>

            {/* Mode Variasi Status Badge */}
            <div className="bg-white p-4 border-2 border-slate-900 flex flex-col justify-between">
              <div>
                <span className="text-[8px] font-mono text-slate-900 font-black tracking-widest bg-indigo-400 px-1.5 py-0.5 border-2 border-slate-900 uppercase">Variation Effects</span>
                <h4 className="text-xs font-black text-slate-900 leading-tight mt-1">Simulasi Mode Efek</h4>
              </div>

              <div className="space-y-2 my-3">
                <div className="flex items-center justify-between bg-slate-50 p-2 border-2 border-slate-900">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${state.variasi1 ? 'bg-indigo-600 animate-pulse' : 'bg-slate-300'}`} />
                    <span className="text-[11px] text-slate-800 font-bold">Variasi Lampu 1</span>
                  </div>
                  <span className={`text-[8px] font-mono px-2 py-0.5 border border-slate-900 font-bold ${state.variasi1 ? 'bg-indigo-100 text-indigo-800' : 'bg-white text-slate-400'}`}>
                    {state.variasi1 ? 'UP (500ms)' : 'OFF'}
                  </span>
                </div>

                <div className="flex items-center justify-between bg-slate-50 p-2 border-2 border-slate-900">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${state.variasi2 ? 'bg-pink-600 animate-pulse' : 'bg-slate-300'}`} />
                    <span className="text-[11px] text-slate-800 font-bold">Variasi Lampu 2</span>
                  </div>
                  <span className={`text-[8px] font-mono px-2 py-0.5 border border-slate-900 font-bold ${state.variasi2 ? 'bg-pink-100 text-pink-800' : 'bg-white text-slate-400'}`}>
                    {state.variasi2 ? 'UP (700ms)' : 'OFF'}
                  </span>
                </div>
              </div>

              <p className="text-[9px] font-mono text-slate-500 leading-tight">
                {state.variasi1 ? '💡 1 & 2 bergantian otomatis.' : state.variasi2 ? '💡 3 & 4 bergantian otomatis.' : 'Menunggu pemicu (Telegram / Dashboard).'}
              </p>
            </div>

          </div>

          {/* 4-Channel Relay Board and Light Bulbs */}
          <div className="bg-white p-4 border-2 border-slate-900">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-black text-slate-900 flex items-center gap-1.5 uppercase">
                <Layers className="w-3.5 h-3.5" />
                Relay module & Lamp load (5V DC)
              </span>
              <span className="text-[9px] font-mono text-slate-500 bg-amber-200 border border-slate-900 px-1 font-bold">INVERTED TRIGGER / LOW</span>
            </div>

            {/* Bulbs Grid */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { id: 1, name: 'Lampu 1', pin: 'D25', state: state.relay1 },
                { id: 2, name: 'Lampu 2', pin: 'D26', state: state.relay2 },
                { id: 3, name: 'Lampu 3', pin: 'D27', state: state.relay3 },
                { id: 4, name: 'Lampu 4', pin: 'D14', state: state.relay4 }
              ].map((relay) => (
                <div 
                  key={relay.id} 
                  className={`relative cursor-pointer transition-all duration-200 border-2 rounded-none p-3 flex flex-col items-center select-none ${
                    relay.state 
                      ? 'bg-amber-100 border-slate-900 shadow-[2px_2px_0px_rgba(15,23,42,1)]' 
                      : 'bg-white border-slate-300 hover:border-slate-900'
                  }`}
                  onClick={() => onToggleRelay(relay.id)}
                >
                  {/* Pin label */}
                  <span className="absolute top-1 right-1.5 text-[7px] font-mono font-bold text-slate-500">{relay.pin}</span>
                  
                  {/* Virtual bulb element */}
                  <div className="relative my-2">
                    <motion.div
                      animate={{
                        scale: relay.state ? [1, 1.05, 1] : 1,
                      }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                      className={`relative w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 border-2 ${
                        relay.state 
                          ? 'bg-amber-400 border-slate-900 text-slate-900 shadow-[0_0_12px_rgba(251,191,36,0.6)]' 
                          : 'bg-slate-100 border-slate-350 text-slate-400'
                      }`}
                    >
                      <Lightbulb className={`w-5.5 h-5.5 ${relay.state ? 'stroke-[2.5]' : 'stroke-[1.5]'}`} />
                    </motion.div>
                    
                    {/* Tiny Relay Status Light */}
                    <span className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border border-slate-950 flex items-center justify-center ${relay.state ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  </div>

                  <span className="text-[10px] font-mono font-black text-slate-800 mt-1">{relay.name}</span>
                  
                  {/* Relay module state label */}
                  <span className={`text-[7px] font-mono px-1.5 py-0.5 border border-slate-900 mt-1.5 uppercase font-bold ${relay.state ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                    {relay.state ? 'Relay Low' : 'Relay High'}
                  </span>
                </div>
              ))}
            </div>
            
            <p className="text-[9px] text-slate-500 text-center mt-3 font-mono">
              *Klik kotak lampu untuk menyalasi trigger pin secara manual
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

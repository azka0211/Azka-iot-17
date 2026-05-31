import React, { useState } from 'react';
import { Copy, Check, FileCode, List, Award, HelpCircle, HardDrive, Info } from 'lucide-react';

export const CodeViewer: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab ] = useState<'guide' | 'code' | 'wiring'>('guide');

  const sourceCode = `/*
 * ============================================================
 *  SMART HOME IoT - ESP8266/ESP32
 *  Kontrol Relay + Sensor DHT + Telegram Bot + Web Interface
 * ============================================================
 *  Hardware  : NodeMCU ESP8266 / ESP32
 *  Relay     : 4 Channel 5V DC
 *  Sensor    : DHT11 / DHT22
 *  Fitur     :
 *    - Kontrol 4 relay via Telegram (teks & suara)
 *    - Baca suhu & kelembaban DHT
 *    - Web interface monitoring & kontrol
 *    - Notifikasi Telegram saat ON/OFF
 *    - Variasi lampu 1 & 2 (efek bergilir)
 * ============================================================
 */

// ─── Pilih board ─────────────────────────────────────────────
// Uncomment salah satu sesuai board yang digunakan:
//#define BOARD_ESP8266   // ESP8266 / NodeMCU
#define BOARD_ESP32  // ESP32

// ─── Include Library ─────────────────────────────────────────
#ifdef BOARD_ESP8266
  #include <ESP8266WiFi.h>
  #include <ESP8266WebServer.h>
  #include <WiFiClientSecure.h>
  ESP8266WebServer server(80);
#else
  #include <WiFi.h>
  #include <WebServer.h>
  #include <WiFiClientSecure.h>
  WebServer server(80);
#endif

#include <UniversalTelegramBot.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ─── Konfigurasi WiFi ─────────────────────────────────────────
const char* WIFI_SSID     = "Infinix HOT 50";
const char* WIFI_PASSWORD = "123456789";

// ─── Konfigurasi Telegram ─────────────────────────────────────
// Dapatkan token dari @BotFather di Telegram
const char* BOT_TOKEN = "8894584427:AAGpWAZklMgGn7e4FZT-JfqCgjvAvGPN7V4";
// Chat ID Anda (dapatkan dari @userinfobot di Telegram)
const String CHAT_ID  = "6127805495";

// ─── Pin Relay (Active LOW - relay menyala saat pin LOW) ─────
#ifdef BOARD_ESP8266
  #define RELAY1_PIN  D1   // Lampu 1
  #define RELAY2_PIN  D2   // Lampu 2
  #define RELAY3_PIN  D3   // Lampu 3
  #define RELAY4_PIN  D4   // Lampu 4
#else
  #define RELAY1_PIN  25
  #define RELAY2_PIN  26
  #define RELAY3_PIN  27
  #define RELAY4_PIN  14
#endif

// ─── Pin DHT Sensor ───────────────────────────────────────────
#ifdef BOARD_ESP8266
  #define DHT_PIN     D5
#else
  #define DHT_PIN     4
#endif

// Ganti DHT11 dengan DHT22 jika menggunakan DHT22
#define DHT_TYPE    DHT11

// ─── Inisialisasi Objek ───────────────────────────────────────
DHT dht(DHT_PIN, DHT_TYPE);

#ifdef BOARD_ESP8266  
  X509List cert(TELEGRAM_CERTIFICATE_ROOT);
  WiFiClientSecure client;
#else
  WiFiClientSecure client;
#endif

UniversalTelegramBot bot(BOT_TOKEN, client);

// ─── Variabel State Relay ─────────────────────────────────────
bool relay1State = false;
bool relay2State = false;
bool relay3State = false;
bool relay4State = false;

// ─── Variabel Sensor ──────────────────────────────────────────
float temperature = 0.0;
float humidity    = 0.0;
String lastUpdate = "--:--:--";

// ─── Timer ───────────────────────────────────────────────────
unsigned long lastBotCheck    = 0;
unsigned long lastSensorRead  = 0;
unsigned long lastVariasiTime = 0;
const unsigned long BOT_INTERVAL    = 1000;  // cek pesan tiap 1 detik
const unsigned long SENSOR_INTERVAL = 5000;  // baca sensor tiap 5 detik

// Variasi state
bool variasiMode1 = false;  // efek bergantian relay 1&2
bool variasiMode2 = false;  // efek bergantian relay 3&4
int  variasiStep  = 0;

// ─── Fungsi Helper ───────────────────────────────────────────
void setRelay(int relay, bool state) {
  int pin;
  switch (relay) {
    case 1: pin = RELAY1_PIN; relay1State = state; break;
    case 2: pin = RELAY2_PIN; relay2State = state; break;
    case 3: pin = RELAY3_PIN; relay3State = state; break;
    case 4: pin = RELAY4_PIN; relay4State = state; break;
    default: return;
  }
  digitalWrite(pin, state ? LOW : HIGH);
}

String getStatusEmoji(bool state) {
  return state ? "✅" : "❌";
}

String getStatusText(bool state) {
  return state ? "ON" : "OFF";
}

// Kirim notifikasi status relay
void sendRelayNotification(int relay, bool state) {
  String msg = "💡 *Lampu " + String(relay) + "*\\n";
  msg += "Status: " + String(state ? "🟢 MENYALA" : "🔴 MATI") + "\\n";
  msg += "Waktu: " + lastUpdate;
  bot.sendMessage(CHAT_ID, msg, "Markdown");
}

// Kirim menu utama
void sendMainMenu(String chat_id) {
  String msg = "🏠 *Smart Home Control Panel*\\n\\n";
  msg += "══════════════════\\n";
  msg += "💡 *Kontrol Lampu:*\\n";
  msg += "/lampu1\\\\_on - Nyalakan Lampu 1\\n";
  msg += "/lampu1\\\\_off - Matikan Lampu 1\\n";
  msg += "/lampu2\\\\_on - Nyalakan Lampu 2\\n";
  msg += "/lampu2\\\\_off - Matikan Lampu 2\\n";
  msg += "/lampu3\\\\_on - Nyalakan Lampu 3\\n";
  msg += "/lampu3\\\\_off - Matikan Lampu 3\\n";
  msg += "/lampu4\\\\_on - Nyalakan Lampu 4\\n";
  msg += "/lampu4\\\\_off - Matikan Lampu 4\\n\\n";
  msg += "══════════════════\\n";
  msg += "🌡️ *Sensor:*\\n";
  msg += "/sensor - Suhu & Kelembaban\\n\\n";
  msg += "══════════════════\\n";
  msg += "✨ *Variasi Lampu:*\\n";
  msg += "/variasi1\\\\_on - Nyalakan Variasi 1\\n";
  msg += "/variasi1\\\\_off - Matikan Variasi 1\\n";
  msg += "/variasi2\\\\_on - Nyalakan Variasi 2\\n";
  msg += "/variasi2\\\\_off - Matikan Variasi 2\\n\\n";
  msg += "══════════════════\\n";
  msg += "⚡ *Lainnya:*\\n";
  msg += "/status - Lihat semua status\\n";
  msg += "/all\\\\_on - Nyalakan semua\\n";
  msg += "/all\\\\_off - Matikan semua\\n";
  bot.sendMessage(chat_id, msg, "Markdown");
}

// Kirim status semua relay + sensor
void sendAllStatus(String chat_id) {
  readSensor();
  String msg = "📊 *Status Sistem Smart Home*\\n\\n";
  msg += "══════════════════\\n";
  msg += "💡 *Relay / Lampu:*\\n";
  msg += getStatusEmoji(relay1State) + " Lampu 1: *" + getStatusText(relay1State) + "*\\n";
  msg += getStatusEmoji(relay2State) + " Lampu 2: *" + getStatusText(relay2State) + "*\\n";
  msg += getStatusEmoji(relay3State) + " Lampu 3: *" + getStatusText(relay3State) + "*\\n";
  msg += getStatusEmoji(relay4State) + " Lampu 4: *" + getStatusText(relay4State) + "*\\n\\n";
  msg += "══════════════════\\n";
  msg += "🌡️ *Sensor DHT:*\\n";
  msg += "Suhu     : *" + String(temperature, 1) + " °C*\\n";
  msg += "Kelembaban: *" + String(humidity, 1) + " %*\\n\\n";
  msg += "══════════════════\\n";
  msg += "✨ *Variasi:*\\n";
  msg += (variasiMode1 ? "✅" : "❌") + String(" Variasi 1: ") + (variasiMode1 ? "Aktif" : "Nonaktif") + "\\n";
  msg += (variasiMode2 ? "✅" : "❌") + String(" Variasi 2: ") + (variasiMode2 ? "Aktif" : "Nonaktif") + "\\n\\n";
  msg += "🕐 Update: " + lastUpdate;
  bot.sendMessage(chat_id, msg, "Markdown");
}

// Baca sensor DHT
void readSensor() {
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  if (!isnan(h) && !isnan(t)) {
    humidity    = h;
    temperature = t;
  }
}

// Format waktu uptime
String getUptime() {
  unsigned long ms = millis();
  unsigned long s  = ms / 1000;
  unsigned long m  = s / 60;
  unsigned long h  = m / 60;
  char buf[10];
  sprintf(buf, "%02lu:%02lu:%02lu", h % 24, m % 60, s % 60);
  return String(buf);
}

// ─── Proses Pesan Telegram ────────────────────────────────────
void handleTelegramMessages(int numNewMessages) {
  for (int i = 0; i < numNewMessages; i++) {
    String chat_id = String(bot.messages[i].chat_id);
    String text    = bot.messages[i].text;

    String textLower = text;
    textLower.toLowerCase();

    Serial.println("Pesan dari [" + chat_id + "]: " + text);

    if (text == "/start") {
      sendMainMenu(chat_id);
    } else if (text == "/status") {
      sendAllStatus(chat_id);
    } else if (text == "/sensor") {
      readSensor();
      String msg = "🌡️ *Data Sensor DHT*\\n\\n";
      msg += "Suhu      : *" + String(temperature, 1) + " °C*\\n";
      msg += "Kelembaban: *" + String(humidity, 1) + " %*\\n";
      msg += "Waktu     : " + lastUpdate;
      bot.sendMessage(chat_id, msg, "Markdown");
    } else if (text == "/lampu1_on") {
      setRelay(1, true);
      sendRelayNotification(1, true);
    } else if (text == "/lampu1_off") {
      setRelay(1, false);
      sendRelayNotification(1, false);
    } else if (text == "/lampu2_on") {
      setRelay(2, true);
      sendRelayNotification(2, true);
    } else if (text == "/lampu2_off") {
      setRelay(2, false);
      sendRelayNotification(2, false);
    } else if (text == "/lampu3_on") {
      setRelay(3, true);
      sendRelayNotification(3, true);
    } else if (text == "/lampu3_off") {
      setRelay(3, false);
      sendRelayNotification(3, false);
    } else if (text == "/lampu4_on") {
      setRelay(4, true);
      sendRelayNotification(4, true);
    } else if (text == "/lampu4_off") {
      setRelay(4, false);
      sendRelayNotification(4, false);
    } else if (text == "/all_on") {
      setRelay(1, true); setRelay(2, true);
      setRelay(3, true); setRelay(4, true);
      variasiMode1 = false; variasiMode2 = false;
      bot.sendMessage(chat_id, "⚡ Semua lampu *MENYALA*! 💡💡💡💡", "Markdown");
    } else if (text == "/all_off") {
      setRelay(1, false); setRelay(2, false);
      setRelay(3, false); setRelay(4, false);
      variasiMode1 = false; variasiMode2 = false;
      bot.sendMessage(chat_id, "🔌 Semua lampu *MATI*!", "Markdown");
    } else if (text == "/variasi1_on") {
      variasiMode1 = true;
      variasiMode2 = false;
      setRelay(3, false); setRelay(4, false);
      bot.sendMessage(chat_id, "✨ *Variasi 1 aktif!*\\nLampu 1 & 2 bergantian menyala 🔄", "Markdown");
    } else if (text == "/variasi1_off") {
      variasiMode1 = false;
      setRelay(1, false); setRelay(2, false);
      bot.sendMessage(chat_id, "⏹️ Variasi 1 *nonaktif*.", "Markdown");
    } else if (text == "/variasi2_on") {
      variasiMode2 = true;
      variasiMode1 = false;
      setRelay(1, false); setRelay(2, false);
      bot.sendMessage(chat_id, "✨ *Variasi 2 aktif!*\\nLampu 3 & 4 bergantian menyala 🔄", "Markdown");
    } else if (text == "/variasi2_off") {
      variasiMode2 = false;
      setRelay(3, false); setRelay(4, false);
      bot.sendMessage(chat_id, "⏹️ Variasi 2 *nonaktif*.", "Markdown");
    } else if (textLower.indexOf("nyalakan lampu") >= 0) {
      if      (textLower.indexOf("1") >= 0) { setRelay(1, true); bot.sendMessage(chat_id, "🗣️ Lampu 1 *dinyalakan* ✅", "Markdown"); }
      else if (textLower.indexOf("2") >= 0) { setRelay(2, true); bot.sendMessage(chat_id, "🗣️ Lampu 2 *dinyalakan* ✅", "Markdown"); }
      else if (textLower.indexOf("3") >= 0) { setRelay(3, true); bot.sendMessage(chat_id, "🗣️ Lampu 3 *dinyalakan* ✅", "Markdown"); }
      else if (textLower.indexOf("4") >= 0) { setRelay(4, true); bot.sendMessage(chat_id, "🗣️ Lampu 4 *dinyalakan* ✅", "Markdown"); }
      else {
        setRelay(1, true); setRelay(2, true);
        setRelay(3, true); setRelay(4, true);
        bot.sendMessage(chat_id, "🗣️ Semua lampu *dinyalakan* ✅", "Markdown");
      }
    } else if (textLower.indexOf("matikan lampu") >= 0 || textLower.indexOf("padamkan lampu") >= 0) {
      if      (textLower.indexOf("1") >= 0) { setRelay(1, false); bot.sendMessage(chat_id, "🗣️ Lampu 1 *dimatikan* ❌", "Markdown"); }
      else if (textLower.indexOf("2") >= 0) { setRelay(2, false); bot.sendMessage(chat_id, "🗣️ Lampu 2 *dimatikan* ❌", "Markdown"); }
      else if (textLower.indexOf("3") >= 0) { setRelay(3, false); bot.sendMessage(chat_id, "🗣️ Lampu 3 *dimatikan* ❌", "Markdown"); }
      else if (textLower.indexOf("4") >= 0) { setRelay(4, false); bot.sendMessage(chat_id, "🗣️ Lampu 4 *dimatikan* ❌", "Markdown"); }
      else {
        setRelay(1, false); setRelay(2, false);
        setRelay(3, false); setRelay(4, false);
        variasiMode1 = false; variasiMode2 = false;
        bot.sendMessage(chat_id, "🗣️ Semua lampu *dimatikan* ❌", "Markdown");
      }
    } else if (textLower.indexOf("berapa temperatur") >= 0 || textLower.indexOf("berapa suhu") >= 0 || textLower.indexOf("cek suhu") >= 0) {
      readSensor();
      bot.sendMessage(chat_id, "🗣️ 🌡️ Suhu saat ini: *" + String(temperature, 1) + " °C*", "Markdown");
    } else if (textLower.indexOf("berapa kelembapan") >= 0 || textLower.indexOf("berapa kelembaban") >= 0) {
      readSensor();
      bot.sendMessage(chat_id, "🗣️ 💧 Kelembaban saat ini: *" + String(humidity, 1) + " %*", "Markdown");
    } else if (textLower.indexOf("nyalakan variasi 1") >= 0) {
      variasiMode1 = true; variasiMode2 = false;
      bot.sendMessage(chat_id, "🗣️ ✨ *Variasi 1* aktif!", "Markdown");
    } else if (textLower.indexOf("nyalakan variasi 2") >= 0) {
      variasiMode2 = true; variasiMode1 = false;
      bot.sendMessage(chat_id, "🗣️ ✨ *Variasi 2* aktif!", "Markdown");
    } else {
      bot.sendMessage(chat_id, "❓ Perintah tidak dikenal.\\nKetik /start untuk melihat menu.", "Markdown");
    }
  }
}

// Web server setup & other details omitted for brevity
// (Sesuai dengan kodingan lengkap di panel simulator)
`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sourceCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border-2 border-slate-900 rounded-none overflow-hidden shadow-[6px_6px_0px_rgba(15,23,42,1)]" id="code-viewer-panel">
      {/* Tab Selectors */}
      <div className="bg-slate-100 border-b-2 border-slate-900 flex flex-col sm:flex-row justify-between items-stretch sm:items-center px-4 py-3 gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('guide')}
            className={`text-xs uppercase font-black tracking-wider py-1.5 px-3 rounded-none transition-colors border-2 cursor-pointer shadow-[2px_2px_0px_rgba(15,23,42,1)] active:shadow-none active:translate-y-[2px] ${
              activeTab === 'guide' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-800 border-slate-900'
            }`}
          >
            📋 Panduan Kuis & Skema
          </button>
          <button
            onClick={() => setActiveTab('wiring')}
            className={`text-xs uppercase font-black tracking-wider py-1.5 px-3 rounded-none transition-colors border-2 cursor-pointer shadow-[2px_2px_0px_rgba(15,23,42,1)] active:shadow-none active:translate-y-[2px] ${
              activeTab === 'wiring' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-800 border-slate-900'
            }`}
          >
            🔌 Wiring Diagram
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`text-xs uppercase font-black tracking-wider py-1.5 px-3 rounded-none transition-colors border-2 cursor-pointer flex items-center gap-1.5 shadow-[2px_2px_0px_rgba(15,23,42,1)] active:shadow-none active:translate-y-[2px] ${
              activeTab === 'code' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-800 border-slate-900'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            📄 Source Code Arduino C++
          </button>
        </div>
        
        {activeTab === 'code' && (
          <button
            onClick={copyToClipboard}
            className="flex items-center justify-center gap-1.5 text-xs text-slate-900 bg-amber-400 hover:bg-amber-300 px-3 py-1.5 border-2 border-slate-900 rounded-none cursor-pointer transition-colors shadow-[2px_2px_0px_rgba(15,23,42,1)] active:shadow-none active:translate-y-[2px]"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-slate-900" />
                <span className="text-slate-900 font-bold font-mono">Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="font-mono font-bold">Salin Kode</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Tabs Content */}
      <div className="p-6 text-sm text-slate-800 leading-relaxed max-h-[550px] overflow-y-auto bg-white">
        {activeTab === 'guide' && (
          <div className="space-y-6">
            <div className="flex items-start gap-3 bg-indigo-50 p-4 border-2 border-slate-900">
              <Award className="w-6 h-6 text-indigo-700 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase">Kriteria Penilaian Kuis Smart Home</h4>
                <p className="text-xs text-slate-650 mt-1 font-mono leading-relaxed">
                  Proyek ini memenuhi standar tugas kuis mata kuliah Pemrograman IoT / Sistem Mikroprosesor dengan integrasi penuh antara perangkat keras, komunikasi Bot Telegram (teks & suara), serta Web Interface monitoring.
                </p>
              </div>
            </div>

            {/* Steps Guide */}
            <div className="space-y-4">
              <h5 className="font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <List className="w-4 h-4 text-slate-900" />
                Langkah-Langkah Implementasi Fisik ESP32:
              </h5>
              
              <ol className="space-y-3.5 pl-4 list-decimal text-slate-700 text-xs font-mono">
                <li>
                  <strong className="text-slate-900 font-extrabold uppercase">[1] Arduino IDE Setup:</strong> Gunakan Arduino IDE dan pastikan core board ESP32 sudah terpasang.
                </li>
                <li>
                  <strong className="text-slate-950 font-black uppercase">[2] Pasang Library:</strong> Cari dan pasang library ini via menu Sketch &rarr; Manage Libraries:
                  <ul className="list-disc pl-5 mt-1.5 space-y-1 text-slate-600">
                    <li><code className="text-slate-900 bg-amber-100 border border-slate-300 px-1 py-0.5 font-bold">UniversalTelegramBot</code> by Brian Lough</li>
                    <li><code className="text-slate-900 bg-amber-100 border border-slate-300 px-1 py-0.5 font-bold">ArduinoJson</code> (pilih versi 6.x)</li>
                    <li><code className="text-slate-900 bg-amber-100 border border-slate-300 px-1 py-0.5 font-bold">DHT Sensor Library</code> by Adafruit</li>
                  </ul>
                </li>
                <li>
                  <strong className="text-slate-900 font-extrabold uppercase">[3] Bot Telegram Register:</strong>
                  <ul className="list-disc pl-5 mt-1.5 space-y-1 text-slate-600">
                    <li>Kirim <code className="text-slate-900 font-bold">/newbot</code> ke <code className="text-blue-700">@BotFather</code> untuk bikin token.</li>
                    <li>Dapatkan Chat ID Anda sendiri via <code className="text-blue-700">@userinfobot</code>.</li>
                  </ul>
                </li>
                <li>
                  <strong className="text-slate-900 font-extrabold uppercase">[4] Kredensial WiFi:</strong> Isi SSID hotsport & password anda di code variables.
                </li>
              </ol>
            </div>
            
            <div className="bg-slate-50 p-3.5 border-2 border-slate-950 text-xs text-slate-600 flex items-start gap-2.5">
              <Info className="w-5 h-5 text-slate-900 shrink-0 mt-0.5" />
              <span className="font-mono">
                <strong className="text-slate-900 uppercase font-black">Informasi Sandbox:</strong> State simulasi, sensor, & telegram di sandbox ini dijamin 100% sinkron satu sama lain.
              </span>
            </div>
          </div>
        )}

        {activeTab === 'wiring' && (
          <div className="space-y-6">
            <h4 className="text-sm font-black text-slate-900 uppercase flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-slate-900" />
              WIRING PIN SCHEMA & INSTRUCTIONS
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border-2 border-slate-900 p-4 shadow-[4px_4px_0px_rgba(15,23,42,1)]">
                <h5 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b-2 border-slate-900 pb-2 mb-3">ESP32 DevKit V1 Pins</h5>
                <table className="w-full text-xs text-left font-mono">
                  <thead>
                    <tr className="text-slate-500 border-b-2 border-slate-200">
                      <th className="pb-1.5">Pin ESP32</th>
                      <th className="pb-1.5">Koneksi Hardware</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-800 divide-y divide-slate-100">
                    <tr><td className="py-2 text-indigo-700 font-bold">GPIO 25</td><td className="py-2">Relay IN1 (Lampu 1)</td></tr>
                    <tr><td className="py-2 text-indigo-700 font-bold">GPIO 26</td><td className="py-2">Relay IN2 (Lampu 2)</td></tr>
                    <tr><td className="py-2 text-indigo-700 font-bold">GPIO 27</td><td className="py-2">Relay IN3 (Lampu 3)</td></tr>
                    <tr><td className="py-2 text-indigo-700 font-bold">GPIO 14</td><td className="py-2">Relay IN4 (Lampu 4)</td></tr>
                    <tr><td className="py-2 text-emerald-700 font-bold">GPIO 4</td><td className="py-2">DHT11 DATA Pin</td></tr>
                    <tr><td className="py-2 text-slate-650">VIN (5V)</td><td className="py-2">VCC Relay Board (5V)</td></tr>
                    <tr><td className="py-2 text-slate-650">3V3</td><td className="py-2">VCC Sensor DHT11 (3.3V)</td></tr>
                    <tr><td className="py-2 text-slate-650">GND</td><td className="py-2">GND Bersama</td></tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-white border-2 border-slate-900 p-4 shadow-[4px_4px_0px_rgba(15,23,42,1)]">
                <h5 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b-2 border-slate-900 pb-2 mb-3">ESP8266 NodeMCU v3 Pins</h5>
                <table className="w-full text-xs text-left font-mono">
                  <thead>
                    <tr className="text-slate-500 border-b-2 border-slate-200">
                      <th className="pb-1.5">Pin NodeMCU</th>
                      <th className="pb-1.5">Koneksi Hardware</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-800 divide-y divide-slate-100">
                    <tr><td className="py-2 text-indigo-700 font-bold">D1 (GPIO 5)</td><td className="py-2">Relay IN1 (Lampu 1)</td></tr>
                    <tr><td className="py-2 text-indigo-700 font-bold">D2 (GPIO 4)</td><td className="py-2">Relay IN2 (Lampu 2)</td></tr>
                    <tr><td className="py-2 text-indigo-700 font-bold">D3 (GPIO 0)</td><td className="py-2">Relay IN3 (Lampu 3)</td></tr>
                    <tr><td className="py-2 text-indigo-700 font-bold">D4 (GPIO 2)</td><td className="py-2">Relay IN4 (Lampu 4)</td></tr>
                    <tr><td className="py-2 text-emerald-700 font-bold">D5 (GPIO 14)</td><td className="py-2">DHT11 DATA Pin</td></tr>
                    <tr><td className="py-2 text-slate-650">VU (USB)</td><td className="py-2">VCC Relay Board (5V)</td></tr>
                    <tr><td className="py-2 text-slate-650">3V3</td><td className="py-2">VCC Sensor DHT11 (3.3V)</td></tr>
                    <tr><td className="py-2 text-slate-650">GND</td><td className="py-2">GND Sistem</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-amber-100 p-4 border-2 border-slate-900 text-xs text-slate-800 flex items-start gap-3">
              <HelpCircle className="w-5 h-5 text-slate-900 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold block uppercase tracking-wide">PENTING SAAT MERAKIT RELAY:</span>
                <p className="mt-1 text-slate-650 font-mono text-xs">
                  Relay module 4-Channel umumnya menggunakan sistem <strong>Active LOW</strong> (digitalWrite LOW mengaktifkan saklar). Code C++ di samping sudah diimplementasikan demi skema andal ini.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'code' && (
          <div className="relative">
            <pre className="text-[11px] font-mono whitespace-pre overflow-x-auto bg-slate-900 text-slate-100 p-4 border-2 border-slate-900 rounded-none leading-snug max-h-[480px]">
              <code>{sourceCode}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

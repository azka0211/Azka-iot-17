export interface IoTState {
  temperature: number;
  humidity: number;
  relay1: boolean;
  relay2: boolean;
  relay3: boolean;
  relay4: boolean;
  variasi1: boolean;
  variasi2: boolean;
  wifiConnected: boolean;
  ipAddress: string;
  botToken: string;
  chatId: string;
  lastUpdateTime: string;
}

export interface TelegramMessage {
  id: string;
  sender: 'user' | 'bot';
  senderName: string;
  text: string;
  timestamp: string;
  isVoiceSim?: boolean;
}

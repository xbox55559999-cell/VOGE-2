
export interface VehicleObj {
  vin: string;
  sale_date?: string;
}

export type Vehicle = VehicleObj | string;

export interface Offer {
  count_sold?: number;
  count_free?: number;
  name: string;
  total_sold_price?: number;
  total_buy_price?: number;
  vehicles?: Record<string, Vehicle>;
}

export interface Model {
  name: string;
  url: string;
  offers?: Record<string, Offer>;
}

export interface Dealer {
  name: string;
  city?: string; // City from data source
  count_sold?: number;
  count_free?: number;
  total_buy_price?: number;
  total_sold_price?: number;
  url: string;
  models?: Record<string, Model>;
}

export interface RawData {
  total: {
    count_sold?: number;
    count_free?: number;
    total_sold_price?: number;
    total_buy_price?: number;
  };
  items: Record<string, Dealer>;
}

export interface SaleRecord {
  id: string;
  dealerName: string;
  city: string; // New field for City
  brand: string; // New field for Brand (Mark)
  modelName: string;
  offerName: string;
  vin: string;
  saleDate: Date;
  year: number;
  month: number; // 0-11
  buyPrice: number; // Cost
  soldPrice: number; // Revenue
  margin: number; // Revenue - Cost
}

export interface SalesTarget {
    period: string; // e.g., "Month"
    revenueTarget: number;
    unitsTarget: number;
    marginTarget: number;
}

export type UserRole = 'admin' | 'analyst' | 'user';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  password?: string; // Only used internally for check, not stored in state usually
  lastLogin?: Date;
  isActive: boolean;
}

// Messenger Types
export type Platform = 'telegram' | 'whatsapp' | 'website';

export interface ChatMessage {
    id: string;
    chatId: string;
    text: string;
    isOutbound: boolean; // true = sent by admin, false = received from client
    timestamp: number;
    isRead: boolean;
    isEdited?: boolean;
}

export interface ChatSession {
    id: string;
    platform: Platform;
    contactName: string;
    contactPhone?: string; // or username
    avatarUrl?: string;
    lastMessageText: string;
    lastMessageTime: number;
    unreadCount: number;
    isPinned?: boolean;
}

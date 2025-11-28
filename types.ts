export interface Vehicle {
  vin: string;
  sale_date?: string;
}

export interface Offer {
  count_sold: number;
  name: string;
  total_sold_price: number;
  total_buy_price: number;
  vehicles: Record<string, Vehicle>;
}

export interface Model {
  name: string;
  url: string;
  offers: Record<string, Offer>;
}

export interface Dealer {
  name: string;
  count_sold: number;
  total_buy_price: number;
  total_sold_price: number;
  url: string;
  models: Record<string, Model>;
}

export interface RawData {
  total: {
    count_sold: number;
    total_sold_price: number;
    total_buy_price: number;
  };
  items: Record<string, Dealer>;
}

export interface SaleRecord {
  id: string;
  dealerName: string;
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
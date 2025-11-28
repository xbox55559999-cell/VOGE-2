import { RawData, SaleRecord } from '../types';

// Helper to parse DD.MM.YYYY
const parseDate = (dateStr: string | undefined): Date => {
  if (!dateStr) return new Date(0); // Return epoch if date is missing
  const parts = dateStr.split('.');
  if (parts.length !== 3) return new Date(0);
  // Month is 0-indexed in JS Date
  return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
};

// Helper to determine brand from model name
const determineBrand = (modelName: string): string => {
  const lowerName = modelName.toLowerCase();
  if (lowerName.includes('voge')) return 'VOGE';
  if (lowerName.includes('loncin')) return 'Loncin';
  return 'Другое';
};

export const processData = (data: RawData): SaleRecord[] => {
  const records: SaleRecord[] = [];

  if (!data || !data.items) return records;

  // Iterate Dealers
  Object.entries(data.items).forEach(([dealerId, dealer]) => {
    if (!dealer.models) return;

    // Iterate Models
    Object.entries(dealer.models).forEach(([modelId, model]) => {
      
      const brand = determineBrand(model.name);

      if (!model.offers) return;

      // Iterate Offers (Variants)
      Object.entries(model.offers).forEach(([offerId, offer]) => {
        // To calculate individual unit price averages (since JSON gives totals per offer)
        // We will distribute the totals evenly among the sold vehicles in this offer block
        // This is an approximation based on the structure, assuming vehicles in same offer group have similar pricing
        const count = offer.count_sold;
        const avgBuyPrice = count > 0 ? offer.total_buy_price / count : 0;
        const avgSoldPrice = count > 0 ? offer.total_sold_price / count : 0;

        if (!offer.vehicles) return;

        // Iterate Vehicles (Individual Sales)
        Object.entries(offer.vehicles).forEach(([vehicleId, vehicle]) => {
          const saleDate = parseDate(vehicle.sale_date);
          
          records.push({
            id: `${dealerId}-${modelId}-${offerId}-${vehicleId}`,
            dealerName: dealer.name,
            brand: brand,
            modelName: model.name,
            offerName: offer.name,
            vin: vehicle.vin || 'N/A',
            saleDate: saleDate,
            year: saleDate.getFullYear(),
            month: saleDate.getMonth(),
            buyPrice: avgBuyPrice,
            soldPrice: avgSoldPrice,
            margin: avgSoldPrice - avgBuyPrice
          });
        });
      });
    });
  });

  return records.sort((a, b) => b.saleDate.getTime() - a.saleDate.getTime());
};

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value);
};

export const formatNumber = (value: number) => {
  return new Intl.NumberFormat('ru-RU').format(value);
};
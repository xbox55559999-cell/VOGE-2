
import React, { useMemo, useState } from 'react';
import { SaleRecord } from '../types';
import { formatCurrency, formatNumber } from '../services/dataProcessor';
import { ArrowUpDown, Box, Wallet, FileText, ChevronDown, ChevronRight, Tag, Layers, Users, LayoutList } from 'lucide-react';
import { StatCard } from './StatCard';

interface InventoryViewProps {
  records: SaleRecord[];
  salesRecords: SaleRecord[];
}

type SortField = 'name' | 'units' | 'stockValue' | 'avgCost';
type NestedSortField = 'name' | 'units' | 'stockValue' | 'avgCost';

export const InventoryView: React.FC<InventoryViewProps> = ({ records, salesRecords }) => {
  const [viewMode, setViewMode] = useState<'dealers' | 'models'>('dealers');
  
  const [sortField, setSortField] = useState<SortField>('stockValue');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // State for nested table sorting
  const [nestedSortField, setNestedSortField] = useState<NestedSortField>('stockValue');
  const [nestedSortDirection, setNestedSortDirection] = useState<'asc' | 'desc'>('desc');
  
  const [expandedDealer, setExpandedDealer] = useState<string | null>(null);
  const [expandedModel, setExpandedModel] = useState<string | null>(null);
  const [expandedOffer, setExpandedOffer] = useState<string | null>(null); // Key: "ModelName|OfferName"

  // Generate Map of Model -> Avg Sales Price (Sold Price) from historical Sales Data
  const modelPricing = useMemo(() => {
    const map = new Map<string, number>();
    const sums = new Map<string, { revenue: number; units: number }>();

    salesRecords.forEach(r => {
        const current = sums.get(r.modelName) || { revenue: 0, units: 0 };
        sums.set(r.modelName, {
            revenue: current.revenue + r.soldPrice,
            units: current.units + 1
        });
    });

    sums.forEach((val, key) => {
        // Calculate average sold price
        if (val.units > 0) {
            map.set(key, val.revenue / val.units);
        }
    });

    return map;
  }, [salesRecords]);

  // Helper to get value of a single inventory record
  const getRecordValue = (record: SaleRecord) => {
      const historicalAvg = modelPricing.get(record.modelName);
      // Use historical average sales price if available (Potential Revenue), 
      // otherwise fallback to the buyPrice (Cost) in the inventory file
      return historicalAvg || record.buyPrice || 0;
  };

  // Calculate Total KPIs
  const kpi = useMemo(() => {
    const totalUnits = records.length;
    
    // Summing up the calculated value for all records
    const totalStockValue = records.reduce((sum, r) => sum + getRecordValue(r), 0);
    
    const dealersCount = new Set(records.map(r => r.dealerName)).size;
    const modelsCount = new Set(records.map(r => r.modelName)).size;
    return { totalUnits, totalStockValue, dealersCount, modelsCount };
  }, [records, modelPricing]); // Added modelPricing dependency

  // --- DEALER VIEW LOGIC ---

  // Group by Dealer
  const dealersInventory = useMemo(() => {
    const map = new Map<string, { 
      name: string; 
      units: number; 
      stockValue: number; 
    }>();

    records.forEach(r => {
      const current = map.get(r.dealerName) || { name: r.dealerName, units: 0, stockValue: 0 };
      const itemValue = getRecordValue(r);

      map.set(r.dealerName, {
        name: r.dealerName,
        units: current.units + 1,
        stockValue: current.stockValue + itemValue,
      });
    });

    return Array.from(map.values()).map(d => ({
      ...d,
      avgCost: d.units > 0 ? d.stockValue / d.units : 0
    }));
  }, [records, modelPricing]);

  // Sort Data (Dealers)
  const sortedInventory = useMemo(() => {
    return [...dealersInventory].sort((a, b) => {
      const factor = sortDirection === 'asc' ? 1 : -1;
      if (sortField === 'name') return a.name.localeCompare(b.name) * factor;
      return (a[sortField] - b[sortField]) * factor;
    });
  }, [dealersInventory, sortField, sortDirection]);

  // Get models for expanded dealer
  const getDealerModels = (dealerName: string) => {
    const dealerRecords = records.filter(r => r.dealerName === dealerName);
    const modelMap = new Map<string, { units: number, stockValue: number }>();

    dealerRecords.forEach(r => {
        const current = modelMap.get(r.modelName) || { units: 0, stockValue: 0 };
        const itemValue = getRecordValue(r);

        modelMap.set(r.modelName, {
            units: current.units + 1,
            stockValue: current.stockValue + itemValue
        });
    });

    const models = Array.from(modelMap.entries())
        .map(([name, stats]) => ({ name, ...stats, avgCost: stats.stockValue / stats.units }));
    
    return models.sort((a, b) => {
        const factor = nestedSortDirection === 'asc' ? 1 : -1;
        if (nestedSortField === 'name') return a.name.localeCompare(b.name) * factor;
        return (a[nestedSortField] - b[nestedSortField]) * factor;
    });
  };

  // --- MODEL VIEW LOGIC ---

  // Group by Model
  const modelsInventory = useMemo(() => {
    const map = new Map<string, { name: string; units: number; stockValue: number }>();

    records.forEach(r => {
        const current = map.get(r.modelName) || { name: r.modelName, units: 0, stockValue: 0 };
        const itemValue = getRecordValue(r);

        map.set(r.modelName, {
            name: r.modelName,
            units: current.units + 1,
            stockValue: current.stockValue + itemValue
        });
    });

    return Array.from(map.values()).map(m => ({
        ...m,
        avgCost: m.units > 0 ? m.stockValue / m.units : 0
    })).sort((a, b) => b.stockValue - a.stockValue); // Default sort by value
  }, [records, modelPricing]);

  // Get Offers for Model
  const getOffersForModel = (modelName: string) => {
      const modelRecords = records.filter(r => r.modelName === modelName);
      const offerMap = new Map<string, { name: string; units: number; stockValue: number }>();

      modelRecords.forEach(r => {
          const current = offerMap.get(r.offerName) || { name: r.offerName, units: 0, stockValue: 0 };
          const itemValue = getRecordValue(r);
          
          offerMap.set(r.offerName, {
              name: r.offerName,
              units: current.units + 1,
              stockValue: current.stockValue + itemValue
          });
      });

      return Array.from(offerMap.values()).sort((a, b) => b.units - a.units);
  };

  // Get Dealers for Offer
  const getDealersForOffer = (modelName: string, offerName: string) => {
      const offerRecords = records.filter(r => r.modelName === modelName && r.offerName === offerName);
      const dealerMap = new Map<string, { name: string; units: number; stockValue: number }>();

      offerRecords.forEach(r => {
          const current = dealerMap.get(r.dealerName) || { name: r.dealerName, units: 0, stockValue: 0 };
          const itemValue = getRecordValue(r);

          dealerMap.set(r.dealerName, {
              name: r.dealerName,
              units: current.units + 1,
              stockValue: current.stockValue + itemValue
          });
      });

      return Array.from(dealerMap.values()).sort((a, b) => b.units - a.units);
  };


  // --- HANDLERS ---

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleNestedSort = (field: NestedSortField) => {
    if (nestedSortField === field) {
      setNestedSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setNestedSortField(field);
      setNestedSortDirection('desc');
    }
  };

  const toggleExpandDealer = (dealerName: string) => {
    setExpandedDealer(prev => prev === dealerName ? null : dealerName);
  };

  const toggleExpandModel = (modelName: string) => {
      setExpandedModel(prev => prev === modelName ? null : modelName);
      setExpandedOffer(null); // Close deeper levels
  };

  const toggleExpandOffer = (modelName: string, offerName: string) => {
      const key = `${modelName}|${offerName}`;
      setExpandedOffer(prev => prev === key ? null : key);
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-slate-300 ml-1 inline" />;
    return <ArrowUpDown className={`w-3 h-3 ml-1 inline ${sortDirection === 'asc' ? 'text-indigo-600 rotate-180' : 'text-indigo-600'}`} />;
  };

  const renderNestedSortIcon = (field: NestedSortField) => {
    if (nestedSortField !== field) return <ArrowUpDown className="w-3 h-3 text-slate-300 ml-1 inline" />;
    return <ArrowUpDown className={`w-3 h-3 ml-1 inline ${nestedSortDirection === 'asc' ? 'text-indigo-600 rotate-180' : 'text-indigo-600'}`} />;
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Остатки дилеров</h2>
          <p className="text-slate-500 mt-1">Анализ стока техники и стоимости склада (оценка по средним ценам продаж)</p>
        </div>

        {/* View Switcher */}
        <div className="bg-slate-100 p-1 rounded-xl flex">
            <button 
                onClick={() => setViewMode('dealers')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    viewMode === 'dealers' 
                    ? 'bg-white text-indigo-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
            >
                <Users className="w-4 h-4" />
                По дилерам
            </button>
            <button 
                onClick={() => setViewMode('models')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    viewMode === 'models' 
                    ? 'bg-white text-indigo-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
            >
                <LayoutList className="w-4 h-4" />
                По моделям
            </button>
        </div>
      </div>

      {/* Inventory KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard 
          title="Всего в наличии" 
          value={`${formatNumber(kpi.totalUnits)} шт.`} 
          subValue="Единиц техники"
          icon={<Box className="w-6 h-6" />} 
          color="blue" 
        />
        <StatCard 
          title="Стоимость склада" 
          value={formatCurrency(kpi.totalStockValue)} 
          subValue="Оценка по ценам реализации"
          icon={<Wallet className="w-6 h-6" />} 
          color="emerald" 
        />
        <StatCard 
          title="Активных дилеров" 
          value={formatNumber(kpi.dealersCount)} 
          subValue="С остатками на складе"
          icon={<FileText className="w-6 h-6" />} 
          color="indigo" 
        />
        <StatCard 
          title="Моделей в наличии" 
          value={formatNumber(kpi.modelsCount)} 
          subValue="Уникальных наименований"
          icon={<Box className="w-6 h-6" />} 
          color="amber" 
        />
      </div>

      {/* DEALERS TABLE */}
      {viewMode === 'dealers' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-900">Детализация по дилерам</h3>
            </div>
            <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                <tr>
                    <th className="px-6 py-4 w-10"></th>
                    <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('name')}>
                    Дилер {renderSortIcon('name')}
                    </th>
                    <th className="px-6 py-4 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('units')}>
                    В наличии (шт) {renderSortIcon('units')}
                    </th>
                    <th className="px-6 py-4 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('stockValue')}>
                    Стоимость склада {renderSortIcon('stockValue')}
                    </th>
                    <th className="px-6 py-4 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('avgCost')}>
                    Ср. цена модели {renderSortIcon('avgCost')}
                    </th>
                    <th className="px-6 py-4 text-left pl-8">Доля склада</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                {sortedInventory.map((dealer, index) => {
                    const share = kpi.totalStockValue > 0 ? (dealer.stockValue / kpi.totalStockValue) * 100 : 0;
                    const isExpanded = expandedDealer === dealer.name;

                    return (
                        <React.Fragment key={dealer.name}>
                            <tr 
                                onClick={() => toggleExpandDealer(dealer.name)}
                                className={`transition-colors cursor-pointer ${isExpanded ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                            >
                            <td className="px-6 py-4 text-center">
                                {isExpanded ? <ChevronDown className="w-4 h-4 text-indigo-600" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                            </td>
                            <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-500 flex items-center justify-center font-bold text-xs">
                                {index + 1}
                                </div>
                                {dealer.name}
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-slate-700">
                                {formatNumber(dealer.units)}
                            </td>
                            <td className="px-6 py-4 text-right font-semibold text-emerald-600">
                                {formatCurrency(dealer.stockValue)}
                            </td>
                            <td className="px-6 py-4 text-right text-slate-500">
                                {formatCurrency(dealer.avgCost)}
                            </td>
                            <td className="px-6 py-4 pl-8">
                                <div className="flex items-center gap-3">
                                <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div 
                                    className="h-full bg-emerald-500 rounded-full" 
                                    style={{ width: `${share}%` }}
                                    ></div>
                                </div>
                                <span className="text-xs text-slate-500">{share.toFixed(1)}%</span>
                                </div>
                            </td>
                            </tr>
                            {isExpanded && (
                                <tr>
                                    <td colSpan={6} className="p-0">
                                        <div className="bg-slate-50 px-12 py-6 border-y border-slate-100 shadow-inner">
                                            <h4 className="text-xs font-bold uppercase text-slate-500 mb-4 flex items-center gap-2">
                                                <Tag className="w-4 h-4" />
                                                Модели в наличии: {dealer.name}
                                            </h4>
                                            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                                <table className="w-full">
                                                    <thead className="bg-slate-50 text-xs font-medium text-slate-500">
                                                        <tr>
                                                            <th className="px-6 py-3 text-left cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleNestedSort('name')}>
                                                                Модель {renderNestedSortIcon('name')}
                                                            </th>
                                                            <th className="px-6 py-3 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleNestedSort('units')}>
                                                                Количество (шт) {renderNestedSortIcon('units')}
                                                            </th>
                                                            <th className="px-6 py-3 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleNestedSort('stockValue')}>
                                                                Стоимость склада {renderNestedSortIcon('stockValue')}
                                                            </th>
                                                            <th className="px-6 py-3 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleNestedSort('avgCost')}>
                                                                Ср. цена {renderNestedSortIcon('avgCost')}
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 text-sm">
                                                        {getDealerModels(dealer.name).map((model) => (
                                                            <tr key={model.name} className="hover:bg-indigo-50/50 transition-colors">
                                                                <td className="px-6 py-3 font-medium text-slate-700">{model.name}</td>
                                                                <td className="px-6 py-3 text-right">{formatNumber(model.units)}</td>
                                                                <td className="px-6 py-3 text-right font-medium text-emerald-600">{formatCurrency(model.stockValue)}</td>
                                                                <td className="px-6 py-3 text-right text-slate-500">{formatCurrency(model.avgCost)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </React.Fragment>
                    );
                })}
                {sortedInventory.length === 0 && (
                    <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                        Нет данных по остаткам
                    </td>
                    </tr>
                )}
                </tbody>
            </table>
            </div>
        </div>
      )}

      {/* MODELS VIEW */}
      {viewMode === 'models' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                  <h3 className="text-lg font-bold text-slate-900">Детализация по моделям и комплектациям</h3>
              </div>
              <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                      <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                          <tr>
                              <th className="px-6 py-4 w-10"></th>
                              <th className="px-6 py-4">Модель / Комплектация / Дилер</th>
                              <th className="px-6 py-4 text-right">В наличии (шт)</th>
                              <th className="px-6 py-4 text-right">Стоимость склада</th>
                              <th className="px-6 py-4 text-right">Ср. стоимость</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {modelsInventory.map((model) => {
                              const isExpanded = expandedModel === model.name;
                              
                              return (
                                  <React.Fragment key={model.name}>
                                      {/* Level 1: Model */}
                                      <tr 
                                          onClick={() => toggleExpandModel(model.name)}
                                          className={`transition-colors cursor-pointer ${isExpanded ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                                      >
                                          <td className="px-6 py-4 text-center">
                                              {isExpanded ? <ChevronDown className="w-4 h-4 text-indigo-600" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                                          </td>
                                          <td className="px-6 py-4 font-bold text-slate-900">{model.name}</td>
                                          <td className="px-6 py-4 text-right font-bold">{formatNumber(model.units)}</td>
                                          <td className="px-6 py-4 text-right font-bold text-emerald-600">{formatCurrency(model.stockValue)}</td>
                                          <td className="px-6 py-4 text-right text-slate-500">{formatCurrency(model.avgCost)}</td>
                                      </tr>

                                      {/* Level 2: Offers */}
                                      {isExpanded && getOffersForModel(model.name).map(offer => {
                                          const offerKey = `${model.name}|${offer.name}`;
                                          const isOfferExpanded = expandedOffer === offerKey;

                                          return (
                                              <React.Fragment key={offerKey}>
                                                  <tr 
                                                      onClick={() => toggleExpandOffer(model.name, offer.name)}
                                                      className={`transition-colors cursor-pointer ${isOfferExpanded ? 'bg-slate-100' : 'bg-slate-50 hover:bg-slate-100'}`}
                                                  >
                                                      <td className="px-6 py-3"></td>
                                                      <td className="px-6 py-3 pl-12 flex items-center gap-2 font-medium text-slate-700">
                                                          {isOfferExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                                          <Tag className="w-3 h-3 text-slate-400" />
                                                          {offer.name}
                                                      </td>
                                                      <td className="px-6 py-3 text-right">{formatNumber(offer.units)}</td>
                                                      <td className="px-6 py-3 text-right">{formatCurrency(offer.stockValue)}</td>
                                                      <td className="px-6 py-3 text-right text-slate-400">-</td>
                                                  </tr>

                                                  {/* Level 3: Dealers */}
                                                  {isOfferExpanded && getDealersForOffer(model.name, offer.name).map((dealer, idx) => (
                                                      <tr key={`${offerKey}-${dealer.name}`} className="bg-white border-l-4 border-l-indigo-500">
                                                          <td className="px-6 py-2"></td>
                                                          <td className="px-6 py-2 pl-20 flex items-center gap-2 text-xs text-slate-600">
                                                              <Users className="w-3 h-3 text-slate-300" />
                                                              {dealer.name}
                                                          </td>
                                                          <td className="px-6 py-2 text-right text-xs">{formatNumber(dealer.units)}</td>
                                                          <td className="px-6 py-2 text-right text-xs font-medium text-indigo-600">{formatCurrency(dealer.stockValue)}</td>
                                                          <td className="px-6 py-2 text-right text-xs text-slate-300">-</td>
                                                      </tr>
                                                  ))}
                                              </React.Fragment>
                                          );
                                      })}
                                  </React.Fragment>
                              );
                          })}
                      </tbody>
                  </table>
              </div>
          </div>
      )}
    </div>
  );
};

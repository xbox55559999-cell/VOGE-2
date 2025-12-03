
import React, { useMemo, useState } from 'react';
import { SaleRecord } from '../types';
import { formatCurrency, formatNumber, exportToCSV } from '../services/dataProcessor';
import { ArrowUpDown, Box, Wallet, FileText, ChevronDown, ChevronRight, Tag, Users, LayoutList, Copy, Check, PieChart as PieChartIcon, FileSpreadsheet, Upload } from 'lucide-react';
import { StatCard } from './StatCard';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export type InventoryViewMode = 'dealers' | 'models';

interface InventoryViewProps {
  records: SaleRecord[];
  salesRecords: SaleRecord[];
  onImport?: () => void;
  // Lifted State
  currentViewMode: InventoryViewMode;
  onChangeViewMode: (mode: InventoryViewMode) => void;
}

type SortField = 'name' | 'units' | 'stockValue' | 'avgCost';
type NestedSortField = 'name' | 'units' | 'stockValue' | 'avgCost';

// Interfaces for nested structures
interface InventoryOffer {
    name: string;
    units: number;
    stockValue: number;
    avgCost: number;
    records: SaleRecord[];
}

interface InventoryModel {
    name: string;
    units: number;
    stockValue: number;
    avgCost: number;
    offers: InventoryOffer[];
}

export const InventoryView: React.FC<InventoryViewProps> = ({ 
    records, 
    salesRecords, 
    onImport,
    currentViewMode,
    onChangeViewMode
}) => {
  // Local state for table interactions can remain here
  const [sortField, setSortField] = useState<SortField>('stockValue');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // State for nested table sorting
  const [nestedSortField, setNestedSortField] = useState<NestedSortField>('stockValue');
  const [nestedSortDirection, setNestedSortDirection] = useState<'asc' | 'desc'>('desc');
  
  const [expandedDealer, setExpandedDealer] = useState<string | null>(null);
  const [expandedModel, setExpandedModel] = useState<string | null>(null);
  const [expandedOffer, setExpandedOffer] = useState<string | null>(null); // Key: "ModelName|OfferName"
  const [expandedModelDealer, setExpandedModelDealer] = useState<string | null>(null); // Key: "Model|Offer|Dealer"

  // State for inventory expansion within dealer view
  const [expandedInvModel, setExpandedInvModel] = useState<string | null>(null);
  const [expandedInvOffer, setExpandedInvOffer] = useState<string | null>(null);
  const [copiedVin, setCopiedVin] = useState<string | null>(null);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  // Generate Map of Model -> Avg Sales Price (Sold Price) from historical Sales Data
  const modelPricing = useMemo(() => {
    const map = new Map<string, number>();
    const sums = new Map<string, { revenue: number; units: number }>();

    if (salesRecords) {
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
    }

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
  }, [records, modelPricing]);

  // Calculate Brand Stats for Pie Chart
  const brandStats = useMemo(() => {
    const map = new Map<string, number>();
    records.forEach(r => {
        map.set(r.brand, (map.get(r.brand) || 0) + 1);
    });
    
    const total = records.length;
    return Array.from(map.entries())
        .map(([name, value]) => ({ 
            name, 
            value,
            share: total > 0 ? (value / total) * 100 : 0
        }))
        .sort((a, b) => b.value - a.value);
  }, [records]);

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

  // Get hierarchy for expanded dealer: Model -> Offer -> Records
  const getDealerInventoryHierarchy = (dealerName: string): InventoryModel[] => {
    const dealerRecords = records.filter(r => r.dealerName === dealerName);
    const modelMap = new Map<string, { 
        name: string; 
        units: number; 
        stockValue: number;
        offers: Map<string, {
            name: string;
            units: number;
            stockValue: number;
            records: SaleRecord[];
        }>
    }>();

    dealerRecords.forEach(r => {
        const itemValue = getRecordValue(r);

        if (!modelMap.has(r.modelName)) {
            modelMap.set(r.modelName, { name: r.modelName, units: 0, stockValue: 0, offers: new Map() });
        }
        const model = modelMap.get(r.modelName)!;
        model.units += 1;
        model.stockValue += itemValue;

        if (!model.offers.has(r.offerName)) {
            model.offers.set(r.offerName, { name: r.offerName, units: 0, stockValue: 0, records: [] });
        }
        const offer = model.offers.get(r.offerName)!;
        offer.units += 1;
        offer.stockValue += itemValue;
        offer.records.push(r);
    });

    return Array.from(modelMap.values()).map(m => ({
        ...m,
        avgCost: m.units > 0 ? m.stockValue / m.units : 0,
        offers: Array.from(m.offers.values()).map(o => ({
            ...o,
            avgCost: o.units > 0 ? o.stockValue / o.units : 0,
            records: o.records
        })).sort((a, b) => b.stockValue - a.stockValue)
    })).sort((a, b) => {
        const factor = nestedSortDirection === 'asc' ? 1 : -1;
        if (nestedSortField === 'name') return a.name.localeCompare(b.name) * factor;
        
        // Type-safe numeric sort
        const valA = a[nestedSortField as keyof InventoryModel];
        const valB = b[nestedSortField as keyof InventoryModel];
        
        if (typeof valA === 'number' && typeof valB === 'number') {
            return (valA - valB) * factor;
        }
        return 0;
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
    })).sort((a, b) => b.stockValue - a.stockValue);
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

  // Get Dealers for Offer with Records (VINs)
  const getDealersForOffer = (modelName: string, offerName: string) => {
      const offerRecords = records.filter(r => r.modelName === modelName && r.offerName === offerName);
      const dealerMap = new Map<string, { name: string; units: number; stockValue: number, records: SaleRecord[] }>();

      offerRecords.forEach(r => {
          const current = dealerMap.get(r.dealerName) || { name: r.dealerName, units: 0, stockValue: 0, records: [] };
          const itemValue = getRecordValue(r);

          dealerMap.set(r.dealerName, {
              name: r.dealerName,
              units: current.units + 1,
              stockValue: current.stockValue + itemValue,
              records: [...current.records, r]
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
    if (expandedDealer === dealerName) {
        setExpandedDealer(null);
        setExpandedInvModel(null);
        setExpandedInvOffer(null);
    } else {
        setExpandedDealer(dealerName);
        setExpandedInvModel(null);
        setExpandedInvOffer(null);
    }
  };

  const toggleExpandInvModel = (modelName: string) => {
    setExpandedInvModel(prev => prev === modelName ? null : modelName);
    setExpandedInvOffer(null);
  };

  const toggleExpandInvOffer = (offerKey: string) => {
    setExpandedInvOffer(prev => prev === offerKey ? null : offerKey);
  };

  const toggleExpandModel = (modelName: string) => {
      setExpandedModel(prev => prev === modelName ? null : modelName);
      setExpandedOffer(null);
      setExpandedModelDealer(null);
  };

  const toggleExpandOffer = (modelName: string, offerName: string) => {
      const key = `${modelName}|${offerName}`;
      setExpandedOffer(prev => prev === key ? null : key);
      setExpandedModelDealer(null);
  };

  const toggleExpandModelDealer = (key: string) => {
      setExpandedModelDealer(prev => prev === key ? null : key);
  };

  const handleCopyVin = (vin: string) => {
    try {
        navigator.clipboard.writeText(vin);
        setCopiedVin(vin);
        setTimeout(() => {
            setCopiedVin(null);
        }, 2000);
    } catch (err) {
        console.error('Failed to copy VIN:', err);
    }
  };

  const handleExport = () => {
      if (currentViewMode === 'dealers') {
          const data = sortedInventory.map(d => ({
              "Дилер": d.name,
              "В наличии (шт)": d.units,
              "Стоимость склада (руб)": d.stockValue,
              "Средняя стоимость модели (руб)": d.avgCost
          }));
          exportToCSV(data, 'inventory_by_dealers');
      } else {
          const data = modelsInventory.map(m => ({
              "Модель": m.name,
              "В наличии (шт)": m.units,
              "Стоимость склада (руб)": m.stockValue,
              "Средняя стоимость (руб)": m.avgCost
          }));
          exportToCSV(data, 'inventory_by_models');
      }
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

        <div className="flex gap-2">
            {onImport && (
                <button 
                    onClick={onImport}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-sm"
                >
                    <Upload className="w-4 h-4 text-indigo-600" />
                    Импорт из CSV
                </button>
            )}
            <button 
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-sm"
            >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                Экспорт в CSV
            </button>
            
            {/* View Switcher */}
            <div className="bg-slate-100 p-1 rounded-xl flex">
                <button 
                    onClick={() => onChangeViewMode('dealers')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                        currentViewMode === 'dealers' 
                        ? 'bg-white text-indigo-600 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <Users className="w-4 h-4" />
                    По дилерам
                </button>
                <button 
                    onClick={() => onChangeViewMode('models')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                        currentViewMode === 'models' 
                        ? 'bg-white text-indigo-600 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <LayoutList className="w-4 h-4" />
                    По моделям
                </button>
            </div>
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

      {/* Brand Distribution Chart */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-indigo-600" />
            Распределение по маркам
        </h3>
        <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="h-[300px] w-full md:w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={brandStats}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                            nameKey="name"
                            label={({ percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                        >
                            {brandStats.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip 
                             formatter={(value: number, name: string) => [`${value} шт.`, name]}
                             contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="w-full md:w-1/2 space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                {brandStats.map((brand, index) => (
                    <div key={brand.name} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                            <span className="font-medium text-slate-700">{brand.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-bold text-slate-900">{brand.value} шт.</span>
                            <span className="text-xs text-slate-500 w-12 text-right">{brand.share.toFixed(1)}%</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>

      {/* DEALERS TABLE */}
      {currentViewMode === 'dealers' && (
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
                                                        {getDealerInventoryHierarchy(dealer.name).map((model) => {
                                                            const isModelExpanded = expandedInvModel === model.name;
                                                            return (
                                                                <React.Fragment key={model.name}>
                                                                    <tr 
                                                                        onClick={() => toggleExpandInvModel(model.name)}
                                                                        className={`transition-colors cursor-pointer ${isModelExpanded ? 'bg-indigo-50' : 'hover:bg-indigo-50/50'}`}
                                                                    >
                                                                        <td className="px-6 py-3 pl-6 font-medium text-slate-700 flex items-center gap-2">
                                                                            {isModelExpanded ? <ChevronDown className="w-3 h-3 text-indigo-500" /> : <ChevronRight className="w-3 h-3 text-slate-400" />}
                                                                            {model.name}
                                                                        </td>
                                                                        <td className="px-6 py-3 text-right">{formatNumber(model.units)}</td>
                                                                        <td className="px-6 py-3 text-right font-medium text-emerald-600">{formatCurrency(model.stockValue)}</td>
                                                                        <td className="px-6 py-3 text-right text-slate-500">{formatCurrency(model.avgCost)}</td>
                                                                    </tr>
                                                                    {isModelExpanded && model.offers.map(offer => {
                                                                        const offerKey = `${model.name}-${offer.name}`;
                                                                        const isOfferExpanded = expandedInvOffer === offerKey;
                                                                        return (
                                                                            <React.Fragment key={offerKey}>
                                                                                <tr 
                                                                                    onClick={() => toggleExpandInvOffer(offerKey)}
                                                                                    className={`cursor-pointer transition-colors ${isOfferExpanded ? 'bg-slate-100' : 'bg-slate-50 hover:bg-slate-100'}`}
                                                                                >
                                                                                    <td className="px-6 py-2 pl-12 flex items-center gap-2 font-medium text-slate-600">
                                                                                        {isOfferExpanded ? <ChevronDown className="w-3 h-3 text-indigo-500" /> : <ChevronRight className="w-3 h-3 text-slate-400" />}
                                                                                        <Tag className="w-3 h-3 text-slate-400" />
                                                                                        {offer.name}
                                                                                    </td>
                                                                                    <td className="px-6 py-2 text-right">{formatNumber(offer.units)}</td>
                                                                                    <td className="px-6 py-2 text-right">{formatCurrency(offer.stockValue)}</td>
                                                                                    <td className="px-6 py-2 text-right text-slate-400">{formatCurrency(offer.avgCost)}</td>
                                                                                </tr>
                                                                                {isOfferExpanded && offer.records.map(record => (
                                                                                    <tr key={record.id} className="bg-white border-l-4 border-l-indigo-500 hover:bg-slate-50 transition-colors">
                                                                                        <td className="px-6 py-2 pl-20">
                                                                                            <div className="flex items-center gap-2 text-xs font-mono text-slate-600">
                                                                                                <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">VIN</span>
                                                                                                {record.vin}
                                                                                                <button 
                                                                                                    onClick={(e) => { e.stopPropagation(); handleCopyVin(record.vin); }}
                                                                                                    className="p-1 hover:bg-slate-100 rounded transition-colors text-slate-400 hover:text-indigo-600 ml-1"
                                                                                                    title="Копировать VIN"
                                                                                                >
                                                                                                    {copiedVin === record.vin ? (
                                                                                                        <Check className="w-3 h-3 text-emerald-500" />
                                                                                                    ) : (
                                                                                                        <Copy className="w-3 h-3" />
                                                                                                    )}
                                                                                                </button>
                                                                                            </div>
                                                                                        </td>
                                                                                        <td className="px-6 py-2 text-right text-xs text-slate-400">1</td>
                                                                                        <td className="px-6 py-2 text-right text-sm font-medium text-slate-900">{formatCurrency(getRecordValue(record))}</td>
                                                                                        <td className="px-6 py-2 text-right text-xs text-slate-400">-</td>
                                                                                    </tr>
                                                                                ))}
                                                                            </React.Fragment>
                                                                        )
                                                                    })}
                                                                </React.Fragment>
                                                            );
                                                        })}
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
      {currentViewMode === 'models' && (
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
                                                  {isOfferExpanded && getDealersForOffer(model.name, offer.name).map((dealer, idx) => {
                                                      const dealerKey = `${offerKey}|${dealer.name}`;
                                                      const isDealerExpanded = expandedModelDealer === dealerKey;
                                                      
                                                      return (
                                                        <React.Fragment key={dealerKey}>
                                                            <tr 
                                                                onClick={() => toggleExpandModelDealer(dealerKey)}
                                                                className={`cursor-pointer transition-colors border-l-4 border-l-indigo-500 ${isDealerExpanded ? 'bg-slate-50' : 'bg-white hover:bg-slate-50'}`}
                                                            >
                                                                <td className="px-6 py-2"></td>
                                                                <td className="px-6 py-2 pl-20 flex items-center gap-2 text-xs text-slate-600">
                                                                    {isDealerExpanded ? <ChevronDown className="w-3 h-3 text-indigo-500" /> : <ChevronRight className="w-3 h-3 text-slate-400" />}
                                                                    <Users className="w-3 h-3 text-slate-300" />
                                                                    {dealer.name}
                                                                </td>
                                                                <td className="px-6 py-2 text-right text-xs">{formatNumber(dealer.units)}</td>
                                                                <td className="px-6 py-2 text-right text-xs font-medium text-indigo-600">{formatCurrency(dealer.stockValue)}</td>
                                                                <td className="px-6 py-2 text-right text-xs text-slate-300">-</td>
                                                            </tr>

                                                            {/* Level 4: VINs */}
                                                            {isDealerExpanded && dealer.records.map(record => (
                                                                <tr key={record.id} className="bg-slate-50/50 border-l-4 border-l-indigo-300">
                                                                    <td className="px-6 py-2"></td>
                                                                    <td className="px-6 py-2 pl-28">
                                                                        <div className="flex items-center gap-2 text-xs font-mono text-slate-600">
                                                                            <span className="bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-500">VIN</span>
                                                                            {record.vin}
                                                                            <button 
                                                                                onClick={(e) => { e.stopPropagation(); handleCopyVin(record.vin); }}
                                                                                className="p-1 hover:bg-slate-100 rounded transition-colors text-slate-400 hover:text-indigo-600 ml-1"
                                                                                title="Копировать VIN"
                                                                            >
                                                                                {copiedVin === record.vin ? (
                                                                                    <Check className="w-3 h-3 text-emerald-500" />
                                                                                ) : (
                                                                                    <Copy className="w-3 h-3" />
                                                                                )}
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-6 py-2 text-right text-xs text-slate-400">1</td>
                                                                    <td className="px-6 py-2 text-right text-xs text-slate-500">{formatCurrency(getRecordValue(record))}</td>
                                                                    <td className="px-6 py-2 text-right text-xs text-slate-300">-</td>
                                                                </tr>
                                                            ))}
                                                        </React.Fragment>
                                                      );
                                                  })}
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

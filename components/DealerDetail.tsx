
import React, { useMemo, useState, useEffect } from 'react';
import { SaleRecord } from '../types';
import { formatCurrency, formatNumber } from '../services/dataProcessor';
import { StatCard } from './StatCard';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import { ArrowLeft, Wallet, ShoppingCart, TrendingUp, RussianRuble, ChevronDown, ChevronRight, Tag, Calendar, Box, Search, Copy, Check } from 'lucide-react';

interface DealerDetailProps {
  dealerName: string;
  records: SaleRecord[];
  onBack: () => void;
}

export const DealerDetail: React.FC<DealerDetailProps> = ({ dealerName, records, onBack }) => {
  const [expandedModel, setExpandedModel] = useState<string | null>(null);
  const [expandedOffer, setExpandedOffer] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedVin, setCopiedVin] = useState<string | null>(null);

  // Calculate KPIs for this specific dealer
  const kpi = useMemo(() => {
    const totalRevenue = records.reduce((sum, r) => sum + r.soldPrice, 0);
    const totalCost = records.reduce((sum, r) => sum + r.buyPrice, 0);
    const totalMargin = totalRevenue - totalCost;
    const totalUnits = records.length;
    const avgTicket = totalUnits > 0 ? totalRevenue / totalUnits : 0;
    return { totalRevenue, totalMargin, totalUnits, avgTicket };
  }, [records]);

  // Monthly Trend Data (Time Series)
  const monthlyData = useMemo(() => {
    const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
    
    // Group by Year-Month to show timeline
    const map = new Map<string, { date: number, label: string, value: number }>();
    
    records.forEach(r => {
        const key = `${r.year}-${r.month}`;
        if (!map.has(key)) {
            map.set(key, { 
                date: new Date(r.year, r.month, 1).getTime(),
                label: `${months[r.month]} ${r.year}`, 
                value: 0 
            });
        }
        map.get(key)!.value += r.soldPrice;
    });
    
    return Array.from(map.values()).sort((a, b) => a.date - b.date);
  }, [records]);

  // Top Models for this dealer
  const topModels = useMemo(() => {
    const map = new Map<string, number>();
    records.forEach(r => {
      map.set(r.modelName, (map.get(r.modelName) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [records]);

  // Grouped Sales Data Structure with Search Filter
  const groupedRecords = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    
    // Filter records based on search query
    const filteredRecords = !query 
        ? records 
        : records.filter(r => 
            r.modelName.toLowerCase().includes(query) || 
            r.offerName.toLowerCase().includes(query) || 
            r.vin.toLowerCase().includes(query)
          );

    // Structure: Model -> Offer -> Records
    const modelMap = new Map<string, {
      name: string;
      totalRevenue: number;
      count: number;
      offers: Map<string, {
        name: string;
        totalRevenue: number;
        count: number;
        sales: SaleRecord[];
      }>
    }>();

    filteredRecords.forEach(r => {
      // 1. Get or Create Model Group
      if (!modelMap.has(r.modelName)) {
        modelMap.set(r.modelName, {
          name: r.modelName,
          totalRevenue: 0,
          count: 0,
          offers: new Map()
        });
      }
      const modelGroup = modelMap.get(r.modelName)!;
      modelGroup.totalRevenue += r.soldPrice;
      modelGroup.count += 1;

      // 2. Get or Create Offer Group within Model
      if (!modelGroup.offers.has(r.offerName)) {
        modelGroup.offers.set(r.offerName, {
          name: r.offerName,
          totalRevenue: 0,
          count: 0,
          sales: []
        });
      }
      const offerGroup = modelGroup.offers.get(r.offerName)!;
      offerGroup.totalRevenue += r.soldPrice;
      offerGroup.count += 1;
      offerGroup.sales.push(r);
    });

    // Convert to Array and Sort
    return Array.from(modelMap.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .map(model => ({
        ...model,
        offers: Array.from(model.offers.values())
          .sort((a, b) => b.totalRevenue - a.totalRevenue)
          .map(offer => ({
             ...offer,
             sales: offer.sales.sort((a, b) => b.saleDate.getTime() - a.saleDate.getTime())
          }))
      }));
  }, [records, searchQuery]);

  // Auto-expand logic if search narrows down to single result
  useEffect(() => {
    if (searchQuery.trim() && groupedRecords.length === 1) {
        const model = groupedRecords[0];
        setExpandedModel(model.name);
        if (model.offers.length === 1) {
            setExpandedOffer(`${model.name}-${model.offers[0].name}`);
        }
    }
  }, [searchQuery, groupedRecords]);

  const toggleModel = (modelName: string) => {
    setExpandedModel(prev => prev === modelName ? null : modelName);
    setExpandedOffer(null); // Close inner details when toggling model
  };

  const toggleOffer = (offerKey: string) => {
    setExpandedOffer(prev => prev === offerKey ? null : offerKey);
  };

  const handleCopyVin = (vin: string) => {
    navigator.clipboard.writeText(vin);
    setCopiedVin(vin);
    setTimeout(() => {
        setCopiedVin(null);
    }, 2000);
  };

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6 animate-fade-in">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors mb-2 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Назад к дашборду
      </button>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
         <div>
            <h2 className="text-3xl font-bold text-slate-900">{dealerName}</h2>
            <p className="text-slate-500 mt-1">Карточка партнера и детальная статистика продаж</p>
         </div>
      </div>

      {/* Dealer KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Выручка" value={formatCurrency(kpi.totalRevenue)} icon={<Wallet className="w-6 h-6" />} color="indigo" />
        <StatCard title="Продажи (шт)" value={formatNumber(kpi.totalUnits)} icon={<ShoppingCart className="w-6 h-6" />} color="blue" />
        <StatCard title="Валовая прибыль" value={formatCurrency(kpi.totalMargin)} icon={<TrendingUp className="w-6 h-6" />} color="emerald" />
        <StatCard title="Средний чек" value={formatCurrency(kpi.avgTicket)} icon={<RussianRuble className="w-6 h-6" />} color="amber" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
           <h3 className="text-lg font-bold text-slate-900 mb-6">Динамика продаж (All Time)</h3>
           <div className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                 <defs>
                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                 </defs>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                 <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} minTickGap={30} />
                 <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(val) => `${(val/1000000).toFixed(1)}M`} />
                 <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), "Выручка"]}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                 />
                 <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorVal)" activeDot={{ r: 6 }} />
               </AreaChart>
             </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
           <h3 className="text-lg font-bold text-slate-900 mb-4">Популярные модели</h3>
           <div className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topModels} layout="vertical" margin={{ left: 0, right: 30 }}>
                   <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                   <XAxis type="number" hide />
                   <YAxis dataKey="name" type="category" width={100} tick={{fill: '#64748b', fontSize: 11, fontWeight: 500}} />
                   <Tooltip 
                      cursor={{fill: '#f1f5f9'}} 
                      contentStyle={{ borderRadius: '8px', border: 'none' }}
                   />
                   <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                      {topModels.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                   </Bar>
                </BarChart>
             </ResponsiveContainer>
           </div>
        </div>
      </div>

      {/* Sales History Table (Grouped) with Search */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
         <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
            <h3 className="text-lg font-bold text-slate-900">История продаж</h3>
            
            <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                    type="text" 
                    placeholder="Поиск по модели, компл. или VIN..." 
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-lg text-sm border-none outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-400"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
               <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                  <tr>
                     <th className="px-6 py-4 w-10"></th>
                     <th className="px-6 py-4">Модель / Комплектация / VIN</th>
                     <th className="px-6 py-4 text-right">Количество</th>
                     <th className="px-6 py-4 text-right">Выручка</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {groupedRecords.map((model) => {
                     const isExpanded = expandedModel === model.name;
                     return (
                        <React.Fragment key={model.name}>
                           {/* Level 1: Model */}
                           <tr 
                              onClick={() => toggleModel(model.name)}
                              className={`cursor-pointer transition-colors ${isExpanded ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                           >
                              <td className="px-6 py-4 text-center">
                                 {isExpanded ? <ChevronDown className="w-4 h-4 text-indigo-600" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                              </td>
                              <td className="px-6 py-4 font-bold text-slate-900 flex items-center gap-2">
                                 <Box className="w-4 h-4 text-slate-500" />
                                 {model.name}
                              </td>
                              <td className="px-6 py-4 text-right font-bold">{formatNumber(model.count)} шт.</td>
                              <td className="px-6 py-4 text-right font-bold text-emerald-600">{formatCurrency(model.totalRevenue)}</td>
                           </tr>

                           {/* Level 2: Offers */}
                           {isExpanded && model.offers.map((offer) => {
                               const offerKey = `${model.name}-${offer.name}`;
                               const isOfferExpanded = expandedOffer === offerKey;

                               return (
                                  <React.Fragment key={offerKey}>
                                     <tr 
                                        onClick={() => toggleOffer(offerKey)}
                                        className={`cursor-pointer transition-colors ${isOfferExpanded ? 'bg-slate-100' : 'bg-slate-50 hover:bg-slate-100'}`}
                                     >
                                        <td className="px-6 py-3"></td>
                                        <td className="px-6 py-3 pl-12 flex items-center gap-2 font-medium text-slate-700">
                                            {isOfferExpanded ? <ChevronDown className="w-3 h-3 text-indigo-500" /> : <ChevronRight className="w-3 h-3 text-slate-400" />}
                                            <Tag className="w-3 h-3 text-slate-400" />
                                            {offer.name}
                                        </td>
                                        <td className="px-6 py-3 text-right text-slate-600">{formatNumber(offer.count)} шт.</td>
                                        <td className="px-6 py-3 text-right font-medium text-emerald-600">{formatCurrency(offer.totalRevenue)}</td>
                                     </tr>

                                     {/* Level 3: Individual Sales */}
                                     {isOfferExpanded && offer.sales.map((sale) => (
                                         <tr key={sale.id} className="bg-white border-l-4 border-l-indigo-500 hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-2"></td>
                                            <td className="px-6 py-2 pl-20">
                                               <div className="flex flex-col gap-0.5">
                                                  <div className="flex items-center gap-2 text-xs font-mono text-slate-600">
                                                     <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">VIN</span>
                                                     {
                                                        searchQuery && sale.vin.toLowerCase().includes(searchQuery.toLowerCase()) ? (
                                                            <span className="bg-yellow-100 text-slate-900 font-semibold px-1 rounded">{sale.vin}</span>
                                                        ) : (
                                                            sale.vin
                                                        )
                                                     }
                                                     <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleCopyVin(sale.vin);
                                                        }}
                                                        className="p-1 hover:bg-slate-100 rounded transition-colors text-slate-400 hover:text-indigo-600 ml-1"
                                                        title="Копировать VIN"
                                                     >
                                                        {copiedVin === sale.vin ? (
                                                            <Check className="w-3 h-3 text-emerald-500" />
                                                        ) : (
                                                            <Copy className="w-3 h-3" />
                                                        )}
                                                     </button>
                                                  </div>
                                                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                                     <Calendar className="w-3 h-3" />
                                                     {sale.saleDate.toLocaleDateString('ru-RU')}
                                                  </div>
                                               </div>
                                            </td>
                                            <td className="px-6 py-2 text-right text-xs text-slate-400">1 шт.</td>
                                            <td className="px-6 py-2 text-right text-sm font-medium text-slate-900">
                                               {formatCurrency(sale.soldPrice)}
                                               {sale.margin > 0 && (
                                                   <div className="text-[10px] text-emerald-600 mt-0.5">
                                                       Прибыль: +{formatNumber(sale.margin)}
                                                   </div>
                                               )}
                                            </td>
                                         </tr>
                                     ))}
                                  </React.Fragment>
                               );
                           })}
                        </React.Fragment>
                     );
                  })}
                  {groupedRecords.length === 0 && (
                     <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                           {searchQuery ? 'Ничего не найдено по вашему запросу' : 'Нет данных о продажах'}
                        </td>
                     </tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};

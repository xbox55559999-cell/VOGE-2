
import React, { useMemo, useState } from 'react';
import { SaleRecord } from '../types';
import { formatCurrency, formatNumber } from '../services/dataProcessor';
import { ArrowLeft, Users, RussianRuble, ShoppingCart, ArrowUpDown, ChevronRight } from 'lucide-react';

interface ModelOfferDetailProps {
  modelName: string;
  offerName: string;
  records: SaleRecord[];
  onBack: () => void;
  onDealerSelect: (dealerName: string) => void;
}

type SortField = 'name' | 'units' | 'revenue' | 'avgPrice';

export const ModelOfferDetail: React.FC<ModelOfferDetailProps> = ({ 
  modelName, 
  offerName, 
  records, 
  onBack,
  onDealerSelect
}) => {
  const [sortField, setSortField] = useState<SortField>('units');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Calculate KPI for this Offer
  const stats = useMemo(() => {
    const totalRevenue = records.reduce((sum, r) => sum + r.soldPrice, 0);
    const totalUnits = records.length;
    const avgPrice = totalUnits > 0 ? totalRevenue / totalUnits : 0;
    return { totalRevenue, totalUnits, avgPrice };
  }, [records]);

  // Aggregate by Dealer
  const dealersData = useMemo(() => {
    const map = new Map<string, { name: string; units: number; revenue: number }>();

    records.forEach(r => {
      const current = map.get(r.dealerName) || { name: r.dealerName, units: 0, revenue: 0 };
      map.set(r.dealerName, {
        name: r.dealerName,
        units: current.units + 1,
        revenue: current.revenue + r.soldPrice
      });
    });

    return Array.from(map.values()).map(d => ({
      ...d,
      avgPrice: d.revenue / d.units,
      share: stats.totalUnits > 0 ? (d.units / stats.totalUnits) * 100 : 0
    }));
  }, [records, stats.totalUnits]);

  // Sorting
  const sortedDealers = useMemo(() => {
    return [...dealersData].sort((a, b) => {
      const factor = sortDirection === 'asc' ? 1 : -1;
      if (sortField === 'name') return a.name.localeCompare(b.name) * factor;
      return (a[sortField] - b[sortField]) * factor;
    });
  }, [dealersData, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const renderSortIcon = (field: SortField) => {
      if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-slate-300 ml-1 inline" />;
      return <ArrowUpDown className={`w-3 h-3 ml-1 inline ${sortDirection === 'asc' ? 'text-indigo-600 rotate-180' : 'text-indigo-600'}`} />;
    };

  return (
    <div className="animate-fade-in space-y-6">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors mb-2 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Назад к списку моделей
      </button>

      <div className="border-b border-slate-200 pb-6">
         <h2 className="text-3xl font-bold text-slate-900">{modelName}</h2>
         <div className="flex items-center gap-2 mt-2">
            <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-sm font-medium border border-slate-200">
                Комплектация: {offerName}
            </span>
         </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-blue-600" />
            </div>
            <div>
                <p className="text-sm text-slate-500">Всего продано</p>
                <p className="text-xl font-bold text-slate-900">{formatNumber(stats.totalUnits)} шт.</p>
            </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-50 rounded-lg">
                <RussianRuble className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
                <p className="text-sm text-slate-500">Общая выручка</p>
                <p className="text-xl font-bold text-slate-900">{formatCurrency(stats.totalRevenue)}</p>
            </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-amber-50 rounded-lg">
                <Users className="w-6 h-6 text-amber-600" />
            </div>
            <div>
                <p className="text-sm text-slate-500">Дилеров</p>
                <p className="text-xl font-bold text-slate-900">{dealersData.length}</p>
            </div>
        </div>
      </div>

      {/* Dealers Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-900">Продажи по дилерам</h3>
            <p className="text-sm text-slate-400">Нажмите на дилера для просмотра списка продаж</p>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                    <tr>
                        <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('name')}>
                            Дилер {renderSortIcon('name')}
                        </th>
                        <th className="px-6 py-4 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('units')}>
                            Продано (шт) {renderSortIcon('units')}
                        </th>
                        <th className="px-6 py-4 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('avgPrice')}>
                            Средняя цена {renderSortIcon('avgPrice')}
                        </th>
                        <th className="px-6 py-4 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('revenue')}>
                            Выручка {renderSortIcon('revenue')}
                        </th>
                        <th className="px-6 py-4 text-left">Доля от продаж модели</th>
                        <th className="px-6 py-4"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {sortedDealers.map((dealer, index) => (
                        <tr 
                            key={index} 
                            onClick={() => onDealerSelect(dealer.name)}
                            className="hover:bg-slate-50 transition-colors cursor-pointer group"
                        >
                            <td className="px-6 py-4 font-medium text-slate-900 group-hover:text-indigo-600 transition-colors">
                                {dealer.name}
                            </td>
                            <td className="px-6 py-4 text-right font-medium">
                                {formatNumber(dealer.units)}
                            </td>
                            <td className="px-6 py-4 text-right text-slate-500">
                                {formatCurrency(dealer.avgPrice)}
                            </td>
                            <td className="px-6 py-4 text-right font-semibold text-indigo-600">
                                {formatCurrency(dealer.revenue)}
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-indigo-500 rounded-full" 
                                            style={{ width: `${dealer.share}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-xs text-slate-500">{dealer.share.toFixed(1)}%</span>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-right text-slate-300 group-hover:text-indigo-400">
                                <ChevronRight className="w-5 h-5 inline-block" />
                            </td>
                        </tr>
                    ))}
                     {sortedDealers.length === 0 && (
                        <tr>
                            <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                                Нет данных
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

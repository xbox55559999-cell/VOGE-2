
import React, { useMemo, useState } from 'react';
import { SaleRecord } from '../types';
import { formatCurrency, formatNumber, exportToCSV } from '../services/dataProcessor';
import { ChevronRight, ArrowUpDown, TrendingUp, FileSpreadsheet, Upload, MapPin } from 'lucide-react';

interface DealersViewProps {
  records: SaleRecord[];
  onDealerClick: (dealerName: string) => void;
  onImport?: () => void;
}

type SortField = 'name' | 'city' | 'units' | 'revenue' | 'margin' | 'avgTicket' | 'share';

export const DealersView: React.FC<DealersViewProps> = ({ records, onDealerClick, onImport }) => {
  const [sortField, setSortField] = useState<SortField>('revenue');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const totalMarketRevenue = useMemo(() => records.reduce((sum, r) => sum + r.soldPrice, 0), [records]);

  const dealersStats = useMemo(() => {
    const map = new Map<string, { 
      name: string; 
      city: string;
      units: number; 
      revenue: number; 
      margin: number; 
    }>();

    records.forEach(r => {
      const current = map.get(r.dealerName) || { name: r.dealerName, city: r.city, units: 0, revenue: 0, margin: 0 };
      map.set(r.dealerName, {
        name: r.dealerName,
        city: r.city,
        units: current.units + 1,
        revenue: current.revenue + r.soldPrice,
        margin: current.margin + r.margin
      });
    });

    return Array.from(map.values()).map(d => ({
      ...d,
      avgTicket: d.revenue / d.units,
      share: totalMarketRevenue > 0 ? (d.revenue / totalMarketRevenue) * 100 : 0
    }));
  }, [records, totalMarketRevenue]);

  const sortedDealers = useMemo(() => {
    return [...dealersStats].sort((a, b) => {
      const factor = sortDirection === 'asc' ? 1 : -1;
      if (sortField === 'name') return a.name.localeCompare(b.name) * factor;
      if (sortField === 'city') return a.city.localeCompare(b.city) * factor;
      return (a[sortField] - b[sortField]) * factor;
    });
  }, [dealersStats, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleExport = () => {
    const dataToExport = sortedDealers.map(d => ({
        "Дилер": d.name,
        "Город": d.city,
        "Продажи (шт)": d.units,
        "Выручка (руб)": d.revenue,
        "Маржа (руб)": d.margin,
        "Рентабельность (%)": d.revenue > 0 ? ((d.margin / d.revenue) * 100).toFixed(2) : 0,
        "Средний чек (руб)": d.avgTicket,
        "Доля рынка (%)": d.share.toFixed(2)
    }));
    exportToCSV(dataToExport, 'dealers_report');
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-slate-300 ml-1 inline" />;
    return <ArrowUpDown className={`w-3 h-3 ml-1 inline ${sortDirection === 'asc' ? 'text-indigo-600 rotate-180' : 'text-indigo-600'}`} />;
  };

  const getMarginColorClass = (percent: number) => {
    if (percent < 0) return 'text-red-700 bg-red-50';
    if (percent < 5) return 'text-orange-700 bg-orange-50';
    if (percent < 10) return 'text-yellow-700 bg-yellow-50';
    if (percent <= 15) return 'text-emerald-700 bg-emerald-50';
    return 'text-purple-700 bg-purple-50';
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Дилерская сеть</h2>
          <p className="text-slate-500 mt-1">Рейтинг эффективности партнеров ({sortedDealers.length})</p>
        </div>
        <div className="flex gap-2">
            {onImport && (
                <button 
                    onClick={onImport}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-sm"
                >
                    <Upload className="w-4 h-4 text-indigo-600" />
                    Импорт из CSV
                </button>
            )}
            <button 
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-sm"
            >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                Экспорт в CSV
            </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
              <tr>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('name')}>
                  Дилер {renderSortIcon('name')}
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('city')}>
                  Город {renderSortIcon('city')}
                </th>
                <th className="px-6 py-4 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('units')}>
                  Продажи (шт) {renderSortIcon('units')}
                </th>
                <th className="px-6 py-4 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('revenue')}>
                  Выручка {renderSortIcon('revenue')}
                </th>
                <th className="px-6 py-4 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('margin')}>
                  Валовая прибыль {renderSortIcon('margin')}
                </th>
                <th className="px-6 py-4 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('avgTicket')}>
                  Средний чек {renderSortIcon('avgTicket')}
                </th>
                <th className="px-6 py-4 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('share')}>
                  Доля рынка {renderSortIcon('share')}
                </th>
                <th className="px-6 py-4 text-center">Действие</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedDealers.map((dealer, index) => {
                const marginPercent = dealer.revenue > 0 ? (dealer.margin / dealer.revenue) * 100 : 0;
                
                return (
                  <tr 
                    key={dealer.name} 
                    onClick={() => onDealerClick(dealer.name)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                        {index + 1}
                      </div>
                      {dealer.name}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {dealer.city}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-medium">
                      {formatNumber(dealer.units)}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-indigo-600">
                      {formatCurrency(dealer.revenue)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-slate-700">{formatCurrency(dealer.margin)}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-md font-bold ${getMarginColorClass(marginPercent)}`}>
                          {marginPercent.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-500">
                      {formatCurrency(dealer.avgTicket)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-3">
                        <span className="text-xs text-slate-500 w-8 text-right">{dealer.share.toFixed(1)}%</span>
                        <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-500 rounded-full" 
                            style={{ width: `${dealer.share}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-300 group-hover:text-indigo-600 transition-colors">
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {sortedDealers.length === 0 && (
                 <tr>
                   <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                     Нет данных, удовлетворяющих условиям фильтра
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

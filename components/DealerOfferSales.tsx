
import React, { useMemo, useState } from 'react';
import { SaleRecord } from '../types';
import { formatCurrency, formatNumber } from '../services/dataProcessor';
import { ArrowLeft, Calendar, Tag, CreditCard, TrendingUp, ArrowUpDown } from 'lucide-react';

interface DealerOfferSalesProps {
  dealerName: string;
  modelName: string;
  offerName: string;
  records: SaleRecord[];
  onBack: () => void;
}

type SortField = 'date' | 'soldPrice' | 'margin';

export const DealerOfferSales: React.FC<DealerOfferSalesProps> = ({ 
  dealerName, 
  modelName, 
  offerName, 
  records, 
  onBack 
}) => {
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // KPI for this specific slice
  const stats = useMemo(() => {
    const totalRevenue = records.reduce((sum, r) => sum + r.soldPrice, 0);
    const totalMargin = records.reduce((sum, r) => sum + r.margin, 0);
    const avgPrice = records.length > 0 ? totalRevenue / records.length : 0;
    return { totalRevenue, totalMargin, avgPrice };
  }, [records]);

  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => {
      const factor = sortDirection === 'asc' ? 1 : -1;
      if (sortField === 'date') {
        return (a.saleDate.getTime() - b.saleDate.getTime()) * factor;
      }
      if (sortField === 'soldPrice') {
        return (a.soldPrice - b.soldPrice) * factor;
      }
      if (sortField === 'margin') {
        return (a.margin - b.margin) * factor;
      }
      return 0;
    });
  }, [records, sortField, sortDirection]);

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
        Назад к дилерам
      </button>

      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="mb-6">
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-sm text-slate-500 mb-1">
                <span className="flex items-center gap-1"><Tag className="w-4 h-4" /> {modelName}</span>
                <span className="hidden md:inline">•</span>
                <span>{offerName}</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">{dealerName}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
            <div>
                <p className="text-xs text-slate-500 font-medium uppercase">Продано единиц</p>
                <p className="text-xl font-bold text-slate-900">{records.length}</p>
            </div>
            <div>
                <p className="text-xs text-slate-500 font-medium uppercase">Общая выручка</p>
                <p className="text-xl font-bold text-indigo-600">{formatCurrency(stats.totalRevenue)}</p>
            </div>
            <div>
                <p className="text-xs text-slate-500 font-medium uppercase">Средняя маржа</p>
                <p className="text-xl font-bold text-emerald-600">{formatCurrency(stats.totalMargin / records.length)}</p>
            </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-900">История транзакций</h3>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                    <tr>
                        <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('date')}>
                            Дата продажи {renderSortIcon('date')}
                        </th>
                        <th className="px-6 py-4">VIN</th>
                        <th className="px-6 py-4 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('soldPrice')}>
                            Выручка {renderSortIcon('soldPrice')}
                        </th>
                        <th className="px-6 py-4 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('margin')}>
                            Маржа {renderSortIcon('margin')}
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {sortedRecords.map((record) => (
                        <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-slate-400" />
                                    <span className="font-medium text-slate-700">
                                        {record.saleDate.toLocaleDateString('ru-RU')}
                                    </span>
                                </div>
                            </td>
                            <td className="px-6 py-4 font-mono text-xs text-slate-500">
                                {record.vin}
                            </td>
                            <td className="px-6 py-4 text-right font-medium text-slate-900">
                                {formatCurrency(record.soldPrice)}
                            </td>
                            <td className="px-6 py-4 text-right font-medium text-emerald-600">
                                {formatCurrency(record.margin)}
                            </td>
                        </tr>
                    ))}
                    {sortedRecords.length === 0 && (
                        <tr>
                            <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                                Нет записей о продажах
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


import React, { useMemo, useState } from 'react';
import { SaleRecord } from '../types';
import { formatCurrency, formatNumber, exportToCSV } from '../services/dataProcessor';
import { Trophy, TrendingUp, Package, ChevronDown, ChevronRight, Tag, ArrowRight, FileSpreadsheet, Upload, Layers } from 'lucide-react';

interface ModelListProps {
    records: SaleRecord[];
    onOfferSelect: (modelName: string, offerName: string) => void;
    onImport?: () => void;
}

export const ModelList: React.FC<ModelListProps> = ({ records, onOfferSelect, onImport }) => {
    const [expandedModel, setExpandedModel] = useState<string | null>(null);

    // Aggregate data by Model
    const modelStats = useMemo(() => {
        const map = new Map<string, { units: number, revenue: number }>();
        records.forEach(r => {
            const current = map.get(r.modelName) || { units: 0, revenue: 0 };
            map.set(r.modelName, {
                units: current.units + 1,
                revenue: current.revenue + r.soldPrice
            });
        });
        return Array.from(map.entries())
            .map(([name, val]) => ({ name, ...val, avgPrice: val.revenue / val.units }))
            .sort((a, b) => b.revenue - a.revenue);
    }, [records]);

    // Aggregate data by Offer for the Expanded Model
    const offerStats = useMemo(() => {
        if (!expandedModel) return [];
        
        const filtered = records.filter(r => r.modelName === expandedModel);
        const map = new Map<string, { units: number, revenue: number }>();
        
        filtered.forEach(r => {
            const current = map.get(r.offerName) || { units: 0, revenue: 0 };
            map.set(r.offerName, {
                units: current.units + 1,
                revenue: current.revenue + r.soldPrice
            });
        });

        return Array.from(map.entries())
            .map(([name, val]) => ({ name, ...val, avgPrice: val.revenue / val.units }))
            .sort((a, b) => b.units - a.units); // Sort offers by units sold
    }, [records, expandedModel]);

    const topModel = modelStats[0];
    const totalRevenue = modelStats.reduce((sum, m) => sum + m.revenue, 0);

    const toggleExpand = (modelName: string) => {
        setExpandedModel(prev => prev === modelName ? null : modelName);
    };

    const handleExport = () => {
        const dataToExport = modelStats.map(m => ({
            "Модель": m.name,
            "Продажи (шт)": m.units,
            "Выручка (руб)": m.revenue,
            "Средняя цена (руб)": m.avgPrice,
            "Доля выручки (%)": totalRevenue > 0 ? ((m.revenue / totalRevenue) * 100).toFixed(2) : 0
        }));
        exportToCSV(dataToExport, 'models_sales_report');
    };

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900">Модельный ряд</h2>
                    <p className="text-slate-500 mt-1">Статистика продаж в разрезе моделей и комплектаций</p>
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

            {/* Highlights */}
            {topModel && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
                         <div className="flex items-center gap-3 mb-2">
                             <div className="p-2 bg-white/20 rounded-lg">
                                 <Trophy className="w-5 h-5 text-white" />
                             </div>
                             <span className="text-indigo-100 font-medium">Лидер продаж</span>
                         </div>
                         <h3 className="text-2xl font-bold mb-1">{topModel.name}</h3>
                         <p className="text-indigo-100 text-sm">
                            {formatNumber(topModel.units)} проданных единиц
                         </p>
                    </div>
                     <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-emerald-50 rounded-lg">
                                <TrendingUp className="w-5 h-5 text-emerald-600" />
                            </div>
                            <span className="text-slate-500 font-medium">Выручка лидера</span>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(topModel.revenue)}</h3>
                    </div>
                     <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <Package className="w-5 h-5 text-blue-600" />
                            </div>
                            <span className="text-slate-500 font-medium">Всего моделей</span>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900">{modelStats.length}</h3>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                            <tr>
                                <th className="px-6 py-4 w-10"></th>
                                <th className="px-6 py-4">Модель</th>
                                <th className="px-6 py-4 text-right">Продажи (шт)</th>
                                <th className="px-6 py-4 text-right">Средняя цена</th>
                                <th className="px-6 py-4 text-right">Выручка</th>
                                <th className="px-6 py-4 text-center">Доля выручки</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {modelStats.map((model) => {
                                const share = totalRevenue > 0 ? (model.revenue / totalRevenue) * 100 : 0;
                                const isExpanded = expandedModel === model.name;
                                
                                return (
                                    <React.Fragment key={model.name}>
                                        <tr 
                                            onClick={() => toggleExpand(model.name)}
                                            className={`transition-colors cursor-pointer ${isExpanded ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                                        >
                                            <td className="px-6 py-4 text-center">
                                                {isExpanded ? <ChevronDown className="w-4 h-4 text-indigo-600" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-slate-900">
                                                {model.name}
                                            </td>
                                            <td className="px-6 py-4 text-right font-medium">
                                                {formatNumber(model.units)}
                                            </td>
                                            <td className="px-6 py-4 text-right text-slate-500">
                                                {formatCurrency(model.avgPrice)}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-emerald-600">
                                                {formatCurrency(model.revenue)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-3">
                                                    <span className="text-xs text-slate-500 w-8 text-right">{share.toFixed(1)}%</span>
                                                    <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div 
                                                            className="h-full bg-indigo-500 rounded-full" 
                                                            style={{ width: `${share}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                        {/* Expanded Offers Row */}
                                        {isExpanded && (
                                            <tr>
                                                <td colSpan={6} className="p-0">
                                                    <div className="bg-slate-50/50 px-4 md:px-12 py-6 border-y border-slate-100 shadow-inner">
                                                        <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4 flex items-center gap-2 pl-1">
                                                            <Layers className="w-4 h-4 text-indigo-500" />
                                                            Комплектации: {model.name}
                                                        </h4>
                                                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                                            <table className="w-full text-left text-sm text-slate-600">
                                                                <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase font-semibold text-slate-500">
                                                                    <tr>
                                                                        <th className="px-6 py-3 text-left">Комплектация</th>
                                                                        <th className="px-6 py-3 text-right">Продано</th>
                                                                        <th className="px-6 py-3 text-right">Ср. цена</th>
                                                                        <th className="px-6 py-3 text-right">Выручка</th>
                                                                        <th className="px-6 py-3 text-center">Детализация</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100">
                                                                    {offerStats.map((offer) => (
                                                                        <tr 
                                                                            key={offer.name}
                                                                            onClick={() => onOfferSelect(model.name, offer.name)}
                                                                            className="hover:bg-indigo-50/50 transition-colors cursor-pointer group"
                                                                        >
                                                                            <td className="px-6 py-3 font-medium text-slate-900 flex items-center gap-2">
                                                                                <Tag className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                                                                {offer.name}
                                                                            </td>
                                                                            <td className="px-6 py-3 text-right text-slate-600">{formatNumber(offer.units)} шт.</td>
                                                                            <td className="px-6 py-3 text-right text-slate-500">{formatCurrency(offer.avgPrice)}</td>
                                                                            <td className="px-6 py-3 text-right font-semibold text-indigo-600">{formatCurrency(offer.revenue)}</td>
                                                                            <td className="px-6 py-3 text-center">
                                                                                <button className="text-xs bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-slate-600 group-hover:border-indigo-200 group-hover:text-indigo-600 flex items-center gap-1.5 mx-auto transition-all shadow-sm font-medium">
                                                                                    Дилеры <ArrowRight className="w-3 h-3" />
                                                                                </button>
                                                                            </td>
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
                            {modelStats.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                                        Нет данных для отображения
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


import React, { useMemo } from 'react';
import { SaleRecord, SalesTarget } from '../types';
import { formatCurrency, formatNumber } from '../services/dataProcessor';
import { DealersView } from './DealersView';
import { ModelList } from './ModelList';
import { DealerMap } from './DealerMap';
import { 
    List, Users, Package, Map as MapIcon, 
    Target, Search, Calendar, CheckCircle2, TrendingUp, Upload
} from 'lucide-react';

export type SalesSubTab = 'overview' | 'crm' | 'dealers' | 'models' | 'map';

interface SalesViewProps {
    records: SaleRecord[];
    onDealerClick: (dealerName: string) => void;
    onOfferSelect: (modelName: string, offerName: string) => void;
    onImport?: () => void;
    // Lifted state props
    currentSubTab: SalesSubTab;
    onChangeSubTab: (tab: SalesSubTab) => void;
    crmSearchQuery: string;
    onCrmSearchChange: (query: string) => void;
}

// Mock Targets (Norms) - in real app, these would come from settings/DB
const SALES_TARGETS: SalesTarget = {
    period: 'Текущий месяц',
    revenueTarget: 450000000, // 450M
    unitsTarget: 700,
    marginTarget: 50000000
};

export const SalesView: React.FC<SalesViewProps> = ({ 
    records, 
    onDealerClick, 
    onOfferSelect, 
    onImport,
    currentSubTab,
    onChangeSubTab,
    crmSearchQuery,
    onCrmSearchChange
}) => {
    // --- Overview & Norms Logic ---
    const performanceStats = useMemo(() => {
        const totalRevenue = records.reduce((sum, r) => sum + r.soldPrice, 0);
        const totalUnits = records.length;
        const totalMargin = records.reduce((sum, r) => sum + r.margin, 0);

        // Calculate progress (mock logic: assuming 'records' contains the relevant period data)
        const revenueProgress = Math.min((totalRevenue / SALES_TARGETS.revenueTarget) * 100, 100);
        const unitsProgress = Math.min((totalUnits / SALES_TARGETS.unitsTarget) * 100, 100);
        const marginProgress = Math.min((totalMargin / SALES_TARGETS.marginTarget) * 100, 100);

        return { totalRevenue, totalUnits, totalMargin, revenueProgress, unitsProgress, marginProgress };
    }, [records]);

    // --- CRM Logic ---
    const crmRecords = useMemo(() => {
        const q = (crmSearchQuery || '').toLowerCase();
        return records.filter(r => 
            (r.vin || '').toLowerCase().includes(q) || 
            (r.dealerName || '').toLowerCase().includes(q) ||
            (r.modelName || '').toLowerCase().includes(q)
        ).slice(0, 50); // Limit display for performance
    }, [records, crmSearchQuery]);

    // Render Norms Card
    const renderTargetCard = (title: string, current: number, target: number, progress: number, format: 'currency' | 'number', colorClass: string, barColor: string) => (
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-full">
            <div>
                <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-slate-500">{title}</span>
                    <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">План</span>
                </div>
                <div className="flex items-baseline gap-2 mb-1">
                    <h3 className="text-2xl font-bold text-slate-900">
                        {format === 'currency' ? formatCurrency(current) : formatNumber(current)}
                    </h3>
                    <span className="text-xs text-slate-400">
                        / {format === 'currency' ? formatCurrency(target) : formatNumber(target)}
                    </span>
                </div>
            </div>
            <div className="mt-4">
                <div className="flex justify-between text-xs mb-1.5 font-semibold">
                    <span className={colorClass}>Выполнение</span>
                    <span className={colorClass}>{progress.toFixed(1)}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${barColor}`} 
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="animate-fade-in space-y-6">
            {/* Header & Sub-navigation */}
            <div className="flex flex-col gap-6">
                <div className="bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm inline-flex flex-wrap gap-1 w-full md:w-auto">
                    {[
                        { id: 'overview', label: 'Сводка и Нормы', icon: Target },
                        { id: 'crm', label: 'Реестр сделок (CRM)', icon: List },
                        { id: 'dealers', label: 'Дилеры', icon: Users },
                        { id: 'models', label: 'Модельный ряд', icon: Package },
                        { id: 'map', label: 'География', icon: MapIcon },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => onChangeSubTab(tab.id as SalesSubTab)}
                            className={`
                                flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 md:flex-none justify-center
                                ${currentSubTab === tab.id 
                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }
                            `}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="min-h-[500px]">
                {/* 1. OVERVIEW & NORMS */}
                {currentSubTab === 'overview' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex items-center gap-2 text-slate-800 font-bold text-lg">
                            <Target className="w-5 h-5 text-indigo-600" />
                            Выполнение плана продаж (KPI)
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {renderTargetCard(
                                "Выручка", 
                                performanceStats.totalRevenue, 
                                SALES_TARGETS.revenueTarget, 
                                performanceStats.revenueProgress, 
                                'currency', 
                                'text-indigo-600', 
                                'bg-indigo-600'
                            )}
                            {renderTargetCard(
                                "Объем продаж (шт)", 
                                performanceStats.totalUnits, 
                                SALES_TARGETS.unitsTarget, 
                                performanceStats.unitsProgress, 
                                'number', 
                                'text-blue-600', 
                                'bg-blue-600'
                            )}
                            {renderTargetCard(
                                "Валовая прибыль", 
                                performanceStats.totalMargin, 
                                SALES_TARGETS.marginTarget, 
                                performanceStats.marginProgress, 
                                'currency', 
                                'text-emerald-600', 
                                'bg-emerald-600'
                            )}
                        </div>

                        {/* Additional CRM Insights */}
                        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-lg mt-6">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-white/10 rounded-xl">
                                    <TrendingUp className="w-6 h-6 text-emerald-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold mb-1">Эффективность продаж</h3>
                                    <p className="text-slate-300 text-sm leading-relaxed max-w-2xl">
                                        Текущий прогноз выполнения плана составляет <span className="text-white font-bold">{(performanceStats.revenueProgress * 1.1).toFixed(1)}%</span> к концу периода при сохранении текущей динамики. 
                                        Средний чек по закрытым сделкам: <span className="text-emerald-400 font-bold">{formatCurrency(performanceStats.totalUnits > 0 ? performanceStats.totalRevenue / performanceStats.totalUnits : 0)}</span>.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. CRM (TRANSACTIONS) */}
                {currentSubTab === 'crm' && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2 whitespace-nowrap">
                                    <List className="w-5 h-5 text-indigo-600" />
                                    Реестр транзакций
                                </h3>
                                {onImport && (
                                    <button 
                                        onClick={onImport}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium hover:bg-indigo-100 transition-colors ml-auto md:ml-0"
                                        title="Импорт данных продаж"
                                    >
                                        <Upload className="w-3.5 h-3.5" />
                                        Импорт CSV
                                    </button>
                                )}
                            </div>
                            <div className="relative w-full md:w-80">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                <input 
                                    type="text" 
                                    placeholder="Поиск по VIN, Дилеру, Модели..."
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                                    value={crmSearchQuery}
                                    onChange={(e) => onCrmSearchChange(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-600">
                                    <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                                        <tr>
                                            <th className="px-6 py-4">Дата</th>
                                            <th className="px-6 py-4">Статус</th>
                                            <th className="px-6 py-4">Клиент / Дилер</th>
                                            <th className="px-6 py-4">Автомобиль</th>
                                            <th className="px-6 py-4 text-right">Сумма сделки</th>
                                            <th className="px-6 py-4 text-right">Маржа</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {crmRecords.map((r) => (
                                            <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2 text-slate-700 font-medium">
                                                        <Calendar className="w-4 h-4 text-slate-400" />
                                                        {r.saleDate.toLocaleDateString('ru-RU')}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        Продано
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-slate-900 max-w-[200px] truncate" title={r.dealerName}>
                                                        {r.dealerName}
                                                    </div>
                                                    <div className="text-xs text-slate-400 mt-0.5">B2B Партнер</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-800">{r.modelName}</div>
                                                    <div className="text-xs text-slate-500 mt-0.5">{r.offerName}</div>
                                                    <div className="text-[10px] font-mono text-slate-400 mt-1 bg-slate-100 inline-block px-1 rounded">{r.vin}</div>
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold text-slate-900">
                                                    {formatCurrency(r.soldPrice)}
                                                </td>
                                                <td className="px-6 py-4 text-right font-medium text-emerald-600">
                                                    +{formatCurrency(r.margin)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {crmRecords.length === 0 && (
                                <div className="p-8 text-center text-slate-400">
                                    Транзакции не найдены
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 3. DEALERS VIEW */}
                {currentSubTab === 'dealers' && (
                    <DealersView records={records} onDealerClick={onDealerClick} onImport={onImport} />
                )}

                {/* 4. MODELS VIEW */}
                {currentSubTab === 'models' && (
                    <ModelList records={records} onOfferSelect={onOfferSelect} onImport={onImport} />
                )}

                {/* 5. MAP VIEW */}
                {currentSubTab === 'map' && (
                    <DealerMap records={records} onDealerSelect={onDealerClick} />
                )}
            </div>
        </div>
    );
};

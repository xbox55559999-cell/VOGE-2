
import React, { useMemo, useState } from 'react';
import { SaleRecord } from '../types';
import { formatCurrency, formatNumber } from '../services/dataProcessor';
import { Calendar, ArrowRight, TrendingUp, TrendingDown, RussianRuble, ShoppingCart, AlertCircle, DollarSign, Box } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  ComposedChart, Line, Area 
} from 'recharts';

interface ComparisonViewProps {
  records: SaleRecord[];
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({ records }) => {
  const [period1Start, setPeriod1Start] = useState('');
  const [period1End, setPeriod1End] = useState('');
  const [period2Start, setPeriod2Start] = useState('');
  const [period2End, setPeriod2End] = useState('');
  
  // State for chart toggle
  const [chartMode, setChartMode] = useState<'money' | 'units'>('money');

  const getStats = (start: string, end: string) => {
    if (!start || !end) return { revenue: 0, units: 0, records: [] };
    
    const startDate = new Date(start);
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999);

    const filtered = records.filter(r => r.saleDate >= startDate && r.saleDate <= endDate);
    
    const revenue = filtered.reduce((sum, r) => sum + r.soldPrice, 0);
    const units = filtered.length;
    
    return { revenue, units, records: filtered };
  };

  const stats1 = useMemo(() => getStats(period1Start, period1End), [records, period1Start, period1End]);
  const stats2 = useMemo(() => getStats(period2Start, period2End), [records, period2Start, period2End]);

  // Calculate Deltas
  const getDelta = (val1: number, val2: number) => {
    const diff = val2 - val1; 
    const percent = val1 === 0 ? (val2 === 0 ? 0 : 100) : ((val2 - val1) / val1) * 100;
    return { diff, percent };
  };

  const revenueDelta = getDelta(stats1.revenue, stats2.revenue);
  const unitsDelta = getDelta(stats1.units, stats2.units);

  // Prepare Monthly Data for Charts
  const chartData = useMemo(() => {
    const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
    
    // Helper to aggregate by month index (0-11)
    const aggregateByMonth = (recs: SaleRecord[]) => {
      const data = Array(12).fill(0).map(() => ({ revenue: 0, profit: 0, units: 0 }));
      recs.forEach(r => {
        data[r.month].revenue += r.soldPrice;
        data[r.month].profit += r.margin;
        data[r.month].units += 1;
      });
      return data;
    };

    const p1Data = aggregateByMonth(stats1.records);
    const p2Data = aggregateByMonth(stats2.records);

    return months.map((monthName, index) => ({
      name: monthName,
      p1_revenue: p1Data[index].revenue,
      p1_profit: p1Data[index].profit,
      p1_units: p1Data[index].units,
      p2_revenue: p2Data[index].revenue,
      p2_profit: p2Data[index].profit,
      p2_units: p2Data[index].units,
    }));
  }, [stats1.records, stats2.records]);

  const renderDeltaBadge = (percent: number) => {
    if (percent === 0) return <span className="text-slate-400 text-sm font-medium">0%</span>;
    const isPositive = percent > 0;
    return (
      <div className={`flex items-center gap-1 text-sm font-bold px-2 py-1 rounded-lg ${
        isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
      }`}>
        {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
        {Math.abs(percent).toFixed(1)}%
      </div>
    );
  };

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-slate-900">Сравнение периодов</h2>
        <p className="text-slate-500 mt-1">Анализ изменений показателей между двумя временными отрезками</p>
      </div>

      {/* Date Pickers */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex flex-col lg:flex-row items-center gap-8 justify-center">
            
            {/* Period 1 */}
            <div className="flex flex-col gap-2 w-full lg:w-auto">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Период 1 (База)</label>
                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 group focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                    <Calendar className="w-5 h-5 text-slate-400" />
                    <input 
                        type="date" 
                        className="bg-transparent border-none text-sm focus:ring-0 text-slate-700 w-32"
                        value={period1Start}
                        onChange={(e) => setPeriod1Start(e.target.value)}
                    />
                    <span className="text-slate-300">|</span>
                    <input 
                        type="date" 
                        className="bg-transparent border-none text-sm focus:ring-0 text-slate-700 w-32"
                        value={period1End}
                        onChange={(e) => setPeriod1End(e.target.value)}
                    />
                </div>
            </div>

            <div className="hidden lg:block text-slate-300">
                <ArrowRight className="w-6 h-6" />
            </div>

            {/* Period 2 */}
            <div className="flex flex-col gap-2 w-full lg:w-auto">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Период 2 (Сравнение)</label>
                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 group focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                    <Calendar className="w-5 h-5 text-indigo-500" />
                    <input 
                        type="date" 
                        className="bg-transparent border-none text-sm focus:ring-0 text-slate-700 w-32"
                        value={period2Start}
                        onChange={(e) => setPeriod2Start(e.target.value)}
                    />
                    <span className="text-slate-300">|</span>
                    <input 
                        type="date" 
                        className="bg-transparent border-none text-sm focus:ring-0 text-slate-700 w-32"
                        value={period2End}
                        onChange={(e) => setPeriod2End(e.target.value)}
                    />
                </div>
            </div>
        </div>

        {(!period1Start || !period1End || !period2Start || !period2End) && (
             <div className="mt-6 p-4 bg-amber-50 text-amber-700 rounded-xl flex items-center justify-center gap-2 text-sm border border-amber-100">
                <AlertCircle className="w-4 h-4" />
                Пожалуйста, выберите даты начала и окончания для обоих периодов.
             </div>
        )}
      </div>

      {/* Comparison Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Revenue Comparison */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                      <RussianRuble className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Выручка</h3>
                  <div className="ml-auto">
                      {renderDeltaBadge(revenueDelta.percent)}
                  </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="text-xs text-slate-500 mb-1 font-medium">Период 1</p>
                      <p className="text-xl font-bold text-slate-400">{formatCurrency(stats1.revenue)}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100">
                      <p className="text-xs text-indigo-600 mb-1 font-medium">Период 2</p>
                      <p className="text-xl font-bold text-indigo-900">{formatCurrency(stats2.revenue)}</p>
                  </div>
              </div>
              <div className="mt-4 text-center">
                  <p className="text-sm text-slate-500">
                      Разница: <span className={revenueDelta.diff > 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                          {revenueDelta.diff > 0 ? '+' : ''}{formatCurrency(revenueDelta.diff)}
                      </span>
                  </p>
              </div>
          </div>

          {/* Units Comparison */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                      <ShoppingCart className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Количество продаж</h3>
                  <div className="ml-auto">
                      {renderDeltaBadge(unitsDelta.percent)}
                  </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="text-xs text-slate-500 mb-1 font-medium">Период 1</p>
                      <p className="text-xl font-bold text-slate-400">{formatNumber(stats1.units)} шт.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100">
                      <p className="text-xs text-blue-600 mb-1 font-medium">Период 2</p>
                      <p className="text-xl font-bold text-blue-900">{formatNumber(stats2.units)} шт.</p>
                  </div>
              </div>
              <div className="mt-4 text-center">
                  <p className="text-sm text-slate-500">
                      Разница: <span className={unitsDelta.diff > 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                          {unitsDelta.diff > 0 ? '+' : ''}{formatNumber(unitsDelta.diff)} шт.
                      </span>
                  </p>
              </div>
          </div>
      </div>

      {/* Visual Comparison Chart */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <div>
                 <h3 className="text-lg font-bold text-slate-900">Наглядное сравнение</h3>
                 <p className="text-sm text-slate-500 mt-1">Помесячная динамика показателей</p>
              </div>
              
              {/* Chart Type Toggle */}
              <div className="bg-slate-100 p-1 rounded-xl flex">
                 <button 
                   onClick={() => setChartMode('money')}
                   className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                     chartMode === 'money' 
                       ? 'bg-white text-indigo-600 shadow-sm' 
                       : 'text-slate-500 hover:text-slate-700'
                   }`}
                 >
                   <RussianRuble className="w-4 h-4" />
                   Финансы
                 </button>
                 <button 
                   onClick={() => setChartMode('units')}
                   className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                     chartMode === 'units' 
                       ? 'bg-white text-indigo-600 shadow-sm' 
                       : 'text-slate-500 hover:text-slate-700'
                   }`}
                 >
                   <Box className="w-4 h-4" />
                   Продажи (шт)
                 </button>
              </div>
          </div>

          <div className="h-[400px]">
             <ResponsiveContainer width="100%" height="100%">
                {chartMode === 'money' ? (
                  <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                      <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} tickFormatter={(val) => `${(val/1000000).toFixed(1)}M`} />
                      <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} tickFormatter={(val) => `${(val/1000).toFixed(0)}k`} />
                      <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          formatter={(value: number, name: string) => {
                             const valStr = formatCurrency(value);
                             if (name === 'p1_revenue') return [valStr, 'Выручка (П1)'];
                             if (name === 'p2_revenue') return [valStr, 'Выручка (П2)'];
                             if (name === 'p1_profit') return [valStr, 'Прибыль (П1)'];
                             if (name === 'p2_profit') return [valStr, 'Прибыль (П2)'];
                             return [valStr, name];
                          }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      {/* Revenue Bars */}
                      <Bar yAxisId="left" dataKey="p1_revenue" name="Выручка (П1)" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={20} />
                      <Bar yAxisId="left" dataKey="p2_revenue" name="Выручка (П2)" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={20} />
                      
                      {/* Profit Lines */}
                      <Line yAxisId="right" type="monotone" dataKey="p1_profit" name="Прибыль (П1)" stroke="#94a3b8" strokeDasharray="5 5" dot={false} strokeWidth={2} />
                      <Line yAxisId="right" type="monotone" dataKey="p2_profit" name="Прибыль (П2)" stroke="#10b981" dot={{r: 4, fill: '#10b981'}} strokeWidth={2} />
                  </ComposedChart>
                ) : (
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                      <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          cursor={{fill: '#f8fafc'}}
                          formatter={(value: number, name: string) => {
                             if (name === 'p1_units') return [value, 'Продажи (П1)'];
                             if (name === 'p2_units') return [value, 'Продажи (П2)'];
                             return [value, name];
                          }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      <Bar dataKey="p1_units" name="Продажи (П1)" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={30} />
                      <Bar dataKey="p2_units" name="Продажи (П2)" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                  </BarChart>
                )}
             </ResponsiveContainer>
          </div>
      </div>
    </div>
  );
};


import React, { useMemo } from 'react';
import { SaleRecord } from '../types';
import { formatCurrency, formatNumber } from '../services/dataProcessor';
import { 
  ComposedChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  ScatterChart, Scatter, ZAxis, AreaChart, Area
} from 'recharts';
import { TrendingUp, Calendar, Activity, BarChart2 } from 'lucide-react';

interface AnalyticsViewProps {
  records: SaleRecord[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ records }) => {
  
  // 1. Revenue vs Margin Over Time
  const trendData = useMemo(() => {
    const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
    const data = months.map((m, i) => ({ name: m, revenue: 0, margin: 0, units: 0 }));
    
    records.forEach(r => {
      data[r.month].revenue += r.soldPrice;
      data[r.month].margin += r.margin;
      data[r.month].units += 1;
    });
    return data;
  }, [records]);

  // 2. Daily Sales Heatmap (Simplified to Day of Week distribution)
  const dayOfWeekData = useMemo(() => {
    const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const data = days.map(d => ({ name: d, sales: 0 }));
    records.forEach(r => {
      const dayIndex = r.saleDate.getDay();
      data[dayIndex].sales += 1;
    });
    return data;
  }, [records]);

  // 3. Model Performance Matrix (Price vs Margin)
  const scatterData = useMemo(() => {
    const modelMap = new Map<string, { revenue: number, margin: number, count: number }>();
    records.forEach(r => {
        const current = modelMap.get(r.modelName) || { revenue: 0, margin: 0, count: 0 };
        modelMap.set(r.modelName, {
            revenue: current.revenue + r.soldPrice,
            margin: current.margin + r.margin,
            count: current.count + 1
        });
    });
    
    return Array.from(modelMap.entries()).map(([name, stats]) => ({
        name,
        x: Math.round(stats.revenue / stats.count), // Avg Price
        y: Math.round((stats.margin / stats.revenue) * 100), // Margin %
        z: stats.count // Volume (bubble size)
    }));
  }, [records]);

  // 4. Cumulative Revenue
  const cumulativeData = useMemo(() => {
      const sorted = [...records].sort((a, b) => a.saleDate.getTime() - b.saleDate.getTime());
      const points: { date: string, total: number }[] = [];
      let runningTotal = 0;
      
      // Aggregate by day to reduce points if needed, simplified here
      // Grouping by month for cleaner chart if range is large
      const aggregatedByMonth = new Map<string, number>();
      sorted.forEach(r => {
          const key = `${r.year}-${r.month}`;
          aggregatedByMonth.set(key, (aggregatedByMonth.get(key) || 0) + r.soldPrice);
      });

      // Convert to array and calculate cumulative
      // Assuming records span roughly 1-2 years from mock data structure
      // We will stick to the trendData structure but cumulative
      const monthLabels = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
      let cumulative = 0;
      return trendData.map(d => {
          cumulative += d.revenue;
          return { name: d.name, value: cumulative };
      });

  }, [records, trendData]);

  return (
    <div className="animate-fade-in space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h2 className="text-3xl font-bold text-slate-900">Глубокая аналитика</h2>
                <p className="text-slate-500 mt-1">Тренды, корреляции и финансовые показатели</p>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Financial Efficiency */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-indigo-600" />
                            Финансовая эффективность
                        </h3>
                        <p className="text-xs text-slate-400">Выручка и Маржинальность по месяцам</p>
                    </div>
                </div>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} dy={10} />
                            <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} tickFormatter={(v) => `${(v/1000000).toFixed(1)}M`} />
                            <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                            <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                formatter={(value: number, name) => [formatCurrency(value), name === 'revenue' ? 'Выручка' : 'Маржа']}
                            />
                            <Legend />
                            <Area yAxisId="left" type="monotone" dataKey="revenue" name="Выручка" fill="url(#colorRevenue)" stroke="#6366f1" strokeWidth={2} />
                            <Line yAxisId="right" type="monotone" dataKey="margin" name="Маржа" stroke="#10b981" strokeWidth={2} dot={{r: 4, fill: '#10b981'}} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Chart 2: Cumulative Growth */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-amber-500" />
                            Накопительный рост
                        </h3>
                        <p className="text-xs text-slate-400">Кумулятивная выручка с начала года</p>
                    </div>
                </div>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={cumulativeData} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorCum" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} tickFormatter={(v) => `${(v/1000000).toFixed(0)}M`} />
                            <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                formatter={(value: number) => [formatCurrency(value), "Накопительно"]}
                            />
                            <Area type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={3} fill="url(#colorCum)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Chart 3: Model Matrix */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <BarChart2 className="w-5 h-5 text-blue-500" />
                            Матрица эффективности моделей
                        </h3>
                        <p className="text-xs text-slate-400">Ось X: Ср. Цена, Ось Y: Рентабельность %, Размер: Объем продаж</p>
                    </div>
                </div>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis type="number" dataKey="x" name="Средняя цена" unit="₽" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                            <YAxis type="number" dataKey="y" name="Рентабельность" unit="%" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                            <ZAxis type="number" dataKey="z" range={[50, 500]} name="Продажи (шт)" />
                            <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                            <Scatter name="Модели" data={scatterData} fill="#3b82f6" />
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Chart 4: Day of Week Analysis */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-rose-500" />
                            Активность продаж
                        </h3>
                        <p className="text-xs text-slate-400">Распределение сделок по дням недели</p>
                    </div>
                </div>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dayOfWeekData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                            <Tooltip 
                                cursor={{fill: '#fff1f2'}}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar dataKey="sales" fill="#f43f5e" radius={[6, 6, 0, 0]} barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    </div>
  );
};

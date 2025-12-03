
import React, { useState, useEffect, useMemo } from 'react';
import { SaleRecord } from '../types';
import { getBusinessRecommendations } from '../services/aiService';
import { saveToDB, loadFromDB } from '../services/storage';
import { Sparkles, AlertCircle, Loader2, FileText, CheckCircle2, Calendar, ArrowRight, Save, History, Trash2, Clock, ChevronRight, X } from 'lucide-react';

interface RecommendationsViewProps {
  salesRecords: SaleRecord[];
  inventoryRecords: SaleRecord[];
}

interface SavedRecommendation {
    id: string;
    timestamp: number;
    period1Label: string;
    period2Label: string;
    content: string;
}

const STORAGE_KEY_HISTORY = 'moto_ai_history';

export const RecommendationsView: React.FC<RecommendationsViewProps> = ({ salesRecords, inventoryRecords }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [currentResultMeta, setCurrentResultMeta] = useState<{p1: string, p2: string} | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // History State
  const [history, setHistory] = useState<SavedRecommendation[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Date State for Comparison
  const [period1Start, setPeriod1Start] = useState('');
  const [period1End, setPeriod1End] = useState('');
  const [period2Start, setPeriod2Start] = useState('');
  const [period2End, setPeriod2End] = useState('');

  // Load History on Mount and Auto-Display Latest
  useEffect(() => {
      const loadHistory = async () => {
          const saved = await loadFromDB(STORAGE_KEY_HISTORY);
          if (saved && Array.isArray(saved) && saved.length > 0) {
              setHistory(saved);
              
              // Feature: Show last recommendation automatically
              const latest = saved[0];
              setResult(latest.content);
              setCurrentResultMeta({ p1: latest.period1Label, p2: latest.period2Label });
              setIsSaved(true);
          }
      };
      loadHistory();
  }, []);

  // Initialize dates intelligently
  useEffect(() => {
    if (salesRecords.length > 0 && !period1Start) {
        const dates = salesRecords.map(r => r.saleDate.getTime());
        const maxDate = new Date(Math.max(...dates));
        const minDate = new Date(Math.min(...dates));

        // Helper: format Date to YYYY-MM-DD
        const formatDate = (d: Date) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        // Period 1: Last 30 days of available data
        const p1End = maxDate;
        const p1Start = new Date(maxDate);
        p1Start.setDate(p1End.getDate() - 30);
        
        // Period 2: Previous 30 days
        const p2End = new Date(p1Start);
        p2End.setDate(p2End.getDate() - 1);
        const p2Start = new Date(p2End);
        p2Start.setDate(p2End.getDate() - 30);

        setPeriod1End(formatDate(p1End));
        setPeriod1Start(formatDate(p1Start < minDate ? minDate : p1Start));
        
        setPeriod2End(formatDate(p2End < minDate ? minDate : p2End));
        setPeriod2Start(formatDate(p2Start < minDate ? minDate : p2Start));
    }
  }, [salesRecords]);

  const getFilteredRecords = (start: string, end: string) => {
      if (!start || !end) return [];
      const startDate = new Date(start);
      const endDate = new Date(end);
      endDate.setHours(23, 59, 59, 999);
      
      return salesRecords.filter(r => r.saleDate >= startDate && r.saleDate <= endDate);
  };

  const salesP1 = useMemo(() => getFilteredRecords(period1Start, period1End), [salesRecords, period1Start, period1End]);
  const salesP2 = useMemo(() => getFilteredRecords(period2Start, period2End), [salesRecords, period2Start, period2End]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setIsSaved(false);
    setCurrentResultMeta(null);
    // Clear current result to show loading state properly
    setResult(null); 
    
    try {
      if (salesP1.length === 0 && salesP2.length === 0) {
        throw new Error("Нет данных о продажах за выбранные периоды.");
      }
      
      const p1Label = `${new Date(period1Start).toLocaleDateString('ru-RU')} - ${new Date(period1End).toLocaleDateString('ru-RU')}`;
      const p2Label = `${new Date(period2Start).toLocaleDateString('ru-RU')} - ${new Date(period2End).toLocaleDateString('ru-RU')}`;

      const text = await getBusinessRecommendations(salesP1, salesP2, inventoryRecords, p1Label, p2Label);
      setResult(text || "Не удалось получить ответ от модели.");
      setCurrentResultMeta({ p1: p1Label, p2: p2Label });
      
      // Auto-save to history on generation
      const newItem: SavedRecommendation = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          period1Label: p1Label,
          period2Label: p2Label,
          content: text || ""
      };
      const updatedHistory = [newItem, ...history];
      setHistory(updatedHistory);
      await saveToDB(STORAGE_KEY_HISTORY, updatedHistory);
      setIsSaved(true);

    } catch (err: any) {
      setError(err.message || "Произошла ошибка при генерации рекомендаций.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToHistory = async () => {
      if (!result || !currentResultMeta || isSaved) return;

      const newItem: SavedRecommendation = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          period1Label: currentResultMeta.p1,
          period2Label: currentResultMeta.p2,
          content: result
      };

      const updatedHistory = [newItem, ...history];
      setHistory(updatedHistory);
      await saveToDB(STORAGE_KEY_HISTORY, updatedHistory);
      setIsSaved(true);
  };

  const handleDeleteHistoryItem = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      const updatedHistory = history.filter(item => item.id !== id);
      setHistory(updatedHistory);
      await saveToDB(STORAGE_KEY_HISTORY, updatedHistory);
      
      // If we deleted the currently viewed item, clear the view? 
      // User requested "don't delete until new one requested", so we keep current view even if deleted from history 
      // unless we want strict sync. For now, keep view as is.
  };

  const handleLoadHistoryItem = (item: SavedRecommendation) => {
      setResult(item.content);
      setCurrentResultMeta({ p1: item.period1Label, p2: item.period2Label });
      setIsSaved(true); // Already saved since it's from history
      // Close history on mobile if open
      if (window.innerWidth < 1024) setShowHistory(false);
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Helper function to render formatted text safely
  const renderFormattedText = (text: string) => {
    return text.split('\n').map((line, index) => {
        if (line.startsWith('### ')) {
            return <h3 key={index} className="text-lg font-bold text-slate-900 mt-6 mb-3">{line.replace('### ', '')}</h3>;
        }
        if (line.startsWith('## ')) {
            return <h2 key={index} className="text-xl font-bold text-indigo-900 mt-8 mb-4 border-b border-indigo-100 pb-2">{line.replace('## ', '')}</h2>;
        }
        if (line.startsWith('# ')) {
            return <h1 key={index} className="text-2xl font-bold text-slate-900 mt-8 mb-4">{line.replace('# ', '')}</h1>;
        }
        if (line.includes('**')) {
            const parts = line.split('**');
            return (
                <p key={index} className="mb-2 text-slate-700 leading-relaxed">
                    {parts.map((part, i) => i % 2 === 1 ? <strong key={i} className="font-semibold text-slate-900">{part}</strong> : part)}
                </p>
            );
        }
        if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
            return (
                <li key={index} className="ml-4 list-disc text-slate-700 mb-1 pl-2 marker:text-indigo-400">
                    {line.replace(/^[-*]\s/, '')}
                </li>
            );
        }
        if (line.trim() === '') {
            return <div key={index} className="h-2"></div>;
        }
        return <p key={index} className="mb-2 text-slate-700 leading-relaxed">{line}</p>;
    });
  };

  return (
    <div className="animate-fade-in flex flex-col lg:flex-row gap-6 relative min-h-[calc(100vh-8rem)]">
      
      {/* Main Content Area */}
      <div className="flex-1 space-y-8 w-full min-w-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h2 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                    <Sparkles className="w-8 h-8 text-indigo-600" />
                    AI Бизнес-Ассистент
                </h2>
                <p className="text-slate-500 mt-2 max-w-2xl">
                    Использует модель Gemini 3.0 Pro для сравнительного анализа периодов и поиска точек роста.
                </p>
            </div>
            
            <button 
                onClick={() => setShowHistory(!showHistory)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${showHistory ? 'bg-indigo-100 text-indigo-700' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
                <History className="w-4 h-4" />
                История {history.length > 0 && <span className="bg-indigo-600 text-white text-[10px] px-1.5 rounded-full">{history.length}</span>}
            </button>
        </div>

        {/* Date Filters Block - Always visible to change query */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex flex-col lg:flex-row items-center gap-8 justify-center">
                {/* Period 1 */}
                <div className="flex flex-col gap-2 w-full lg:w-auto">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Период 1 (Текущий)</label>
                    <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 group focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                        <Calendar className="w-5 h-5 text-indigo-500" />
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
                        <Calendar className="w-5 h-5 text-slate-400" />
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
                <div className="mt-4 text-center text-sm text-amber-600 bg-amber-50 p-2 rounded-lg inline-block w-full">
                    Пожалуйста, укажите даты для корректного анализа
                </div>
            )}
        </div>

        {!result && !loading && (
            <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-3xl p-8 text-white shadow-xl flex flex-col items-center text-center">
                <div className="bg-white/20 p-4 rounded-full mb-6 backdrop-blur-sm">
                    <FileText className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Готов к сравнению</h3>
                <p className="text-indigo-100 mb-8 max-w-lg">
                    Выбрано: <b>{salesP1.length}</b> продаж в периоде 1 и <b>{salesP2.length}</b> продаж в периоде 2.
                    Также анализируются текущие остатки ({inventoryRecords.length} поз.).
                    Нажмите кнопку ниже для запуска сравнительного аудита.
                </p>
                
                <button 
                    onClick={handleGenerate}
                    disabled={!period1Start || !period1End || !period2Start || !period2End}
                    className="group relative inline-flex items-center justify-center px-8 py-4 font-semibold text-indigo-600 transition-all duration-200 bg-white rounded-full hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-indigo-600 focus:ring-white shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                    <Sparkles className="w-5 h-5 mr-2 animate-pulse" />
                    Сравнить и дать рекомендации
                </button>
            </div>
        )}

        {loading && (
            <div className="bg-white rounded-3xl p-12 border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center min-h-[400px]">
                <div className="relative">
                    <div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-75"></div>
                    <div className="relative bg-indigo-50 p-4 rounded-full">
                        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                    </div>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mt-6">Анализируем периоды...</h3>
                <p className="text-slate-500 mt-2 max-w-md">
                    Сравниваем показатели продаж, ищем тренды роста и падения, проверяем склад. Это может занять до 30 секунд.
                </p>
            </div>
        )}

        {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 flex items-start gap-4 text-rose-800">
                <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
                <div>
                    <h4 className="font-bold text-lg mb-1">Ошибка анализа</h4>
                    <p>{error}</p>
                    <button 
                        onClick={() => setError(null)}
                        className="mt-4 text-sm font-semibold underline hover:text-rose-900"
                    >
                        Попробовать снова
                    </button>
                </div>
            </div>
        )}

        {result && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-indigo-50/50 p-6 border-b border-indigo-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-2 text-indigo-900 font-semibold">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        Анализ завершен
                        {currentResultMeta && (
                            <span className="text-xs font-normal text-indigo-600 ml-2 bg-indigo-100 px-2 py-0.5 rounded-full border border-indigo-200">
                                Сравнение: {currentResultMeta.p1} vs {currentResultMeta.p2}
                            </span>
                        )}
                    </div>
                    
                    <div className="flex gap-2 w-full md:w-auto">
                        <button 
                            onClick={handleGenerate}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm bg-white border border-indigo-100 text-indigo-600 hover:text-indigo-800 font-medium hover:bg-indigo-50 rounded-xl transition-all shadow-sm"
                        >
                            <Sparkles className="w-4 h-4" />
                            Сгенерировать новый
                        </button>
                        
                        <button 
                            onClick={handleSaveToHistory}
                            disabled={isSaved}
                            className={`
                                flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all shadow-sm
                                ${isSaved 
                                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-default' 
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
                                }
                            `}
                        >
                            {isSaved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                            {isSaved ? 'Сохранено' : 'Сохранить'}
                        </button>
                    </div>
                </div>
                <div className="p-8 md:p-12 prose prose-slate max-w-none">
                    {renderFormattedText(result)}
                </div>
            </div>
        )}
      </div>

      {/* History Sidebar */}
      <div 
        className={`
            fixed inset-y-0 right-0 z-30 w-80 bg-white border-l border-slate-200 shadow-2xl transform transition-transform duration-300 ease-in-out
            lg:relative lg:transform-none lg:shadow-none lg:w-72 lg:block lg:bg-transparent lg:border-l-0
            ${showHistory ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
            ${!showHistory && 'lg:hidden'}
        `}
      >
          <div className="h-full flex flex-col bg-white lg:rounded-2xl lg:border lg:border-slate-200 lg:shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                      <History className="w-4 h-4 text-slate-500" />
                      История
                  </h3>
                  <button onClick={() => setShowHistory(false)} className="lg:hidden text-slate-400 hover:text-slate-600">
                      <X className="w-5 h-5" />
                  </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {history.length === 0 ? (
                      <div className="text-center py-10 text-slate-400">
                          <History className="w-10 h-10 mx-auto mb-3 opacity-20" />
                          <p className="text-sm">История пуста</p>
                          <p className="text-xs mt-1">Сохраните результат анализа, чтобы вернуться к нему позже</p>
                      </div>
                  ) : (
                      history.map(item => (
                          <div 
                            key={item.id}
                            onClick={() => handleLoadHistoryItem(item)}
                            className="group bg-white border border-slate-100 rounded-xl p-3 hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer relative"
                          >
                              <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                                      <Clock className="w-3 h-3" />
                                      {new Date(item.timestamp).toLocaleDateString('ru-RU')}
                                  </div>
                                  <button 
                                    onClick={(e) => handleDeleteHistoryItem(e, item.id)}
                                    className="text-slate-300 hover:text-rose-500 p-1 rounded hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100"
                                    title="Удалить"
                                  >
                                      <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                              </div>
                              <div className="space-y-1">
                                  <div className="flex items-center justify-between text-[10px] text-slate-400 bg-slate-50 p-1.5 rounded">
                                      <span className="truncate max-w-[80px]">{item.period1Label}</span>
                                      <ArrowRight className="w-3 h-3 text-slate-300" />
                                      <span className="truncate max-w-[80px]">{item.period2Label}</span>
                                  </div>
                              </div>
                              <div className="mt-2 flex items-center text-xs text-indigo-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                  Открыть отчет <ChevronRight className="w-3 h-3 ml-auto" />
                              </div>
                          </div>
                      ))
                  )}
              </div>
          </div>
      </div>
      
      {/* Overlay for mobile when history is open */}
      {showHistory && (
          <div 
            className="fixed inset-0 bg-black/20 z-20 lg:hidden"
            onClick={() => setShowHistory(false)}
          ></div>
      )}
    </div>
  );
};

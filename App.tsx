
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { MOCK_DATA } from './constants';
import { RawData, SaleRecord } from './types';
import { processData, formatCurrency, formatNumber } from './services/dataProcessor';
import { saveToDB, loadFromDB } from './services/storage';
import { Sidebar } from './components/Sidebar';
import { StatCard } from './components/StatCard';
import { DealerDetail } from './components/DealerDetail';
import { ModelList } from './components/ModelList';
import { ModelOfferDetail } from './components/ModelOfferDetail';
import { DealerOfferSales } from './components/DealerOfferSales';
import { DealersView } from './components/DealersView';
import { AnalyticsView } from './components/AnalyticsView';
import { ComparisonView } from './components/ComparisonView';
import { InventoryView } from './components/InventoryView';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { 
  RussianRuble, ShoppingCart, TrendingUp, Wallet, 
  Calendar, Filter, Download, Search, Package, ChevronRight, ChevronDown, Check, Tag, Upload, BadgeCheck, Box, Loader2
} from 'lucide-react';

const STORAGE_KEY = 'moto_analytics_data';
const STORAGE_KEY_INVENTORY = 'moto_analytics_inventory';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDataLoading, setIsDataLoading] = useState(true);
  
  // Data State - Initialize with MOCK_DATA temporarily, then load from DB
  const [rawData, setRawData] = useState<RawData>(MOCK_DATA);

  // Inventory Data State
  const [inventoryRawData, setInventoryRawData] = useState<RawData>({ total: { count_sold: 0, total_sold_price: 0, total_buy_price: 0 }, items: {} });

  // Load Data from IndexedDB on Mount
  useEffect(() => {
    const initData = async () => {
        setIsDataLoading(true);
        try {
            // Load Sales Data
            const savedSales = await loadFromDB(STORAGE_KEY);
            if (savedSales) {
                setRawData(savedSales);
                console.log('Loaded sales data from DB');
            } else {
                console.log('No sales data in DB, using mock');
                setRawData(MOCK_DATA);
            }

            // Load Inventory Data
            const savedInventory = await loadFromDB(STORAGE_KEY_INVENTORY);
            if (savedInventory) {
                setInventoryRawData(savedInventory);
                console.log('Loaded inventory data from DB');
            }
        } catch (e) {
            console.error('Error loading data:', e);
        } finally {
            setIsDataLoading(false);
        }
    };

    initData();
  }, []);

  // View State
  const [currentView, setCurrentView] = useState<'dashboard' | 'dealer'>('dashboard');
  const [selectedDealerDetailId, setSelectedDealerDetailId] = useState<string | null>(null);

  // Model View State
  const [modelViewMode, setModelViewMode] = useState<'list' | 'detail' | 'sales'>('list');
  const [selectedModelOffer, setSelectedModelOffer] = useState<{model: string, offer: string} | null>(null);
  const [selectedDealerForOffer, setSelectedDealerForOffer] = useState<string | null>(null);

  // Dashboard Chart State
  const [dashboardChartMode, setDashboardChartMode] = useState<'revenue' | 'units'>('revenue');

  // Filter State
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [selectedDealer, setSelectedDealer] = useState<string>('all');
  // Multi-select for models
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  // Multi-select for offers
  const [selectedOffers, setSelectedOffers] = useState<string[]>([]);
  const [isOfferDropdownOpen, setIsOfferDropdownOpen] = useState(false);

  // Date Range Filter
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // File Upload Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset detailed views when tab changes
  useEffect(() => {
    setCurrentView('dashboard');
    setSelectedDealerDetailId(null);
    setModelViewMode('list');
    setSelectedModelOffer(null);
    setSelectedDealerForOffer(null);
  }, [activeTab]);

  // 1. Process raw data into flat records
  const allRecords = useMemo(() => processData(rawData), [rawData]);
  const allInventoryRecords = useMemo(() => processData(inventoryRawData), [inventoryRawData]);

  // Determine which dataset to use for filters based on active tab
  // This ensures filters populate correctly if only inventory data is loaded
  const currentDataset = useMemo(() => {
    return activeTab === 'inventory' ? allInventoryRecords : allRecords;
  }, [activeTab, allRecords, allInventoryRecords]);

  // 2. Extract Filter Options from the ACTIVE dataset
  const availableYears = useMemo(() => Array.from(new Set(currentDataset.map(r => r.year))).sort(), [currentDataset]);
  const availableBrands = useMemo(() => Array.from(new Set(currentDataset.map(r => r.brand))).sort(), [currentDataset]);
  const availableDealers = useMemo(() => Array.from(new Set(currentDataset.map(r => r.dealerName))).sort(), [currentDataset]);
  const availableModels = useMemo(() => {
      const records = selectedBrand === 'all' ? currentDataset : currentDataset.filter(r => r.brand === selectedBrand);
      return Array.from(new Set(records.map(r => r.modelName))).sort();
  }, [currentDataset, selectedBrand]);
  
  const availableOffers = useMemo(() => {
      let records = currentDataset;
      if (selectedBrand !== 'all') {
          records = records.filter(r => r.brand === selectedBrand);
      }
      if (selectedModels.length > 0) {
          records = records.filter(r => selectedModels.includes(r.modelName));
      }
      return Array.from(new Set(records.map(r => r.offerName))).sort();
  }, [currentDataset, selectedBrand, selectedModels]);

  // Helper to toggle model selection
  const toggleModel = (model: string) => {
    setSelectedModels(prev => {
      if (prev.includes(model)) {
        return prev.filter(m => m !== model);
      } else {
        return [...prev, model];
      }
    });
  };

  // Helper to toggle offer selection
  const toggleOffer = (offer: string) => {
    setSelectedOffers(prev => {
      if (prev.includes(offer)) {
        return prev.filter(o => o !== offer);
      } else {
        return [...prev, offer];
      }
    });
  };
  
  // Reset dependent filters when brand changes
  useEffect(() => {
      setSelectedModels([]);
      setSelectedOffers([]);
  }, [selectedBrand]);

  // Handle File Upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const parsedData = JSON.parse(content);

        // Basic validation
        if (!parsedData.total || !parsedData.items) {
          alert('Ошибка: Неверный формат файла. Файл должен содержать структуру MotoAnalytics (total, items).');
          return;
        }

        // Check active tab to decide where to load data
        if (activeTab === 'inventory') {
            setInventoryRawData(parsedData);
            try {
                await saveToDB(STORAGE_KEY_INVENTORY, parsedData);
                alert('Файл остатков успешно загружен и сохранен в базе данных!');
            } catch (storageError) {
                console.error('DB error:', storageError);
                alert('Файл остатков загружен в память, но не сохранен в БД.');
            }
        } else {
            // Load Sales Data
            setRawData(parsedData);
            try {
                await saveToDB(STORAGE_KEY, parsedData);
                alert('Файл продаж успешно загружен и сохранен в базе данных!');
            } catch (storageError) {
                console.error('DB error:', storageError);
                alert('Файл продаж загружен в память, но не сохранен в БД.');
            }
        }
        
        // Reset filters
        setSelectedYear('all');
        setSelectedBrand('all');
        setSelectedDealer('all');
        setSelectedModels([]);
        setSelectedOffers([]);
        setStartDate('');
        setEndDate('');
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

      } catch (error) {
        console.error('Error parsing JSON:', error);
        alert('Ошибка при чтении файла. Убедитесь, что это корректный JSON.');
      }
    };
    reader.readAsText(file);
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  // 3. Filter Records Logic (Reusable for Sales and Inventory)
  const filterRecordsGeneric = (recordsToFilter: SaleRecord[]) => {
      return recordsToFilter.filter(record => {
        if (selectedBrand !== 'all' && record.brand !== selectedBrand) return false;
        if (selectedDealer !== 'all' && record.dealerName !== selectedDealer) return false;
        if (selectedModels.length > 0 && !selectedModels.includes(record.modelName)) return false;
        if (selectedOffers.length > 0 && !selectedOffers.includes(record.offerName)) return false;
        return true;
      });
  };

  const recordsFilteredByMetadata = useMemo(() => filterRecordsGeneric(allRecords), [allRecords, selectedBrand, selectedDealer, selectedModels, selectedOffers]);

  // Sales Records with Date Filtering
  const filteredRecords = useMemo(() => {
    return recordsFilteredByMetadata.filter(record => {
      // Year Filter
      if (selectedYear !== 'all' && record.year !== selectedYear) return false;
      
      // Date Range Filter
      if (startDate) {
        const start = new Date(startDate);
        if (record.saleDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        const endOfDay = new Date(end);
        endOfDay.setHours(23, 59, 59, 999);
        if (record.saleDate > endOfDay) return false;
      }
      return true;
    });
  }, [recordsFilteredByMetadata, selectedYear, startDate, endDate]);

  // Inventory Records (No date filtering applied typically for current stock)
  const filteredInventoryRecords = useMemo(() => {
      return filterRecordsGeneric(allInventoryRecords);
  }, [allInventoryRecords, selectedBrand, selectedDealer, selectedModels, selectedOffers]);


  // 4. Calculate KPIs
  const kpi = useMemo(() => {
    const totalRevenue = filteredRecords.reduce((sum, r) => sum + r.soldPrice, 0);
    const totalCost = filteredRecords.reduce((sum, r) => sum + r.buyPrice, 0);
    const totalMargin = totalRevenue - totalCost;
    const totalUnits = filteredRecords.length;
    const avgTicket = totalUnits > 0 ? totalRevenue / totalUnits : 0;
    const marginPercent = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

    return { totalRevenue, totalCost, totalMargin, totalUnits, avgTicket, marginPercent };
  }, [filteredRecords]);

  // 5. Prepare Chart Data: Monthly Sales Comparison
  const monthlyData = useMemo(() => {
    const data: any[] = [];
    const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
    
    months.forEach((monthName, index) => {
      const item: any = { name: monthName };
      
      if (selectedYear === 'all') {
         availableYears.forEach(year => {
            const records = recordsFilteredByMetadata.filter(r => r.year === year && r.month === index);
            // Revenue Data
            item[`${year}`] = records.reduce((sum, r) => sum + r.soldPrice, 0);
            // Units Data
            item[`${year}_units`] = records.length;
         });
      } else {
         const records = filteredRecords.filter(r => r.month === index);
         item['Выручка'] = records.reduce((sum, r) => sum + r.soldPrice, 0);
         item['Прибыль'] = records.reduce((sum, r) => sum + r.margin, 0);
         item['Продажи'] = records.length;
      }
      data.push(item);
    });
    return data;
  }, [recordsFilteredByMetadata, filteredRecords, availableYears, selectedYear]);

  // 6. Prepare Chart Data: Top Dealers
  const topDealers = useMemo(() => {
    const map = new Map<string, number>();
    filteredRecords.forEach(r => {
      map.set(r.dealerName, (map.get(r.dealerName) || 0) + r.soldPrice);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10
  }, [filteredRecords]);

  // 7. Prepare Chart Data: Top Models
  const topModels = useMemo(() => {
    const map = new Map<string, number>();
    const totalSales = filteredRecords.length;

    filteredRecords.forEach(r => {
      map.set(r.modelName, (map.get(r.modelName) || 0) + 1);
    });
    
    return Array.from(map.entries())
      .map(([name, value]) => ({ 
          name, 
          value,
          share: totalSales > 0 ? (value / totalSales) * 100 : 0 
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredRecords]);

  // Handlers
  const handleDealerClick = (dealerName: string) => {
    setSelectedDealerDetailId(dealerName);
    setCurrentView('dealer');
    window.scrollTo(0, 0);
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
    setSelectedDealerDetailId(null);
  };

  const handleOfferSelect = (modelName: string, offerName: string) => {
    setSelectedModelOffer({ model: modelName, offer: offerName });
    setModelViewMode('detail');
    window.scrollTo(0, 0);
  };

  const handleDealerInOfferSelect = (dealerName: string) => {
      setSelectedDealerForOffer(dealerName);
      setModelViewMode('sales');
      window.scrollTo(0, 0);
  };

  const handleBackToModelList = () => {
    setModelViewMode('list');
    setSelectedModelOffer(null);
  };

  const handleBackToOfferDetail = () => {
      setModelViewMode('detail');
      setSelectedDealerForOffer(null);
  };

  const getPageTitle = () => {
    if (currentView === 'dealer') return 'Карточка дилера';
    switch (activeTab) {
      case 'models': return 'Модели';
      case 'dealers': return 'Дилеры';
      case 'inventory': return 'Остатки';
      case 'analytics': return 'Аналитика';
      case 'comparison': return 'Сравнение';
      default: return 'Обзор';
    }
  };

  const getPageDescription = () => {
     if (currentView === 'dealer') return 'Детальная статистика продаж и показатели партнера';
     switch (activeTab) {
       case 'models': return 'Детальная статистика по модельному ряду';
       case 'dealers': return 'Управление и анализ дилерской сети';
       case 'inventory': return 'Анализ складских запасов дилеров';
       case 'analytics': return 'Глубокий анализ данных продаж';
       case 'comparison': return 'Сравнение эффективности периодов';
       default: return 'Обзор ключевых показателей эффективности за выбранный период';
     }
  };

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (isDataLoading) {
      return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
              <h2 className="text-xl font-semibold text-slate-700">Загрузка данных...</h2>
              <p className="text-slate-500 mt-2">Считываем историю продаж из базы данных</p>
          </div>
      );
  }

  // Determine if Date filters should be shown
  const showDateFilters = currentView === 'dealer' || (activeTab !== 'comparison' && activeTab !== 'inventory');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900">
      {/* Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-x-hidden">
        
        {/* GLOBAL HEADER & FILTERS */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-8">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">
                {getPageTitle()}
              </h2>
              <p className="text-slate-500 mt-1">
                {getPageDescription()}
              </p>
            </div>
            
            <div className="flex flex-wrap gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm w-full xl:w-auto z-20 relative">
                
                {/* Date Filters */}
                {showDateFilters && (
                  <>
                        <div className="relative flex-grow xl:flex-grow-0">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Calendar className="h-4 w-4 text-slate-400" />
                          </div>
                          <select 
                            className="w-full xl:w-auto pl-9 pr-8 py-2 bg-slate-50 border-none rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 cursor-pointer outline-none hover:bg-slate-100 transition-colors appearance-none"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                          >
                            <option value="all">Все года</option>
                            {availableYears.map(year => (
                              <option key={year} value={year}>{year}</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="relative">
                              <input 
                                type="date" 
                                className="pl-3 pr-3 py-2 bg-slate-50 border-none rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none hover:bg-slate-100 transition-colors"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                placeholder="С"
                              />
                          </div>
                          <span className="text-slate-400">-</span>
                          <div className="relative">
                              <input 
                                type="date" 
                                className="pl-3 pr-3 py-2 bg-slate-50 border-none rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none hover:bg-slate-100 transition-colors"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                placeholder="По"
                              />
                          </div>
                        </div>
                  </>
                )}

                {/* Brand Filter */}
                <div className="relative flex-grow xl:flex-grow-0">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <BadgeCheck className="h-4 w-4 text-slate-400" />
                  </div>
                  <select 
                    className="w-full xl:w-auto pl-9 pr-8 py-2 bg-slate-50 border-none rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 cursor-pointer outline-none hover:bg-slate-100 transition-colors appearance-none"
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
                  >
                    <option value="all">Все марки</option>
                    {availableBrands.map(brand => (
                      <option key={brand} value={brand}>{brand}</option>
                    ))}
                  </select>
                </div>

                {/* Dealer Filter - Disabled when in Dealer Detail View */}
                <div className="relative flex-grow xl:flex-grow-0">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Filter className="h-4 w-4 text-slate-400" />
                  </div>
                  <select 
                    className={`w-full xl:w-[200px] pl-9 pr-8 py-2 bg-slate-50 border-none rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-colors appearance-none truncate ${currentView === 'dealer' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-100'}`}
                    value={selectedDealer}
                    onChange={(e) => setSelectedDealer(e.target.value)}
                    disabled={currentView === 'dealer'}
                    title={currentView === 'dealer' ? "Фильтр недоступен в карточке дилера" : "Выберите дилера"}
                  >
                    <option value="all">Все дилеры</option>
                    {availableDealers.map(dealer => (
                      <option key={dealer} value={dealer}>{dealer}</option>
                    ))}
                  </select>
                </div>

                {/* Model Filter */}
                <div className="relative flex-grow xl:flex-grow-0">
                  {isModelDropdownOpen && (
                    <div className="fixed inset-0 z-40" onClick={() => setIsModelDropdownOpen(false)} />
                  )}
                  
                  <button 
                    onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                    className="w-full xl:w-[220px] pl-3 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none hover:bg-slate-100 transition-colors flex items-center justify-between relative z-50"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Package className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <span className="truncate block">
                        {selectedModels.length === 0 
                          ? 'Все модели' 
                          : selectedModels.length === 1 
                            ? selectedModels[0] 
                            : `Модели (${selectedModels.length})`}
                      </span>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform flex-shrink-0 ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {isModelDropdownOpen && (
                    <div className="absolute top-full right-0 mt-2 w-[280px] max-h-[400px] overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 animate-fade-in">
                      <div 
                        onClick={() => setSelectedModels([])}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer text-sm transition-colors ${selectedModels.length === 0 ? 'bg-indigo-50 text-indigo-700 font-medium' : 'hover:bg-slate-50 text-slate-700'}`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedModels.length === 0 ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 bg-white'}`}>
                            {selectedModels.length === 0 && <Check className="w-3 h-3 text-white" />}
                        </div>
                        Все модели
                      </div>
                      <div className="my-1 border-b border-slate-100"></div>
                      <div className="space-y-0.5">
                        {availableModels.map(model => {
                          const isSelected = selectedModels.includes(model);
                          return (
                            <div 
                              key={model} 
                              onClick={() => toggleModel(model)}
                              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer text-sm transition-colors ${isSelected ? 'bg-indigo-50 text-indigo-700 font-medium' : 'hover:bg-slate-50 text-slate-700'}`}
                            >
                              <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 bg-white'}`}>
                                {isSelected && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <span className="truncate">{model}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Offer Filter */}
                <div className="relative flex-grow xl:flex-grow-0">
                  {isOfferDropdownOpen && (
                    <div className="fixed inset-0 z-40" onClick={() => setIsOfferDropdownOpen(false)} />
                  )}
                  
                  <button 
                    onClick={() => setIsOfferDropdownOpen(!isOfferDropdownOpen)}
                    className="w-full xl:w-[220px] pl-3 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none hover:bg-slate-100 transition-colors flex items-center justify-between relative z-50"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Tag className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <span className="truncate block">
                        {selectedOffers.length === 0 
                          ? 'Все комплектации' 
                          : selectedOffers.length === 1 
                            ? selectedOffers[0] 
                            : `Комплектации (${selectedOffers.length})`}
                      </span>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform flex-shrink-0 ${isOfferDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {isOfferDropdownOpen && (
                    <div className="absolute top-full right-0 mt-2 w-[280px] max-h-[400px] overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 animate-fade-in">
                      <div 
                        onClick={() => setSelectedOffers([])}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer text-sm transition-colors ${selectedOffers.length === 0 ? 'bg-indigo-50 text-indigo-700 font-medium' : 'hover:bg-slate-50 text-slate-700'}`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedOffers.length === 0 ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 bg-white'}`}>
                            {selectedOffers.length === 0 && <Check className="w-3 h-3 text-white" />}
                        </div>
                        Все комплектации
                      </div>
                      <div className="my-1 border-b border-slate-100"></div>
                      <div className="space-y-0.5">
                        {availableOffers.map(offer => {
                          const isSelected = selectedOffers.includes(offer);
                          return (
                            <div 
                              key={offer} 
                              onClick={() => toggleOffer(offer)}
                              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer text-sm transition-colors ${isSelected ? 'bg-indigo-50 text-indigo-700 font-medium' : 'hover:bg-slate-50 text-slate-700'}`}
                            >
                              <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 bg-white'}`}>
                                {isSelected && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <span className="truncate">{offer}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* File Upload Button */}
                <div className="flex items-center">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    accept=".json" 
                    className="hidden" 
                  />
                  <button 
                    onClick={triggerFileUpload}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title={activeTab === 'inventory' ? "Загрузить остатки" : "Загрузить продажи"}
                  >
                    <Upload className="w-5 h-5" />
                  </button>
                  
                  <button className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                    <Download className="w-5 h-5" />
                  </button>
                </div>
            </div>
        </div>

        {/* View Switcher */}
        {currentView === 'dealer' && selectedDealerDetailId ? (
           <DealerDetail 
              dealerName={selectedDealerDetailId}
              records={filteredRecords.filter(r => r.dealerName === selectedDealerDetailId)}
              onBack={handleBackToDashboard}
           />
        ) : (
          <div className="animate-fade-in space-y-8">
            {/* Tab Content Switcher */}
            {activeTab === 'dashboard' && (
              <>
                {/* Summary Section */}
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 shadow-lg text-white flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-emerald-400" />
                      Сводка за период
                    </h3>
                    <p className="text-slate-300 text-sm max-w-xl leading-relaxed">
                      За выбранный период общий объем продаж составил <span className="text-white font-medium">{formatCurrency(kpi.totalRevenue)}</span>. 
                      Реализовано <span className="text-white font-medium">{formatNumber(kpi.totalUnits)}</span> единиц техники. 
                      Валовая прибыль компании достигла <span className="text-emerald-400 font-bold">{formatCurrency(kpi.totalMargin)}</span> 
                      с рентабельностью <span className="text-white font-bold">{kpi.marginPercent.toFixed(1)}%</span>.
                    </p>
                  </div>
                  
                  <div className="flex gap-4 w-full lg:w-auto">
                     <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 flex-1 lg:flex-none lg:w-40 border border-white/10">
                        <p className="text-xs text-slate-400 uppercase font-medium mb-1">Продажи</p>
                        <p className="text-2xl font-bold text-white">{formatNumber(kpi.totalUnits)}</p>
                     </div>
                     <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 flex-1 lg:flex-none lg:w-40 border border-white/10">
                        <p className="text-xs text-slate-400 uppercase font-medium mb-1">Рентабельность</p>
                        <p className="text-2xl font-bold text-emerald-400">{kpi.marginPercent.toFixed(1)}%</p>
                     </div>
                  </div>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard 
                    title="Выручка" 
                    value={formatCurrency(kpi.totalRevenue)} 
                    subValue="Общий объем продаж"
                    trend={12.5}
                    icon={<Wallet className="w-6 h-6" />}
                    color="indigo"
                  />
                  <StatCard 
                    title="Проданно единиц" 
                    value={formatNumber(kpi.totalUnits)} 
                    subValue="Количество техники"
                    trend={8.2}
                    icon={<ShoppingCart className="w-6 h-6" />}
                    color="blue"
                  />
                  <StatCard 
                    title="Валовая прибыль" 
                    value={formatCurrency(kpi.totalMargin)} 
                    subValue="Разница продажи и закупки"
                    trend={-2.4}
                    icon={<TrendingUp className="w-6 h-6" />}
                    color="emerald"
                  />
                  <StatCard 
                    title="Средний чек" 
                    value={formatCurrency(kpi.avgTicket)} 
                    subValue="Средняя стоимость единицы"
                    trend={5.1}
                    icon={<RussianRuble className="w-6 h-6" />}
                    color="amber"
                  />
                </div>

                {/* Charts Row 1 */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Main Sales Chart */}
                  <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-slate-900">
                            {dashboardChartMode === 'revenue' ? 'Динамика выручки' : 'Динамика продаж (шт)'}
                        </h3>
                        <div className="bg-slate-100 p-1 rounded-lg flex">
                             <button 
                                 onClick={() => setDashboardChartMode('revenue')}
                                 className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${dashboardChartMode === 'revenue' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                             >
                                 <RussianRuble className="w-3 h-3" />
                                 Выручка
                             </button>
                             <button 
                                 onClick={() => setDashboardChartMode('units')}
                                 className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${dashboardChartMode === 'units' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                             >
                                 <Box className="w-3 h-3" />
                                 Продажи
                             </button>
                        </div>
                    </div>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorProf" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorUnits" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fill: '#64748b', fontSize: 12}} 
                            tickFormatter={(value) => dashboardChartMode === 'revenue' ? `${(value / 1000000).toFixed(0)}M` : value.toString()} 
                          />
                          <Tooltip 
                            formatter={(value: number, name: string) => {
                                if (dashboardChartMode === 'revenue') return formatCurrency(value);
                                return `${value} шт.`;
                            }}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          />
                          <Legend wrapperStyle={{ paddingTop: '20px' }} />
                          
                          {selectedYear === 'all' ? (
                             availableYears.map((year, i) => (
                                <Area 
                                    key={year}
                                    type="monotone" 
                                    dataKey={dashboardChartMode === 'revenue' ? year.toString() : `${year}_units`}
                                    name={dashboardChartMode === 'revenue' ? `${year}` : `${year} (шт)`}
                                    stroke={COLORS[i % COLORS.length]} 
                                    fillOpacity={0.1} 
                                    fill={COLORS[i % COLORS.length]}
                                    strokeWidth={2}
                                />
                             ))
                          ) : (
                            dashboardChartMode === 'revenue' ? (
                                <>
                                    <Area type="monotone" dataKey="Выручка" stroke="#6366f1" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} />
                                    <Area type="monotone" dataKey="Прибыль" stroke="#10b981" fillOpacity={1} fill="url(#colorProf)" strokeWidth={2} />
                                </>
                            ) : (
                                <Area type="monotone" dataKey="Продажи" stroke="#3b82f6" fillOpacity={1} fill="url(#colorUnits)" strokeWidth={2} />
                            )
                          )}
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Model Distribution */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Топ-5 Моделей</h3>
                    <p className="text-xs text-slate-400 mb-6">По количеству продаж</p>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={topModels}
                                    cx="50%"
                                    cy="45%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    nameKey="name"
                                    labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                                    label={({ payload }) => payload?.share ? `${payload.share.toFixed(0)}%` : ''}
                                >
                                    {topModels.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    formatter={(value: number, name: string) => [`${value} шт.`, name]}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend 
                                    layout="horizontal" 
                                    verticalAlign="bottom" 
                                    align="center"
                                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                                    formatter={(value, entry: any) => (
                                        <span className="text-slate-600 font-medium ml-1">
                                            {value}
                                        </span>
                                    )}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Dealers Table */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                        <h3 className="text-lg font-bold text-slate-900">Рейтинг дилеров по выручке</h3>
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input type="text" placeholder="Поиск..." className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-lg text-sm border-none outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                                <tr>
                                    <th className="px-6 py-4">Дилер</th>
                                    <th className="px-6 py-4 text-right">Выручка</th>
                                    <th className="px-6 py-4 text-right">Доля</th>
                                    <th className="px-6 py-4 text-center">Действия</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {topDealers.map((dealer, index) => (
                                    <tr 
                                      key={index} 
                                      onClick={() => handleDealerClick(dealer.name)}
                                      className="hover:bg-slate-50 transition-colors cursor-pointer group"
                                    >
                                        <td className="px-6 py-4 font-medium text-slate-900">{dealer.name}</td>
                                        <td className="px-6 py-4 text-right font-semibold text-indigo-600">{formatCurrency(dealer.value)}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                <span>{((dealer.value / kpi.totalRevenue) * 100).toFixed(1)}%</span>
                                                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-indigo-500 rounded-full" 
                                                        style={{ width: `${(dealer.value / kpi.totalRevenue) * 100}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button className="p-1 rounded-full hover:bg-indigo-50 text-slate-300 group-hover:text-indigo-500 transition-colors">
                                                <ChevronRight className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
              </>
            )}

            {activeTab === 'dealers' && (
              <DealersView records={filteredRecords} onDealerClick={handleDealerClick} />
            )}

            {activeTab === 'models' && (
               modelViewMode === 'list' ? (
                 <ModelList 
                    records={filteredRecords} 
                    onOfferSelect={handleOfferSelect}
                 />
               ) : modelViewMode === 'detail' && selectedModelOffer ? (
                    <ModelOfferDetail 
                        modelName={selectedModelOffer.model}
                        offerName={selectedModelOffer.offer}
                        records={filteredRecords.filter(r => 
                            r.modelName === selectedModelOffer.model && 
                            r.offerName === selectedModelOffer.offer
                        )}
                        onBack={handleBackToModelList}
                        onDealerSelect={handleDealerInOfferSelect}
                    />
               ) : modelViewMode === 'sales' && selectedModelOffer && selectedDealerForOffer ? (
                    <DealerOfferSales
                        dealerName={selectedDealerForOffer}
                        modelName={selectedModelOffer.model}
                        offerName={selectedModelOffer.offer}
                        records={filteredRecords.filter(r => 
                            r.modelName === selectedModelOffer.model && 
                            r.offerName === selectedModelOffer.offer &&
                            r.dealerName === selectedDealerForOffer
                        )}
                        onBack={handleBackToOfferDetail}
                    />
               ) : null
            )}

            {activeTab === 'analytics' && (
               <AnalyticsView records={filteredRecords} />
            )}

            {activeTab === 'comparison' && (
               <ComparisonView records={recordsFilteredByMetadata} />
            )}
            
            {activeTab === 'inventory' && (
               <InventoryView records={filteredInventoryRecords} salesRecords={allRecords} />
            )}

          </div>
        )}
      </main>
    </div>
  );
}

export default App;

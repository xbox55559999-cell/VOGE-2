
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { MOCK_DATA } from './constants';
import { RawData, SaleRecord, User } from './types';
import { processData, formatCurrency, formatNumber, convertCSVToRawData } from './services/dataProcessor';
import { saveToDB, loadFromDB } from './services/storage';
import { syncPikData } from './services/pikIntegration';
import { sendTelegramMessage, getTelegramUpdates } from './services/telegramIntegration';
import { messengerService } from './services/messengerService'; // Import Messenger Service
import { authService } from './services/auth';
import { Login } from './components/Login';
import { UserManagement } from './components/UserManagement';
import { Sidebar } from './components/Sidebar';
import { StatCard } from './components/StatCard';
import { DealerDetail } from './components/DealerDetail';
import { ModelOfferDetail } from './components/ModelOfferDetail';
import { DealerOfferSales } from './components/DealerOfferSales';
// Import View Components and Types
import { SalesView, SalesSubTab } from './components/SalesView'; 
import { AnalyticsView } from './components/AnalyticsView';
import { ComparisonView } from './components/ComparisonView';
import { InventoryView, InventoryViewMode } from './components/InventoryView';
import { RecommendationsView } from './components/RecommendationsView';
import { InventoryMap } from './components/InventoryMap';
import { PromptSettings } from './components/PromptSettings';
import { IntegrationsHub } from './components/IntegrationsHub';
import { MessengerHub } from './components/MessengerHub'; // Import Messenger Component
import { FilterDropdown } from './components/FilterDropdown';
// Charting
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
// Icons - Explicitly avoid Map to prevent shadowing
import { 
  RussianRuble, ShoppingCart, TrendingUp, Wallet, 
  Calendar, Filter, Download, Search, Package, ChevronRight, ChevronDown, Check, Tag, Upload, Award, Box, Loader2, ArrowUpDown, X, ListFilter, MapPin as MapPinIcon,
  BarChart2, LineChart as LineChartIcon
} from 'lucide-react';

const STORAGE_KEY = 'moto_analytics_data';
const STORAGE_KEY_INVENTORY = 'moto_analytics_inventory';

// Helper to safely read from localStorage
const getInitialState = <T,>(key: string, defaultValue: T): T => {
  try {
    const saved = localStorage.getItem(key);
    if (saved !== null) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error(`Error parsing localStorage key "${key}":`, e);
  }
  return defaultValue;
};

function App() {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDataLoading, setIsDataLoading] = useState(true);
  
  // Data State - Initialize with MOCK_DATA temporarily, then load from DB
  const [rawData, setRawData] = useState<RawData>(MOCK_DATA);

  // Inventory Data State
  const [inventoryRawData, setInventoryRawData] = useState<RawData>({ total: { count_sold: 0, total_sold_price: 0, total_buy_price: 0 }, items: {} });

  // Persistent States for Sales and Inventory Views
  const [salesSubTab, setSalesSubTab] = useState<SalesSubTab>('overview');
  const [salesCrmSearch, setSalesCrmSearch] = useState('');
  const [inventoryViewMode, setInventoryViewMode] = useState<InventoryViewMode>('dealers');

  // Messenger State
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  // Check Auth on Mount
  useEffect(() => {
      const user = authService.getCurrentUser();
      setCurrentUser(user);
      setIsAuthChecking(false);
  }, []);

  const handleLogin = (user: User) => {
      setCurrentUser(user);
      setActiveTab('dashboard'); // Reset to dashboard on login
  };

  const handleLogout = () => {
      authService.logout();
      setCurrentUser(null);
  };

  const loadData = async () => {
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

  // Load Data from IndexedDB on Mount
  useEffect(() => {
    // Only load data if authenticated
    if (!currentUser) return;
    loadData();
  }, [currentUser]); 

  // Background Auto-Sync Logic (Cron-like for Frontend) & Messenger Polling
  useEffect(() => {
      if (!currentUser) return;

      const updateUnreadCount = async () => {
          const count = await messengerService.getTotalUnread();
          setUnreadMessagesCount(count);
      };
      
      // Initial count
      updateUnreadCount();

      // Poll Messenger Logic
      const messengerInterval = setInterval(async () => {
          const tgSettings = await loadFromDB('TELEGRAM_SETTINGS');
          
          if (tgSettings?.isConnected && tgSettings?.botToken) {
              // REAL POLLING
              const offset = messengerService.getLastUpdateId() + 1;
              try {
                  const updates = await getTelegramUpdates(tgSettings.botToken, offset);
                  if (updates.length > 0) {
                      await messengerService.processTelegramUpdates(updates);
                      updateUnreadCount();
                  }
              } catch (e) {
                  console.error("Polling error", e);
              }
          }
          // Removed simulation fallback to prevent demo bots
      }, 5000); // Check every 5 sec

      const checkAndRunSync = async () => {
          const pikConfig = await loadFromDB('PIK_API_SETTINGS');
          if (pikConfig && pikConfig.isConnected && pikConfig.autoSync && pikConfig.apiKey) {
              const lastSync = pikConfig.lastSync || 0;
              const now = Date.now();
              const oneHour = 60 * 60 * 1000;

              // If more than 1 hour passed
              if (now - lastSync > oneHour) {
                  console.log('Triggering Auto-Sync for PIK API...');
                  try {
                      const result = await syncPikData({ apiKey: pikConfig.apiKey });
                      
                      // Update Last Sync
                      const updatedConfig = { ...pikConfig, lastSync: now };
                      await saveToDB('PIK_API_SETTINGS', updatedConfig);
                      
                      if (result.added > 0) {
                          console.log(`Auto-sync added ${result.added} records. Reloading...`);
                          // Reload data to reflect changes in UI
                          loadData(); 

                          // Telegram Notification
                          const telegramConfig = await loadFromDB('TELEGRAM_SETTINGS');
                          if (telegramConfig?.isConnected && telegramConfig?.autoNotify && telegramConfig?.defaultChatId) {
                              await sendTelegramMessage(
                                  telegramConfig.botToken,
                                  telegramConfig.defaultChatId,
                                  `📊 <b>Обновление данных MotoData</b>\n\n✅ Успешная синхронизация с PIK-TD.\n📥 Загружено новых продаж: <b>${result.added}</b>\n🕒 Время: ${new Date().toLocaleTimeString('ru-RU')}`
                              );
                          }
                      }
                  } catch (e) {
                      console.error('Auto-sync failed:', e);
                  }
              }
          }
      };

      // Check immediately on mount/login
      checkAndRunSync();

      // Check every 5 minutes if it's time to sync
      const intervalId = setInterval(checkAndRunSync, 5 * 60 * 1000);

      return () => {
          clearInterval(intervalId);
          clearInterval(messengerInterval);
      };
  }, [currentUser]);


  // View State
  const [currentView, setCurrentView] = useState<'dashboard' | 'dealer'>('dashboard');
  const [selectedDealerDetailId, setSelectedDealerDetailId] = useState<string | null>(null);

  // Model View State
  const [modelViewMode, setModelViewMode] = useState<'list' | 'detail' | 'sales'>('list');
  const [selectedModelOffer, setSelectedModelOffer] = useState<{model: string, offer: string} | null>(null);
  const [selectedDealerForOffer, setSelectedDealerForOffer] = useState<string | null>(null);

  // Dashboard Chart State
  const [dashboardChartMode, setDashboardChartMode] = useState<'revenue' | 'units'>('revenue');
  const [dashboardChartType, setDashboardChartType] = useState<'area' | 'bar'>('area');

  // Dashboard Table Sorting & Search State
  const [dashboardSortField, setDashboardSortField] = useState<'name' | 'value'>('value');
  const [dashboardSortDirection, setDashboardSortDirection] = useState<'asc' | 'desc'>('desc');
  const [dashboardSearchQuery, setDashboardSearchQuery] = useState('');

  // Filter State (Initialized from LocalStorage)
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(() => getInitialState('filter_year', 'all'));
  const [selectedBrand, setSelectedBrand] = useState<string>(() => getInitialState('filter_brand', 'all'));
  const [selectedCity, setSelectedCity] = useState<string>(() => getInitialState('filter_city', 'all'));
  const [selectedDealer, setSelectedDealer] = useState<string>(() => getInitialState('filter_dealer', 'all'));
  
  // Multi-select for models
  const [selectedModels, setSelectedModels] = useState<string[]>(() => getInitialState('filter_models', []));
  // Multi-select for offers
  const [selectedOffers, setSelectedOffers] = useState<string[]>(() => getInitialState('filter_offers', []));

  // Date Range Filter
  const [startDate, setStartDate] = useState<string>(() => getInitialState('filter_startDate', ''));
  const [endDate, setEndDate] = useState<string>(() => getInitialState('filter_endDate', ''));

  // File Upload Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persist filters to localStorage
  useEffect(() => { localStorage.setItem('filter_year', JSON.stringify(selectedYear)); }, [selectedYear]);
  useEffect(() => { localStorage.setItem('filter_brand', JSON.stringify(selectedBrand)); }, [selectedBrand]);
  useEffect(() => { localStorage.setItem('filter_city', JSON.stringify(selectedCity)); }, [selectedCity]);
  useEffect(() => { localStorage.setItem('filter_dealer', JSON.stringify(selectedDealer)); }, [selectedDealer]);
  useEffect(() => { localStorage.setItem('filter_models', JSON.stringify(selectedModels)); }, [selectedModels]);
  useEffect(() => { localStorage.setItem('filter_offers', JSON.stringify(selectedOffers)); }, [selectedOffers]);
  useEffect(() => { localStorage.setItem('filter_startDate', JSON.stringify(startDate)); }, [startDate]);
  useEffect(() => { localStorage.setItem('filter_endDate', JSON.stringify(endDate)); }, [endDate]);

  // Reset detailed views when tab changes, but keep sub-tabs persistent
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
    if (activeTab === 'inventory' || activeTab === 'inventory-map') {
        return allInventoryRecords;
    }
    return allRecords;
  }, [activeTab, allRecords, allInventoryRecords]);

  // 2. Extract Filter Options from the ACTIVE dataset
  const availableYears = useMemo(() => Array.from(new Set(currentDataset.map(r => r.year))).sort(), [currentDataset]);
  const availableBrands = useMemo(() => Array.from(new Set(currentDataset.map(r => r.brand))).sort(), [currentDataset]);
  const availableCities = useMemo(() => Array.from(new Set(currentDataset.map(r => r.city))).sort(), [currentDataset]);
  
  const availableDealers = useMemo(() => {
    let records = currentDataset;
    if (selectedCity !== 'all') {
        records = records.filter(r => r.city === selectedCity);
    }
    return Array.from(new Set(records.map(r => r.dealerName))).sort();
  }, [currentDataset, selectedCity]);

  const availableModels = useMemo(() => {
      let records = currentDataset;
      if (selectedBrand !== 'all') records = records.filter(r => r.brand === selectedBrand);
      if (selectedCity !== 'all') records = records.filter(r => r.city === selectedCity);
      
      return Array.from(new Set(records.map(r => r.modelName))).sort();
  }, [currentDataset, selectedBrand, selectedCity]);
  
  const availableOffers = useMemo(() => {
      let records = currentDataset;
      if (selectedBrand !== 'all') records = records.filter(r => r.brand === selectedBrand);
      if (selectedCity !== 'all') records = records.filter(r => r.city === selectedCity);
      if (selectedModels.length > 0) records = records.filter(r => selectedModels.includes(r.modelName));
      
      return Array.from(new Set(records.map(r => r.offerName))).sort();
  }, [currentDataset, selectedBrand, selectedCity, selectedModels]);

  // Ref to track if it's the first run for brand effect to avoid clearing restored state
  const isFirstBrandRun = useRef(true);

  // Reset dependent filters when brand changes
  useEffect(() => {
      // Skip the first run so we don't clear restored models/offers from localStorage
      if (isFirstBrandRun.current) {
          isFirstBrandRun.current = false;
          return;
      }
      setSelectedModels([]);
      setSelectedOffers([]);
  }, [selectedBrand]);

  // Reset dealer if city changes and dealer doesn't belong to city
  useEffect(() => {
      if (selectedCity !== 'all' && selectedDealer !== 'all') {
          // Check if currently selected dealer is in the available dealers for this city
          // If not availableDealers check is expensive, just reset to 'all' is safer or check against records
          // Since we computed availableDealers above, we can check that list, but it's a string array.
          if (!availableDealers.includes(selectedDealer)) {
              setSelectedDealer('all');
          }
      }
  }, [selectedCity, availableDealers]);

  // Handle File Upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        
        let parsedData: RawData;

        // Parse logic based on extension
        if (fileExt === 'csv') {
            try {
                parsedData = convertCSVToRawData(content);
            } catch (err: any) {
                alert(`Ошибка парсинга CSV: ${err.message}`);
                return;
            }
        } else {
            // Assume JSON
            parsedData = JSON.parse(content);
            // Basic validation for JSON
            if (!parsedData.total || !parsedData.items) {
                alert('Ошибка: Неверный формат JSON файла. Ожидается структура { total, items }.');
                return;
            }
        }

        // Check active tab to decide where to load data
        if (activeTab === 'inventory') {
            setInventoryRawData(parsedData);
            try {
                await saveToDB(STORAGE_KEY_INVENTORY, parsedData);
                alert(`Файл остатков (${fileExt?.toUpperCase()}) успешно загружен и сохранен в базе данных!`);
            } catch (storageError) {
                console.error('DB error:', storageError);
                alert('Файл остатков загружен в память, но не сохранен в БД.');
            }
        } else {
            // Load Sales Data
            setRawData(parsedData);
            try {
                await saveToDB(STORAGE_KEY, parsedData);
                alert(`Файл продаж (${fileExt?.toUpperCase()}) успешно загружен и сохранен в базе данных!`);
            } catch (storageError) {
                console.error('DB error:', storageError);
                alert('Файл продаж загружен в память, но не сохранен в БД.');
            }
        }
        
        // Reset filters
        clearAllFilters();
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

      } catch (error) {
        console.error('Error processing file:', error);
        alert('Ошибка при чтении файла. Убедитесь, что формат корректен.');
      }
    };
    reader.readAsText(file);
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const clearAllFilters = () => {
    setSelectedYear('all');
    setStartDate('');
    setEndDate('');
    setSelectedBrand('all');
    setSelectedCity('all');
    setSelectedDealer('all');
    setSelectedModels([]);
    setSelectedOffers([]);
  };

  const hasActiveFilters = 
    selectedYear !== 'all' || 
    startDate !== '' || 
    endDate !== '' || 
    selectedBrand !== 'all' || 
    selectedCity !== 'all' || 
    (selectedDealer !== 'all' && currentView !== 'dealer') || 
    selectedModels.length > 0 || 
    selectedOffers.length > 0;

  // 3. Filter Records Logic (Reusable for Sales and Inventory)
  const filterRecordsGeneric = (recordsToFilter: SaleRecord[]) => {
      return recordsToFilter.filter(record => {
        if (selectedBrand !== 'all' && record.brand !== selectedBrand) return false;
        if (selectedCity !== 'all' && record.city !== selectedCity) return false;
        if (selectedDealer !== 'all' && record.dealerName !== selectedDealer) return false;
        if (selectedModels.length > 0 && !selectedModels.includes(record.modelName)) return false;
        if (selectedOffers.length > 0 && !selectedOffers.includes(record.offerName)) return false;
        return true;
      });
  };

  const recordsFilteredByMetadata = useMemo(() => filterRecordsGeneric(allRecords), [allRecords, selectedBrand, selectedCity, selectedDealer, selectedModels, selectedOffers]);

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
  }, [allInventoryRecords, selectedBrand, selectedCity, selectedDealer, selectedModels, selectedOffers]);


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
    // ... (same as before)
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

  // 6. Prepare Chart Data: Top Dealers (Dashboard Table)
  const dashboardDealers = useMemo(() => {
    const map = new Map<string, number>();
    filteredRecords.forEach(r => {
      map.set(r.dealerName, (map.get(r.dealerName) || 0) + r.soldPrice);
    });

    let dealers = Array.from(map.entries())
      .map(([name, value]) => ({ name, value }));
    
    if (dashboardSearchQuery) {
        dealers = dealers.filter(d => d.name.toLowerCase().includes(dashboardSearchQuery.toLowerCase()));
    }

    dealers.sort((a, b) => {
        const factor = dashboardSortDirection === 'asc' ? 1 : -1;
        if (dashboardSortField === 'name') {
            return a.name.localeCompare(b.name) * factor;
        } else {
            return (a.value - b.value) * factor;
        }
    });

    return dealers.slice(0, 10);
  }, [filteredRecords, dashboardSearchQuery, dashboardSortField, dashboardSortDirection]);

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

  const handleDashboardSort = (field: 'name' | 'value') => {
      if (dashboardSortField === field) {
          setDashboardSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
      } else {
          setDashboardSortField(field);
          setDashboardSortDirection('desc');
      }
  };

  const renderDashboardSortIcon = (field: 'name' | 'value') => {
      if (dashboardSortField !== field) return <ArrowUpDown className="w-3 h-3 text-slate-300 ml-1 inline" />;
      return <ArrowUpDown className={`w-3 h-3 ml-1 inline ${dashboardSortDirection === 'asc' ? 'text-indigo-600 rotate-180' : 'text-indigo-600'}`} />;
    };

  const getPageTitle = () => {
    if (currentView === 'dealer') return 'Карточка дилера';
    switch (activeTab) {
      case 'sales': return 'Управление продажами';
      case 'inventory': return 'Остатки';
      case 'inventory-map': return 'Остатки на карте';
      case 'analytics': return 'Аналитика';
      case 'comparison': return 'Сравнение';
      case 'recommendations': return 'AI Бизнес-Ассистент';
      case 'messengers': return 'Мессенджеры';
      case 'users': return 'Управление пользователями';
      case 'integrations': return 'Интеграции';
      case 'settings': return 'Настройки';
      default: return 'Обзор';
    }
  };

  const getPageDescription = () => {
     if (currentView === 'dealer') return 'Детальная статистика продаж и показатели партнера';
     switch (activeTab) {
       case 'sales': return 'Реестр сделок, дилерская сеть и выполнение планов';
       case 'inventory': return 'Анализ складских запасов дилеров';
       case 'inventory-map': return 'Географическое распределение складских запасов';
       case 'analytics': return 'Глубокий анализ данных продаж';
       case 'comparison': return 'Сравнение эффективности периодов';
       case 'recommendations': return 'AI-анализ бизнеса, поиск точек роста и ошибок';
       case 'messengers': return 'Объединенный центр сообщений с клиентами';
       case 'users': return 'Администрирование сотрудников и прав доступа';
       case 'integrations': return 'Управление подключениями к внешним сервисам';
       case 'settings': return 'Конфигурация системы и AI-ассистента';
       default: return 'Обзор ключевых показателей эффективности за выбранный период';
     }
  };

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  // Auth Guard
  if (isAuthChecking) {
      return (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          </div>
      );
  }

  if (!currentUser) {
      return <Login onLogin={handleLogin} />;
  }

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
  const showDateFilters = currentView === 'dealer' || (activeTab !== 'comparison' && activeTab !== 'inventory' && activeTab !== 'inventory-map' && activeTab !== 'recommendations' && activeTab !== 'messengers' && activeTab !== 'users' && activeTab !== 'settings' && activeTab !== 'integrations');
  
  // Can upload?
  const canUpload = authService.canUploadData(currentUser.role);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900">
      {/* Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        currentUser={currentUser} 
        onLogout={handleLogout} 
        unreadMessages={unreadMessagesCount}
      />

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
            
            {activeTab !== 'users' && activeTab !== 'settings' && activeTab !== 'integrations' && activeTab !== 'messengers' && (
                <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm w-full xl:w-auto z-20 relative">
                    <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
                        
                        {/* Date Group */}
                        {showDateFilters && (
                            <div className="flex flex-wrap gap-2 items-center w-full lg:w-auto border-b lg:border-b-0 lg:border-r border-slate-100 pb-3 lg:pb-0 lg:pr-4">
                                <div className="text-xs font-semibold text-slate-400 uppercase mr-1 hidden xl:block">Период:</div>
                                <div className="w-full sm:w-auto">
                                    <FilterDropdown 
                                        label="Год" 
                                        icon={Calendar}
                                        options={availableYears}
                                        value={selectedYear}
                                        onChange={setSelectedYear}
                                        mode="single"
                                    />
                                </div>

                                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 hover:border-indigo-300 transition-colors rounded-xl px-3 py-2.5 h-[42px] shadow-sm relative group flex-grow sm:flex-grow-0">
                                    <Calendar className="w-4 h-4 text-slate-400 group-hover:text-indigo-400 transition-colors flex-shrink-0" />
                                    <input 
                                        type="date" 
                                        className="bg-transparent border-none text-sm text-slate-700 focus:ring-0 outline-none w-24 p-0"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        title="С даты"
                                    />
                                    <span className="text-slate-300 mx-1">→</span>
                                    <input 
                                        type="date" 
                                        className="bg-transparent border-none text-sm text-slate-700 focus:ring-0 outline-none w-24 p-0"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        title="По дату"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Attribute Group */}
                        <div className="flex flex-wrap gap-2 items-center flex-grow">
                            <div className="text-xs font-semibold text-slate-400 uppercase mr-1 hidden xl:block">Фильтры:</div>
                            
                            <FilterDropdown 
                                label="Марка" 
                                icon={Award}
                                options={availableBrands}
                                value={selectedBrand}
                                onChange={setSelectedBrand}
                                mode="single"
                            />

                             <FilterDropdown 
                                label="Город" 
                                icon={MapPinIcon}
                                options={availableCities}
                                value={selectedCity}
                                onChange={setSelectedCity}
                                mode="single"
                            />

                            <FilterDropdown 
                                label="Дилер" 
                                icon={Filter}
                                options={availableDealers}
                                value={selectedDealer}
                                onChange={setSelectedDealer}
                                mode="single"
                                searchable={true}
                                placeholder="Найти дилера..."
                                disabled={currentView === 'dealer'}
                            />

                            <FilterDropdown 
                                label="Модели" 
                                icon={Package}
                                options={availableModels}
                                value={selectedModels}
                                onChange={setSelectedModels}
                                mode="multi"
                                searchable={true}
                                placeholder="Выберите модели..."
                            />

                            <FilterDropdown 
                                label="Комплектации" 
                                icon={Tag}
                                options={availableOffers}
                                value={selectedOffers}
                                onChange={setSelectedOffers}
                                mode="multi"
                                searchable={true}
                                placeholder="Выберите комплектации..."
                            />
                        </div>

                        {/* Actions Group */}
                        <div className="flex items-center gap-2 ml-auto pl-4 border-l border-slate-100">
                            {hasActiveFilters && (
                                <button 
                                    onClick={clearAllFilters}
                                    className="p-2.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors h-[42px] w-[42px] flex items-center justify-center border border-transparent hover:border-rose-100"
                                    title="Сбросить все фильтры"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            )}

                            {canUpload && (
                                <div className="flex items-center gap-1">
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        onChange={handleFileUpload} 
                                        accept=".json,.csv" 
                                        className="hidden" 
                                    />
                                    <button 
                                        onClick={triggerFileUpload}
                                        className="p-2.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors h-[42px] w-[42px] flex items-center justify-center shadow-sm border border-indigo-100"
                                        title={activeTab === 'inventory' ? "Импорт остатков (JSON/CSV)" : "Импорт продаж (JSON/CSV)"}
                                    >
                                        <Upload className="w-5 h-5" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* View Switcher */}
        {currentView === 'dealer' && selectedDealerDetailId ? (
           <DealerDetail 
              dealerName={selectedDealerDetailId}
              records={filteredRecords.filter(r => r.dealerName === selectedDealerDetailId)}
              onBack={handleBackToDashboard}
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
                        <div className="flex gap-2">
                            <div className="bg-slate-100 p-1 rounded-lg flex">
                                <button 
                                    onClick={() => setDashboardChartType('area')}
                                    className={`p-1.5 rounded-md text-xs font-medium transition-all ${dashboardChartType === 'area' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    title="Линейный график"
                                >
                                    <LineChartIcon className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => setDashboardChartType('bar')}
                                    className={`p-1.5 rounded-md text-xs font-medium transition-all ${dashboardChartType === 'bar' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    title="Столбчатая диаграмма"
                                >
                                    <BarChart2 className="w-4 h-4" />
                                </button>
                            </div>
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
                    </div>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        {dashboardChartType === 'area' ? (
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
                        ) : (
                            <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fill: '#64748b', fontSize: 12}} 
                                    tickFormatter={(value) => dashboardChartMode === 'revenue' ? `${(value / 1000000).toFixed(0)}M` : value.toString()} 
                                />
                                <Tooltip 
                                    cursor={{fill: '#f8fafc'}}
                                    formatter={(value: number, name: string) => {
                                        if (dashboardChartMode === 'revenue') return formatCurrency(value);
                                        return `${value} шт.`;
                                    }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                {selectedYear === 'all' ? (
                                    availableYears.map((year, i) => (
                                        <Bar 
                                            key={year}
                                            dataKey={dashboardChartMode === 'revenue' ? year.toString() : `${year}_units`}
                                            name={dashboardChartMode === 'revenue' ? `${year}` : `${year} (шт)`}
                                            fill={COLORS[i % COLORS.length]} 
                                            radius={[4, 4, 0, 0]}
                                        />
                                    ))
                                ) : (
                                    dashboardChartMode === 'revenue' ? (
                                        <>
                                            <Bar dataKey="Выручка" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="Прибыль" fill="#10b981" radius={[4, 4, 0, 0]} />
                                        </>
                                    ) : (
                                        <Bar dataKey="Продажи" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    )
                                )}
                            </BarChart>
                        )}
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
                            <input 
                                type="text" 
                                placeholder="Поиск..." 
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-lg text-sm border-none outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                                value={dashboardSearchQuery}
                                onChange={(e) => setDashboardSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                                <tr>
                                    <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleDashboardSort('name')}>
                                        Дилер {renderDashboardSortIcon('name')}
                                    </th>
                                    <th className="px-6 py-4 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleDashboardSort('value')}>
                                        Выручка {renderDashboardSortIcon('value')}
                                    </th>
                                    <th className="px-6 py-4 text-right">Доля</th>
                                    <th className="px-6 py-4 text-center">Действия</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {dashboardDealers.map((dealer, index) => (
                                    <tr 
                                      key={index} 
                                      onClick={() => handleDealerClick(dealer.name)}
                                      className="hover:bg-slate-50 transition-colors cursor-pointer group"
                                    >
                                        <td className="px-6 py-4 font-medium text-slate-900">{dealer.name}</td>
                                        <td className="px-6 py-4 text-right font-semibold text-indigo-600">{formatCurrency(dealer.value)}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                <span>{kpi.totalRevenue > 0 ? ((dealer.value / kpi.totalRevenue) * 100).toFixed(1) : 0}%</span>
                                                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-indigo-500 rounded-full" 
                                                        style={{ width: `${kpi.totalRevenue > 0 ? (dealer.value / kpi.totalRevenue) * 100 : 0}%` }}
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

            {/* NEW SALES HUB */}
            {activeTab === 'sales' && (
              <SalesView 
                records={filteredRecords}
                onDealerClick={handleDealerClick}
                onOfferSelect={handleOfferSelect}
                onImport={canUpload ? triggerFileUpload : undefined}
                // Persist State
                currentSubTab={salesSubTab}
                onChangeSubTab={setSalesSubTab}
                crmSearchQuery={salesCrmSearch}
                onCrmSearchChange={setSalesCrmSearch}
              />
            )}

            {activeTab === 'analytics' && currentUser.role !== 'user' && (
               <AnalyticsView records={filteredRecords} onImport={canUpload ? triggerFileUpload : undefined} />
            )}

            {activeTab === 'comparison' && currentUser.role !== 'user' && (
               <ComparisonView records={recordsFilteredByMetadata} onImport={canUpload ? triggerFileUpload : undefined} />
            )}
            
            {activeTab === 'inventory' && (
               <InventoryView 
                  records={filteredInventoryRecords} 
                  salesRecords={allRecords} 
                  onImport={canUpload ? triggerFileUpload : undefined}
                  // Persist State
                  currentViewMode={inventoryViewMode}
                  onChangeViewMode={setInventoryViewMode}
               />
            )}
            
            {activeTab === 'inventory-map' && currentUser.role !== 'user' && (
               <InventoryMap records={filteredInventoryRecords} salesRecords={allRecords} />
            )}

            {activeTab === 'recommendations' && currentUser.role !== 'user' && (
               <RecommendationsView salesRecords={recordsFilteredByMetadata} inventoryRecords={filteredInventoryRecords} />
            )}

            {/* NEW MESSENGER HUB */}
            {activeTab === 'messengers' && currentUser.role === 'admin' && (
                <MessengerHub onOpenSettings={() => setActiveTab('integrations')} />
            )}
            
            {activeTab === 'users' && currentUser.role === 'admin' && (
                <UserManagement />
            )}

            {activeTab === 'integrations' && currentUser.role === 'admin' && (
                <IntegrationsHub />
            )}

            {activeTab === 'settings' && currentUser.role === 'admin' && (
                <PromptSettings />
            )}

          </div>
        )}
      </main>
    </div>
  );
}

export default App;


import React, { useState, useEffect } from 'react';
import { loadFromDB, saveToDB, removeFromDB } from '../services/storage';
import { syncPikData } from '../services/pikIntegration';
import { Settings, Link, Globe, CheckCircle2, AlertCircle, RefreshCw, LogOut, Key, ExternalLink, ArrowLeft, Clock, Power } from 'lucide-react';

interface PikConfig {
    apiKey: string;
    autoSync: boolean;
    isConnected: boolean;
    lastSync?: number;
}

interface PikApiSettingsProps {
    onBack?: () => void;
}

export const PikApiSettings: React.FC<PikApiSettingsProps> = ({ onBack }) => {
    const [config, setConfig] = useState<PikConfig>({
        apiKey: '',
        autoSync: false,
        isConnected: false
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

    useEffect(() => {
        const loadSettings = async () => {
            const saved = await loadFromDB('PIK_API_SETTINGS');
            if (saved) {
                setConfig(saved);
            }
            setIsLoading(false);
        };
        loadSettings();
    }, []);

    const handleChange = (field: keyof PikConfig, value: any) => {
        setConfig(prev => ({ ...prev, [field]: value }));
    };

    const handleConnect = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        setIsSaving(true);

        if (!config.apiKey) {
            setMessage({ type: 'error', text: 'Введите API Key для доступа к данным' });
            setIsSaving(false);
            return;
        }

        try {
            // Verify connection by attempting a sync
            const result = await syncPikData({ apiKey: config.apiKey, dateFrom: '01.01.2025' });

            const newConfig = {
                ...config,
                isConnected: true,
                lastSync: Date.now()
            };

            await saveToDB('PIK_API_SETTINGS', newConfig);
            setConfig(newConfig);
            setMessage({ type: 'success', text: `Подключено! Загружено ${result.added} новых записей.` });
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Ошибка соединения. Проверьте ключ API.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDisconnect = async () => {
        if (window.confirm('Отключить интеграцию с PIK-TD? Автообновление будет остановлено.')) {
            await removeFromDB('PIK_API_SETTINGS');
            setConfig({
                apiKey: '',
                autoSync: false,
                isConnected: false
            });
            setMessage({ type: 'success', text: 'Интеграция отключена.' });
        }
    };

    const handleManualSync = async () => {
        setIsSyncing(true);
        setMessage(null);
        try {
            const result = await syncPikData({ apiKey: config.apiKey });
            const updatedConfig = { ...config, lastSync: Date.now() };
            await saveToDB('PIK_API_SETTINGS', updatedConfig);
            setConfig(updatedConfig);
            setMessage({ type: 'success', text: `Синхронизация завершена. Добавлено: ${result.added} записей.` });
        } catch (e) {
            setMessage({ type: 'error', text: 'Ошибка при синхронизации данных.' });
        } finally {
            setIsSyncing(false);
        }
    };

    const toggleAutoSync = async () => {
        const newAutoSync = !config.autoSync;
        const updatedConfig = { ...config, autoSync: newAutoSync };
        setConfig(updatedConfig);
        await saveToDB('PIK_API_SETTINGS', updatedConfig);
    };

    if (isLoading) return <div className="p-8 text-center text-slate-500">Загрузка настроек...</div>;

    return (
        <div className="animate-fade-in max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                {onBack && (
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                )}
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <span className="bg-orange-500 text-white p-2 rounded-xl">
                            <span className="font-bold text-lg">PK</span>
                        </span>
                        Интеграция PIK-TD
                    </h2>
                    <p className="text-slate-500 mt-2">
                        Импорт данных о продажах техники через API.
                    </p>
                </div>
            </div>

            {/* Status Card */}
            <div className={`rounded-2xl border p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${config.isConnected ? 'bg-orange-50 border-orange-100' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${config.isConnected ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-400'}`}>
                        {config.isConnected ? <CheckCircle2 className="w-8 h-8" /> : <Link className="w-8 h-8" />}
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-slate-900">
                            {config.isConnected ? 'Подключено к PIK API' : 'Не подключено'}
                        </h3>
                        {config.isConnected && config.lastSync && (
                            <p className="text-sm text-orange-700">
                                Последнее обновление: {new Date(config.lastSync).toLocaleString('ru-RU')}
                            </p>
                        )}
                        {!config.isConnected && (
                            <p className="text-sm text-slate-500">Настройте доступ к endpoint vehicle-sales</p>
                        )}
                    </div>
                </div>
                {config.isConnected && (
                    <div className="flex gap-2 w-full md:w-auto">
                        <button 
                            onClick={handleManualSync}
                            disabled={isSyncing}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-orange-200 text-orange-700 rounded-xl hover:bg-orange-100 transition-colors text-sm font-medium shadow-sm flex-1 md:flex-none"
                        >
                            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                            {isSyncing ? 'Обновление...' : 'Обновить сейчас'}
                        </button>
                        <button 
                            onClick={handleDisconnect}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-rose-200 text-rose-600 rounded-xl hover:bg-rose-50 transition-colors text-sm font-medium shadow-sm flex-1 md:flex-none"
                        >
                            <LogOut className="w-4 h-4" />
                            Отключить
                        </button>
                    </div>
                )}
            </div>

            {/* Configuration Form */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Settings className="w-5 h-5 text-indigo-600" />
                        Параметры доступа
                    </h3>
                    <a 
                        href="https://pik-td.ru/api/statistic/vehicle-sales" 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors"
                    >
                        <ExternalLink className="w-3 h-3" />
                        API Endpoint
                    </a>
                </div>
                
                <div className="p-6 space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                            <Key className="w-4 h-4 text-slate-400" />
                            API Token / Authorization Key
                        </label>
                        <input
                            type="password"
                            disabled={config.isConnected}
                            className="block w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-orange-500 focus:border-orange-500 sm:text-sm shadow-sm font-mono disabled:bg-slate-50 disabled:text-slate-500"
                            placeholder="Введите ваш API ключ..."
                            value={config.apiKey}
                            onChange={(e) => handleChange('apiKey', e.target.value)}
                        />
                        <p className="text-xs text-slate-400">
                            Ключ будет использован в заголовке запроса для получения данных с <span className="font-mono bg-slate-100 px-1 rounded">api/statistic/vehicle-sales</span>.
                        </p>
                    </div>

                    {config.isConnected && (
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${config.autoSync ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                                    <Clock className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900">Автообновление данных</p>
                                    <p className="text-xs text-slate-500">Синхронизация каждый час (60 мин)</p>
                                </div>
                            </div>
                            <button
                                onClick={toggleAutoSync}
                                className={`
                                    relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none
                                    ${config.autoSync ? 'bg-emerald-500' : 'bg-slate-300'}
                                `}
                            >
                                <span
                                    aria-hidden="true"
                                    className={`
                                        pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                                        ${config.autoSync ? 'translate-x-5' : 'translate-x-0'}
                                    `}
                                />
                            </button>
                        </div>
                    )}

                    {message && (
                        <div className={`p-4 rounded-xl flex items-start gap-3 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-rose-50 text-rose-800 border border-rose-100'}`}>
                            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
                            <p className="text-sm font-medium">{message.text}</p>
                        </div>
                    )}

                    {!config.isConnected && (
                        <div className="pt-2 flex justify-end">
                            <button
                                onClick={handleConnect}
                                disabled={isSaving}
                                className="flex items-center gap-2 px-6 py-2.5 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-medium shadow-md shadow-orange-100 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
                                {isSaving ? 'Подключение...' : 'Подключить API'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

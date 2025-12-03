
import React, { useState, useEffect } from 'react';
import { loadFromDB, saveToDB, removeFromDB } from '../services/storage';
import { Settings, Link, Lock, Globe, CheckCircle2, AlertCircle, RefreshCw, LogOut, Key, ExternalLink, ArrowLeft } from 'lucide-react';

interface BitrixConfig {
    domain: string;
    clientId: string;
    clientSecret: string;
    isConnected: boolean;
    lastSync?: number;
}

interface Bitrix24SettingsProps {
    onBack?: () => void;
}

export const Bitrix24Settings: React.FC<Bitrix24SettingsProps> = ({ onBack }) => {
    const [config, setConfig] = useState<BitrixConfig>({
        domain: '',
        clientId: '',
        clientSecret: '',
        isConnected: false
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

    useEffect(() => {
        const loadSettings = async () => {
            const saved = await loadFromDB('BITRIX24_SETTINGS');
            if (saved) {
                setConfig(saved);
            }
            setIsLoading(false);
        };
        loadSettings();
    }, []);

    const handleChange = (field: keyof BitrixConfig, value: string) => {
        setConfig(prev => ({ ...prev, [field]: value }));
    };

    const handleConnect = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        setIsSaving(true);

        if (!config.domain || !config.clientId || !config.clientSecret) {
            setMessage({ type: 'error', text: 'Пожалуйста, заполните все поля' });
            setIsSaving(false);
            return;
        }

        try {
            // Simulation of OAuth/Webhook exchange with Bitrix24
            await new Promise(resolve => setTimeout(resolve, 1500));

            const newConfig = {
                ...config,
                isConnected: true,
                lastSync: Date.now()
            };

            await saveToDB('BITRIX24_SETTINGS', newConfig);
            setConfig(newConfig);
            setMessage({ type: 'success', text: 'Интеграция с Битрикс24 успешно настроена!' });
        } catch (err) {
            setMessage({ type: 'error', text: 'Ошибка подключения. Проверьте правильность данных.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDisconnect = async () => {
        if (window.confirm('Вы уверены? Это остановит синхронизацию данных с Битрикс24.')) {
            await removeFromDB('BITRIX24_SETTINGS');
            setConfig({
                domain: '',
                clientId: '',
                clientSecret: '',
                isConnected: false
            });
            setMessage({ type: 'success', text: 'Интеграция отключена.' });
        }
    };

    const handleSync = async () => {
        setIsSyncing(true);
        // Simulate fetching leads/deals
        await new Promise(resolve => setTimeout(resolve, 2500));
        
        const updatedConfig = { ...config, lastSync: Date.now() };
        await saveToDB('BITRIX24_SETTINGS', updatedConfig);
        setConfig(updatedConfig);
        
        setIsSyncing(false);
        alert('Данные успешно синхронизированы! Получено 28 новых сделок из Битрикс24.');
    };

    if (isLoading) {
        return <div className="p-8 text-center text-slate-500">Загрузка настроек...</div>;
    }

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
                        <span className="bg-[#00AEEF] text-white p-2 rounded-xl">
                            <span className="font-bold text-lg">24</span>
                        </span>
                        Интеграция с Битрикс24
                    </h2>
                    <p className="text-slate-500 mt-2">
                        Настройте подключение к порталу Битрикс24 для импорта сделок и лидов.
                    </p>
                </div>
            </div>

            {/* Status Card */}
            <div className={`rounded-2xl border p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${config.isConnected ? 'bg-sky-50 border-sky-100' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${config.isConnected ? 'bg-sky-100 text-sky-600' : 'bg-slate-100 text-slate-400'}`}>
                        {config.isConnected ? <CheckCircle2 className="w-8 h-8" /> : <Link className="w-8 h-8" />}
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-slate-900">
                            {config.isConnected ? 'Подключено к Битрикс24' : 'Интеграция не активна'}
                        </h3>
                        {config.isConnected && config.lastSync && (
                            <p className="text-sm text-sky-700">
                                Последняя синхронизация: {new Date(config.lastSync).toLocaleString('ru-RU')}
                            </p>
                        )}
                        {!config.isConnected && (
                            <p className="text-sm text-slate-500">Введите данные приложения для начала работы</p>
                        )}
                    </div>
                </div>
                {config.isConnected && (
                    <div className="flex gap-2 w-full md:w-auto">
                        <button 
                            onClick={handleSync}
                            disabled={isSyncing}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-sky-200 text-sky-700 rounded-xl hover:bg-sky-100 transition-colors text-sm font-medium shadow-sm flex-1 md:flex-none"
                        >
                            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                            {isSyncing ? 'Синхронизация...' : 'Синхронизировать'}
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

            {/* Main Form */}
            {!config.isConnected && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row justify-between md:items-center gap-4">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Settings className="w-5 h-5 text-sky-600" />
                            Параметры приложения (OAuth 2.0)
                        </h3>
                        <a 
                            href="https://albato.ru/app-bitrix24" 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-xs text-sky-600 hover:text-sky-800 flex items-center gap-1 font-medium bg-sky-50 px-3 py-1.5 rounded-lg border border-sky-100 hover:bg-sky-100 transition-colors"
                        >
                            <ExternalLink className="w-3 h-3" />
                            Справка по подключению
                        </a>
                    </div>
                    
                    <form onSubmit={handleConnect} className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-slate-400" />
                                    Адрес портала (Domain)
                                </label>
                                <input
                                    type="text"
                                    required
                                    className="block w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-sky-500 focus:border-sky-500 sm:text-sm shadow-sm"
                                    placeholder="example.bitrix24.ru"
                                    value={config.domain}
                                    onChange={(e) => handleChange('domain', e.target.value)}
                                />
                                <p className="text-xs text-slate-400">Полный адрес вашего портала Битрикс24.</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                    <Link className="w-4 h-4 text-slate-400" />
                                    ID Приложения (Client ID)
                                </label>
                                <input
                                    type="text"
                                    required
                                    className="block w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-sky-500 focus:border-sky-500 sm:text-sm shadow-sm"
                                    placeholder="local.1234567890.abcdef"
                                    value={config.clientId}
                                    onChange={(e) => handleChange('clientId', e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                    <Key className="w-4 h-4 text-slate-400" />
                                    Ключ Приложения (Client Secret)
                                </label>
                                <input
                                    type="password"
                                    required
                                    className="block w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-sky-500 focus:border-sky-500 sm:text-sm shadow-sm font-mono"
                                    placeholder="••••••••••••••••••••"
                                    value={config.clientSecret}
                                    onChange={(e) => handleChange('clientSecret', e.target.value)}
                                />
                            </div>
                        </div>

                        {message && (
                            <div className={`p-4 rounded-xl flex items-start gap-3 ${message.type === 'success' ? 'bg-sky-50 text-sky-800 border border-sky-100' : 'bg-rose-50 text-rose-800 border border-rose-100'}`}>
                                {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
                                <p className="text-sm font-medium">{message.text}</p>
                            </div>
                        )}

                        <div className="pt-4 border-t border-slate-100 flex justify-end">
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="flex items-center gap-2 px-6 py-2.5 bg-[#00AEEF] text-white rounded-xl hover:bg-[#0090C7] transition-colors font-medium shadow-md shadow-sky-100 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isSaving ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        Подключение...
                                    </>
                                ) : (
                                    <>
                                        Подключить
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Instructions */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                <h4 className="font-bold text-slate-900 mb-3 text-sm">Как настроить интеграцию?</h4>
                <ol className="list-decimal list-inside text-sm text-slate-600 space-y-2">
                    <li>Создайте локальное приложение в Битрикс24 (Разработчикам → Другое → Локальное приложение).</li>
                    <li>Выберите тип "Серверное" (OAuth).</li>
                    <li>Укажите права доступа: <b>CRM (crm)</b>, <b>Пользователи (user)</b>.</li>
                    <li>В поле "Путь вашего обработчика" укажите <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">https://motodata.app/oauth/bitrix24</code>.</li>
                    <li>Скопируйте <b>ID приложения</b> и <b>Ключ приложения</b> в форму выше.</li>
                </ol>
            </div>
        </div>
    );
};

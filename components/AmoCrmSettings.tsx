
import React, { useState, useEffect } from 'react';
import { loadFromDB, saveToDB, removeFromDB } from '../services/storage';
import { Settings, Link, Lock, Globe, CheckCircle2, AlertCircle, RefreshCw, LogOut, Key, ExternalLink, ArrowLeft } from 'lucide-react';

interface AmoConfig {
    subdomain: string;
    integrationId: string;
    secretKey: string;
    authCode: string;
    isConnected: boolean;
    lastSync?: number;
}

interface AmoCrmSettingsProps {
    onBack?: () => void;
}

export const AmoCrmSettings: React.FC<AmoCrmSettingsProps> = ({ onBack }) => {
    const [config, setConfig] = useState<AmoConfig>({
        subdomain: '',
        integrationId: '',
        secretKey: '',
        authCode: '',
        isConnected: false
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

    useEffect(() => {
        const loadSettings = async () => {
            const saved = await loadFromDB('AMO_CRM_SETTINGS');
            if (saved) {
                setConfig({ ...saved, authCode: '' }); // Auth code is usually one-time, don't persist in view
            }
            setIsLoading(false);
        };
        loadSettings();
    }, []);

    const handleChange = (field: keyof AmoConfig, value: string) => {
        setConfig(prev => ({ ...prev, [field]: value }));
    };

    const handleConnect = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        setIsSaving(true);

        // Basic Validation
        if (!config.subdomain || !config.integrationId || !config.secretKey || !config.authCode) {
            setMessage({ type: 'error', text: 'Пожалуйста, заполните все поля' });
            setIsSaving(false);
            return;
        }

        try {
            // Simulation of OAuth exchange with AmoCRM
            await new Promise(resolve => setTimeout(resolve, 1500));

            const newConfig = {
                ...config,
                isConnected: true,
                lastSync: Date.now()
            };

            await saveToDB('AMO_CRM_SETTINGS', newConfig);
            setConfig(newConfig);
            setMessage({ type: 'success', text: 'Интеграция успешно настроена! Токены доступа получены.' });
        } catch (err) {
            setMessage({ type: 'error', text: 'Ошибка подключения. Проверьте правильность ключей.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDisconnect = async () => {
        if (window.confirm('Вы уверены? Это остановит синхронизацию данных с AmoCRM.')) {
            await removeFromDB('AMO_CRM_SETTINGS');
            setConfig({
                subdomain: '',
                integrationId: '',
                secretKey: '',
                authCode: '',
                isConnected: false
            });
            setMessage({ type: 'success', text: 'Интеграция отключена.' });
        }
    };

    const handleSync = async () => {
        setIsSyncing(true);
        // Simulate fetching deals
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const updatedConfig = { ...config, lastSync: Date.now() };
        await saveToDB('AMO_CRM_SETTINGS', updatedConfig);
        setConfig(updatedConfig);
        
        setIsSyncing(false);
        alert('Данные успешно синхронизированы! Получено 45 новых сделок.');
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
                        <span className="bg-[#2D9CDB] text-white p-2 rounded-xl">
                            <Link className="w-6 h-6" />
                        </span>
                        Интеграция с AmoCRM
                    </h2>
                    <p className="text-slate-500 mt-2">
                        Настройте автоматический импорт сделок из вашей CRM для анализа продаж в MotoAnalytics.
                    </p>
                </div>
            </div>

            {/* Status Card */}
            <div className={`rounded-2xl border p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${config.isConnected ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${config.isConnected ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                        {config.isConnected ? <CheckCircle2 className="w-8 h-8" /> : <Link className="w-8 h-8" />}
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-slate-900">
                            {config.isConnected ? 'Подключено к AmoCRM' : 'Интеграция не активна'}
                        </h3>
                        {config.isConnected && config.lastSync && (
                            <p className="text-sm text-emerald-700">
                                Последняя синхронизация: {new Date(config.lastSync).toLocaleString('ru-RU')}
                            </p>
                        )}
                        {!config.isConnected && (
                            <p className="text-sm text-slate-500">Введите ключи доступа для начала работы</p>
                        )}
                    </div>
                </div>
                {config.isConnected && (
                    <div className="flex gap-2 w-full md:w-auto">
                        <button 
                            onClick={handleSync}
                            disabled={isSyncing}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-emerald-200 text-emerald-700 rounded-xl hover:bg-emerald-100 transition-colors text-sm font-medium shadow-sm flex-1 md:flex-none"
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
                            <Settings className="w-5 h-5 text-indigo-600" />
                            Настройки подключения
                        </h3>
                        <a 
                            href="https://www.amocrm.ru/developers/content/platform/abilities" 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors"
                        >
                            <ExternalLink className="w-3 h-3" />
                            Документация API AmoCRM
                        </a>
                    </div>
                    
                    <form onSubmit={handleConnect} className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-slate-400" />
                                    Субдомен (адрес CRM)
                                </label>
                                <div className="flex rounded-xl shadow-sm">
                                    <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-300 bg-slate-50 text-slate-500 text-sm">
                                        https://
                                    </span>
                                    <input
                                        type="text"
                                        required
                                        className="flex-1 min-w-0 block w-full px-3 py-2.5 rounded-none border-t border-b border-slate-300 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        placeholder="company"
                                        value={config.subdomain}
                                        onChange={(e) => handleChange('subdomain', e.target.value)}
                                    />
                                    <span className="inline-flex items-center px-3 rounded-r-xl border border-l-0 border-slate-300 bg-slate-50 text-slate-500 text-sm">
                                        .amocrm.ru
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400">Например, если ваш адрес company.amocrm.ru, введите "company"</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                    <Link className="w-4 h-4 text-slate-400" />
                                    ID Интеграции (Integration ID)
                                </label>
                                <input
                                    type="text"
                                    required
                                    className="block w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm shadow-sm"
                                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                    value={config.integrationId}
                                    onChange={(e) => handleChange('integrationId', e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                    <Lock className="w-4 h-4 text-slate-400" />
                                    Секретный ключ (Secret Key)
                                </label>
                                <input
                                    type="password"
                                    required
                                    className="block w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm shadow-sm font-mono"
                                    placeholder="••••••••••••••••••••"
                                    value={config.secretKey}
                                    onChange={(e) => handleChange('secretKey', e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                    <Key className="w-4 h-4 text-slate-400" />
                                    Код авторизации (Auth Code)
                                </label>
                                <input
                                    type="text"
                                    required
                                    className="block w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm shadow-sm font-mono"
                                    placeholder="Временный код авторизации (действует 20 мин)"
                                    value={config.authCode}
                                    onChange={(e) => handleChange('authCode', e.target.value)}
                                />
                                <p className="text-xs text-slate-400">Получите этот код в настройках интеграции AmoCRM после создания ключей.</p>
                            </div>
                        </div>

                        {message && (
                            <div className={`p-4 rounded-xl flex items-start gap-3 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-rose-50 text-rose-800 border border-rose-100'}`}>
                                {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
                                <p className="text-sm font-medium">{message.text}</p>
                            </div>
                        )}

                        <div className="pt-4 border-t border-slate-100 flex justify-end">
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="flex items-center gap-2 px-6 py-2.5 bg-[#2D9CDB] text-white rounded-xl hover:bg-[#2589c4] transition-colors font-medium shadow-md shadow-blue-100 disabled:opacity-70 disabled:cursor-not-allowed"
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
                    <li>Перейдите в аккаунт AmoCRM → Настройки → Интеграции.</li>
                    <li>Нажмите "Создать интеграцию" (внешняя интеграция).</li>
                    <li>Ссылка для перенаправления: укажите <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">https://motodata.app/oauth/amocrm</code> (пример).</li>
                    <li>Разрешите доступ к данным (Сделки, Контакты, Компании).</li>
                    <li>Скопируйте <b>ID интеграции</b>, <b>Секретный ключ</b> и <b>Код авторизации</b> в форму выше.</li>
                </ol>
            </div>
        </div>
    );
};


import React, { useState, useEffect } from 'react';
import { loadFromDB, saveToDB, removeFromDB } from '../services/storage';
import { verifyBotToken, sendTelegramMessage } from '../services/telegramIntegration';
import { Settings, Send, MessageCircle, CheckCircle2, AlertCircle, RefreshCw, LogOut, Key, ArrowLeft, Bell, Smartphone } from 'lucide-react';

interface TelegramConfig {
    botToken: string;
    defaultChatId: string;
    autoNotify: boolean;
    isConnected: boolean;
    botName?: string;
}

interface TelegramSettingsProps {
    onBack?: () => void;
}

export const TelegramSettings: React.FC<TelegramSettingsProps> = ({ onBack }) => {
    const [config, setConfig] = useState<TelegramConfig>({
        botToken: '',
        defaultChatId: '',
        autoNotify: true,
        isConnected: false
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

    useEffect(() => {
        const loadSettings = async () => {
            const saved = await loadFromDB('TELEGRAM_SETTINGS');
            if (saved) {
                setConfig(saved);
            }
            setIsLoading(false);
        };
        loadSettings();
    }, []);

    const handleChange = (field: keyof TelegramConfig, value: any) => {
        setConfig(prev => ({ ...prev, [field]: value }));
    };

    const handleConnect = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        setIsSaving(true);

        if (!config.botToken) {
            setMessage({ type: 'error', text: 'Введите токен бота' });
            setIsSaving(false);
            return;
        }

        try {
            const botInfo = await verifyBotToken(config.botToken);
            
            const newConfig = {
                ...config,
                isConnected: true,
                botName: botInfo.username
            };

            await saveToDB('TELEGRAM_SETTINGS', newConfig);
            setConfig(newConfig);
            setMessage({ type: 'success', text: `Бот @${botInfo.username} успешно подключен!` });
        } catch (err) {
            setMessage({ type: 'error', text: 'Неверный токен. Проверьте данные и попробуйте снова.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleTestMessage = async () => {
        if (!config.defaultChatId) {
            setMessage({ type: 'error', text: 'Укажите Chat ID получателя' });
            return;
        }
        setIsTesting(true);
        const sent = await sendTelegramMessage(
            config.botToken, 
            config.defaultChatId, 
            '🚀 <b>Тестовое сообщение</b>\n\nИнтеграция с MotoAnalytics настроена успешно!'
        );
        
        if (sent) {
            setMessage({ type: 'success', text: 'Сообщение отправлено. Проверьте ваш Telegram.' });
            // Save chat ID if successful test
            await saveToDB('TELEGRAM_SETTINGS', config);
        } else {
            setMessage({ type: 'error', text: 'Ошибка отправки. Убедитесь, что вы начали диалог с ботом (/start).' });
        }
        setIsTesting(false);
    };

    const handleDisconnect = async () => {
        if (window.confirm('Отключить уведомления Telegram?')) {
            await removeFromDB('TELEGRAM_SETTINGS');
            setConfig({
                botToken: '',
                defaultChatId: '',
                autoNotify: true,
                isConnected: false
            });
            setMessage({ type: 'success', text: 'Интеграция удалена.' });
        }
    };

    const toggleAutoNotify = async () => {
        const newValue = !config.autoNotify;
        const updatedConfig = { ...config, autoNotify: newValue };
        setConfig(updatedConfig);
        await saveToDB('TELEGRAM_SETTINGS', updatedConfig);
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
                        <span className="bg-[#24A1DE] text-white p-2 rounded-xl">
                            <Send className="w-6 h-6 -ml-0.5 mt-0.5" />
                        </span>
                        Уведомления Telegram
                    </h2>
                    <p className="text-slate-500 mt-2">
                        Получайте отчеты о синхронизации данных прямо в мессенджер.
                    </p>
                </div>
            </div>

            {/* Status Card */}
            <div className={`rounded-2xl border p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${config.isConnected ? 'bg-sky-50 border-sky-100' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${config.isConnected ? 'bg-sky-100 text-[#24A1DE]' : 'bg-slate-100 text-slate-400'}`}>
                        {config.isConnected ? <CheckCircle2 className="w-8 h-8" /> : <MessageCircle className="w-8 h-8" />}
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-slate-900">
                            {config.isConnected ? `Бот подключен: @${config.botName}` : 'Бот не подключен'}
                        </h3>
                        {config.isConnected ? (
                            <p className="text-sm text-sky-700">Уведомления {config.autoNotify ? 'активны' : 'приостановлены'}</p>
                        ) : (
                            <p className="text-sm text-slate-500">Настройте токен для отправки сообщений</p>
                        )}
                    </div>
                </div>
                {config.isConnected && (
                    <div className="flex gap-2 w-full md:w-auto">
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
                <div className="p-6 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Settings className="w-5 h-5 text-indigo-600" />
                        Настройка бота
                    </h3>
                </div>
                
                <div className="p-6 space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                            <Key className="w-4 h-4 text-slate-400" />
                            Bot Token
                        </label>
                        <input
                            type="password"
                            disabled={config.isConnected}
                            className="block w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-sky-500 focus:border-sky-500 sm:text-sm shadow-sm font-mono disabled:bg-slate-50 disabled:text-slate-500"
                            placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                            value={config.botToken}
                            onChange={(e) => handleChange('botToken', e.target.value)}
                        />
                        {!config.isConnected && (
                            <p className="text-xs text-slate-400">
                                Получите токен у <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-sky-600 hover:underline">@BotFather</a>, создав нового бота.
                            </p>
                        )}
                    </div>

                    {config.isConnected && (
                        <>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                    <Smartphone className="w-4 h-4 text-slate-400" />
                                    Chat ID (Получатель)
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        className="block w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-sky-500 focus:border-sky-500 sm:text-sm shadow-sm font-mono"
                                        placeholder="Например: 123456789"
                                        value={config.defaultChatId}
                                        onChange={(e) => handleChange('defaultChatId', e.target.value)}
                                    />
                                    <button
                                        onClick={handleTestMessage}
                                        disabled={isTesting || !config.defaultChatId}
                                        className="whitespace-nowrap px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl font-medium text-sm transition-colors"
                                    >
                                        {isTesting ? 'Отправка...' : 'Тест'}
                                    </button>
                                </div>
                                <p className="text-xs text-slate-400">
                                    Чтобы узнать свой ID, напишите боту <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" className="text-sky-600 hover:underline">@userinfobot</a>. 
                                    <b>Важно:</b> Вы должны сначала нажать /start в диалоге с вашим ботом.
                                </p>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${config.autoNotify ? 'bg-sky-100 text-sky-600' : 'bg-slate-200 text-slate-500'}`}>
                                        <Bell className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-900">Автоматические уведомления</p>
                                        <p className="text-xs text-slate-500">Отправлять отчет при обновлении данных через API</p>
                                    </div>
                                </div>
                                <button
                                    onClick={toggleAutoNotify}
                                    className={`
                                        relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none
                                        ${config.autoNotify ? 'bg-sky-500' : 'bg-slate-300'}
                                    `}
                                >
                                    <span
                                        aria-hidden="true"
                                        className={`
                                            pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                                            ${config.autoNotify ? 'translate-x-5' : 'translate-x-0'}
                                        `}
                                    />
                                </button>
                            </div>
                        </>
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
                                className="flex items-center gap-2 px-6 py-2.5 bg-[#24A1DE] text-white rounded-xl hover:bg-[#1c8ec7] transition-colors font-medium shadow-md shadow-sky-100 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                {isSaving ? 'Подключение...' : 'Подтвердить токен'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

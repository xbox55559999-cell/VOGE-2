
import React, { useState, useEffect } from 'react';
import { loadFromDB } from '../services/storage';
import { AmoCrmSettings } from './AmoCrmSettings';
import { Bitrix24Settings } from './Bitrix24Settings';
import { PikApiSettings } from './PikApiSettings';
import { TelegramSettings } from './TelegramSettings';
import { Blocks, CheckCircle2, ChevronRight, AlertCircle, Send } from 'lucide-react';

type IntegrationType = 'list' | 'amo' | 'bitrix' | 'pik' | 'telegram';

export const IntegrationsHub: React.FC = () => {
    const [view, setView] = useState<IntegrationType>('list');
    const [status, setStatus] = useState({ amo: false, bitrix: false, pik: false, telegram: false });

    // Check status on mount and when returning to list
    useEffect(() => {
        if (view === 'list') {
            const checkStatus = async () => {
                const amo = await loadFromDB('AMO_CRM_SETTINGS');
                const bitrix = await loadFromDB('BITRIX24_SETTINGS');
                const pik = await loadFromDB('PIK_API_SETTINGS');
                const telegram = await loadFromDB('TELEGRAM_SETTINGS');
                setStatus({
                    amo: !!amo?.isConnected,
                    bitrix: !!bitrix?.isConnected,
                    pik: !!pik?.isConnected,
                    telegram: !!telegram?.isConnected
                });
            };
            checkStatus();
        }
    }, [view]);

    if (view === 'amo') return <AmoCrmSettings onBack={() => setView('list')} />;
    if (view === 'bitrix') return <Bitrix24Settings onBack={() => setView('list')} />;
    if (view === 'pik') return <PikApiSettings onBack={() => setView('list')} />;
    if (view === 'telegram') return <TelegramSettings onBack={() => setView('list')} />;

    return (
        <div className="animate-fade-in max-w-5xl mx-auto space-y-8">
            <div>
                <h2 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                    <Blocks className="w-8 h-8 text-indigo-600" />
                    Интеграции
                </h2>
                <p className="text-slate-500 mt-2">
                    Подключите внешние источники данных для автоматической синхронизации сделок и аналитики.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* AmoCRM Card */}
                <div 
                    onClick={() => setView('amo')}
                    className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer overflow-hidden relative"
                >
                    <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 bg-[#2D9CDB] rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-md">
                                AMO
                            </div>
                            {status.amo ? (
                                <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Активно
                                </span>
                            ) : (
                                <span className="bg-slate-100 text-slate-500 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> Не настроено
                                </span>
                            )}
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">AmoCRM</h3>
                        <p className="text-slate-500 text-sm leading-relaxed mb-6">
                            Автоматическая загрузка сделок, синхронизация статусов и воронок продаж.
                        </p>
                        <div className="flex items-center text-indigo-600 font-medium text-sm group-hover:translate-x-1 transition-transform">
                            Настроить <ChevronRight className="w-4 h-4 ml-1" />
                        </div>
                    </div>
                    {status.amo && <div className="h-1.5 w-full bg-emerald-500 absolute bottom-0"></div>}
                </div>

                {/* Bitrix24 Card */}
                <div 
                    onClick={() => setView('bitrix')}
                    className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-sky-300 transition-all cursor-pointer overflow-hidden relative"
                >
                    <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 bg-[#00AEEF] rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md">
                                24
                            </div>
                            {status.bitrix ? (
                                <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Активно
                                </span>
                            ) : (
                                <span className="bg-slate-100 text-slate-500 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> Не настроено
                                </span>
                            )}
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Битрикс24</h3>
                        <p className="text-slate-500 text-sm leading-relaxed mb-6">
                            Импорт лидов и сделок из облачной или коробочной версии Битрикс24.
                        </p>
                        <div className="flex items-center text-sky-600 font-medium text-sm group-hover:translate-x-1 transition-transform">
                            Настроить <ChevronRight className="w-4 h-4 ml-1" />
                        </div>
                    </div>
                    {status.bitrix && <div className="h-1.5 w-full bg-emerald-500 absolute bottom-0"></div>}
                </div>

                {/* PIK-TD API Card */}
                <div 
                    onClick={() => setView('pik')}
                    className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-orange-300 transition-all cursor-pointer overflow-hidden relative"
                >
                    <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md">
                                PK
                            </div>
                            {status.pik ? (
                                <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Активно
                                </span>
                            ) : (
                                <span className="bg-slate-100 text-slate-500 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> Не настроено
                                </span>
                            )}
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">PIK-TD API</h3>
                        <p className="text-slate-500 text-sm leading-relaxed mb-6">
                            Импорт статистики продаж техники по API. Автообновление каждый час.
                        </p>
                        <div className="flex items-center text-orange-600 font-medium text-sm group-hover:translate-x-1 transition-transform">
                            Настроить <ChevronRight className="w-4 h-4 ml-1" />
                        </div>
                    </div>
                    {status.pik && <div className="h-1.5 w-full bg-emerald-500 absolute bottom-0"></div>}
                </div>

                {/* Telegram Card */}
                <div 
                    onClick={() => setView('telegram')}
                    className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-sky-400 transition-all cursor-pointer overflow-hidden relative"
                >
                    <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 bg-[#24A1DE] rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md">
                                <Send className="w-6 h-6 -ml-0.5 mt-0.5" />
                            </div>
                            {status.telegram ? (
                                <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Активно
                                </span>
                            ) : (
                                <span className="bg-slate-100 text-slate-500 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> Не настроено
                                </span>
                            )}
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Telegram</h3>
                        <p className="text-slate-500 text-sm leading-relaxed mb-6">
                            Уведомления о новых продажах и отчеты по расписанию прямо в мессенджер.
                        </p>
                        <div className="flex items-center text-sky-600 font-medium text-sm group-hover:translate-x-1 transition-transform">
                            Настроить <ChevronRight className="w-4 h-4 ml-1" />
                        </div>
                    </div>
                    {status.telegram && <div className="h-1.5 w-full bg-emerald-500 absolute bottom-0"></div>}
                </div>
            </div>
        </div>
    );
};

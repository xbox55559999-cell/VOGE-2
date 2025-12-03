
import React, { useState, useEffect } from 'react';
import { loadFromDB, saveToDB, removeFromDB } from '../services/storage';
import { DEFAULT_SYSTEM_PROMPT } from '../services/aiService';
import { Settings2, Save, RotateCcw, CheckCircle2, AlertCircle } from 'lucide-react';

export const PromptSettings: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    useEffect(() => {
        const fetchPrompt = async () => {
            const stored = await loadFromDB('AI_SYSTEM_PROMPT');
            setPrompt(stored || DEFAULT_SYSTEM_PROMPT);
            setIsLoading(false);
        };
        fetchPrompt();
    }, []);

    const handleSave = async () => {
        setSaveStatus('saving');
        try {
            await saveToDB('AI_SYSTEM_PROMPT', prompt);
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (e) {
            console.error(e);
            setSaveStatus('error');
        }
    };

    const handleReset = async () => {
        if (window.confirm('Вы уверены? Это действие сбросит промпт к заводским настройкам.')) {
            setPrompt(DEFAULT_SYSTEM_PROMPT);
            await removeFromDB('AI_SYSTEM_PROMPT'); // Effectively resets to default for next load, or save explicitly
            await saveToDB('AI_SYSTEM_PROMPT', DEFAULT_SYSTEM_PROMPT); 
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        }
    };

    return (
        <div className="animate-fade-in space-y-6 max-w-4xl mx-auto">
            <div>
                <h2 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                    <Settings2 className="w-8 h-8 text-indigo-600" />
                    Настройки AI
                </h2>
                <p className="text-slate-500 mt-2">
                    Управление системным промптом для бизнес-ассистента. Изменения повлияют на будущие генерации.
                </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-600 uppercase tracking-wide">Системная инструкция (System Prompt)</span>
                    <div className="flex gap-2">
                        <button 
                            onClick={handleReset}
                            className="px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1.5"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Сбросить
                        </button>
                    </div>
                </div>
                
                <div className="flex-1 relative">
                    {isLoading ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                            <span className="text-slate-400">Загрузка...</span>
                        </div>
                    ) : (
                        <textarea 
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            className="w-full h-full p-6 resize-none focus:outline-none focus:bg-indigo-50/10 font-mono text-sm leading-relaxed text-slate-700"
                            placeholder="Введите системный промпт..."
                        />
                    )}
                </div>

                <div className="p-4 border-t border-slate-100 bg-white flex justify-end">
                    <button 
                        onClick={handleSave}
                        disabled={saveStatus === 'saving'}
                        className={`
                            flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all shadow-sm
                            ${saveStatus === 'saved' 
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                                : saveStatus === 'error'
                                ? 'bg-rose-600 text-white hover:bg-rose-700'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
                            }
                        `}
                    >
                        {saveStatus === 'saving' && <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-1"></span>}
                        {saveStatus === 'saved' && <CheckCircle2 className="w-4 h-4" />}
                        {saveStatus === 'error' && <AlertCircle className="w-4 h-4" />}
                        
                        {saveStatus === 'idle' && <Save className="w-4 h-4" />}
                        {saveStatus === 'idle' && 'Сохранить изменения'}
                        {saveStatus === 'saving' && 'Сохранение...'}
                        {saveStatus === 'saved' && 'Сохранено!'}
                        {saveStatus === 'error' && 'Ошибка'}
                    </button>
                </div>
            </div>
        </div>
    );
};

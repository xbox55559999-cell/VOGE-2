
import React, { useState, useEffect, useRef } from 'react';
import { ChatSession, ChatMessage } from '../types';
import { messengerService } from '../services/messengerService';
import { loadFromDB } from '../services/storage';
import { MessageCircle, Search, Send, Settings, MoreVertical, Phone, Paperclip, Smile, Check, CheckCheck, Trash2, Edit2, X } from 'lucide-react';
import { TelegramSettings } from './TelegramSettings';

interface MessengerHubProps {
    onOpenSettings: () => void;
}

export const MessengerHub: React.FC<MessengerHubProps> = ({ onOpenSettings }) => {
    const [chats, setChats] = useState<ChatSession[]>([]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isConfiguring, setIsConfiguring] = useState(false);
    
    // Editing state
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    
    // Status state
    const [telegramConnected, setTelegramConnected] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initial Load
    useEffect(() => {
        const init = async () => {
            const loadedChats = await messengerService.getChats();
            setChats(loadedChats);
            
            const tgSettings = await loadFromDB('TELEGRAM_SETTINGS');
            setTelegramConnected(!!tgSettings?.isConnected);
        };
        init();

        // Poll for chat list updates (e.g. new incoming messages updating order/unread)
        const interval = setInterval(async () => {
            const loadedChats = await messengerService.getChats();
            // Simple check to avoid re-rendering if nothing changed dramatically in order/count
            // In real app, deep compare. Here we just set it.
            setChats(loadedChats);
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    // Load messages when active chat changes
    useEffect(() => {
        if (activeChatId) {
            const loadMsgs = async () => {
                const msgs = await messengerService.getMessages(activeChatId);
                setMessages(msgs);
                // Mark as read
                const updated = await messengerService.markAsRead(activeChatId);
                if (updated) {
                    // Refresh chats immediately to clear badge
                    const loadedChats = await messengerService.getChats();
                    setChats(loadedChats);
                }
            };
            loadMsgs();
            setEditingMessageId(null);
            setInputMessage('');
            
            // Poll for new messages in active chat
            const msgInterval = setInterval(loadMsgs, 2000);
            return () => clearInterval(msgInterval);
        }
    }, [activeChatId]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (!editingMessageId) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, editingMessageId]);

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputMessage.trim() || !activeChatId) return;

        if (editingMessageId) {
            // EDIT MODE
            await messengerService.editMessage(editingMessageId, inputMessage);
            setEditingMessageId(null);
        } else {
            // SEND MODE
            await messengerService.sendMessage(activeChatId, inputMessage);
        }

        const msgs = await messengerService.getMessages(activeChatId);
        setMessages(msgs);
        setInputMessage('');
        
        // Refresh chats to update last message preview
        const loadedChats = await messengerService.getChats();
        setChats(loadedChats);
    };

    const handleDeleteMessage = async (msgId: string) => {
        if (window.confirm('Удалить сообщение?')) {
            if (!activeChatId) return;
            await messengerService.deleteMessage(activeChatId, msgId);
            const msgs = await messengerService.getMessages(activeChatId);
            setMessages(msgs);
            
            // Refresh chats in case last message changed
            const loadedChats = await messengerService.getChats();
            setChats(loadedChats);
        }
    };

    const startEditMessage = (msg: ChatMessage) => {
        setEditingMessageId(msg.id);
        setInputMessage(msg.text);
    };

    const cancelEdit = () => {
        setEditingMessageId(null);
        setInputMessage('');
    };

    const filteredChats = chats.filter(c => c.contactName.toLowerCase().includes(searchQuery.toLowerCase()));
    const activeChat = chats.find(c => c.id === activeChatId);

    if (isConfiguring) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center gap-2">
                    <button onClick={() => setIsConfiguring(false)} className="text-slate-500 hover:text-indigo-600">
                        Назад к чатам
                    </button>
                </div>
                <div className="p-6">
                    <TelegramSettings onBack={() => setIsConfiguring(false)} />
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-8rem)] bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
            {/* LEFT SIDEBAR: Chat List */}
            <div className="w-full md:w-80 border-r border-slate-200 flex flex-col bg-slate-50/50">
                <div className="p-4 border-b border-slate-100 bg-white">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <MessageCircle className="w-6 h-6 text-indigo-600" />
                            Мессенджеры
                        </h2>
                        <button 
                            onClick={() => setIsConfiguring(true)}
                            className={`p-2 rounded-lg transition-colors ${telegramConnected ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100' : 'text-slate-400 hover:bg-slate-100'}`}
                            title="Настройки каналов"
                        >
                            <Settings className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Поиск чата..." 
                            className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {filteredChats.map(chat => (
                        <div 
                            key={chat.id}
                            onClick={() => setActiveChatId(chat.id)}
                            className={`p-4 flex gap-3 cursor-pointer transition-colors border-b border-slate-100 hover:bg-white ${activeChatId === chat.id ? 'bg-white border-l-4 border-l-indigo-600 shadow-sm' : 'border-l-4 border-l-transparent'}`}
                        >
                            <div className="relative">
                                <img src={chat.avatarUrl} alt={chat.contactName} className="w-12 h-12 rounded-full bg-slate-200" />
                                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                                    {chat.platform === 'telegram' ? (
                                        <div className="w-4 h-4 bg-[#24A1DE] rounded-full flex items-center justify-center">
                                            <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 text-white fill-current"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.48-.94-2.4-1.54-1.06-.7-.37-1.09.23-1.72.14-.15 2.54-2.32 2.59-2.52.01-.03.01-.15-.06-.21-.07-.06-.17-.04-.25-.02-.11.02-1.78 1.14-5.02 3.34-.48.33-.91.49-1.3.48-.42-.01-1.23-.24-1.83-.44-.73-.24-1.31-.37-1.25-.79.03-.22.32-.44.88-.66 3.46-1.5 5.79-2.49 6.98-2.98 3.33-1.38 4.02-1.63 4.47-1.63.1 0 .32.02.47.14.12.1.16.23.18.37.01.12.01.24 0 .37z"/></svg>
                                        </div>
                                    ) : (
                                        <div className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                                            <div className="w-2 h-2 bg-white rounded-full"></div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className="font-semibold text-slate-900 truncate text-sm">{chat.contactName}</h4>
                                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                        {new Date(chat.lastMessageTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <p className="text-xs text-slate-500 truncate pr-2">{chat.lastMessageText || <span className="italic text-slate-300">Сообщение удалено</span>}</p>
                                    {chat.unreadCount > 0 && (
                                        <span className="bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                            {chat.unreadCount}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {filteredChats.length === 0 && (
                        <div className="p-8 text-center text-slate-400 text-sm">
                            {telegramConnected ? 'Ожидание сообщений...' : 'Подключите Telegram, чтобы получать сообщения'}
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT MAIN AREA: Active Chat */}
            <div className="flex-1 flex flex-col h-full relative">
                {activeChatId && activeChat ? (
                    <>
                        {/* Chat Header */}
                        <div className="px-6 py-3 border-b border-slate-100 flex justify-between items-center bg-white z-10 shadow-sm">
                            <div className="flex items-center gap-3">
                                <img src={activeChat.avatarUrl} className="w-10 h-10 rounded-full" alt="Avatar" />
                                <div>
                                    <h3 className="font-bold text-slate-900">{activeChat.contactName}</h3>
                                    <p className="text-xs text-slate-500">{activeChat.contactPhone || 'Telegram'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-full hover:text-indigo-600 transition-colors">
                                    <Phone className="w-5 h-5" />
                                </button>
                                <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-full hover:text-indigo-600 transition-colors">
                                    <Search className="w-5 h-5" />
                                </button>
                                <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-full hover:text-indigo-600 transition-colors">
                                    <MoreVertical className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Chat Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50 scrollbar-thin scrollbar-thumb-slate-200">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex ${msg.isOutbound ? 'justify-end' : 'justify-start'} group/msg`}>
                                    <div 
                                        className={`
                                            max-w-[70%] px-4 py-2.5 rounded-2xl shadow-sm text-sm relative
                                            ${msg.isOutbound 
                                                ? 'bg-indigo-600 text-white rounded-br-none' 
                                                : 'bg-white text-slate-800 rounded-bl-none border border-slate-100'
                                            }
                                        `}
                                    >
                                        {/* Actions for outbound messages or delete for any */}
                                        <div className={`absolute top-0 ${msg.isOutbound ? '-left-16' : '-right-16'} h-full flex items-center gap-1 opacity-0 group-hover/msg:opacity-100 transition-opacity`}>
                                            {msg.isOutbound && (
                                                <button 
                                                    onClick={() => startEditMessage(msg)}
                                                    className="p-1.5 bg-white text-indigo-500 rounded-full shadow-sm hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
                                                    title="Редактировать"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => handleDeleteMessage(msg.id)}
                                                className="p-1.5 bg-white text-rose-400 rounded-full shadow-sm hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                                title="Удалить"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                        <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                                        <div className={`text-[10px] mt-1 flex items-center justify-end gap-1 ${msg.isOutbound ? 'text-indigo-200' : 'text-slate-400'}`}>
                                            {msg.isEdited && <span className="italic mr-1">изм.</span>}
                                            {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            {msg.isOutbound && (
                                                msg.isRead ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Chat Input */}
                        <div className="p-4 bg-white border-t border-slate-100">
                            {editingMessageId && (
                                <div className="flex items-center justify-between bg-indigo-50 px-4 py-2 rounded-t-xl text-xs text-indigo-700">
                                    <span className="flex items-center gap-2">
                                        <Edit2 className="w-3 h-3" /> Редактирование сообщения
                                    </span>
                                    <button onClick={cancelEdit} className="hover:text-indigo-900">
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            )}
                            <form onSubmit={handleSendMessage} className={`flex items-center gap-2 bg-slate-50 p-2 border border-slate-200 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100 transition-all ${editingMessageId ? 'rounded-b-2xl border-t-0' : 'rounded-2xl'}`}>
                                <button type="button" className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-200 rounded-full transition-colors">
                                    <Paperclip className="w-5 h-5" />
                                </button>
                                <input 
                                    type="text" 
                                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-slate-800 placeholder-slate-400"
                                    placeholder="Напишите сообщение..."
                                    value={inputMessage}
                                    onChange={(e) => setInputMessage(e.target.value)}
                                />
                                <button type="button" className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-200 rounded-full transition-colors">
                                    <Smile className="w-5 h-5" />
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={!inputMessage.trim()}
                                    className={`p-2 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md ${editingMessageId ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'}`}
                                >
                                    {editingMessageId ? <Check className="w-5 h-5" /> : <Send className="w-5 h-5" />}
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                            <MessageCircle className="w-10 h-10 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-700">Выберите чат</h3>
                        <p className="text-sm mt-1 max-w-xs text-center">
                            Выберите диалог из списка слева, чтобы начать общение с клиентами.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};


import React, { useState, useEffect, useRef } from 'react';
import { ChatSession, ChatMessage } from '../types';
import { messengerService } from '../services/messengerService';
import { loadFromDB } from '../services/storage';
import { MessageCircle, Search, Send, Settings, MoreVertical, Phone, Paperclip, Smile, Check, CheckCheck, Trash2, Edit2, X, ChevronLeft, ArrowDown, Info, AtSign, User, Shield } from 'lucide-react';
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
    
    // UI State
    const [showProfile, setShowProfile] = useState(false);
    
    // Editing state
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    
    // Status state
    const [telegramConnected, setTelegramConnected] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Initial Load
    useEffect(() => {
        const init = async () => {
            const loadedChats = await messengerService.getChats();
            setChats(loadedChats);
            
            const tgSettings = await loadFromDB('TELEGRAM_SETTINGS');
            setTelegramConnected(!!tgSettings?.isConnected);
        };
        init();

        // Poll for chat list updates
        const interval = setInterval(async () => {
            const loadedChats = await messengerService.getChats();
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
                    const loadedChats = await messengerService.getChats();
                    setChats(loadedChats);
                }
            };
            loadMsgs();
            setEditingMessageId(null);
            setInputMessage('');
            setShowProfile(false); // Close profile on chat switch initially, or keep open based on preference
            
            // Poll for new messages in active chat
            const msgInterval = setInterval(loadMsgs, 2000);
            return () => clearInterval(msgInterval);
        }
    }, [activeChatId]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (!editingMessageId) {
            scrollToBottom();
        }
    }, [messages, editingMessageId]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputMessage.trim() || !activeChatId) return;

        if (editingMessageId) {
            await messengerService.editMessage(editingMessageId, inputMessage);
            setEditingMessageId(null);
        } else {
            await messengerService.sendMessage(activeChatId, inputMessage);
        }

        const msgs = await messengerService.getMessages(activeChatId);
        setMessages(msgs);
        setInputMessage('');
        
        const loadedChats = await messengerService.getChats();
        setChats(loadedChats);
    };

    const handleDeleteMessage = async (msgId: string) => {
        if (window.confirm('Удалить сообщение?')) {
            if (!activeChatId) return;
            await messengerService.deleteMessage(activeChatId, msgId);
            const msgs = await messengerService.getMessages(activeChatId);
            setMessages(msgs);
            
            const loadedChats = await messengerService.getChats();
            setChats(loadedChats);
        }
    };

    const handleDeleteChat = async (chatId: string) => {
        if (window.confirm('Удалить весь чат и историю переписки?')) {
            await messengerService.deleteChat(chatId);
            const loadedChats = await messengerService.getChats();
            setChats(loadedChats);
            setActiveChatId(null);
            setShowProfile(false);
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

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        
        if (isToday) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
    };

    const filteredChats = chats.filter(c => c.contactName.toLowerCase().includes(searchQuery.toLowerCase()));
    const activeChat = chats.find(c => c.id === activeChatId);

    if (isConfiguring) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-[calc(100vh-8rem)] flex flex-col">
                <div className="p-4 border-b border-slate-100 flex items-center gap-2">
                    <button onClick={() => setIsConfiguring(false)} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors px-2 py-1 rounded-lg hover:bg-slate-50">
                        <ChevronLeft className="w-5 h-5" />
                        <span>Назад к чатам</span>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                    <TelegramSettings onBack={() => setIsConfiguring(false)} />
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-8rem)] bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden animate-fade-in relative">
            {/* LEFT SIDEBAR: Chat List */}
            <div className={`w-full md:w-80 lg:w-96 border-r border-slate-200 flex flex-col bg-white z-20 absolute md:relative h-full transition-transform duration-300 ${activeChatId ? '-translate-x-full md:translate-x-0' : 'translate-x-0'}`}>
                {/* Header */}
                <div className="p-4 border-b border-slate-100 bg-white sticky top-0 z-10">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            Мессенджеры
                            {telegramConnected && <div className="w-2 h-2 rounded-full bg-emerald-500" title="Подключено"></div>}
                        </h2>
                        <button 
                            onClick={() => setIsConfiguring(true)}
                            className={`p-2 rounded-full transition-all ${telegramConnected ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100' : 'text-slate-400 hover:bg-slate-100'}`}
                            title="Настройки интеграций"
                        >
                            <Settings className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Поиск чата..." 
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all placeholder:text-slate-400"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {filteredChats.map(chat => (
                        <div 
                            key={chat.id}
                            onClick={() => setActiveChatId(chat.id)}
                            className={`
                                group px-4 py-3 flex gap-3 cursor-pointer transition-all border-b border-slate-50 hover:bg-slate-50
                                ${activeChatId === chat.id ? 'bg-indigo-50/60 hover:bg-indigo-50 border-l-4 border-l-indigo-600 pl-[12px]' : 'border-l-4 border-l-transparent'}
                            `}
                        >
                            <div className="relative flex-shrink-0">
                                <img src={chat.avatarUrl} alt={chat.contactName} className="w-12 h-12 rounded-full bg-slate-200 object-cover shadow-sm" />
                                <div className="absolute bottom-0 right-0 p-0.5 bg-white rounded-full">
                                    {chat.platform === 'telegram' ? (
                                        <div className="w-4 h-4 bg-[#24A1DE] rounded-full flex items-center justify-center shadow-sm">
                                            <Send className="w-2.5 h-2.5 text-white ml-px mt-px" />
                                        </div>
                                    ) : (
                                        <div className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm">
                                            <div className="w-2 h-2 bg-white rounded-full"></div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <div className="flex justify-between items-baseline mb-1">
                                    <h4 className={`font-semibold truncate text-sm ${activeChatId === chat.id ? 'text-indigo-900' : 'text-slate-900'}`}>{chat.contactName}</h4>
                                    <span className="text-[11px] text-slate-400 whitespace-nowrap ml-2 font-medium">
                                        {formatTime(chat.lastMessageTime)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <p className={`text-sm truncate pr-2 ${chat.unreadCount > 0 ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>
                                        {chat.lastMessageText || <span className="italic opacity-50">Нет сообщений</span>}
                                    </p>
                                    {chat.unreadCount > 0 && (
                                        <span className="bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-sm shadow-indigo-200">
                                            {chat.unreadCount}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    {filteredChats.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-48 text-center px-6">
                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                                <MessageCircle className="w-6 h-6 text-slate-300" />
                            </div>
                            <p className="text-sm text-slate-500 font-medium">
                                {telegramConnected 
                                    ? (searchQuery ? 'Ничего не найдено' : 'Список чатов пуст. Ждем сообщений...') 
                                    : 'Подключите Telegram, чтобы начать общение'}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT MAIN AREA */}
            <div className={`flex-1 flex h-full relative transition-transform duration-300 ${!activeChatId ? 'translate-x-full md:translate-x-0' : 'translate-x-0'}`}>
                
                {/* Chat View */}
                <div className={`flex flex-col h-full bg-[#F0F2F5] relative transition-all duration-300 ${showProfile ? 'flex-[0.65]' : 'flex-1'}`}>
                    
                    {/* Chat Background Pattern */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                    }}></div>

                    {activeChatId && activeChat ? (
                        <>
                            {/* Chat Header */}
                            <div className="px-6 py-3 border-b border-slate-200 flex justify-between items-center bg-white z-30 shadow-sm">
                                <div className="flex items-center gap-3 cursor-pointer" onClick={() => setShowProfile(!showProfile)}>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setActiveChatId(null); }} 
                                        className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full"
                                    >
                                        <ChevronLeft className="w-6 h-6" />
                                    </button>
                                    <div className="relative">
                                        <img src={activeChat.avatarUrl} className="w-10 h-10 rounded-full object-cover border border-slate-100" alt="Avatar" />
                                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 leading-tight hover:text-indigo-600 transition-colors">{activeChat.contactName}</h3>
                                        <p className="text-xs text-emerald-600 font-medium">в сети</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button 
                                        onClick={() => setShowProfile(!showProfile)}
                                        className={`p-2 rounded-full transition-colors ${showProfile ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:bg-slate-100 hover:text-indigo-600'}`}
                                        title="Информация"
                                    >
                                        <Info className="w-5 h-5" />
                                    </button>
                                    <button 
                                        className="p-2 text-slate-400 hover:bg-slate-100 rounded-full hover:text-indigo-600 transition-colors" 
                                        title="Поиск в чате"
                                    >
                                        <Search className="w-5 h-5" />
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteChat(activeChat.id)}
                                        className="p-2 text-slate-400 hover:bg-rose-50 rounded-full hover:text-rose-600 transition-colors" 
                                        title="Удалить чат"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Chat Messages */}
                            <div 
                                ref={chatContainerRef}
                                className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent z-10"
                            >
                                {messages.map((msg, index) => {
                                    return (
                                        <div key={msg.id} className={`flex ${msg.isOutbound ? 'justify-end' : 'justify-start'} group/msg animate-fade-in-up`}>
                                            <div className="relative max-w-[85%] md:max-w-[70%]">
                                                {/* Action Buttons */}
                                                <div 
                                                    className={`
                                                        absolute top-0 bottom-0 flex items-center gap-1 opacity-0 group-hover/msg:opacity-100 transition-all duration-200
                                                        ${msg.isOutbound ? '-left-20 pr-2' : '-right-20 pl-2'}
                                                    `}
                                                >
                                                    {msg.isOutbound && (
                                                        <button 
                                                            onClick={() => startEditMessage(msg)}
                                                            className="p-1.5 bg-white text-slate-500 rounded-full shadow-sm hover:text-indigo-600 hover:bg-indigo-50 transition-colors border border-slate-100"
                                                            title="Редактировать"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={() => handleDeleteMessage(msg.id)}
                                                        className="p-1.5 bg-white text-slate-400 rounded-full shadow-sm hover:text-rose-600 hover:bg-rose-50 transition-colors border border-slate-100"
                                                        title="Удалить"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>

                                                {/* Message Bubble */}
                                                <div 
                                                    className={`
                                                        px-4 py-2.5 shadow-sm text-sm relative break-words
                                                        ${msg.isOutbound 
                                                            ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-2xl rounded-tr-none' 
                                                            : 'bg-white text-slate-800 rounded-2xl rounded-tl-none border border-slate-100'
                                                        }
                                                    `}
                                                >
                                                    <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                                                    
                                                    <div className={`text-[10px] mt-1 flex items-center justify-end gap-1 ${msg.isOutbound ? 'text-indigo-100' : 'text-slate-400'}`}>
                                                        {msg.isEdited && <span className="opacity-80">изменено</span>}
                                                        <span>
                                                            {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                        </span>
                                                        {msg.isOutbound && (
                                                            msg.isRead ? <CheckCheck className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Chat Input */}
                            <div className="p-4 bg-white border-t border-slate-200 z-30">
                                {editingMessageId && (
                                    <div className="flex items-center justify-between bg-amber-50 px-4 py-2 mb-2 rounded-lg border-l-4 border-amber-400 animate-fade-in">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                                                <Edit2 className="w-3 h-3" /> Редактирование
                                            </span>
                                            <span className="text-xs text-slate-600 truncate max-w-[200px]">{messages.find(m => m.id === editingMessageId)?.text}</span>
                                        </div>
                                        <button onClick={cancelEdit} className="text-slate-400 hover:text-slate-600 p-1">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                                
                                <form onSubmit={handleSendMessage} className="flex items-end gap-2 bg-slate-50 p-1.5 rounded-[24px] border border-slate-200 focus-within:bg-white focus-within:border-indigo-300 focus-within:shadow-lg focus-within:shadow-indigo-100/50 transition-all duration-300">
                                    <button type="button" className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors flex-shrink-0">
                                        <Paperclip className="w-5 h-5" />
                                    </button>
                                    
                                    <input 
                                        type="text" 
                                        className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-sm text-slate-700 placeholder-slate-400 py-3"
                                        placeholder="Напишите сообщение..."
                                        value={inputMessage}
                                        onChange={(e) => setInputMessage(e.target.value)}
                                        autoComplete="off"
                                    />
                                    
                                    <button type="button" className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-full transition-colors flex-shrink-0">
                                        <Smile className="w-5 h-5" />
                                    </button>
                                    
                                    <button 
                                        type="submit" 
                                        disabled={!inputMessage.trim()}
                                        className={`
                                            p-2 rounded-full transition-all flex-shrink-0 shadow-sm mb-0.5 mr-0.5
                                            ${inputMessage.trim() 
                                                ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105 active:scale-95 shadow-indigo-300' 
                                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                            }
                                            ${editingMessageId ? 'bg-amber-500 hover:bg-amber-600' : ''}
                                        `}
                                    >
                                        {editingMessageId ? <Check className="w-5 h-5" /> : <Send className="w-5 h-5 ml-0.5" />}
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 z-10">
                            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center shadow-inner mb-6">
                                <MessageCircle className="w-12 h-12 text-slate-300" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-700">Выберите чат</h3>
                            <p className="text-sm mt-2 max-w-xs text-center text-slate-500">
                                Выберите диалог из списка слева, чтобы начать общение с клиентами.
                            </p>
                        </div>
                    )}
                </div>

                {/* User Profile Sidebar */}
                {activeChat && showProfile && (
                    <div className="w-80 bg-white border-l border-slate-200 h-full flex flex-col animate-slide-in-right z-40 shadow-xl lg:shadow-none absolute right-0 top-0 bottom-0 lg:relative">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <h3 className="font-bold text-slate-700">Информация</h3>
                            <button onClick={() => setShowProfile(false)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="p-6 flex flex-col items-center border-b border-slate-100">
                            <div className="relative mb-4">
                                <img src={activeChat.avatarUrl} className="w-24 h-24 rounded-full object-cover shadow-lg border-4 border-white" alt="Large Avatar" />
                                {activeChat.platform === 'telegram' && (
                                    <div className="absolute bottom-0 right-0 bg-[#24A1DE] text-white p-1.5 rounded-full border-2 border-white shadow-sm" title="Telegram">
                                        <Send className="w-4 h-4 ml-px mt-px" />
                                    </div>
                                )}
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 text-center">{activeChat.contactName}</h2>
                            <p className="text-sm text-emerald-600 font-medium mt-1">в сети</p>
                        </div>

                        <div className="p-4 flex-1 overflow-y-auto space-y-6">
                            {/* Username / Phone */}
                            {activeChat.contactPhone && (
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 text-slate-400">
                                        {activeChat.contactPhone.startsWith('@') ? <AtSign className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-900">{activeChat.contactPhone}</p>
                                        <p className="text-xs text-slate-400">
                                            {activeChat.contactPhone.startsWith('@') ? 'Username' : 'Телефон'}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Simulated Phone for Telegram if username is used as ID */}
                            {activeChat.platform === 'telegram' && activeChat.contactPhone?.startsWith('@') && (
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 text-slate-400">
                                        <Phone className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-900 italic opacity-50">Скрыт настройками</p>
                                        <p className="text-xs text-slate-400">Телефон</p>
                                    </div>
                                </div>
                            )}

                            {/* Bio / About */}
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 text-slate-400">
                                    <Info className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-900">Интересуется моделью VOGE DS900X. Бюджет до 1.5 млн.</p>
                                    <p className="text-xs text-slate-400">О себе (Bio)</p>
                                </div>
                            </div>

                            {/* ID */}
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 text-slate-400">
                                    <Shield className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-mono text-slate-600 bg-slate-100 px-1.5 rounded w-fit">{activeChat.id}</p>
                                    <p className="text-xs text-slate-400">User ID</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

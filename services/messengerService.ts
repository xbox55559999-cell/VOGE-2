
import { ChatSession, ChatMessage } from '../types';
import { loadFromDB, saveToDB } from './storage';

const CHATS_KEY = 'MESSENGER_CHATS';
const MESSAGES_KEY = 'MESSENGER_MESSAGES';

// Initial Data - Empty to remove demo bots
const MOCK_CHATS: ChatSession[] = [];
const MOCK_MESSAGES: ChatMessage[] = [];

let lastUpdateId = 0;

export const messengerService = {
    getChats: async (): Promise<ChatSession[]> => {
        const chats = await loadFromDB(CHATS_KEY);
        // If DB is empty, initialize with empty array (no demo bots)
        if (!chats) {
            await saveToDB(CHATS_KEY, []);
            return [];
        }
        return chats.sort((a: ChatSession, b: ChatSession) => b.lastMessageTime - a.lastMessageTime);
    },

    getMessages: async (chatId: string): Promise<ChatMessage[]> => {
        const allMessages = await loadFromDB(MESSAGES_KEY) || [];
        return allMessages.filter((m: ChatMessage) => m.chatId === chatId).sort((a: ChatMessage, b: ChatMessage) => a.timestamp - b.timestamp);
    },

    sendMessage: async (chatId: string, text: string) => {
        const allMessages = (await loadFromDB(MESSAGES_KEY)) || [];
        const chats = (await loadFromDB(CHATS_KEY)) || [];

        const newMessage: ChatMessage = {
            id: Date.now().toString(),
            chatId,
            text,
            isOutbound: true,
            timestamp: Date.now(),
            isRead: true
        };

        const updatedMessages = [...allMessages, newMessage];
        await saveToDB(MESSAGES_KEY, updatedMessages);

        // Update Chat Session
        const chatIndex = chats.findIndex((c: ChatSession) => c.id === chatId);
        if (chatIndex >= 0) {
            chats[chatIndex].lastMessageText = text;
            chats[chatIndex].lastMessageTime = Date.now();
            await saveToDB(CHATS_KEY, chats);
        }

        return newMessage;
    },

    deleteMessage: async (chatId: string, messageId: string) => {
        const allMessages = (await loadFromDB(MESSAGES_KEY)) || [];
        const updatedMessages = allMessages.filter((m: ChatMessage) => m.id !== messageId);
        await saveToDB(MESSAGES_KEY, updatedMessages);

        // Update last message in chat session if needed
        const chats = (await loadFromDB(CHATS_KEY)) || [];
        const chatIndex = chats.findIndex((c: ChatSession) => c.id === chatId);
        if (chatIndex >= 0) {
            // Find the new last message for this chat
            const lastMsg = updatedMessages.filter((m: ChatMessage) => m.chatId === chatId)
                                           .sort((a: ChatMessage, b: ChatMessage) => b.timestamp - a.timestamp)[0];
            
            if (lastMsg) {
                chats[chatIndex].lastMessageText = lastMsg.text;
                chats[chatIndex].lastMessageTime = lastMsg.timestamp;
            } else {
                chats[chatIndex].lastMessageText = '';
            }
            await saveToDB(CHATS_KEY, chats);
        }
    },

    editMessage: async (messageId: string, newText: string) => {
        const allMessages = (await loadFromDB(MESSAGES_KEY)) || [];
        const msgIndex = allMessages.findIndex((m: ChatMessage) => m.id === messageId);
        
        if (msgIndex >= 0) {
            allMessages[msgIndex].text = newText;
            allMessages[msgIndex].isEdited = true;
            await saveToDB(MESSAGES_KEY, allMessages);
            
            // Note: We might need to update the chat session if this was the last message, 
            // but for simplicity assuming UI refresh handles it via getChats sorting mostly by time. 
            // Correct implementation would check if it's the last message and update chat preview text.
            const chatId = allMessages[msgIndex].chatId;
            const chats = (await loadFromDB(CHATS_KEY)) || [];
            const chatIndex = chats.findIndex((c: ChatSession) => c.id === chatId);
            
            // Simple check: is this roughly the last message?
            if (chatIndex >= 0 && chats[chatIndex].lastMessageTime === allMessages[msgIndex].timestamp) {
                 chats[chatIndex].lastMessageText = newText;
                 await saveToDB(CHATS_KEY, chats);
            }
        }
    },

    markAsRead: async (chatId: string) => {
        const chats = (await loadFromDB(CHATS_KEY)) || [];
        const chatIndex = chats.findIndex((c: ChatSession) => c.id === chatId);
        
        if (chatIndex >= 0 && chats[chatIndex].unreadCount > 0) {
            chats[chatIndex].unreadCount = 0;
            await saveToDB(CHATS_KEY, chats);
            return true; // Indicates update happened
        }
        return false;
    },

    // Process real updates from Telegram API
    processTelegramUpdates: async (updates: any[]) => {
        if (!updates || updates.length === 0) return 0;

        let currentChats = (await loadFromDB(CHATS_KEY)) || [];
        let currentMessages = (await loadFromDB(MESSAGES_KEY)) || [];
        
        let processedCount = 0;

        for (const update of updates) {
            if (update.update_id <= lastUpdateId) continue;
            lastUpdateId = update.update_id;

            const msg = update.message;
            if (!msg || !msg.text) continue; // Only text messages for now

            const chatId = String(msg.chat.id);
            const text = msg.text;
            const fromName = msg.from.first_name + (msg.from.last_name ? ' ' + msg.from.last_name : '');
            const username = msg.from.username ? `@${msg.from.username}` : '';
            
            // 1. Find or Create Chat
            let chatIndex = currentChats.findIndex((c: ChatSession) => c.id === chatId);
            
            if (chatIndex === -1) {
                const newChat: ChatSession = {
                    id: chatId,
                    platform: 'telegram',
                    contactName: fromName || `User ${chatId}`,
                    contactPhone: username,
                    lastMessageText: text,
                    lastMessageTime: Date.now(),
                    unreadCount: 1,
                    avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${chatId}`
                };
                currentChats.unshift(newChat);
            } else {
                // Update existing
                const chat = currentChats[chatIndex];
                chat.lastMessageText = text;
                chat.lastMessageTime = Date.now();
                chat.unreadCount += 1;
                // Move to top
                currentChats.splice(chatIndex, 1);
                currentChats.unshift(chat);
            }

            // 2. Add Message
            // Deduplicate by ID
            if (!currentMessages.some((m: ChatMessage) => m.id === String(msg.message_id))) {
                const newMessage: ChatMessage = {
                    id: String(msg.message_id),
                    chatId: chatId,
                    text: text,
                    isOutbound: false,
                    timestamp: Date.now(),
                    isRead: false
                };
                currentMessages.push(newMessage);
                processedCount++;
            }
        }

        if (processedCount > 0) {
            await saveToDB(CHATS_KEY, currentChats);
            await saveToDB(MESSAGES_KEY, currentMessages);
        }

        return lastUpdateId;
    },

    getLastUpdateId: () => lastUpdateId,

    // Mocking an incoming message for demo purposes (Fallback)
    simulateIncomingMessage: async () => {
        const chats = (await loadFromDB(CHATS_KEY)) || [];
        const allMessages = (await loadFromDB(MESSAGES_KEY)) || [];

        // Always create new chat if empty to show functionality in demo
        // Or pick random existing
        let chatId;
        let chatName;

        if (chats.length === 0 || Math.random() > 0.7) {
            chatId = Date.now().toString();
            chatName = `Клиент ${Math.floor(Math.random() * 1000)}`;
            chats.unshift({
                id: chatId,
                platform: 'telegram',
                contactName: chatName,
                contactPhone: `@user${Math.floor(Math.random() * 1000)}`,
                lastMessageText: '',
                lastMessageTime: Date.now(),
                unreadCount: 0,
                avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${chatId}`
            });
        } else {
            const target = chats[0];
            chatId = target.id;
            chatName = target.contactName;
        }

        const phrases = [
            "Подскажите цену на SR4 Max?",
            "Есть ли в наличии черный цвет?",
            "Можно ли оформить кредит?",
            "Где находится ваш салон?",
            "Спасибо, жду информацию."
        ];
        const text = phrases[Math.floor(Math.random() * phrases.length)];

        const newMessage: ChatMessage = {
            id: Date.now().toString(),
            chatId,
            text,
            isOutbound: false,
            timestamp: Date.now(),
            isRead: false
        };

        // Update Messages
        const updatedMessages = [...allMessages, newMessage];
        await saveToDB(MESSAGES_KEY, updatedMessages);

        // Update Chat Session
        const chatIndex = chats.findIndex((c: ChatSession) => c.id === chatId);
        if (chatIndex >= 0) {
            chats[chatIndex].lastMessageText = text;
            chats[chatIndex].lastMessageTime = Date.now();
            chats[chatIndex].unreadCount += 1;
            // Move to top
            const chat = chats.splice(chatIndex, 1)[0];
            chats.unshift(chat);
            await saveToDB(CHATS_KEY, chats);
        }

        return { chatName, text, chatId };
    },

    getTotalUnread: async () => {
        const chats = (await loadFromDB(CHATS_KEY)) || [];
        return chats.reduce((sum: number, c: ChatSession) => sum + (c.unreadCount || 0), 0);
    }
};

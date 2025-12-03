
export const verifyBotToken = async (token: string) => {
    try {
        const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
        const data = await response.json();
        if (data.ok) {
            return data.result;
        }
        throw new Error('Invalid token');
    } catch (e) {
        throw e;
    }
};

export const sendTelegramMessage = async (token: string, chatId: string, text: string) => {
    try {
        const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'HTML' })
        });
        const data = await response.json();
        return data.ok;
    } catch (e) {
        console.error("Telegram Send Error:", e);
        return false;
    }
};

export const getTelegramUpdates = async (token: string, offset?: number) => {
    try {
        const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=${offset || 0}&limit=10&timeout=0`);
        const data = await response.json();
        if (data.ok) {
            return data.result;
        }
        return [];
    } catch (e) {
        console.error("Telegram GetUpdates Error:", e);
        return [];
    }
};

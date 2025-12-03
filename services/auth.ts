
import { User, UserRole } from '../types';

const USERS_STORAGE_KEY = 'moto_crm_users';
const SESSION_STORAGE_KEY = 'moto_crm_session';

// Initial Seed Data
const DEFAULT_ADMIN: User = {
    id: '1',
    email: 'xbox55559999@gmail.com',
    name: 'Главный Администратор',
    role: 'admin',
    password: '987654321', // In a real app, this would be hashed
    isActive: true
};

const DEFAULT_ANALYST: User = {
    id: '2',
    email: 'analyst@moto.pro',
    name: 'Старший Аналитик',
    role: 'analyst',
    password: 'password',
    isActive: true
};

const DEFAULT_USER: User = {
    id: '3',
    email: 'manager@moto.pro',
    name: 'Менеджер продаж',
    role: 'user',
    password: 'password',
    isActive: true
};

const initializeUsers = (): User[] => {
    const stored = localStorage.getItem(USERS_STORAGE_KEY);
    if (stored) {
        return JSON.parse(stored);
    }
    const initialUsers = [DEFAULT_ADMIN, DEFAULT_ANALYST, DEFAULT_USER];
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(initialUsers));
    return initialUsers;
};

export const authService = {
    getUsers: (): User[] => {
        return initializeUsers();
    },

    saveUser: (user: User) => {
        const users = authService.getUsers();
        const index = users.findIndex(u => u.id === user.id);
        
        if (index >= 0) {
            users[index] = { ...users[index], ...user };
        } else {
            users.push(user);
        }
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    },

    deleteUser: (id: string) => {
        const users = authService.getUsers();
        const filtered = users.filter(u => u.id !== id);
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(filtered));
    },

    login: (email: string, password: string): User | null => {
        const users = authService.getUsers();
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
        
        if (user && user.isActive) {
            // Update last login
            user.lastLogin = new Date();
            authService.saveUser(user);
            
            // Create session (omit password)
            const sessionUser = { ...user };
            delete sessionUser.password;
            localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionUser));
            return sessionUser;
        }
        return null;
    },

    logout: () => {
        localStorage.removeItem(SESSION_STORAGE_KEY);
    },

    getCurrentUser: (): User | null => {
        const stored = localStorage.getItem(SESSION_STORAGE_KEY);
        return stored ? JSON.parse(stored) : null;
    },

    // RBAC Logic
    canAccessTab: (role: UserRole, tabId: string): boolean => {
        if (role === 'admin') return true;

        const permissions: Record<UserRole, string[]> = {
            'admin': [], // All access
            'analyst': ['dashboard', 'models', 'inventory', 'inventory-map', 'analytics', 'comparison', 'recommendations', 'map'],
            'user': ['dashboard', 'dealers', 'models', 'inventory', 'map']
        };

        return permissions[role]?.includes(tabId) || false;
    },

    canUploadData: (role: UserRole): boolean => {
        return role === 'admin' || role === 'analyst';
    }
};

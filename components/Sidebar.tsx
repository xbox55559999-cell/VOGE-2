
import React from 'react';
import { LayoutDashboard, BarChart3, Users, Package, Settings, PieChart, GitCompare, Box, Sparkles, Map, MapPin, UserCircle, LogOut, Shield, ShoppingBag } from 'lucide-react';
import { User, UserRole } from '../types';
import { authService } from '../services/auth';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: User | null;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, currentUser, onLogout }) => {
  const role = currentUser?.role || 'user';

  // Base Menu
  const allMenuItems = [
    { id: 'dashboard', label: 'Обзор', icon: LayoutDashboard, roles: ['admin', 'analyst', 'user'] },
    // New Sales Hub replaces individual tabs for Dealers, Models, Map
    { id: 'sales', label: 'Продажи', icon: ShoppingBag, roles: ['admin', 'user', 'analyst'] },
    
    { id: 'inventory', label: 'Остатки дилеров', icon: Box, roles: ['admin', 'analyst', 'user'] },
    { id: 'inventory-map', label: 'Остатки на карте', icon: MapPin, roles: ['admin', 'analyst'] },
    { id: 'analytics', label: 'Глубокая аналитика', icon: BarChart3, roles: ['admin', 'analyst'] },
    { id: 'comparison', label: 'Сравнение периодов', icon: GitCompare, roles: ['admin', 'analyst'] },
    { id: 'recommendations', label: 'AI Рекомендации', icon: Sparkles, roles: ['admin', 'analyst'] },
    { id: 'users', label: 'Пользователи (CRM)', icon: Shield, roles: ['admin'] },
  ];

  const menuItems = allMenuItems.filter(item => item.roles.includes(role));

  return (
    <aside className="w-64 bg-white border-r border-slate-200 h-screen fixed left-0 top-0 z-10 hidden md:flex flex-col">
      <div className="p-6 border-b border-slate-100">
        <h1 className="text-2xl font-bold text-indigo-600 flex items-center gap-2">
            <PieChart className="w-8 h-8" />
            MotoData
        </h1>
        <div className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg">
            <div className={`w-2 h-2 rounded-full ${role === 'admin' ? 'bg-purple-500' : role === 'analyst' ? 'bg-blue-500' : 'bg-slate-500'}`}></div>
            <span className="text-xs font-medium text-slate-500 uppercase">{role === 'admin' ? 'Администратор' : role === 'analyst' ? 'Аналитик' : 'Менеджер'}</span>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-indigo-50 text-indigo-600 shadow-sm' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3 px-2 mb-4">
            <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                <UserCircle className="w-6 h-6" />
            </div>
            <div className="overflow-hidden">
                <p className="text-sm font-bold text-slate-900 truncate">{currentUser?.name}</p>
                <p className="text-xs text-slate-500 truncate">{currentUser?.email}</p>
            </div>
        </div>
        <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all border border-transparent hover:border-rose-100"
        >
            <LogOut className="w-4 h-4" />
            Выйти
        </button>
      </div>
    </aside>
  );
};

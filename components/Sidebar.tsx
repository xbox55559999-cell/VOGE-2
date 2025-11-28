import React from 'react';
import { LayoutDashboard, BarChart3, Users, Package, Settings, PieChart, GitCompare, Box } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Обзор', icon: LayoutDashboard },
    { id: 'dealers', label: 'Дилеры', icon: Users },
    { id: 'models', label: 'Модели', icon: Package },
    { id: 'inventory', label: 'Остатки дилеров', icon: Box },
    { id: 'analytics', label: 'Глубокая аналитика', icon: BarChart3 },
    { id: 'comparison', label: 'Сравнение периодов', icon: GitCompare },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 h-screen fixed left-0 top-0 z-10 hidden md:flex flex-col">
      <div className="p-6 border-b border-slate-100">
        <h1 className="text-2xl font-bold text-indigo-600 flex items-center gap-2">
            <PieChart className="w-8 h-8" />
            MotoData
        </h1>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
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

      <div className="p-4 border-t border-slate-100">
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all">
            <Settings className="w-5 h-5 text-slate-400" />
            Настройки
        </button>
      </div>
    </aside>
  );
};
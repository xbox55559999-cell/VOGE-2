
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { authService } from '../services/auth';
import { Users, UserPlus, Edit2, Trash2, Shield, ShieldAlert, User as UserIcon, Check, X, Search } from 'lucide-react';

export const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<Partial<User>>({});
    const [mode, setMode] = useState<'add' | 'edit'>('add');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = () => {
        setUsers(authService.getUsers());
    };

    const handleAdd = () => {
        setMode('add');
        setCurrentUser({
            role: 'user',
            isActive: true
        });
        setIsModalOpen(true);
    };

    const handleEdit = (user: User) => {
        setMode('edit');
        setCurrentUser({ ...user, password: '' }); // Don't show password
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Вы уверены, что хотите удалить этого пользователя?')) {
            authService.deleteUser(id);
            loadUsers();
        }
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!currentUser.email || !currentUser.name) return;

        const userData: User = {
            id: currentUser.id || Date.now().toString(),
            email: currentUser.email,
            name: currentUser.name,
            role: currentUser.role as UserRole,
            isActive: currentUser.isActive ?? true,
            // If editing and password is empty, keep old password (handled in service in real app, here we assume provided)
            // For simple mock: if add mode, pass required. If edit mode and pass empty, we need logic to keep old.
            // Simplified:
            password: currentUser.password || (mode === 'edit' ? (users.find(u => u.id === currentUser.id)?.password) : '123456'),
        };

        authService.saveUser(userData);
        setIsModalOpen(false);
        loadUsers();
    };

    const getRoleBadge = (role: UserRole) => {
        switch (role) {
            case 'admin':
                return <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"><ShieldAlert className="w-3 h-3" /> Админ</span>;
            case 'analyst':
                return <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><Shield className="w-3 h-3" /> Аналитик</span>;
            default:
                return <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600"><UserIcon className="w-3 h-3" /> Пользователь</span>;
        }
    };

    const filteredUsers = users.filter(u => 
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900">Пользователи</h2>
                    <p className="text-slate-500 mt-1">Управление доступом и сотрудниками</p>
                </div>
                <button 
                    onClick={handleAdd}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200 font-medium"
                >
                    <UserPlus className="w-4 h-4" />
                    Добавить сотрудника
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                    <Search className="w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Поиск по имени или email..." 
                        className="bg-transparent border-none text-sm focus:ring-0 w-full placeholder-slate-400"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-white text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4">Сотрудник</th>
                                <th className="px-6 py-4">Роль</th>
                                <th className="px-6 py-4">Статус</th>
                                <th className="px-6 py-4">Последний вход</th>
                                <th className="px-6 py-4 text-right">Действия</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                                                {user.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900">{user.name}</p>
                                                <p className="text-xs text-slate-400">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {getRoleBadge(user.role)}
                                    </td>
                                    <td className="px-6 py-4">
                                        {user.isActive ? (
                                            <span className="flex items-center gap-1.5 text-emerald-600 text-xs font-medium">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Активен
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div> Заблокирован
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-slate-400 text-xs">
                                        {user.lastLogin ? new Date(user.lastLogin).toLocaleString('ru-RU') : 'Никогда'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button 
                                                onClick={() => handleEdit(user)}
                                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                title="Редактировать"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            {user.id !== '1' && ( // Prevent deleting main admin
                                                <button 
                                                    onClick={() => handleDelete(user.id)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                    title="Удалить"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in-up">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-900">{mode === 'add' ? 'Новый сотрудник' : 'Редактирование'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">ФИО</label>
                                <input 
                                    type="text" 
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                                    value={currentUser.name || ''}
                                    onChange={e => setCurrentUser({...currentUser, name: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                <input 
                                    type="email" 
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                                    value={currentUser.email || ''}
                                    onChange={e => setCurrentUser({...currentUser, email: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Пароль {mode === 'edit' && <span className="text-slate-400 font-normal">(оставьте пустым чтобы не менять)</span>}
                                </label>
                                <input 
                                    type="text" 
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm font-mono"
                                    value={currentUser.password || ''}
                                    onChange={e => setCurrentUser({...currentUser, password: e.target.value})}
                                    placeholder={mode === 'add' ? 'Придумайте пароль' : 'Новый пароль'}
                                    required={mode === 'add'}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Роль</label>
                                    <select 
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm bg-white"
                                        value={currentUser.role}
                                        onChange={e => setCurrentUser({...currentUser, role: e.target.value as UserRole})}
                                    >
                                        <option value="user">Пользователь</option>
                                        <option value="analyst">Аналитик</option>
                                        <option value="admin">Администратор</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Статус</label>
                                    <select 
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm bg-white"
                                        value={currentUser.isActive ? 'true' : 'false'}
                                        onChange={e => setCurrentUser({...currentUser, isActive: e.target.value === 'true'})}
                                    >
                                        <option value="true">Активен</option>
                                        <option value="false">Заблокирован</option>
                                    </select>
                                </div>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button 
                                    type="button" 
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 font-medium transition-colors"
                                >
                                    Отмена
                                </button>
                                <button 
                                    type="submit" 
                                    className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium transition-colors shadow-md shadow-indigo-200"
                                >
                                    Сохранить
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

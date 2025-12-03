
import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

interface FilterDropdownProps {
  label: string;
  icon?: React.ElementType;
  options: (string | number)[];
  value: string | number | string[]; // Single value ('all' or value) or Array of strings
  onChange: (value: any) => void;
  mode?: 'single' | 'multi';
  searchable?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export const FilterDropdown: React.FC<FilterDropdownProps> = ({
  label,
  icon: Icon,
  options,
  value,
  onChange,
  mode = 'single',
  searchable = false,
  disabled = false,
  placeholder = 'Поиск...'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    String(opt).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isSelected = (option: string | number) => {
    if (mode === 'single') {
      return value === option;
    }
    return Array.isArray(value) && value.includes(String(option));
  };

  const handleSelect = (option: string | number) => {
    if (mode === 'single') {
      onChange(option);
      setIsOpen(false);
      setSearchQuery('');
    } else {
      // Multi mode
      const strOption = String(option);
      const currentArray = Array.isArray(value) ? value : [];
      if (currentArray.includes(strOption)) {
        onChange(currentArray.filter(item => item !== strOption));
      } else {
        onChange([...currentArray, strOption]);
      }
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (mode === 'single') {
        onChange('all');
    } else {
        onChange([]);
    }
    // Don't close for multi-select clear inside dropdown, but close for single
    if (mode === 'single') setIsOpen(false);
  };

  const handleSelectAll = () => {
    if (searchQuery) {
       const visibleOptions = filteredOptions.map(String);
       const currentArray = Array.isArray(value) ? value : [];
       const newSet = new Set([...currentArray, ...visibleOptions]);
       onChange(Array.from(newSet));
    } else {
       onChange(options.map(String));
    }
  };

  const handleClearMulti = () => {
    onChange([]);
  };

  const hasSelection = mode === 'single' ? value !== 'all' : (value as string[]).length > 0;
  const selectionCount = mode === 'multi' ? (value as string[]).length : 0;

  // Display Text Logic
  const getDisplayText = () => {
    if (mode === 'single') {
        if (value === 'all') return label;
        return value;
    } else {
        if (selectionCount === 0) return label;
        if (selectionCount === options.length && options.length > 0) return `Все ${label.toLowerCase()}`;
        if (selectionCount === 1) return (value as string[])[0];
        return label;
    }
  };

  return (
    <div className="relative min-w-[160px] md:min-w-[180px]" ref={containerRef}>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
            w-full pl-3 pr-2 py-2.5 text-left bg-white border rounded-xl text-sm font-medium transition-all duration-200 outline-none
            flex items-center gap-2 relative shadow-sm group
            ${disabled 
                ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed' 
                : isOpen 
                    ? 'border-indigo-500 ring-2 ring-indigo-500/20 z-20' 
                    : 'border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-slate-50'
            }
        `}
      >
        {Icon && <Icon className={`w-4 h-4 flex-shrink-0 ${hasSelection || isOpen ? 'text-indigo-600' : 'text-slate-400'}`} />}
        
        <div className="flex-1 flex items-center gap-2 overflow-hidden">
            <span className={`truncate ${hasSelection ? 'text-slate-900' : 'text-slate-500'}`}>{getDisplayText()}</span>
            {selectionCount > 1 && (
                <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">
                    {selectionCount}
                </span>
            )}
        </div>

        <div className="flex items-center gap-1">
            {hasSelection && !disabled && (
                <div 
                    role="button"
                    onClick={handleClear}
                    className="p-0.5 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                    title="Очистить"
                >
                    <X className="w-3.5 h-3.5" />
                </div>
            )}
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full min-w-[260px] bg-white border border-slate-200 rounded-xl shadow-xl z-50 animate-fade-in overflow-hidden flex flex-col max-h-[400px]">
           
           {/* Search Input */}
           {searchable && (
             <div className="p-2 border-b border-slate-100 bg-slate-50 sticky top-0 z-10">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder={placeholder}
                        className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
             </div>
           )}

           {/* Multi-select Actions */}
           {mode === 'multi' && (
             <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50/50">
                <button 
                    onClick={handleSelectAll}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline transition-colors"
                >
                    Выбрать все
                </button>
                <button 
                    onClick={handleClearMulti}
                    className="text-xs font-medium text-slate-500 hover:text-rose-600 hover:underline transition-colors"
                >
                    Сбросить
                </button>
             </div>
           )}

           {/* Options List */}
           <div className="overflow-y-auto p-1.5 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent max-h-[250px]">
              {/* "All" Option for Single Mode */}
              {mode === 'single' && (
                  <>
                    <div 
                        onClick={() => { onChange('all'); setIsOpen(false); }}
                        className={`
                            flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer text-sm transition-colors mb-1
                            ${!hasSelection 
                                ? 'bg-indigo-50 text-indigo-700 font-medium' 
                                : 'hover:bg-slate-50 text-slate-700'
                            }
                        `}
                    >
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${!hasSelection ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 bg-white'}`}>
                            {!hasSelection && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </div>
                        <span>Все</span>
                    </div>
                    <div className="border-b border-slate-100 my-1 mx-2"></div>
                  </>
              )}

              {filteredOptions.length > 0 ? (
                  filteredOptions.map((opt) => {
                    const active = isSelected(opt);
                    return (
                        <div 
                            key={opt}
                            onClick={() => handleSelect(opt)}
                            className={`
                                flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm transition-colors
                                ${active 
                                    ? 'bg-indigo-50 text-indigo-700 font-medium' 
                                    : 'hover:bg-slate-50 text-slate-700'
                                }
                            `}
                        >
                            {/* Custom Checkbox/Radio Visual */}
                            <div className={`
                                w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-colors
                                ${mode === 'multi' ? 'rounded' : 'rounded-full'}
                                ${active ? 'border-indigo-600 bg-indigo-600 border' : 'border-slate-300 bg-white border group-hover:border-indigo-300'}
                            `}>
                                {active && <Check className="w-3 h-3 text-white" />}
                            </div>
                            
                            <span className="truncate flex-1">{opt}</span>
                        </div>
                    );
                  })
              ) : (
                  <div className="px-3 py-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                      <Search className="w-6 h-6 opacity-20" />
                      <span>Ничего не найдено</span>
                  </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
};


import React, { useEffect, useRef, useMemo, useState } from 'react';
import L from 'leaflet';
import { SaleRecord } from '../types';
import { formatCurrency, formatNumber, getCityCoordinates } from '../services/dataProcessor';
import { MapPin, Box, Wallet, X, Award, Layers, ChevronDown, ChevronRight, Tag } from 'lucide-react';

interface InventoryMapProps {
  records: SaleRecord[];
  salesRecords?: SaleRecord[]; 
}

interface DealerInventoryGeo {
    name: string;
    city: string;
    lat: number;
    lng: number;
    stats: {
        units: number;
        stockValue: number;
    };
    brands: string[];
    models: { 
        name: string; 
        count: number; 
        offers: { name: string; count: number }[] 
    }[];
}

export const InventoryMap: React.FC<InventoryMapProps> = ({ records }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  
  const [selectedDealer, setSelectedDealer] = useState<DealerInventoryGeo | null>(null);
  const [expandedModel, setExpandedModel] = useState<string | null>(null);

  // 1. Calculate stats and assign coordinates
  const dealerData = useMemo(() => {
    const dealerMap = new Map<string, {
        geo: Omit<DealerInventoryGeo, 'models' | 'brands'>;
        tempBrands: Set<string>;
        tempModels: Map<string, { count: number; offers: Map<string, number> }>;
    }>();

    records.forEach(r => {
        if (!dealerMap.has(r.dealerName)) {
            let lat = 55.75; 
            let lng = 37.62;
            
            // Use city based lookup
            const cityCoords = getCityCoordinates(r.city);
            if (cityCoords) {
                // Jitter
                const hash = (r.dealerName || 'unknown').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                const angle = (hash % 360) * (Math.PI / 180);
                const jitter = 0.02 + (hash % 10) * 0.005; 
                lat = cityCoords.lat + jitter * Math.cos(angle);
                lng = cityCoords.lng + jitter * Math.sin(angle);
            } else {
                 // Fallback
                const hash = (r.dealerName || 'unknown').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                const angle = (hash % 360) * (Math.PI / 180);
                const dist = 0.5 + (hash % 50) * 0.05; 
                lat = 55.75 + dist * Math.cos(angle);
                lng = 37.62 + dist * Math.sin(angle);
            }

            dealerMap.set(r.dealerName, {
                geo: {
                    name: r.dealerName,
                    city: r.city,
                    lat,
                    lng,
                    stats: { units: 0, stockValue: 0 },
                },
                tempBrands: new Set(),
                tempModels: new Map()
            });
        }

        const entry = dealerMap.get(r.dealerName)!;
        
        // Stats
        entry.geo.stats.units += 1;
        entry.geo.stats.stockValue += r.buyPrice;

        // Details
        entry.tempBrands.add(r.brand);

        if (!entry.tempModels.has(r.modelName)) {
            entry.tempModels.set(r.modelName, { count: 0, offers: new Map() });
        }
        const modelStats = entry.tempModels.get(r.modelName)!;
        modelStats.count += 1;
        
        const currentOfferCount = modelStats.offers.get(r.offerName) || 0;
        modelStats.offers.set(r.offerName, currentOfferCount + 1);
    });

    return Array.from(dealerMap.values()).map(entry => {
        const brands = Array.from(entry.tempBrands).sort();
        const models = Array.from(entry.tempModels.entries())
            .map(([name, stats]) => ({
                name,
                count: stats.count,
                offers: Array.from(stats.offers.entries())
                    .map(([oName, oCount]) => ({ name: oName, count: oCount }))
                    .sort((a, b) => b.count - a.count)
            }))
            .sort((a, b) => b.count - a.count);

        return {
            ...entry.geo,
            brands,
            models
        };
    });
  }, [records]);

  // 2. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
        mapInstanceRef.current = L.map(mapContainerRef.current, { attributionControl: false }).setView([55.75, 37.62], 5);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(mapInstanceRef.current);
        setTimeout(() => { mapInstanceRef.current?.invalidateSize(); }, 100);
    }

    return () => {
        if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
        }
    };
  }, []);

  // 3. Update Markers
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const createIcon = (count: number) => {
        const baseSize = 32;
        const scale = Math.min(1.5, 1 + Math.log10((count || 0) + 1) * 0.2);
        const size = baseSize * scale;

        return L.divIcon({
            className: 'custom-inv-icon',
            html: `
                <div class="relative group">
                    <div class="absolute -inset-2 bg-emerald-500/30 rounded-full blur opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div class="
                        flex items-center justify-center 
                        bg-emerald-600 text-white font-bold text-xs shadow-lg 
                        rounded-full border-2 border-white 
                        transform group-hover:scale-110 transition-transform cursor-pointer
                    " style="width: ${size}px; height: ${size}px;">
                        ${count}
                    </div>
                </div>
            `,
            iconSize: [size, size],
            iconAnchor: [size/2, size/2]
        });
    };

    const bounds = L.latLngBounds([]);
    let hasValidPoints = false;

    dealerData.forEach(dealer => {
        if (!Number.isFinite(dealer.lat) || !Number.isFinite(dealer.lng)) return;

        const marker = L.marker([dealer.lat, dealer.lng], {
            icon: createIcon(dealer.stats.units)
        }).addTo(map);

        marker.on('click', () => {
            setSelectedDealer(dealer);
            setExpandedModel(null);
            map.flyTo([dealer.lat, dealer.lng], 10, { duration: 1.5 });
        });

        markersRef.current.push(marker);
        bounds.extend([dealer.lat, dealer.lng]);
        hasValidPoints = true;
    });

    if (hasValidPoints && markersRef.current.length > 0) {
        map.invalidateSize();
        if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
        }
    }

  }, [dealerData]);

  const toggleModel = (modelName: string) => {
      setExpandedModel(prev => prev === modelName ? null : modelName);
  };

  return (
    <div className="animate-fade-in relative h-[calc(100vh-8rem)] rounded-3xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
        <div ref={mapContainerRef} className="absolute inset-0 z-0" />
        
        <div className="absolute top-4 left-4 z-[400] bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-slate-100 max-w-xs">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Box className="w-5 h-5 text-emerald-600" />
                Остатки на карте
            </h3>
            <p className="text-xs text-slate-500 mt-1">
                Цифра на маркере показывает количество техники в наличии.
            </p>
        </div>

        {selectedDealer && (
            <div className="absolute top-4 right-4 z-[400] w-full max-w-sm animate-fade-in-up">
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[calc(100vh-10rem)]">
                    <div className="p-5 border-b border-slate-100 flex justify-between items-start bg-emerald-50/50">
                        <div>
                            <h3 className="font-bold text-slate-900 pr-4">{selectedDealer.name}</h3>
                            <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {selectedDealer.city}
                            </p>
                        </div>
                        <button 
                            onClick={() => setSelectedDealer(null)}
                            className="p-1 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-slate-600"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    
                    <div className="p-5 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
                        <div className="space-y-4 mb-6">
                            <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-100">
                                <div className="p-2 bg-emerald-100 rounded-lg">
                                    <Box className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-semibold">В наличии</p>
                                    <p className="text-2xl font-bold text-slate-900">{formatNumber(selectedDealer.stats.units)} <span className="text-sm font-normal text-slate-400">шт</span></p>
                                </div>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                                <div className="flex items-center gap-2 mb-2 text-slate-500">
                                    <Wallet className="w-4 h-4" />
                                    <span className="text-xs uppercase font-semibold">Стоимость склада</span>
                                </div>
                                <p className="text-lg font-bold text-emerald-700">{formatCurrency(selectedDealer.stats.stockValue)}</p>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-slate-100">
                            {selectedDealer.brands.length > 0 && (
                                <div>
                                    <p className="text-xs text-slate-400 uppercase font-bold mb-2 flex items-center gap-1">
                                        <Award className="w-3 h-3" /> Марки
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedDealer.brands.map(b => (
                                            <span key={b} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-md border border-slate-200">
                                                {b}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedDealer.models.length > 0 && (
                                <div>
                                    <p className="text-xs text-slate-400 uppercase font-bold mb-2 flex items-center gap-1">
                                        <Box className="w-3 h-3" /> В наличии (Модели)
                                    </p>
                                    <div className="space-y-2">
                                        {selectedDealer.models.slice(0, 5).map(m => {
                                            const isExpanded = expandedModel === m.name;
                                            return (
                                                <div key={m.name} className="flex flex-col bg-slate-50 rounded-lg overflow-hidden border border-slate-100 transition-colors">
                                                    <div 
                                                        className={`flex justify-between items-center text-sm p-2 cursor-pointer hover:bg-slate-100 ${isExpanded ? 'bg-slate-100' : ''}`}
                                                        onClick={() => toggleModel(m.name)}
                                                    >
                                                        <div className="flex items-center flex-1 truncate pr-2 gap-1.5">
                                                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-indigo-600" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                                                            <span className="text-slate-700 font-medium truncate">{m.name}</span>
                                                        </div>
                                                        <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded-md text-xs border border-slate-200">
                                                            {m.count} шт
                                                        </span>
                                                    </div>
                                                    
                                                    {/* Offers Dropdown */}
                                                    {isExpanded && (
                                                        <div className="bg-white border-t border-slate-100 px-3 py-2 space-y-1.5 animate-fade-in">
                                                            {m.offers.map(offer => (
                                                                <div key={offer.name} className="flex justify-between items-center text-xs">
                                                                    <div className="flex items-center gap-1.5 text-slate-600 truncate pr-2">
                                                                        <Tag className="w-3 h-3 text-slate-300" />
                                                                        <span className="truncate">{offer.name}</span>
                                                                    </div>
                                                                    <span className="font-medium text-slate-800 bg-slate-50 px-1.5 py-0.5 rounded">
                                                                        {offer.count}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

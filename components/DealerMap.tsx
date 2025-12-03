
import React, { useEffect, useRef, useMemo, useState } from 'react';
import L from 'leaflet';
import { SaleRecord } from '../types';
import { formatCurrency, formatNumber, getCityCoordinates } from '../services/dataProcessor';
import { MapPin, ShoppingCart, Wallet, TrendingUp, X, Award, Box, Layers } from 'lucide-react';

interface DealerMapProps {
  records: SaleRecord[];
  onDealerSelect?: (dealerName: string) => void;
}

interface DealerGeo {
    name: string;
    city: string;
    lat: number;
    lng: number;
    stats: {
        units: number;
        revenue: number;
        margin: number;
    };
    brands: string[];
    models: { name: string; count: number; offersCount: number }[];
}

export const DealerMap: React.FC<DealerMapProps> = ({ records, onDealerSelect }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [selectedDealer, setSelectedDealer] = useState<DealerGeo | null>(null);

  // 1. Calculate stats and assign coordinates
  const dealerData = useMemo(() => {
    // Intermediate storage to aggregate details
    const dealerMap = new Map<string, {
        geo: DealerGeo;
        tempBrands: Set<string>;
        tempModels: Map<string, { count: number; offers: Set<string> }>;
    }>();

    records.forEach(r => {
        if (!dealerMap.has(r.dealerName)) {
            let lat = 55.75; // Default Moscow center
            let lng = 37.62;
            
            // Try to find city coordinates based on record's city
            const cityCoords = getCityCoordinates(r.city);
            
            if (cityCoords) {
                // Add small jitter so dealers in same city don't overlap perfectly
                const hash = (r.dealerName || 'unknown').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                const angle = (hash % 360) * (Math.PI / 180);
                const jitter = 0.02 + (hash % 10) * 0.005; // ~2-3km variance
                
                lat = cityCoords.lat + jitter * Math.cos(angle);
                lng = cityCoords.lng + jitter * Math.sin(angle);
            } else {
                // Fallback to random scatter near Moscow if city unknown
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
                    stats: { units: 0, revenue: 0, margin: 0 },
                    brands: [],
                    models: []
                },
                tempBrands: new Set(),
                tempModels: new Map()
            });
        }

        const entry = dealerMap.get(r.dealerName)!;
        
        // Stats
        entry.geo.stats.units += 1;
        entry.geo.stats.revenue += r.soldPrice;
        entry.geo.stats.margin += r.margin;

        // Details
        entry.tempBrands.add(r.brand);
        
        if (!entry.tempModels.has(r.modelName)) {
            entry.tempModels.set(r.modelName, { count: 0, offers: new Set() });
        }
        const modelStats = entry.tempModels.get(r.modelName)!;
        modelStats.count += 1;
        modelStats.offers.add(r.offerName);
    });

    // Convert map to array and finalize structure
    return Array.from(dealerMap.values()).map(entry => {
        const brands = Array.from(entry.tempBrands).sort();
        const models = Array.from(entry.tempModels.entries())
            .map(([name, stats]) => ({
                name,
                count: stats.count,
                offersCount: stats.offers.size
            }))
            .sort((a, b) => b.count - a.count); // Sort models by volume

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

        // Using standard OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(mapInstanceRef.current);

        setTimeout(() => {
            mapInstanceRef.current?.invalidateSize();
        }, 100);
    }

    // Cleanup
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
    
    // Clear existing
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Create custom icon
    const createIcon = (val: number) => {
        const safeVal = Math.max(val || 0, 1);
        const size = Math.max(30, Math.min(60, Math.log(safeVal) * 2));
        
        return L.divIcon({
            className: 'custom-div-icon',
            html: `
                <div class="relative group">
                    <div class="absolute -inset-2 bg-indigo-500/20 rounded-full blur opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div class="w-8 h-8 md:w-10 md:h-10 bg-indigo-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center transform group-hover:scale-110 transition-transform cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                    </div>
                </div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });
    };

    const bounds = L.latLngBounds([]);
    let hasValidPoints = false;

    dealerData.forEach(dealer => {
        if (!Number.isFinite(dealer.lat) || !Number.isFinite(dealer.lng)) return;

        const marker = L.marker([dealer.lat, dealer.lng], {
            icon: createIcon(dealer.stats.revenue)
        }).addTo(map);

        marker.on('click', () => {
            setSelectedDealer(dealer);
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

  return (
    <div className="animate-fade-in relative h-[calc(100vh-8rem)] rounded-3xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
        <div ref={mapContainerRef} className="absolute inset-0 z-0" />
        
        <div className="absolute top-4 left-4 z-[400] bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-slate-100 max-w-xs">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-indigo-600" />
                Карта дилеров
            </h3>
            <p className="text-xs text-slate-500 mt-1">
                Показаны {dealerData.length} точек продаж. Нажмите на маркер для деталей.
            </p>
        </div>

        {selectedDealer && (
            <div className="absolute top-4 right-4 z-[400] w-full max-w-sm animate-fade-in-up">
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[calc(100vh-10rem)]">
                    <div className="p-5 border-b border-slate-100 flex justify-between items-start bg-indigo-50/50">
                        <div>
                            <h3 className="font-bold text-slate-900 pr-4">{selectedDealer.name}</h3>
                            <p className="text-xs text-indigo-600 font-medium mt-1 flex items-center gap-1">
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
                                <div className="p-2 bg-indigo-100 rounded-lg">
                                    <Wallet className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-semibold">Выручка</p>
                                    <p className="text-lg font-bold text-slate-900">{formatCurrency(selectedDealer.stats.revenue)}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                                    <div className="flex items-center gap-2 mb-2 text-slate-500">
                                        <ShoppingCart className="w-4 h-4" />
                                        <span className="text-xs uppercase font-semibold">Продажи</span>
                                    </div>
                                    <p className="text-lg font-bold text-slate-900">{formatNumber(selectedDealer.stats.units)} <span className="text-xs font-normal text-slate-400">шт</span></p>
                                </div>
                                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                                    <div className="flex items-center gap-2 mb-2 text-emerald-600">
                                        <TrendingUp className="w-4 h-4" />
                                        <span className="text-xs uppercase font-semibold">Маржа</span>
                                    </div>
                                    <p className="text-lg font-bold text-emerald-700">{formatCurrency(selectedDealer.stats.margin)}</p>
                                </div>
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
                                        <Box className="w-3 h-3" /> Топ модели
                                    </p>
                                    <div className="space-y-2">
                                        {selectedDealer.models.slice(0, 5).map(m => (
                                            <div key={m.name} className="flex justify-between items-center text-sm">
                                                <div className="flex-1 truncate pr-2">
                                                    <span className="text-slate-700 font-medium">{m.name}</span>
                                                    {m.offersCount > 1 && (
                                                        <span className="ml-1.5 inline-flex items-center text-[10px] text-slate-400 bg-slate-50 px-1 rounded border border-slate-100" title="Вариантов комплектаций">
                                                            <Layers className="w-2.5 h-2.5 mr-0.5" />
                                                            {m.offersCount}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="font-bold text-slate-900 bg-indigo-50 px-2 py-0.5 rounded-md text-xs">
                                                    {m.count} шт
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {onDealerSelect && (
                            <button 
                                onClick={() => onDealerSelect(selectedDealer.name)}
                                className="w-full mt-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-indigo-200"
                            >
                                Перейти к дилеру
                            </button>
                        )}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

"use client";

import { MapContainer, TileLayer, Rectangle, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import L from "leaflet";
import { Droplets } from "lucide-react";

// Fix leaflet icon issue in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface Zone {
    id: string;
    name: string;
    type: string;
    moisture: number;
    status: "optimal" | "dry" | "over-watered";
    bounds: [[number, number], [number, number]];
}

interface MapComponentProps {
    zones: Zone[];
    activeAnomaly: string | null;
    onZoneClick: (zoneId: string) => void;
    isIrrigating: number;
}

const getZoneColor = (status: Zone["status"]) => {
    switch (status) {
        case "dry": return "#fb923c"; // orange-400
        case "optimal": return "#4ade80"; // green-400
        case "over-watered": return "#3b82f6"; // blue-500
    }
};

const getFillColor = (status: Zone["status"], isActive: boolean) => {
    if (isActive) return "#ef4444"; // red-500
    switch (status) {
        case "dry": return "#ffedd5"; // orange-100
        case "optimal": return "#dcfce7"; // green-100
        case "over-watered": return "#dbeafe"; // blue-100
    }
};

export default function MapComponent({ zones, activeAnomaly, onZoneClick, isIrrigating }: MapComponentProps) {
    // Center map around the farm bounds
    const center: [number, number] = [30.155, -9.4255]; // Chtouka Ait Baha, Agadir region

    return (
        <div className="w-full h-[500px] md:h-[600px] z-0 relative isolate rounded-xl overflow-hidden border border-green-200">
            <MapContainer
                center={center}
                zoom={15}
                style={{ width: "100%", height: "100%", zIndex: 0 }}
                scrollWheelZoom={false}
                dragging={false}
                doubleClickZoom={false}
                zoomControl={false}
                touchZoom={false}
                keyboard={false}
            >
                {/* Google Maps Satellite tile layer */}
                <TileLayer
                    url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                    maxZoom={20}
                    attribution="&copy; Google Maps"
                />

                {zones.map((zone) => {
                    const isActive = activeAnomaly === zone.id;
                    return (
                        <Rectangle
                            key={zone.id}
                            bounds={zone.bounds}
                            pathOptions={{
                                color: isActive ? "#ef4444" : getZoneColor(zone.status),
                                weight: isActive ? 4 : 2,
                                fillColor: getFillColor(zone.status, isActive),
                                fillOpacity: isActive ? 0.7 : 0.4,
                                dashArray: isActive ? "10, 10" : undefined,
                                className: isActive ? "animate-pulse" : "",
                            }}
                            eventHandlers={{
                                click: () => onZoneClick(zone.id),
                            }}
                        >
                            <Popup className="rounded-xl overflow-hidden shadow-xl border-0">
                                <div className="text-center p-1 min-w-[120px]">
                                    <p className="font-bold text-gray-900 m-0">{zone.name}</p>
                                    <p className="text-xs text-gray-500 m-0 mt-1 mb-2">{zone.type}</p>
                                    <div className="flex items-center justify-center gap-1 font-mono text-sm bg-gray-50 rounded-md py-1 border border-gray-100">
                                        <span className={`font-bold ${zone.status === "dry" ? "text-orange-600" :
                                            zone.status === "over-watered" ? "text-blue-600" : "text-green-600"
                                            }`}>
                                            {zone.moisture.toFixed(1)}%
                                        </span>
                                    </div>
                                    {isActive && (
                                        <div className="mt-2 text-xs font-bold text-red-600 bg-red-50 py-1 rounded-md animate-pulse">
                                            Anomaly Detected!
                                        </div>
                                    )}
                                </div>
                            </Popup>
                        </Rectangle>
                    );
                })}
            </MapContainer>
        </div>
    );
}

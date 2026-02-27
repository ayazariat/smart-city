// Geolocation service for Tunisia
// Uses Nominatim API for reverse geocoding

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationData {
  governorate: string;
  municipality: string;
  latitude: number;
  longitude: number;
}

import { TUNISIA_GEOGRAPHY } from "../data/tunisia-geography";

// Tunisia governorates list for validation
const TUNISIA_GOVERNORATES = [
  "Ariana", "Béja", "Ben Arous", "Bizerte", "Gabès", "Gafsa", 
  "Jendouba", "Kairouan", "Kasserine", "Kébili", "Le Kef", "Mahdia", 
  "Manouba", "Médenine", "Monastir", "Nabeul", "Sfax", "Sidi Bouzid", 
  "Siliana", "Sousse", "Tataouine", "Tozeur", "Tunis", "Zaghouan"
];

// Get user's current location using browser Geolocation API
export function getCurrentLocation(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error("Location permission denied. Please enable location access."));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new Error("Location information unavailable."));
            break;
          case error.TIMEOUT:
            reject(new Error("Location request timed out."));
            break;
          default:
            reject(new Error("An unknown error occurred."));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes cache
      }
    );
  });
}

// Get location with reverse geocoding using Nominatim API
export async function getLocationWithDetails(): Promise<LocationData | null> {
  try {
    const coords = await getCurrentLocation();
    
    // Use Nominatim for reverse geocoding
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json&addressdetails=1&accept-language=fr`,
      {
        headers: {
          'User-Agent': 'SmartCityTunisia/1.0',
          'Accept': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      console.error("Nominatim API error:", response.status, response.statusText);
      // Return location with coordinates even if geocoding fails
      return {
        governorate: "",
        municipality: "",
        latitude: coords.latitude,
        longitude: coords.longitude,
      };
    }
    
    const data = await response.json();
    const address = data.address || {};
    
    // Extract municipality/commune
    const municipality = 
      address.municipality || 
      address.village || 
      address.town || 
      address.city || 
      address.county || 
      address.suburb || 
      "";
    
    // Extract governorate - handle Nominatim's French format
    let governorate = "";
    
    // Try to get state/region which in Tunisia is the governorate
    const stateOrRegion = address.state || address.region || address.county || "";
    
    if (stateOrRegion) {
      // Handle French format like "Gouvernorat de Nabeul"
      const frenchMatch = stateOrRegion.match(/Gouvernorat de (.+)/i);
      if (frenchMatch) {
        governorate = frenchMatch[1].trim();
      } else {
        governorate = stateOrRegion;
      }
      
      // Try to match with Tunisia governorates
      const matched = TUNISIA_GOVERNORATES.find(g => 
        g.toLowerCase() === governorate.toLowerCase() ||
        governorate.toLowerCase().includes(g.toLowerCase()) ||
        g.toLowerCase().includes(governorate.toLowerCase())
      );
      
      if (matched) {
        governorate = matched;
      }
    }
    
    // If no governorate found, try to determine from municipality
    if (!governorate && municipality) {
      // Best-effort guess based on our geography dataset
      // We'll import the full mapping from tunisia-geography.ts
      for (const g of TUNISIA_GEOGRAPHY) {
        const matches = g.municipalities.map(m => m.toLowerCase());
        if (matches.includes(municipality.toLowerCase())) {
          governorate = g.governorate;
          break;
        }
      }
    }
    
    return {
      governorate,
      municipality,
      latitude: coords.latitude,
      longitude: coords.longitude,
    };
  } catch (error) {
    console.error("Failed to get location:", error);
    return null;
  }
}

// Check if coordinates are within Tunisia bounds
export function isWithinTunisia(latitude: number, longitude: number): boolean {
  // Approximate bounding box for Tunisia
  return (
    latitude >= 30.2 &&
    latitude <= 37.5 &&
    longitude >= 7.5 &&
    longitude <= 12
  );
}

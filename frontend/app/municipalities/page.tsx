'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import {
  MapPin,
  Building,
  BarChart3,
  CheckCircle2,
  Clock,
  Target,
  ArrowRight,
  Map as MapIcon,
  Layers,
  Search,
  Filter,
  Grid3X3,
  List,
  Image as ImageIcon,
  X,
  Eye,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useTranslation } from 'react-i18next';

// Dynamic import for the mini map (no SSR for Leaflet)
const MunicipalityMiniMap = dynamic(
  () => import('@/components/dashboard/MunicipalityMiniMap'),
  {
    ssr: false,
    loading: () => (
      <div className="h-[300px] bg-slate-50 rounded-xl flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    ),
  }
);

interface MunicipalityData {
  name: string;
  governorate: string;
  description?: string;
  phone?: string;
  email?: string;
  photoUrl?: string;
  coordinates?: {
    latitude: number | null;
    longitude: number | null;
  };
  total: number;
  resolved: number;
  resolutionRate: number;
  code?: string;
}

interface ComplaintSummary {
  _id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  createdAt: string;
  municipalityName?: string;
  governorate?: string;
  media?: Array<{ url?: string; type?: string }>;
  location?: any;
  referenceId?: string;
  slaStatus?: string;
}

const MUNICIPALITY_PHOTOS: Record<string, string> = {
  Tunis:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Tunisia_Medina_of_Tunis.jpg/800px-Tunisia_Medina_of_Tunis.jpg',
  Sfax: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Sfax_medina.jpg/800px-Sfax_medina.jpg',
  Sousse:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Ribat_of_Sousse.jpg/800px-Ribat_of_Sousse.jpg',
  Nabeul:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Nabeul_pottery.jpg/800px-Nabeul_pottery.jpg',
  Monastir:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Monastir_Ribat.jpg/800px-Monastir_Ribat.jpg',
  Bizerte:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Bizerte_harbor.jpg/800px-Bizerte_harbor.jpg',
  Kairouan:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Great_Mosque_of_Kairouan.jpg/800px-Great_Mosque_of_Kairouan.jpg',
  Gabès:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Gabes_ochre_city.jpg/800px-Gabes_ochre_city.jpg',
  Médenine:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Djerba_Houmt_Souk.jpg/800px-Djerba_Houmt_Souk.jpg',
  Ariana:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Ariana_Saida.jpg/800px-Ariana_Saida.jpg',
  'Ben Arous':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Ben_Arous_Mornag.jpg/800px-Ben_Arous_Mornag.jpg',
  Manouba:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Manouba_university.jpg/800px-Manouba_university.jpg',
  Béja: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Beja_Casbah.jpg/800px-Beja_Casbah.jpg',
  Gafsa:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Gafsa_oasis.jpg/800px-Gafsa_oasis.jpg',
  Jendouba:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Tabarka_Aerial.jpg/800px-Tabarka_Aerial.jpg',
  Kasserine:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Kasserine_Mountains.jpg/800px-Kasserine_Mountains.jpg',
  Kébili:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Douz_oasis.jpg/800px-Douz_oasis.jpg',
  'Le Kef':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Le_Kef_Casbah.jpg/800px-Le_Kef_Casbah.jpg',
  Mahdia:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Mahdia_Coast.jpg/800px-Mahdia_Coast.jpg',
  'Sidi Bouzid':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Sidi_Bouzid_City.jpg/800px-Sidi_Bouzid_City.jpg',
  Siliana:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Siliana_Forest.jpg/800px-Siliana_Forest.jpg',
  Tataouine:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Tataouine_Ksar.jpg/800px-Tataouine_Ksar.jpg',
  Tozeur:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Tozeur_Palm_Groves.jpg/800px-Tozeur_Palm_Groves.jpg',
  Zaghouan:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Zaghouan_Mountain.jpg/800px-Zaghouan_Mountain.jpg',
};

const GRADIENT_CLASSES: Record<string, string> = {
  Tunis: 'from-blue-900 to-blue-800',
  Sfax: 'from-amber-900 to-amber-800',
  Sousse: 'from-cyan-900 to-cyan-800',
  Nabeul: 'from-orange-900 to-orange-800',
  Monastir: 'from-indigo-900 to-indigo-800',
  Bizerte: 'from-slate-900 to-slate-800',
  Kairouan: 'from-purple-900 to-purple-800',
  Gabès: 'from-yellow-900 to-yellow-800',
  Médenine: 'from-teal-900 to-teal-800',
  Ariana: 'from-green-900 to-green-800',
  'Ben Arous': 'from-lime-900 to-lime-800',
  Manouba: 'from-emerald-900 to-emerald-800',
  Béja: 'from-rose-900 to-rose-800',
  Gafsa: 'from-amber-800 to-orange-900',
  Jendouba: 'from-green-800 to-emerald-900',
  Kasserine: 'from-stone-900 to-stone-800',
  Kébili: 'from-yellow-800 to-amber-900',
  'Le Kef': 'from-zinc-900 to-zinc-800',
  Mahdia: 'from-sky-900 to-sky-800',
  'Sidi Bouzid': 'from-neutral-900 to-neutral-800',
  Siliana: 'from-red-900 to-red-800',
  Tataouine: 'from-orange-800 to-red-900',
  Tozeur: 'from-yellow-700 to-orange-800',
  Zaghouan: 'from-cyan-800 to-blue-900',
};

function MunicipalitiesPageContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hydrated, token } = useAuthStore();
  const [municipalities, setMunicipalities] = useState<MunicipalityData[]>([]);
  const [selectedMunicipality, setSelectedMunicipality] =
    useState<MunicipalityData | null>(null);
  const [municipalityComplaints, setMunicipalityComplaints] = useState<
    ComplaintSummary[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [period, setPeriod] = useState('all');
  const mapRef = useRef<HTMLDivElement>(null);

  // Fetch municipalities
  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

      const [munRes] = await Promise.all([
        fetch(`${apiUrl}/public/municipalities?period=${period}`),
      ]);

      const munData = await munRes.json();
      if (munData.success) {
        // Enhance with photos if missing
        const enhanced = munData.data.map((m: MunicipalityData) => ({
          ...m,
          photoUrl: m.photoUrl || MUNICIPALITY_PHOTOS[m.name] || '',
        }));
        setMunicipalities(enhanced);
      }
    } catch (error) {
      console.error('Failed to fetch municipalities:', error);
      setError('Failed to load municipality data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch complaints for selected municipality
  useEffect(() => {
    if (selectedMunicipality) {
      fetchMunicipalityComplaints(selectedMunicipality.name);
    }
  }, [selectedMunicipality, period]);

  const fetchMunicipalityComplaints = async (name: string) => {
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const res = await fetch(
        `${apiUrl}/public/municipalities/${encodeURIComponent(name)}?period=${period}`
      );
      const data = await res.json();
      if (data.success) {
        setMunicipalityComplaints(data.data.complaints || []);
      }
    } catch (error) {
      console.error('Failed to fetch complaints:', error);
    }
  };

  const scrollToMap = () => {
    if (mapRef.current) {
      mapRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const getPerformanceBadgeClass = (rate: number) => {
    if (rate >= 70) return 'bg-green-100 text-green-700';
    if (rate >= 50) return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  };

  const filteredMunicipalities = municipalities.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.governorate.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/50 sticky top-0 z-50 shadow-sm">
        <div className="w-full max-w-none px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Building className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-800">
                  Municipalities Directory
                </h1>
                <p className="text-xs text-slate-500">
                  24 governorates · Public transparency
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-4 mr-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search municipalities..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-64"
                  />
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                  <Grid3X3 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                <option value="all">All Time</option>
                <option value="year">This Year</option>
                <option value="month">This Month</option>
              </select>
            </div>
          </div>
          {/* Mobile search */}
          <div className="sm:hidden mt-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-none px-4 sm:px-6 py-8">
        {error ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="w-8 h-8 text-red-600" />
            </div>
            <p className="text-red-600 font-medium">{error}</p>
            <button
              onClick={fetchData}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(9)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse"
              >
                <div className="h-32 bg-slate-100 rounded-xl mb-4"></div>
                <div className="h-6 bg-slate-100 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-slate-100 rounded w-1/2 mb-4"></div>
                <div className="flex gap-2">
                  <div className="h-8 bg-slate-100 rounded-lg flex-1"></div>
                  <div className="h-8 bg-slate-100 rounded-lg flex-1"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredMunicipalities.length === 0 ? (
          <div className="text-center py-16">
            <Building className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-800 mb-2">
              No municipalities found
            </h3>
            <p className="text-slate-500">
              Try adjusting your search or filter criteria
            </p>
          </div>
        ) : (
          <>
            {/* Stats Summary */}
            <div className="mb-8">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center gap-4 mb-6">
                  <Building className="w-6 h-6 text-blue-600" />
                  <h2 className="text-xl font-semibold text-slate-800">
                    {filteredMunicipalities.length} Municipalities
                  </h2>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    {municipalities.filter((m) => m.total > 0).length} Active
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-slate-50 rounded-xl">
                    <p className="text-2xl font-bold text-slate-800">
                      {municipalities.reduce((s, m) => s + m.total, 0)}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      Total Complaints
                    </p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-xl">
                    <p className="text-2xl font-bold text-green-700">
                      {municipalities.reduce((s, m) => s + m.resolved, 0)}
                    </p>
                    <p className="text-sm text-green-600 mt-1">Resolved</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-xl">
                    <p className="text-2xl font-bold text-blue-700">
                      {Math.round(
                        (municipalities.reduce((s, m) => s + m.resolved, 0) /
                          Math.max(
                            municipalities.reduce((s, m) => s + m.total, 0),
                            1
                          )) *
                          100
                      )}
                      %
                    </p>
                    <p className="text-sm text-blue-600 mt-1">
                      Avg Resolution Rate
                    </p>
                  </div>
                  <div className="text-center p-4 bg-amber-50 rounded-xl">
                    <p className="text-2xl font-bold text-amber-700">
                      {municipalities.filter((m) => m.total > 0).length}
                    </p>
                    <p className="text-sm text-amber-600 mt-1">Report-Active</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Municipalities Grid/List */}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMunicipalities.map((mun) => {
                  const gradientClass =
                    GRADIENT_CLASSES[mun.name] || 'from-slate-900 to-slate-800';
                  const badgeClass = getPerformanceBadgeClass(
                    mun.resolutionRate
                  );

                  return (
                    <div
                      key={mun.name}
                      className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer"
                      onClick={() => setSelectedMunicipality(mun)}
                    >
                      {/* Photo Header */}
                      <div className="relative h-48 overflow-hidden">
                        {mun.photoUrl ? (
                          <img
                            src={mun.photoUrl}
                            alt={mun.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                'none';
                              (
                                e.target as HTMLImageElement
                              ).parentElement?.classList.add(
                                ...gradientClass.split(' ')
                              );
                            }}
                          />
                        ) : (
                          <div
                            className={`w-full h-full bg-gradient-to-br ${gradientClass}`}
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

                        {/* Location Badge */}
                        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                          <div>
                            <h3 className="text-xl font-bold text-white drop-shadow-lg">
                              {mun.name}
                            </h3>
                            <p className="text-white/80 text-sm">
                              {mun.governorate}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 text-white/90 bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full">
                            <MapPin className="w-4 h-4" />
                            <span className="text-sm font-medium">
                              {mun.total}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-5">
                        {/* Stats Row */}
                        <div className="grid grid-cols-3 gap-3 mb-4">
                          <div className="text-center p-3 bg-slate-50 rounded-xl">
                            <p className="text-lg font-bold text-slate-800">
                              {mun.total}
                            </p>
                            <p className="text-xs text-slate-500">Total</p>
                          </div>
                          <div className="text-center p-3 bg-green-50 rounded-xl">
                            <p className="text-lg font-bold text-green-700">
                              {mun.resolved}
                            </p>
                            <p className="text-xs text-green-600">Resolved</p>
                          </div>
                          <div className="text-center p-3 bg-blue-50 rounded-xl">
                            <p className="text-lg font-bold text-blue-700">
                              {mun.resolutionRate}%
                            </p>
                            <p className="text-xs text-blue-600">Rate</p>
                          </div>
                        </div>

                        {/* Performance Badge */}
                        {mun.total > 0 && (
                          <div className="mb-4">
                            <span
                              className={`px-3 py-1.5 rounded-full text-xs font-medium ${badgeClass}`}
                            >
                              {mun.resolutionRate >= 70
                                ? 'Excellent Performance'
                                : mun.resolutionRate >= 50
                                  ? 'Moderate Performance'
                                  : 'Needs Improvement'}
                              <span className="ml-1">
                                - {mun.resolutionRate}% resolved
                              </span>
                            </span>
                          </div>
                        )}

                        {/* Description */}
                        {mun.description && (
                          <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                            {mun.description}
                          </p>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              scrollToMap();
                              setSelectedMunicipality(mun);
                            }}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                          >
                            <MapIcon className="w-4 h-4" />
                            View Map
                          </button>
                          <Link
                            href={`/transparency/complaints?municipality=${encodeURIComponent(mun.name)}`}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors text-sm font-medium"
                          >
                            <Eye className="w-4 h-4" />
                            View All
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredMunicipalities.map((mun) => {
                  const gradientClass =
                    GRADIENT_CLASSES[mun.name] || 'from-slate-900 to-slate-800';
                  const badgeClass = getPerformanceBadgeClass(
                    mun.resolutionRate
                  );

                  return (
                    <div
                      key={mun.name}
                      className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-all cursor-pointer"
                      onClick={() => setSelectedMunicipality(mun)}
                    >
                      <div className="flex items-start gap-6">
                        {/* Photo */}
                        <div className="w-32 h-32 rounded-xl overflow-hidden flex-shrink-0">
                          {mun.photoUrl ? (
                            <img
                              src={mun.photoUrl}
                              alt={mun.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display =
                                  'none';
                                (
                                  e.target as HTMLImageElement
                                ).parentElement?.classList.add(
                                  ...gradientClass.split(' ')
                                );
                              }}
                            />
                          ) : (
                            <div
                              className={`w-full h-full bg-gradient-to-br ${gradientClass}`}
                            />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="text-xl font-bold text-slate-800">
                                {mun.name}
                              </h3>
                              <p className="text-slate-500">
                                {mun.governorate}
                              </p>
                            </div>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${badgeClass}`}
                            >
                              {mun.resolutionRate}% resolved
                            </span>
                          </div>

                          {mun.total > 0 ? (
                            <div className="flex items-center gap-6 mt-3">
                              <div className="flex items-center gap-2">
                                <span className="text-2xl font-bold text-slate-800">
                                  {mun.total}
                                </span>
                                <span className="text-sm text-slate-500">
                                  total complaints
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-2xl font-bold text-green-600">
                                  {mun.resolved}
                                </span>
                                <span className="text-sm text-green-500">
                                  resolved
                                </span>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-500 mt-2">
                              No complaints on record
                            </p>
                          )}

                          {mun.description && (
                            <p className="text-sm text-slate-600 mt-3 line-clamp-2">
                              {mun.description}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              scrollToMap();
                              setSelectedMunicipality(mun);
                            }}
                            className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                            title="View Map"
                          >
                            <MapIcon className="w-5 h-5" />
                          </button>
                          <Link
                            href={`/transparency/complaints?municipality=${encodeURIComponent(mun.name)}`}
                            className="p-2 bg-slate-50 text-slate-500 rounded-lg hover:bg-slate-100 transition-colors"
                            title="View All Complaints"
                          >
                            <Eye className="w-5 h-5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Map Modal */}
        {selectedMunicipality && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              {/* Header */}
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 p-6 flex items-center justify-between rounded-t-2xl">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {selectedMunicipality.name}
                  </h2>
                  <p className="text-blue-100 text-sm mt-1">
                    {selectedMunicipality.governorate}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedMunicipality(null)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-slate-50 rounded-xl">
                    <p className="text-3xl font-bold text-slate-800">
                      {selectedMunicipality.total}
                    </p>
                    <p className="text-sm text-slate-500">Total Complaints</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-xl">
                    <p className="text-3xl font-bold text-green-700">
                      {selectedMunicipality.resolved}
                    </p>
                    <p className="text-sm text-green-600">Resolved</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-xl">
                    <p className="text-3xl font-bold text-blue-700">
                      {selectedMunicipality.resolutionRate}%
                    </p>
                    <p className="text-sm text-blue-600">Resolution Rate</p>
                  </div>
                </div>

                {/* Interactive Map */}
                <div ref={mapRef} className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                      <MapIcon className="w-5 h-5 text-blue-600" />
                      Complaint Activity Map
                    </h3>
                    <span className="text-sm text-slate-500">
                      {municipalityComplaints.length} complaints shown
                    </span>
                  </div>
                  <MunicipalityMiniMap
                    points={municipalityComplaints
                      .filter((c) => c.location?.coordinates?.length === 2)
                      .map((c) => ({
                        lat: c.location.coordinates[1],
                        lng: c.location.coordinates[0],
                        count: 1,
                        categories: [c.category],
                        status: c.status,
                        title: c.title,
                        referenceId: c.referenceId,
                        createdAt: c.createdAt,
                      }))}
                    municipality={selectedMunicipality.name}
                  />
                </div>

                {/* Recent Complaints */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    Recent Complaints
                  </h3>
                  {municipalityComplaints.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {municipalityComplaints.slice(0, 20).map((complaint) => (
                        <div
                          key={complaint._id}
                          className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                          onClick={() => {
                            router.push(
                              `/transparency/complaints/${complaint._id}`
                            );
                            setSelectedMunicipality(null);
                          }}
                        >
                          <div className="w-16 h-16 bg-slate-200 rounded-lg overflow-hidden flex-shrink-0">
                            {complaint.media?.[0]?.url ? (
                              <img
                                src={complaint.media[0].url}
                                alt={complaint.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display =
                                    'none';
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-slate-100">
                                <ImageIcon className="w-6 h-6 text-slate-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-800 truncate">
                              {complaint.title}
                            </p>
                            <p className="text-sm text-slate-500">
                              {new Date(
                                complaint.createdAt
                              ).toLocaleDateString()}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-1 rounded-lg text-xs font-medium whitespace-nowrap ${
                              complaint.status === 'VALIDATED'
                                ? 'bg-blue-100 text-blue-700'
                                : complaint.status === 'ASSIGNED'
                                  ? 'bg-purple-100 text-purple-700'
                                  : complaint.status === 'IN_PROGRESS'
                                    ? 'bg-orange-100 text-orange-700'
                                    : complaint.status === 'RESOLVED'
                                      ? 'bg-green-100 text-green-700'
                                      : complaint.status === 'CLOSED'
                                        ? 'bg-slate-100 text-slate-700'
                                        : complaint.status === 'SUBMITTED'
                                          ? 'bg-amber-100 text-amber-700'
                                          : complaint.status === 'REJECTED'
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {complaint.status === 'VALIDATED'
                              ? 'Verified'
                              : complaint.status === 'ASSIGNED'
                                ? 'Assigned'
                                : complaint.status === 'IN_PROGRESS'
                                  ? 'In Progress'
                                  : complaint.status === 'RESOLVED'
                                    ? 'Resolved'
                                    : complaint.status === 'CLOSED'
                                      ? 'Closed'
                                      : complaint.status === 'SUBMITTED'
                                        ? 'Submitted'
                                        : complaint.status === 'REJECTED'
                                          ? 'Rejected'
                                          : t(`status.${complaint.status}`)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-slate-50 rounded-xl">
                      <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-500">
                        No complaints recorded for this municipality
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 bg-slate-50 border-t border-slate-200 rounded-b-2xl flex gap-3 justify-end">
                <Link
                  href={
                    '/transparency/complaints?municipality=' +
                    encodeURIComponent(selectedMunicipality.name)
                  }
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
                  onClick={() => setSelectedMunicipality(null)}
                >
                  View All Complaints
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => setSelectedMunicipality(null)}
                  className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function MunicipalitiesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MunicipalitiesPageContent />
    </Suspense>
  );
}

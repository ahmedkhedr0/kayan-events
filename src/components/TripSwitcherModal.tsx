import React, { useState, useEffect } from 'react';
import {
  X,
  Compass,
  Plus,
  CheckCircle2,
  Clock,
  Archive,
  Bus,
  Users,
  BadgeDollarSign,
  Landmark,
  Trash2,
  Edit,
  Sparkles,
  MapPin,
  Calendar,
  Layers,
  Send,
  HelpCircle,
  TrendingUp,
  Phone,
  FolderArchive,
  Check,
} from 'lucide-react';
import { Trip, TripStatus, TripSettings, TripAddon, AddonType, ActiveUserSession } from '../types';

interface TripSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  trips: Trip[];
  activeTripId: string;
  userSession?: ActiveUserSession;
  onSelectTrip: (tripId: string) => void;
  onCreateNewTrip: (newTripData: {
    tripName: string;
    tripDate: string;
    destination: string;
    totalSeats: number;
    ticketPrice: number;
    defaultDeposit?: number;
    companionFullPrice?: number;
    companionBasePrice?: number;
    addons?: TripAddon[];
    whatsappGroupLink?: string;
    assemblyLocation?: string;
    assemblyTime?: string;
    supportPhone?: string;
    driveLink?: string;
  }) => void;
  onUpdateTripStatus: (tripId: string, status: TripStatus) => void;
  onUpdateTripSettings?: (tripId: string, newSettings: TripSettings) => void;
  onDeleteTrip: (tripId: string) => void;
  onOpenTreasuryModal: () => void;
  onOpenWhatsAppReminderForTrip?: (trip: Trip) => void;
}

interface TripPreset {
  id: string;
  title: string;
  badge: string;
  icon: string;
  destination: string;
  suggestedPrice: number;
  suggestedDeposit: number;
  suggestedSeats: number;
  assemblyLocation: string;
  assemblyTime: string;
  addons: TripAddon[];
}

const TRIP_PRESETS: TripPreset[] = [
  {
    id: 'athena-beach',
    title: 'قرية أثينا - رأس سدر',
    badge: '🏖️ شاطئ ومصيف',
    icon: '🏖️',
    destination: 'قرية أثينا - رأس سدر',
    suggestedPrice: 850,
    suggestedDeposit: 500,
    suggestedSeats: 200,
    assemblyLocation: 'ميدان الرماية - أمام البوابة الرئيسية',
    assemblyTime: '06:30 ص',
    addons: [
      { id: 'add-hoodie-1', name: 'هودي الفعالية والبراند المعتمد', price: 350, type: 'apparel', options: ['S', 'M', 'L', 'XL', '2XL', '3XL'], isDefaultSelected: true },
      { id: 'add-meal-1', name: 'وجبة غداء VIP (دجاج مشوي / ميكس)', price: 200, type: 'meal', isDefaultSelected: true },
      { id: 'add-photo-1', name: 'جلسة تصوير وفوتوسيشن شاطئي احترافي', price: 150, type: 'service', isDefaultSelected: false },
    ],
  },
  {
    id: 'dahab-camp',
    title: 'مغامرة دهب والبلوهول',
    badge: '🏝️ سفاري وتخييم',
    icon: '🏝️',
    destination: 'الميريلاند - دهب',
    suggestedPrice: 1650,
    suggestedDeposit: 800,
    suggestedSeats: 150,
    assemblyLocation: 'ميدان عبد المنعم رياض - التحرير',
    assemblyTime: '10:00 م (تحرك ليلي)',
    addons: [
      { id: 'add-hoodie-2', name: 'هودي دهب التذكاري', price: 350, type: 'apparel', options: ['S', 'M', 'L', 'XL', '2XL', '3XL'], isDefaultSelected: true },
      { id: 'add-safari-2', name: 'رحلة سفاري بالبيتش باجي ووادي جني', price: 250, type: 'service', isDefaultSelected: false },
      { id: 'add-meal-2', name: 'عشاء بدوي مفتوح في الجبل', price: 220, type: 'meal', isDefaultSelected: true },
    ],
  },
  {
    id: 'fayoum-safari',
    title: 'وادي الريان - سفاري الفيوم',
    badge: '🏜️ مغامرة وألوان',
    icon: '🏜️',
    destination: 'وادي الريان - الفيوم',
    suggestedPrice: 650,
    suggestedDeposit: 400,
    suggestedSeats: 250,
    assemblyLocation: 'ميدان الرماية - محطة المتحف الكبير',
    assemblyTime: '06:00 ص',
    addons: [
      { id: 'add-tshirt-3', name: 'تيشرت حرب الألوان ومهرجان الفوم', price: 200, type: 'apparel', options: ['S', 'M', 'L', 'XL', '2XL', '3XL'], isDefaultSelected: true },
      { id: 'add-sand-3', name: 'تزحلق على الرمال + فلوكة الشلالات', price: 120, type: 'service', isDefaultSelected: true },
      { id: 'add-meal-3', name: 'وجبة غداء ريفية (فطير وعسل ومشاوي)', price: 180, type: 'meal', isDefaultSelected: true },
    ],
  },
  {
    id: 'grad-funday',
    title: 'Fun Day & حفل تخرج الدفعة',
    badge: '🎓 تخرج واحتفال',
    icon: '🎓',
    destination: 'بورتو السخنة - العين السخنة',
    suggestedPrice: 950,
    suggestedDeposit: 600,
    suggestedSeats: 300,
    assemblyLocation: 'أمام البوابة الرئيسية للجامعة',
    assemblyTime: '07:00 ص',
    addons: [
      { id: 'add-hoodie-4', name: 'هودي التخرج الرسمي مطرز باسم الدفعة', price: 380, type: 'apparel', options: ['S', 'M', 'L', 'XL', '2XL', '3XL'], isDefaultSelected: true },
      { id: 'add-grad-4', name: 'روب التخرج + وشاح مطبوع + درع تذكاري', price: 300, type: 'service', isDefaultSelected: true },
      { id: 'add-meal-4', name: 'وجبة غداء بوفيه مفتوح VIP', price: 250, type: 'meal', isDefaultSelected: true },
      { id: 'add-photo-4', name: 'فيديو دروَن وتصوير فوتوسيشن شخصي', price: 200, type: 'service', isDefaultSelected: false },
    ],
  },
  {
    id: 'nile-cruise',
    title: 'نايل كروز الأقصر وأسوان',
    badge: '🚢 سياحية وفندقية',
    icon: '🚢',
    destination: 'الأقصر وأسوان - نايل كروز',
    suggestedPrice: 3800,
    suggestedDeposit: 1500,
    suggestedSeats: 100,
    assemblyLocation: 'محطة قطار مصر - رمسيس',
    assemblyTime: '08:00 م',
    addons: [
      { id: 'add-balloon-5', name: 'جولة المنطاد الطائر (Hot Air Balloon)', price: 950, type: 'service', isDefaultSelected: false },
      { id: 'add-hoodie-5', name: 'جاكيت الشتاء التذكاري الفاخر', price: 450, type: 'apparel', options: ['S', 'M', 'L', 'XL', '2XL', '3XL'], isDefaultSelected: true },
    ],
  },
];

interface AddonsBuilderProps {
  addons: TripAddon[];
  onChange: (addons: TripAddon[]) => void;
}

const AddonsBuilder: React.FC<AddonsBuilderProps> = ({ addons = [], onChange }) => {
  const [newOptionInputs, setNewOptionInputs] = useState<Record<string, string>>({});

  const handleAddAddon = (type: AddonType) => {
    let newAddon: TripAddon;
    if (type === 'apparel') {
      newAddon = {
        id: 'addon-apparel-' + Date.now(),
        name: 'هودي الفعالية الرسمي',
        price: 350,
        type: 'apparel',
        options: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
        isDefaultSelected: true,
      };
    } else if (type === 'meal') {
      newAddon = {
        id: 'addon-meal-' + Date.now(),
        name: 'وجبة غداء VIP (دجاج / كفتة)',
        price: 200,
        type: 'meal',
        options: ['دجاج مشوي', 'كفتة مشوية', 'ميكس جريل'],
        isDefaultSelected: true,
      };
    } else if (type === 'service') {
      newAddon = {
        id: 'addon-service-' + Date.now(),
        name: 'جلسة تصوير فوتوسيشن وميديا',
        price: 150,
        type: 'service',
        isDefaultSelected: false,
      };
    } else {
      newAddon = {
        id: 'addon-custom-' + Date.now(),
        name: 'خدمة ترفيهية إضافية',
        price: 100,
        type: 'custom_options',
        options: ['خيار 1', 'خيار 2'],
        isDefaultSelected: false,
      };
    }
    onChange([...addons, newAddon]);
  };

  const handleUpdate = (index: number, updates: Partial<TripAddon>) => {
    const next = [...addons];
    next[index] = { ...next[index], ...updates };
    onChange(next);
  };

  const handleDelete = (id: string) => {
    onChange(addons.filter((a) => a.id !== id));
  };

  const handleAddOptionToItem = (addonId: string, index: number, optValue: string) => {
    const val = (optValue || '').trim();
    if (!val) return;
    const currentOptions = addons[index].options || [];
    if (!currentOptions.includes(val)) {
      handleUpdate(index, { options: [...currentOptions, val] });
    }
    setNewOptionInputs((prev) => ({ ...prev, [addonId]: '' }));
  };

  const handleRemoveOptionFromItem = (index: number, optIdx: number) => {
    const currentOptions = addons[index].options || [];
    const next = currentOptions.filter((_, i) => i !== optIdx);
    handleUpdate(index, { options: next });
  };

  const handleApplyPresetOptions = (index: number, presetType: 'standard_sizes' | 'oversize' | 'meal_choices') => {
    if (presetType === 'standard_sizes') {
      handleUpdate(index, { options: ['S', 'M', 'L', 'XL', '2XL', '3XL'] });
    } else if (presetType === 'oversize') {
      handleUpdate(index, { options: ['L', 'XL', '2XL', '3XL', '4XL', 'Oversize'] });
    } else if (presetType === 'meal_choices') {
      handleUpdate(index, { options: ['دجاج مشوي', 'كفتة مشوية', 'ميكس جريل', 'نباتي'] });
    }
  };

  return (
    <div className="space-y-3 pt-2 border-t border-slate-800/80 w-full min-w-0 overflow-hidden">
      {/* Top Action Bar with Quick Add Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 border-b border-slate-800/80 pb-2.5 w-full min-w-0">
        <div className="min-w-0">
          <label className="block text-amber-300 font-bold text-xs flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">قائمة الخدمات والإضافات ({addons.length})</span>
          </label>
          <span className="text-[10px] sm:text-[11px] text-slate-400 block">
            تخصيص نوع الخدمة وسعرها ومقاساتها للمشتركين
          </span>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => handleAddAddon('apparel')}
            className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-[11px] sm:text-xs px-2.5 py-1.5 rounded-xl font-bold transition flex items-center justify-center gap-1 active:scale-95 shadow-sm"
          >
            <span>👕 + هودي/ملابس</span>
          </button>
          <button
            type="button"
            onClick={() => handleAddAddon('meal')}
            className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] sm:text-xs px-2.5 py-1.5 rounded-xl font-bold transition flex items-center justify-center gap-1 active:scale-95 shadow-sm"
          >
            <span>🍔 + وجبة طعام</span>
          </button>
          <button
            type="button"
            onClick={() => handleAddAddon('service')}
            className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] sm:text-xs px-2.5 py-1.5 rounded-xl font-bold transition flex items-center justify-center gap-1 active:scale-95 shadow-sm"
          >
            <span>📸 + تصوير وميديا</span>
          </button>
          <button
            type="button"
            onClick={() => handleAddAddon('custom_options')}
            className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[11px] sm:text-xs px-2.5 py-1.5 rounded-xl font-bold transition flex items-center justify-center gap-1 active:scale-95 shadow-sm"
          >
            <span>⚡ + خدمة إضافية</span>
          </button>
        </div>
      </div>

      {/* Addons List Container - Responsive Stack */}
      {addons.length === 0 ? (
        <div className="bg-slate-950/70 border border-dashed border-slate-800 rounded-2xl p-4 sm:p-6 text-center text-xs text-slate-400 space-y-1.5">
          <p className="font-semibold text-slate-300">لا توجد خدمات أو إضافات مخصصة لهذه الرحلة حالياً.</p>
          <p className="text-slate-500 text-[10px] sm:text-[11px]">اضغط على أحد الأزرار بالأعلى لإضافة هودي، وجبة، أو فوتوسيشن.</p>
        </div>
      ) : (
        <div className="space-y-3 w-full min-w-0">
          {addons.map((addon, index) => {
            const currentType = addon.type || (addon.name.includes('هودي') || addon.name.includes('تيشرت') ? 'apparel' : addon.name.includes('وجب') || addon.name.includes('غداء') ? 'meal' : 'service');
            const hasOptions = currentType === 'apparel' || currentType === 'meal' || currentType === 'custom_options' || (addon.options && addon.options.length > 0);
            const currentOptionsList = addon.options && addon.options.length > 0
              ? addon.options
              : currentType === 'apparel'
              ? ['S', 'M', 'L', 'XL', '2XL', '3XL']
              : [];

            return (
              <div
                key={addon.id || index}
                className="bg-slate-950/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-3 sm:p-3.5 space-y-2.5 shadow-md transition-all w-full min-w-0 overflow-hidden"
              >
                {/* 1. Header: Type Selector + Service Name + Delete */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full min-w-0">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <select
                      value={currentType}
                      onChange={(e) => {
                        const newType = e.target.value as AddonType;
                        handleUpdate(index, {
                          type: newType,
                          options: newType === 'apparel'
                            ? ['S', 'M', 'L', 'XL', '2XL', '3XL']
                            : newType === 'meal'
                            ? ['دجاج مشوي', 'كفتة مشوية', 'ميكس']
                            : addon.options,
                        });
                      }}
                      className="bg-slate-900 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl px-2.5 py-2 focus:outline-none focus:border-amber-500 shrink-0 w-full sm:w-auto"
                    >
                      <option value="apparel">👕 ملابس ومقاسات</option>
                      <option value="meal">🍔 وجبة طعام</option>
                      <option value="service">📸 فوتوسيشن وميديا</option>
                      <option value="custom_options">⚡ خدمة ترفيهية</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => handleDelete(addon.id)}
                      className="p-2 text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl transition shrink-0 sm:hidden"
                      title="حذف الخدمة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <input
                    type="text"
                    value={addon.name}
                    onChange={(e) => handleUpdate(index, { name: e.target.value })}
                    className="flex-1 bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-amber-500 shadow-inner min-w-0 w-full"
                    placeholder="اسم الخدمة (مثال: هودي الفعالية، وجبة VIP)"
                    required
                  />

                  <button
                    type="button"
                    onClick={() => handleDelete(addon.id)}
                    className="p-2 text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl transition shrink-0 hidden sm:block"
                    title="حذف الخدمة"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* 2. Middle Row: Price & Default Selection */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1 border-t border-slate-900/80 text-xs w-full min-w-0">
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                    <label className="text-slate-400 font-bold text-xs shrink-0">
                      💰 السعر الإضافي:
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        min={0}
                        value={addon.price}
                        onChange={(e) => handleUpdate(index, { price: Number(e.target.value) })}
                        className="w-24 bg-slate-900 border border-slate-800 text-amber-300 font-mono font-bold rounded-xl px-2.5 py-1.5 text-xs text-center focus:outline-none focus:border-amber-500"
                        required
                      />
                      <span className="text-[11px] text-slate-400 font-bold mr-1.5">ج.م</span>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer bg-slate-900/80 hover:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 transition w-full sm:w-auto">
                    <input
                      type="checkbox"
                      checked={addon.isDefaultSelected || false}
                      onChange={(e) => handleUpdate(index, { isDefaultSelected: e.target.checked })}
                      className="w-4 h-4 accent-amber-500 rounded shrink-0"
                    />
                    <span className="text-[11px] sm:text-xs text-slate-300 font-medium">تحديد افتراضي للمشترك الجديد</span>
                  </label>
                </div>

                {/* 3. Options / Sizes Tag Management */}
                {hasOptions && (
                  <div className="bg-slate-900/60 p-2.5 sm:p-3 rounded-xl border border-slate-800/80 space-y-2 w-full min-w-0 overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]">
                      <span className="text-amber-400 font-bold flex items-center gap-1.5">
                        <span>🏷️</span>
                        <span>
                          {currentType === 'apparel'
                            ? 'المقاسات المتاحة للملابس:'
                            : currentType === 'meal'
                            ? 'خيارات وأنواع الوجبة:'
                            : 'الخيارات المتاحة لهذه الخدمة:'}
                        </span>
                      </span>

                      {/* Quick Option Presets */}
                      <div className="flex items-center gap-1 text-[10px] flex-wrap">
                        <span className="text-slate-500">قوالب سريعة:</span>
                        {currentType === 'apparel' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApplyPresetOptions(index, 'standard_sizes')}
                              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-purple-300 rounded border border-purple-500/30 transition"
                            >
                              + قياسي (S-3XL)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApplyPresetOptions(index, 'oversize')}
                              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-purple-300 rounded border border-purple-500/30 transition"
                            >
                              + أوفر سايز (Oversize)
                            </button>
                          </>
                        )}
                        {currentType === 'meal' && (
                          <button
                            type="button"
                            onClick={() => handleApplyPresetOptions(index, 'meal_choices')}
                            className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded border border-amber-500/30 transition"
                          >
                            + (فراخ/لحمة/ميكس/نباتي)
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Chips Display */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {currentOptionsList.map((opt, optIdx) => (
                        <span
                          key={optIdx}
                          className="bg-slate-950 border border-amber-500/30 text-amber-300 text-xs px-2.5 py-1 rounded-lg font-mono font-bold flex items-center gap-1.5 shadow-sm"
                        >
                          <span>{opt}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveOptionFromItem(index, optIdx)}
                            className="text-slate-500 hover:text-rose-400 text-xs font-black transition"
                            title="حذف هذا الخيار"
                          >
                            ✕
                          </button>
                        </span>
                      ))}

                      {/* Add Custom Option Input */}
                      <div className="flex items-center gap-1 w-full sm:w-auto mt-1 sm:mt-0">
                        <input
                          type="text"
                          value={newOptionInputs[addon.id] || ''}
                          onChange={(e) =>
                            setNewOptionInputs({ ...newOptionInputs, [addon.id]: e.target.value })
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddOptionToItem(addon.id, index, newOptionInputs[addon.id]);
                            }
                          }}
                          placeholder={currentType === 'apparel' ? 'أضف مقاس (4XL)' : 'أضف خيار (دجاج)'}
                          className="bg-slate-950 border border-slate-800 text-white rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-amber-500 flex-1 sm:w-32 min-w-0"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddOptionToItem(addon.id, index, newOptionInputs[addon.id])}
                          className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs px-2.5 py-1 rounded-lg font-bold transition shrink-0"
                        >
                          + إضافة
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const TripSwitcherModal: React.FC<TripSwitcherModalProps> = ({
  isOpen,
  onClose,
  trips,
  activeTripId,
  userSession,
  onSelectTrip,
  onCreateNewTrip,
  onUpdateTripStatus,
  onUpdateTripSettings,
  onDeleteTrip,
  onOpenTreasuryModal,
  onOpenWhatsAppReminderForTrip,
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [editTripForm, setEditTripForm] = useState<TripSettings | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  // Role and permissions checks
  const isAdmin = !userSession || userSession.role === 'admin';
  const canViewFinancials = userSession?.permissions?.canViewFinancials ?? isAdmin;
  const canAccessTreasury = userSession?.permissions?.canAccessTreasury ?? isAdmin;
  const canEditSettings = userSession?.permissions?.canEditSettings ?? isAdmin;

  // Granular trip restriction check
  const isRestrictedStaff = Boolean(
    userSession &&
      userSession.role !== 'admin' &&
      userSession.allowedTripIds &&
      userSession.allowedTripIds.length > 0
  );

  const displayedTrips = isRestrictedStaff
    ? trips.filter((t) => userSession!.allowedTripIds!.includes(t.id))
    : trips;

  // Fallback to all trips if filter somehow yielded empty
  const activeTripsList = displayedTrips.length > 0 ? displayedTrips : trips;

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingTrip) {
          setEditingTrip(null);
          setEditTripForm(null);
        } else if (isOpen) {
          onClose();
        }
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, editingTrip, onClose]);

  // Form State for New Trip
  const [newTripForm, setNewTripForm] = useState({
    tripName: '',
    tripDate: new Date(Date.now() + 86400000 * 14).toISOString().slice(0, 10),
    destination: 'قرية أثينا - رأس سدر',
    totalSeats: 200,
    ticketPrice: 850,
    defaultDeposit: 500,
    companionFullPrice: 850,
    companionBasePrice: 850,
    assemblyLocation: 'ميدان الرماية - أمام البوابة الرئيسية',
    assemblyTime: '06:30 ص',
    supportPhone: '01012345678 / 01198765432',
    driveLink: 'https://drive.google.com/drive/folders/kayan-events',
    whatsappGroupLink: 'https://chat.whatsapp.com/kayan-events',
    addons: [
      { id: 'addon-apparel-1', name: 'هودي الفعالية', price: 350, type: 'apparel' as AddonType, options: ['S', 'M', 'L', 'XL', '2XL', '3XL'], isDefaultSelected: true },
      { id: 'addon-meal-1', name: 'وجبة غداء VIP (دجاج / كفتة)', price: 200, type: 'meal' as AddonType, isDefaultSelected: true },
      { id: 'addon-service-1', name: 'جلسة تصوير وفوتوسيشن احترافي', price: 150, type: 'service' as AddonType, isDefaultSelected: false },
    ],
  });

  if (!isOpen) return null;

  const applyPreset = (preset: TripPreset) => {
    setSelectedPresetId(preset.id);
    setNewTripForm({
      ...newTripForm,
      tripName: `رحلة: ${preset.title} - الفوج الجديد`,
      destination: preset.destination,
      ticketPrice: preset.suggestedPrice,
      defaultDeposit: preset.suggestedDeposit,
      totalSeats: preset.suggestedSeats,
      companionFullPrice: preset.suggestedPrice,
      companionBasePrice: preset.suggestedPrice,
      assemblyLocation: preset.assemblyLocation,
      assemblyTime: preset.assemblyTime,
      addons: preset.addons.map((a) => ({ ...a, id: `preset-${Date.now()}-${Math.random().toString(36).substr(2, 4)}` })),
    });
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTripForm.tripName.trim()) {
      alert('برجاء كتابة اسم الرحلة الرسمي');
      return;
    }

    onCreateNewTrip(newTripForm);
    setActiveTab('list');
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrip || !editTripForm || !onUpdateTripSettings) return;

    onUpdateTripSettings(editingTrip.id, editTripForm);
    setEditingTrip(null);
    setEditTripForm(null);
  };

  // Financial Estimation Widget Data
  const estimatedTicketRevenue = (newTripForm.totalSeats || 0) * (newTripForm.ticketPrice || 0);
  const defaultAddonsTotal = (newTripForm.addons || [])
    .filter((a) => a.isDefaultSelected)
    .reduce((sum, a) => sum + (a.price || 0), 0);
  const estimatedAddonRevenue = (newTripForm.totalSeats || 0) * defaultAddonsTotal;
  const totalEstimatedRevenue = estimatedTicketRevenue + estimatedAddonRevenue;

  const getStatusBadge = (status: TripStatus) => {
    switch (status) {
      case 'active':
        return (
          <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> جارية وقيد الحجز
          </span>
        );
      case 'completed':
        return (
          <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" /> مكتملة ومُقفلة
          </span>
        );
      case 'planning':
        return (
          <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 shadow-sm">
            <Clock className="w-3.5 h-3.5 text-amber-400" /> قيد التجهيز والتخطيط
          </span>
        );
      case 'archived':
        return (
          <span className="bg-slate-800 text-slate-400 border border-slate-700 text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 shadow-sm">
            <Archive className="w-3.5 h-3.5" /> مؤرشفة
          </span>
        );
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col justify-start sm:justify-center items-center p-2 sm:p-4 md:p-6 overflow-y-auto"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92dvh] sm:max-h-[90vh] shrink-0">
        {/* Modal Header - Pinned at top */}
        <div className="bg-slate-950 p-3.5 sm:p-5 border-b border-slate-800 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-amber-400/10 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner shrink-0">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm sm:text-lg font-black text-white flex items-center gap-2">
                <span>إدارة وتبديل الرحلات</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-md font-mono border border-amber-500/30">
                  {activeTripsList.length} رحلات
                </span>
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400">
                {isRestrictedStaff
                  ? `مخصص لك الوصول لـ (${activeTripsList.length}) رحلات مصرح بها فقط لحسابك`
                  : 'أنشئ رحلات جديدة مستقلة بقوالب ذكية، وحاسبة إيرادات، وتوليد إضافات تلقائي'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition active:scale-95 cursor-pointer"
            title="إغلاق النافذة (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Restricted Staff Warning Banner */}
        {isRestrictedStaff && (
          <div className="bg-amber-950/50 border-b border-amber-500/30 px-4 py-2.5 flex items-center gap-2.5 text-xs text-amber-200">
            <span className="text-base">🔒</span>
            <span>
              <strong>صلاحيات مخصصة:</strong> تم تقييد حسابك للوصول إلى الرحلات المعينة لك فقط ({activeTripsList.map((t) => t.settings.tripName).join(' ، ')}).
            </span>
          </div>
        )}

        {/* Action Tabs Header - Pinned */}
        <div className="bg-slate-950/90 p-2 sm:px-5 border-b border-slate-800 flex justify-between items-center gap-2 shrink-0 flex-wrap w-full min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-1 sm:flex-initial min-w-0">
            <button
              onClick={() => setActiveTab('list')}
              className={`flex-1 sm:flex-initial px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 truncate ${
                activeTab === 'list'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-800'
              }`}
            >
              <Layers className="w-4 h-4 shrink-0" />
              <span className="truncate">كافة الرحلات ({activeTripsList.length})</span>
            </button>

            {isAdmin && !isRestrictedStaff && (
              <button
                onClick={() => setActiveTab('create')}
                className={`flex-1 sm:flex-initial px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 truncate ${
                  activeTab === 'create'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-800'
                }`}
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span className="truncate">✨ إنشاء رحلة</span>
              </button>
            )}
          </div>

          {canAccessTreasury && (
            <button
              onClick={() => {
                onClose();
                onOpenTreasuryModal();
              }}
              className="bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/60 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm shrink-0 w-full sm:w-auto"
            >
              <Landmark className="w-4 h-4 text-amber-400 shrink-0" />
              <span>الخزنة المركزية 🏛️</span>
            </button>
          )}
        </div>

        {/* Modal Body - Scrollable */}
        <div className="p-3 sm:p-5 overflow-y-auto overflow-x-hidden space-y-4 flex-1 custom-scrollbar w-full min-w-0">
          {/* TAB 1: LIST ALL TRIPS */}
          {activeTab === 'list' && (
            <div className="space-y-3">
              {activeTripsList.map((trip) => {
                const isActive = trip.id === activeTripId;
                const studentCount = trip.students.length;
                const collected = trip.students.reduce((sum, s) => sum + s.paidAmount, 0);
                const expenses = trip.expenses.reduce((sum, e) => sum + e.amount, 0);
                const netProfit = collected - expenses;

                return (
                  <div
                    key={trip.id}
                    className={`p-4 rounded-2xl border transition space-y-3 ${
                      isActive
                        ? 'bg-slate-950 border-amber-500 ring-1 ring-amber-500/50 shadow-xl'
                        : 'bg-slate-950/60 border-slate-800 hover:bg-slate-950 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {getStatusBadge(trip.status)}
                        <h4 className="font-bold text-white text-base truncate">{trip.settings.tripName}</h4>
                      </div>

                      {isActive ? (
                        <span className="bg-amber-500 text-slate-950 text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider shrink-0 flex items-center gap-1 shadow-md">
                          <span>⚡ الرحلة النشطة والمعروضة</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            onSelectTrip(trip.id);
                            onClose();
                          }}
                          className="bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 font-bold px-4 py-1.5 rounded-xl text-xs transition active:scale-95 shrink-0 shadow"
                        >
                          عرض وتبديل لهذه الرحلة 🔄
                        </button>
                      )}
                    </div>

                    {/* Metadata Badges */}
                    <div className={`grid gap-2 text-xs font-mono ${canViewFinancials ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'}`}>
                      <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-sans">📅 تاريخ الانطلاق</span>
                        <span className="text-slate-200 font-bold">{trip.settings.tripDate}</span>
                      </div>
                      <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-sans">👥 المشتركين والحجوزات</span>
                        <span className="text-amber-400 font-bold">{studentCount} / {trip.settings.totalSeats} طالب</span>
                      </div>
                      <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-sans">📍 الوجهة والتجمع</span>
                        <span className="text-cyan-400 font-bold truncate block">{trip.settings.destination || 'الوجهة المحددة'}</span>
                      </div>
                      {canViewFinancials && (
                        <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-400 block font-sans">💰 صافي السيولة / الأرباح</span>
                          <span className={`font-bold ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {netProfit.toLocaleString()} ج.م
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Controls */}
                    <div className="flex flex-wrap justify-between items-center gap-2 pt-2 border-t border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">حالة الرحلة:</span>
                        {canEditSettings ? (
                          <select
                            value={trip.status}
                            onChange={(e) => onUpdateTripStatus(trip.id, e.target.value as TripStatus)}
                            className="bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-slate-200 px-2.5 py-1 focus:outline-none focus:border-amber-500"
                          >
                            <option value="active">🟢 جارية وقيد الحجز</option>
                            <option value="completed">✅ مكتملة ومُقفلة</option>
                            <option value="planning">⏳ قيد التجهيز</option>
                            <option value="archived">📦 مؤرشفة</option>
                          </select>
                        ) : (
                          <span className="text-xs font-bold text-slate-300">
                            {trip.status === 'active'
                              ? '🟢 جارية'
                              : trip.status === 'completed'
                              ? '✅ مكتملة'
                              : trip.status === 'planning'
                              ? '⏳ قيد التجهيز'
                              : '📦 مؤرشفة'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {onOpenWhatsAppReminderForTrip && isAdmin && (
                          <button
                            onClick={() => {
                              onOpenWhatsAppReminderForTrip(trip);
                              onClose();
                            }}
                            className="px-2.5 py-1.5 bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/60 rounded-xl text-xs font-bold flex items-center gap-1 transition active:scale-95 shadow-sm"
                            title="إرسال رسائل تذكير موحدة لمشتركي هذه الرحلة عبر Meta WhatsApp API"
                          >
                            <Send className="w-3.5 h-3.5 text-indigo-400" />
                            <span>تذكير الواتساب ({studentCount}) 📢</span>
                          </button>
                        )}

                        {canEditSettings && (
                          <button
                            onClick={() => {
                              setEditingTrip(trip);
                              setEditTripForm({ ...trip.settings });
                            }}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                            title="تعديل بيانات وإعدادات الرحلة"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>تعديل الإعدادات</span>
                          </button>
                        )}

                        {isAdmin && !isRestrictedStaff && trips.length > 1 && (
                          <button
                            onClick={() => {
                              if (confirm(`هل أنت متأكد من حذف الرحلة "${trip.settings.tripName}" وكافة بياناتها؟`)) {
                                onDeleteTrip(trip.id);
                              }
                            }}
                            className="p-1.5 text-slate-500 hover:text-rose-400 rounded-xl hover:bg-rose-500/10 transition"
                            title="حذف الرحلة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: CREATE NEW TRIP FORM WITH ADVANCED BUILDER */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreateSubmit} className="space-y-4 bg-slate-950 p-3 sm:p-5 rounded-2xl border border-slate-800 w-full min-w-0 overflow-hidden">
              {/* Header Title */}
              <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 w-full min-w-0">
                <div className="min-w-0">
                  <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 truncate">
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0" />
                    <span>إنشاء رحلة وفعالية جديدة متكاملة</span>
                  </h4>
                  <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                    اختر قالباً جاهزاً بضغطة واحدة أو صمم بيانات الرحلة وأسطول الحافلات والإضافات يدوياً
                  </p>
                </div>
              </div>

              {/* 1. Quick Presets Bar */}
              <div className="space-y-2 bg-slate-900/60 p-2.5 sm:p-3 rounded-2xl border border-slate-800/80 w-full min-w-0 overflow-hidden">
                <label className="block text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>نماذج وقوالب رحلات جاهزة للتعبئة الفورية:</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 w-full min-w-0">
                  {TRIP_PRESETS.map((preset) => {
                    const isSelected = selectedPresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyPreset(preset)}
                        className={`p-2 sm:p-2.5 rounded-xl border text-right transition flex flex-col justify-between text-xs group relative min-w-0 overflow-hidden ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-500 text-amber-200 ring-1 ring-amber-500'
                            : 'bg-slate-950/80 border-slate-800 hover:border-amber-500/40 text-slate-300 hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1 min-w-0">
                          <span className="text-base shrink-0">{preset.icon}</span>
                          <span className="text-[10px] bg-slate-900 text-amber-300 px-1.5 py-0.5 rounded font-mono truncate">
                            {preset.suggestedPrice} ج.م
                          </span>
                        </div>
                        <span className="font-bold text-[11px] text-white truncate block w-full group-hover:text-amber-300">
                          {preset.title}
                        </span>
                        <span className="text-[9px] text-slate-400 mt-0.5 truncate block w-full">{preset.badge}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Core Trip Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full min-w-0">
                <div className="sm:col-span-2 min-w-0">
                  <label className="block text-xs font-bold text-slate-200 mb-1">اسم الرحلة الرسمي *</label>
                  <input
                    type="text"
                    value={newTripForm.tripName}
                    onChange={(e) => setNewTripForm({ ...newTripForm, tripName: e.target.value })}
                    placeholder="مثال: رحلة قرية أثينا باي - رأس سدر"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 sm:px-3.5 sm:py-2.5 text-xs font-bold text-white focus:outline-none focus:border-amber-500 shadow-inner min-w-0"
                    required
                  />
                </div>

                <div className="min-w-0">
                  <label className="block text-xs font-bold text-slate-200 mb-1">📅 تاريخ الانطلاق</label>
                  <input
                    type="date"
                    value={newTripForm.tripDate}
                    onChange={(e) => setNewTripForm({ ...newTripForm, tripDate: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-amber-500 font-mono min-w-0"
                    required
                  />
                </div>

                <div className="min-w-0">
                  <label className="block text-xs font-bold text-slate-200 mb-1">📍 المكان السياحي / الوجهة</label>
                  <input
                    type="text"
                    value={newTripForm.destination}
                    onChange={(e) => setNewTripForm({ ...newTripForm, destination: e.target.value })}
                    placeholder="مثال: قرية أثينا - رأس سدر"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-amber-500 min-w-0"
                    required
                  />
                </div>
              </div>

              {/* 3. Fleet & Bus Capacity Manager */}
              <div className="bg-slate-900/70 p-3 sm:p-3.5 rounded-2xl border border-slate-800 space-y-2.5 w-full min-w-0 overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full min-w-0">
                  <label className="text-xs font-bold text-cyan-300 flex items-center gap-1.5 shrink-0">
                    <Bus className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>أسطول الحافلات والسعة المقترحة:</span>
                  </label>
                  <div className="flex items-center gap-1 text-xs flex-wrap">
                    <span className="text-[10px] text-slate-400 ml-1">سريع:</span>
                    {[
                      { buses: 2, seats: 100, label: '100 مقعد' },
                      { buses: 3, seats: 150, label: '150 مقعد' },
                      { buses: 4, seats: 200, label: '200 مقعد' },
                      { buses: 6, seats: 300, label: '300 مقعد' },
                    ].map((opt) => (
                      <button
                        key={opt.seats}
                        type="button"
                        onClick={() => setNewTripForm({ ...newTripForm, totalSeats: opt.seats })}
                        className={`text-[10px] px-2 py-0.5 rounded-lg border font-bold font-mono transition ${
                          newTripForm.totalSeats === opt.seats
                            ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                            : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-cyan-500/40'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full min-w-0">
                  <div className="min-w-0">
                    <label className="block text-[11px] text-slate-400 font-bold mb-1">السعة الكلية للمقاعد</label>
                    <input
                      type="number"
                      min={1}
                      value={newTripForm.totalSeats}
                      onChange={(e) => setNewTripForm({ ...newTripForm, totalSeats: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-cyan-300 focus:outline-none focus:border-cyan-500 min-w-0"
                      required
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="block text-[11px] text-slate-400 font-bold mb-1">📍 نقطة التجمع</label>
                    <input
                      type="text"
                      value={newTripForm.assemblyLocation}
                      onChange={(e) => setNewTripForm({ ...newTripForm, assemblyLocation: e.target.value })}
                      placeholder="مثال: ميدان الرماية"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-cyan-500 min-w-0"
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="block text-[11px] text-slate-400 font-bold mb-1">⏰ ميعاد التجمع والتحرك</label>
                    <input
                      type="text"
                      value={newTripForm.assemblyTime}
                      onChange={(e) => setNewTripForm({ ...newTripForm, assemblyTime: e.target.value })}
                      placeholder="مثال: 06:30 ص"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-cyan-500 min-w-0"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Pricing Structure & Add-ons Matrix */}
              <div className="bg-slate-900/70 border border-amber-500/30 rounded-2xl p-3 sm:p-3.5 space-y-3 w-full min-w-0 overflow-hidden">
                <div className="flex justify-between items-center border-b border-amber-500/20 pb-2">
                  <h5 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <BadgeDollarSign className="w-4 h-4 shrink-0" />
                    <span>التسعير المالي وقائمة الخدمات والإضافات</span>
                  </h5>
                  <span className="text-[10px] text-slate-400 font-mono">حساب تلقائي ⚡</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs w-full min-w-0">
                  <div className="min-w-0">
                    <label className="block text-slate-200 font-bold mb-1 text-[11px] sm:text-xs">سعر التذكرة الأساسية *</label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        value={newTripForm.ticketPrice}
                        onChange={(e) => setNewTripForm({ ...newTripForm, ticketPrice: Number(e.target.value) })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-500 pl-10 min-w-0"
                        required
                      />
                      <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">ج.م</span>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <label className="block text-slate-200 font-bold mb-1 text-[11px] sm:text-xs">العربون المبدئي الافتراضي</label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        value={newTripForm.defaultDeposit}
                        onChange={(e) => setNewTripForm({ ...newTripForm, defaultDeposit: Number(e.target.value) })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-500 pl-10 min-w-0"
                        required
                      />
                      <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">ج.م</span>
                    </div>
                  </div>
                </div>

                {/* Custom Addons Menu Builder */}
                <AddonsBuilder
                  addons={newTripForm.addons || []}
                  onChange={(updated) => setNewTripForm({ ...newTripForm, addons: updated })}
                />
              </div>

              {/* 5. Live Financial Estimation & Feasibility Card */}
              <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-950 p-3 sm:p-3.5 rounded-2xl border border-emerald-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 w-full min-w-0 overflow-hidden">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-emerald-300 block truncate">
                      حاسبة الإيرادات التقديرية للرحلة 📈
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-slate-400 block truncate">
                      سعة ({newTripForm.totalSeats} مشترك) × {newTripForm.ticketPrice} ج.م
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 w-full md:w-auto text-xs font-mono shrink-0">
                  <div className="text-center bg-slate-950/60 p-1.5 rounded-xl border border-slate-800 min-w-0">
                    <span className="text-[9px] sm:text-[10px] text-slate-400 block font-sans">التذاكر</span>
                    <span className="font-bold text-white text-[11px] sm:text-xs truncate block">{estimatedTicketRevenue.toLocaleString()} ج.م</span>
                  </div>
                  <div className="text-center bg-slate-950/60 p-1.5 rounded-xl border border-slate-800 min-w-0">
                    <span className="text-[9px] sm:text-[10px] text-slate-400 block font-sans">الإضافات</span>
                    <span className="font-bold text-amber-300 text-[11px] sm:text-xs truncate block">+{estimatedAddonRevenue.toLocaleString()} ج.م</span>
                  </div>
                  <div className="text-center bg-emerald-500/20 p-1.5 rounded-xl border border-emerald-500/40 min-w-0">
                    <span className="text-[9px] sm:text-[10px] text-emerald-400 block font-sans font-bold">الإجمالي</span>
                    <span className="font-black text-emerald-300 text-xs sm:text-sm truncate block">{totalEstimatedRevenue.toLocaleString()} ج.م</span>
                  </div>
                </div>
              </div>

              {/* 6. Communication & Social Media Links */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full min-w-0">
                <div className="min-w-0">
                  <label className="block text-xs font-bold text-slate-300 mb-1">🔗 رابط جروب الواتساب</label>
                  <input
                    type="url"
                    value={newTripForm.whatsappGroupLink}
                    onChange={(e) => setNewTripForm({ ...newTripForm, whatsappGroupLink: e.target.value })}
                    placeholder="https://chat.whatsapp.com/..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500 min-w-0"
                  />
                </div>

                <div className="min-w-0">
                  <label className="block text-xs font-bold text-slate-300 mb-1">📞 هاتف الدعم والاستفسارات</label>
                  <input
                    type="text"
                    value={newTripForm.supportPhone}
                    onChange={(e) => setNewTripForm({ ...newTripForm, supportPhone: e.target.value })}
                    placeholder="010xxxxxxx"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500 min-w-0"
                  />
                </div>

                <div className="min-w-0">
                  <label className="block text-xs font-bold text-slate-300 mb-1">📸 ألبوم ميديا جوجل درايف</label>
                  <input
                    type="url"
                    value={newTripForm.driveLink}
                    onChange={(e) => setNewTripForm({ ...newTripForm, driveLink: e.target.value })}
                    placeholder="https://drive.google.com/..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500 min-w-0"
                  />
                </div>
              </div>

              {/* Bottom Submit Actions */}
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 pt-3 border-t border-slate-800 w-full min-w-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-slate-300 px-5 py-2.5 rounded-xl text-xs font-bold border border-slate-800 transition text-center"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black px-7 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-xl shadow-amber-500/25 active:scale-95 cursor-pointer"
                >
                  <Check className="w-4 h-4 shrink-0" />
                  <span>إنشـاء الرحلة والبدء فوراً 🚀</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal Sticky Bottom Footer */}
        <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center shrink-0">
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            شركة كيان لتنظيم الفعاليات والرحلات • إدارة وتبديل الرحلات
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer border border-slate-700"
          >
            <X className="w-4 h-4" />
            <span>إغلاق والرجوع إلى البرنامج</span>
          </button>
        </div>
      </div>

      {/* EDIT TRIP MODAL POPUP */}
      {editingTrip && editTripForm && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setEditingTrip(null);
              setEditTripForm(null);
            }
          }}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col justify-start sm:justify-center items-center p-2 sm:p-4 overflow-y-auto"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-2xl max-h-[92dvh] sm:max-h-[90vh] flex flex-col overflow-hidden shadow-2xl my-auto shrink-0">
            {/* Header - Pinned */}
            <div className="flex justify-between items-center border-b border-slate-800 p-4 bg-slate-950 shrink-0">
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <Edit className="w-5 h-5 text-amber-400 shrink-0" />
                <span className="truncate">تعديل الإعدادات: {editingTrip.settings.tripName}</span>
              </h3>
              <button
                onClick={() => {
                  setEditingTrip(null);
                  setEditTripForm(null);
                }}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="flex flex-col flex-1 overflow-hidden w-full min-w-0">
              <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-5 space-y-4 text-xs custom-scrollbar w-full min-w-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full min-w-0">
                  <div className="sm:col-span-2 min-w-0">
                    <label className="block text-slate-300 font-semibold mb-1">اسم الرحلة الرسمي</label>
                    <input
                      type="text"
                      required
                      value={editTripForm.tripName}
                      onChange={(e) => setEditTripForm({ ...editTripForm, tripName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 font-bold focus:border-amber-500 focus:outline-none min-w-0"
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="block text-slate-300 font-semibold mb-1">تاريخ الرحلة</label>
                    <input
                      type="date"
                      required
                      value={editTripForm.tripDate}
                      onChange={(e) => setEditTripForm({ ...editTripForm, tripDate: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 font-mono focus:border-amber-500 focus:outline-none min-w-0"
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="block text-slate-300 font-semibold mb-1">الوجهة السياحية</label>
                    <input
                      type="text"
                      required
                      value={editTripForm.destination}
                      onChange={(e) => setEditTripForm({ ...editTripForm, destination: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 focus:border-amber-500 focus:outline-none min-w-0"
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="block text-slate-300 font-semibold mb-1">سعر التذكرة الأساسية (ج.م)</label>
                    <input
                      type="number"
                      required
                      value={editTripForm.ticketPrice}
                      onChange={(e) => setEditTripForm({ ...editTripForm, ticketPrice: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 text-amber-300 rounded-xl p-2.5 font-mono font-bold focus:border-amber-500 focus:outline-none min-w-0"
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="block text-slate-300 font-semibold mb-1">العربون الافتراضي (ج.م)</label>
                    <input
                      type="number"
                      required
                      value={editTripForm.defaultDeposit || 500}
                      onChange={(e) => setEditTripForm({ ...editTripForm, defaultDeposit: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 text-amber-300 rounded-xl p-2.5 font-mono font-bold focus:border-amber-500 focus:outline-none min-w-0"
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="block text-slate-300 font-semibold mb-1">السعة الكلية للمقاعد</label>
                    <input
                      type="number"
                      required
                      value={editTripForm.totalSeats}
                      onChange={(e) => setEditTripForm({ ...editTripForm, totalSeats: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 font-mono focus:border-amber-500 focus:outline-none min-w-0"
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="block text-slate-300 font-semibold mb-1">رابط جروب الواتساب</label>
                    <input
                      type="text"
                      value={editTripForm.whatsappGroupLink}
                      onChange={(e) => setEditTripForm({ ...editTripForm, whatsappGroupLink: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 font-mono text-xs focus:border-amber-500 focus:outline-none min-w-0"
                    />
                  </div>

                  <div className="sm:col-span-2 min-w-0">
                    {/* Add-ons Menu Setup */}
                    <AddonsBuilder
                      addons={editTripForm.addons || []}
                      onChange={(updated) => setEditTripForm({ ...editTripForm, addons: updated })}
                    />
                  </div>
                </div>
              </div>

              {/* Footer - Pinned */}
              <div className="flex flex-col-reverse sm:flex-row justify-end items-center gap-2 p-3 sm:p-4 bg-slate-950 border-t border-slate-800 shrink-0 w-full">
                <button
                  type="button"
                  onClick={() => {
                    setEditingTrip(null);
                    setEditTripForm(null);
                  }}
                  className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-bold transition text-center"
                >
                  إلغاء وخروج
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-6 py-2 rounded-xl text-xs shadow-lg shadow-amber-500/20 transition active:scale-95 text-center"
                >
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

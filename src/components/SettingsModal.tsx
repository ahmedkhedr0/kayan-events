import React, { useState, useEffect } from 'react';
import {
  Settings,
  X,
  RotateCcw,
  Sparkles,
  MapPin,
  Calendar,
  DollarSign,
  Building2,
  Share2,
  Trash2,
  Clock,
  Users,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { TripSettings, TripAddon, AddonType } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: TripSettings;
  onSaveSettings: (newSettings: TripSettings) => void;
  onResetToDefaults: () => void;
}

type SettingsTab = 'general' | 'pricing_addons' | 'company' | 'links' | 'advanced';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onResetToDefaults,
}) => {
  const [formData, setFormData] = useState<TripSettings>(settings);
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [newOptionInputs, setNewOptionInputs] = useState<Record<string, string>>({});
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);

  // Sync state whenever settings change or modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData(settings);
      setSaveSuccessNotice(false);
    }
  }, [settings, isOpen]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSaveSuccessNotice(true);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  // Addon Helpers
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
    setFormData({
      ...formData,
      addons: [...(formData.addons || []), newAddon],
    });
  };

  const handleUpdateAddon = (index: number, updates: Partial<TripAddon>) => {
    const next = [...(formData.addons || [])];
    next[index] = { ...next[index], ...updates };
    setFormData({ ...formData, addons: next });
  };

  const handleDeleteAddon = (id: string) => {
    setFormData({
      ...formData,
      addons: (formData.addons || []).filter((a) => a.id !== id),
    });
  };

  const handleAddOptionToItem = (addonId: string, index: number, optValue: string) => {
    const val = (optValue || '').trim();
    if (!val) return;
    const currentOptions = formData.addons?.[index]?.options || [];
    if (!currentOptions.includes(val)) {
      handleUpdateAddon(index, { options: [...currentOptions, val] });
    }
    setNewOptionInputs((prev) => ({ ...prev, [addonId]: '' }));
  };

  const handleRemoveOptionFromItem = (index: number, optIdx: number) => {
    const currentOptions = formData.addons?.[index]?.options || [];
    const next = currentOptions.filter((_, i) => i !== optIdx);
    handleUpdateAddon(index, { options: next });
  };

  const handleApplyPresetOptions = (index: number, presetType: 'standard_sizes' | 'oversize' | 'meal_choices') => {
    if (presetType === 'standard_sizes') {
      handleUpdateAddon(index, { options: ['S', 'M', 'L', 'XL', '2XL', '3XL'] });
    } else if (presetType === 'oversize') {
      handleUpdateAddon(index, { options: ['L', 'XL', '2XL', '3XL', '4XL', 'Oversize'] });
    } else if (presetType === 'meal_choices') {
      handleUpdateAddon(index, { options: ['دجاج مشوي', 'كفتة مشوية', 'ميكس جريل', 'نباتي'] });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-3xl shadow-2xl flex flex-col max-h-[92dvh] overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-slate-950/80 border-b border-slate-800 px-5 py-4 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>إعدادات الرحلة والشركة</span>
                <span className="text-[10px] bg-slate-800 text-amber-300 font-mono px-2 py-0.5 rounded-full border border-slate-700">
                  لوحة التحكم
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                تخصيص بيانات الرحلة، أسعار التذاكر، مينيو الخدمات، وتفاصيل الشركة الرسمية
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition active:scale-95 shrink-0"
            title="إغلاق النافذة (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Navigation Tabs */}
        <div className="bg-slate-950/50 border-b border-slate-800/80 px-4 py-2 flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              activeTab === 'general'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>بيانات الفعالية</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pricing_addons')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              activeTab === 'pricing_addons'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>التسعير والمينيو ({formData.addons?.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('company')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              activeTab === 'company'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>بيانات وأختام الشركة</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('links')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              activeTab === 'links'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>الروابط والتواصل</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('advanced')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              activeTab === 'advanced'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                : 'text-slate-400 hover:text-rose-300 hover:bg-slate-800'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>إعادة الضبط</span>
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* TAB 1: General Info */}
          {activeTab === 'general' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-4">
                <h4 className="text-amber-400 text-xs font-bold flex items-center gap-2 border-b border-slate-800/80 pb-2">
                  <MapPin className="w-4 h-4" />
                  <span>المعلومات الأساسية للفعالية</span>
                </h4>

                <div>
                  <label className="block text-slate-300 font-bold text-xs mb-1.5">اسم الرحلة / الفعالية الرسمي *</label>
                  <input
                    type="text"
                    required
                    value={formData.tripName}
                    onChange={(e) => setFormData({ ...formData, tripName: e.target.value })}
                    placeholder="مثال: رحلة دهب وشرم الشيخ - دفعة حاسبات 2026"
                    className="w-full bg-slate-900 border border-slate-700 text-white font-bold rounded-xl px-3.5 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-slate-300 font-bold text-xs mb-1.5 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      <span>تاريخ الفعالية *</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.tripDate}
                      onChange={(e) => setFormData({ ...formData, tripDate: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 text-white font-mono rounded-xl px-3.5 py-2.5 text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold text-xs mb-1.5 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      <span>مكان الوجهة / القرية السياحية</span>
                    </label>
                    <input
                      type="text"
                      value={formData.destination}
                      onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                      placeholder="مثال: وادي الريان والبحيرة المسحورة"
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-slate-300 font-bold text-xs mb-1.5 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>موعد وتوقيت التجمع</span>
                    </label>
                    <input
                      type="text"
                      value={formData.assemblyTime || ''}
                      onChange={(e) => setFormData({ ...formData, assemblyTime: e.target.value })}
                      placeholder="مثال: 06:00 صباحاً"
                      className="w-full bg-slate-900 border border-slate-700 text-white font-mono rounded-xl px-3.5 py-2.5 text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold text-xs mb-1.5 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      <span>نقطة ومكان التجمع والانطلاق</span>
                    </label>
                    <input
                      type="text"
                      value={formData.assemblyLocation || ''}
                      onChange={(e) => setFormData({ ...formData, assemblyLocation: e.target.value })}
                      placeholder="مثال: أمام البوابة الرئيسية للجامعة"
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold text-xs mb-1.5 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-amber-400" />
                    <span>إجمالي السعة المقدرة / المقاعد المستهدفة</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formData.totalSeats || 300}
                    onChange={(e) => setFormData({ ...formData, totalSeats: Number(e.target.value) })}
                    placeholder="300"
                    className="w-full bg-slate-900 border border-slate-700 text-amber-300 font-mono font-bold rounded-xl px-3.5 py-2.5 text-xs focus:border-amber-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">تستخدم لحساب نسب الامتلاء والمؤشرات المالية في الداشبورد.</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Pricing & Addons */}
          {activeTab === 'pricing_addons' && (
            <div className="space-y-4 animate-fade-in">
              {/* Pricing Cards */}
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-amber-500/20 space-y-4">
                <h4 className="text-amber-400 text-xs font-bold flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4" />
                    <span>أسعار التذاكر والعربونات الافتراضية</span>
                  </span>
                  <span className="text-[10px] text-slate-400">تطبيق تلقائي على المشتركين الجدد</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-slate-300 font-bold text-xs mb-1">
                      سعر التذكرة الأساسية *
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        min={0}
                        required
                        value={formData.ticketPrice}
                        onChange={(e) => setFormData({ ...formData, ticketPrice: Number(e.target.value) })}
                        className="w-full bg-slate-900 border border-slate-700 text-amber-300 font-mono font-bold rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                      />
                      <span className="absolute left-3 text-[11px] text-slate-400 font-bold">ج.م</span>
                    </div>
                    <span className="text-[10px] text-slate-500">سعر تذكرة المشترك بدون أي إضافات</span>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold text-xs mb-1">
                      العربون المبدئي الافتراضي
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        min={0}
                        value={formData.defaultDeposit !== undefined ? formData.defaultDeposit : 500}
                        onChange={(e) => setFormData({ ...formData, defaultDeposit: Number(e.target.value) })}
                        className="w-full bg-slate-900 border border-slate-700 text-amber-300 font-mono font-bold rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                      />
                      <span className="absolute left-3 text-[11px] text-slate-400 font-bold">ج.م</span>
                    </div>
                    <span className="text-[10px] text-slate-500">القيمة المقترحة عند حجز عربون</span>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold text-xs mb-1">
                      سعر تذكرة المرافق الافتراضية
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        min={0}
                        value={formData.companionFullPrice || formData.ticketPrice}
                        onChange={(e) => setFormData({ ...formData, companionFullPrice: Number(e.target.value) })}
                        className="w-full bg-slate-900 border border-slate-700 text-amber-300 font-mono font-bold rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                      />
                      <span className="absolute left-3 text-[11px] text-slate-400 font-bold">ج.م</span>
                    </div>
                    <span className="text-[10px] text-slate-500">في حالة حجز مرافق إضافي</span>
                  </div>
                </div>
              </div>

              {/* Addons Builder Section */}
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-3.5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800/80 pb-2.5">
                  <div>
                    <label className="block text-amber-300 font-bold text-xs flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>قائمة الخدمات والإضافات المخصصة للرحلة ({formData.addons?.length || 0} خدمة)</span>
                    </label>
                    <span className="text-[11px] text-slate-400">
                      تخصيص نوع الخدمة، سعرها، مقاساتها وخياراتها ليختار منها المشتركون بكل وضوح
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleAddAddon('apparel')}
                      className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs px-2.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1 active:scale-95 shadow-sm"
                    >
                      <span>👕 + هودي / ملابس</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddAddon('meal')}
                      className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs px-2.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1 active:scale-95 shadow-sm"
                    >
                      <span>🍔 + وجبة طعام</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddAddon('service')}
                      className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs px-2.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1 active:scale-95 shadow-sm"
                    >
                      <span>📸 + تصوير وميديا</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddAddon('custom_options')}
                      className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs px-2.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1 active:scale-95 shadow-sm"
                    >
                      <span>⚡ + خدمة إضافية</span>
                    </button>
                  </div>
                </div>

                {/* Addons List Stack */}
                {(!formData.addons || formData.addons.length === 0) ? (
                  <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-6 text-center text-xs text-slate-400 space-y-2">
                    <p>لا توجد خدمات أو إضافات مخصصة لهذه الرحلة حالياً.</p>
                    <p className="text-slate-500 text-[11px]">اضغط على أحد الأزرار بالأعلى لإضافة هودي، وجبة، أو فوتوسيشن.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formData.addons.map((addon, index) => {
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
                          className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-3.5 space-y-3 shadow-md transition-all"
                        >
                          {/* 1. Header: Type Selector + Service Name + Delete */}
                          <div className="flex items-center gap-2">
                            <select
                              value={currentType}
                              onChange={(e) => {
                                const newType = e.target.value as AddonType;
                                handleUpdateAddon(index, {
                                  type: newType,
                                  options: newType === 'apparel'
                                    ? ['S', 'M', 'L', 'XL', '2XL', '3XL']
                                    : newType === 'meal'
                                    ? ['دجاج مشوي', 'كفتة مشوية', 'ميكس']
                                    : addon.options,
                                });
                              }}
                              className="bg-slate-950 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl px-2.5 py-2 focus:outline-none focus:border-amber-500 shrink-0"
                            >
                              <option value="apparel">👕 ملابس ومقاسات</option>
                              <option value="meal">🍔 وجبة طعام</option>
                              <option value="service">📸 فوتوسيشن وميديا</option>
                              <option value="custom_options">⚡ خدمة ترفيهية</option>
                            </select>

                            <input
                              type="text"
                              value={addon.name}
                              onChange={(e) => handleUpdateAddon(index, { name: e.target.value })}
                              className="flex-1 bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-amber-500 shadow-inner"
                              placeholder="اسم الخدمة أو الإضافة (مثال: هودي الدفعة، وجبة غداء VIP، سيشن بحري)"
                              required
                            />

                            <button
                              type="button"
                              onClick={() => handleDeleteAddon(addon.id)}
                              className="p-2 text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl transition shrink-0"
                              title="حذف الخدمة"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* 2. Middle Row: Price & Default Selection */}
                          <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-slate-800/80 text-xs">
                            <div className="flex items-center gap-2">
                              <label className="text-slate-400 font-bold text-xs shrink-0">
                                💰 السعر الإضافي:
                              </label>
                              <div className="relative flex items-center">
                                <input
                                  type="number"
                                  min={0}
                                  value={addon.price}
                                  onChange={(e) => handleUpdateAddon(index, { price: Number(e.target.value) })}
                                  className="w-24 bg-slate-950 border border-slate-800 text-amber-300 font-mono font-bold rounded-xl px-2.5 py-1.5 text-xs text-center focus:outline-none focus:border-amber-500"
                                  required
                                />
                                <span className="text-[11px] text-slate-400 font-bold mr-1.5">ج.م</span>
                              </div>
                            </div>

                            <label className="flex items-center gap-2 cursor-pointer bg-slate-950/80 hover:bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 transition">
                              <input
                                type="checkbox"
                                checked={addon.isDefaultSelected || false}
                                onChange={(e) => handleUpdateAddon(index, { isDefaultSelected: e.target.checked })}
                                className="w-4 h-4 accent-amber-500 rounded"
                              />
                              <span className="text-xs text-slate-300 font-medium">تحديد افتراضي عند حجز مشترك جديد</span>
                            </label>
                          </div>

                          {/* 3. Options / Sizes Tag Management */}
                          {hasOptions && (
                            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2">
                              <div className="flex items-center justify-between flex-wrap gap-1 text-[11px]">
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
                                <div className="flex items-center gap-1 text-[10px]">
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
                                        + أوفر سايز
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
                                    className="bg-slate-900 border border-amber-500/30 text-amber-300 text-xs px-2.5 py-1 rounded-lg font-mono font-bold flex items-center gap-1.5 shadow-sm"
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
                                <div className="flex items-center gap-1">
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
                                    placeholder={currentType === 'apparel' ? 'أضف مقاس (4XL)' : 'أضف خيار'}
                                    className="bg-slate-900 border border-slate-800 text-white rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-amber-500 w-28"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleAddOptionToItem(addon.id, index, newOptionInputs[addon.id])}
                                    className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs px-2 py-1 rounded-lg font-bold transition"
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
            </div>
          )}

          {/* TAB 3: Company Details */}
          {activeTab === 'company' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-4">
                <h4 className="text-amber-400 text-xs font-bold flex items-center gap-2 border-b border-slate-800/80 pb-2">
                  <Building2 className="w-4 h-4" />
                  <span>بيانات وإختام الشركة الرسمية المستخدمة في العقود والتذاكر</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-slate-300 font-bold text-xs mb-1.5">اسم الشركة بالعربية *</label>
                    <input
                      type="text"
                      value={formData.companyNameAr || 'شركة كيان لتنظيم الفعاليات والرحلات'}
                      onChange={(e) => setFormData({ ...formData, companyNameAr: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 text-white font-bold rounded-xl px-3.5 py-2.5 text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold text-xs mb-1.5">اسم الشركة بالإنجليزية *</label>
                    <input
                      type="text"
                      value={formData.companyNameEn || 'KAYAN EVENTS & ORGANIZING SERVICES'}
                      onChange={(e) => setFormData({ ...formData, companyNameEn: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-slate-300 font-bold text-xs mb-1.5">رقم السجل التجاري / الترخيص</label>
                    <input
                      type="text"
                      value={formData.companyLicenseNo || '98231'}
                      onChange={(e) => setFormData({ ...formData, companyLicenseNo: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 text-white font-mono rounded-xl px-3.5 py-2.5 text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold text-xs mb-1.5">رقم هاتف الشركة / الإدارة</label>
                    <input
                      type="text"
                      value={formData.companyPhone || '01000000000'}
                      onChange={(e) => setFormData({ ...formData, companyPhone: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 text-white font-mono rounded-xl px-3.5 py-2.5 text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="text-[11px] text-slate-400">
                    <p className="font-bold text-slate-300">التوثيق القانوني والأختام</p>
                    <p>تظهر هذه البيانات بصورة تلقائية على عقود الموردين وسندات القبض وبطاقات المرور الرقمية QR.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Links & Support */}
          {activeTab === 'links' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-4">
                <h4 className="text-amber-400 text-xs font-bold flex items-center gap-2 border-b border-slate-800/80 pb-2">
                  <Share2 className="w-4 h-4" />
                  <span>روابط التواصل والميديا المشتركة مع الطلاب</span>
                </h4>

                <div>
                  <label className="block text-slate-300 font-bold text-xs mb-1.5">رابط ألبوم الصور والميديا (Google Drive)</label>
                  <input
                    type="url"
                    value={formData.driveLink || ''}
                    onChange={(e) => setFormData({ ...formData, driveLink: e.target.value })}
                    placeholder="https://drive.google.com/drive/folders/..."
                    className="w-full bg-slate-900 border border-slate-700 text-white font-mono text-xs rounded-xl px-3.5 py-2.5 focus:border-amber-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">يظهر في بورتال الطالب وبطاقة التذكرة الإلكترونية لتحميل الصور بعد الرحلة.</p>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold text-xs mb-1.5">رابط جروب الواتساب الرسمي للرحلة</label>
                  <input
                    type="url"
                    value={formData.whatsappGroupLink || ''}
                    onChange={(e) => setFormData({ ...formData, whatsappGroupLink: e.target.value })}
                    placeholder="https://chat.whatsapp.com/..."
                    className="w-full bg-slate-900 border border-slate-700 text-white font-mono text-xs rounded-xl px-3.5 py-2.5 focus:border-amber-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">يتم إرساله للمشتركين للانضمام لمتابعة التعليمات والإشعارات.</p>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold text-xs mb-1.5">رقم هاتف الدعم الفني والاستفسارات</label>
                  <input
                    type="tel"
                    value={formData.supportPhone || ''}
                    onChange={(e) => setFormData({ ...formData, supportPhone: e.target.value })}
                    placeholder="01012345678"
                    className="w-full bg-slate-900 border border-slate-700 text-white font-mono text-xs rounded-xl px-3.5 py-2.5 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Advanced & Reset */}
          {activeTab === 'advanced' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-rose-950/20 border border-rose-500/30 rounded-2xl p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl shrink-0">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-rose-300">إعادة تعيين الرحلة إلى الحالة الافتراضية</h4>
                    <p className="text-xs text-slate-300 mt-1">
                      سيؤدي هذا الإجراء إلى مسح كافة البيانات المحلية للرحلة الحالية واسترجاع البيانات التجريبية الافتراضية.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('⚠️ تحذير: هل أنت متأكد تماماً من استعادة الإعدادات الافتراضية ومسح بيانات هذه الرحلة؟ لا يمكن التراجع عن هذا الإجراء.')) {
                        onResetToDefaults();
                        onClose();
                      }
                    }}
                    className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2 active:scale-95 shadow-lg shadow-rose-600/20"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>تأكيد إعادة الضبط الافتراضي</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Modal Sticky Footer */}
        <div className="bg-slate-950/90 border-t border-slate-800 px-5 py-3.5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {saveSuccessNotice && (
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5 animate-bounce">
                <CheckCircle2 className="w-4 h-4" />
                <span>تم حفظ الإعدادات بنجاح!</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition active:scale-95"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm px-6 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 transition active:scale-95 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>حفظ الإعدادات</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

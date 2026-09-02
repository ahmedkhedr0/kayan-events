import React, { useState, useEffect } from 'react';
import {
  X,
  Landmark,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Calendar,
  User,
  FileText,
  Printer,
  Sparkles,
  PlusCircle,
  TrendingUp,
  CheckCircle2,
  Clock,
  Briefcase,
  Edit3,
  Trash2,
} from 'lucide-react';
import { CompanyTreasury, TreasuryTransfer, TreasuryTransferType, Trip } from '../types';
import { generateTreasuryTransferPDF, generateTreasuryFullLedgerPDF } from '../services/pdfGenerator';

interface MainTreasuryModalProps {
  isOpen: boolean;
  onClose: () => void;
  treasury: CompanyTreasury;
  trips: Trip[];
  activeTripId: string;
  onAddTransfer: (transfer: Omit<TreasuryTransfer, 'id' | 'referenceNumber'>, markTripCompleted?: boolean) => void;
  onUpdateTransfer?: (transfer: TreasuryTransfer) => void;
  onDeleteTransfer?: (transferId: string) => void;
}

export const MainTreasuryModal: React.FC<MainTreasuryModalProps> = ({
  isOpen,
  onClose,
  treasury,
  trips,
  activeTripId,
  onAddTransfer,
  onUpdateTransfer,
  onDeleteTransfer,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'new_transfer' | 'logs'>('overview');
  const [filterType, setFilterType] = useState<string>('all');

  const activeTrip = trips.find((t) => t.id === activeTripId) || trips[0];

  // New Transfer Form state
  const [selectedTripId, setSelectedTripId] = useState<string>(activeTrip?.id || '');
  const [transferType, setTransferType] = useState<TreasuryTransferType>('trip_final_profit');
  const [amount, setAmount] = useState<number>(0);
  const [transferredBy, setTransferredBy] = useState<string>('أحمد الكياني - المسؤول المالي');
  const [notes, setNotes] = useState<string>('');
  const [markCompleted, setMarkCompleted] = useState<boolean>(true);

  // Edit & Delete Modal States
  const [editingTransfer, setEditingTransfer] = useState<TreasuryTransfer | null>(null);
  const [transferToDelete, setTransferToDelete] = useState<TreasuryTransfer | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (editingTransfer) {
          setEditingTransfer(null);
        } else if (transferToDelete) {
          setTransferToDelete(null);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, editingTransfer, transferToDelete, onClose]);

  if (!isOpen) return null;

  // Selected Trip for Transfer Calculation
  const selectedTrip = trips.find((t) => t.id === selectedTripId) || activeTrip || trips[0];

  // Financial calculations for selected trip
  const tripCollected = selectedTrip?.students ? selectedTrip.students.reduce((sum, s) => sum + s.paidAmount, 0) : 0;
  const tripExpenses = selectedTrip?.expenses ? selectedTrip.expenses.reduce((sum, e) => sum + e.amount, 0) : 0;
  const tripNetProfit = tripCollected - tripExpenses;

  // Auto set suggested amount on trip change
  const handleTripSelect = (tripId: string) => {
    setSelectedTripId(tripId);
    const target = trips.find((t) => t.id === tripId);
    if (target) {
      const col = target.students.reduce((s, std) => s + std.paidAmount, 0);
      const exp = target.expenses.reduce((s, e) => s + e.amount, 0);
      const net = col - exp;
      setAmount(net > 0 ? net : 0);
      setNotes(`تحويل صافي أرباح ${target.settings.tripName} إلى الخزنة الرئيسية`);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      alert('برجاء كتابة مبلغ تحويل صحيح أكبر من الصفر');
      return;
    }

    onAddTransfer(
      {
        tripId: selectedTrip?.id || '',
        tripName: selectedTrip?.settings?.tripName || 'رحلة عامة',
        amount,
        type: transferType,
        date: new Date().toISOString().slice(0, 10),
        time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        transferredBy: transferredBy || 'إدارة الشركة',
        notes: notes || `تحويل إلى الخزنة الرئيسية من ${selectedTrip?.settings?.tripName || 'الرحلة'}`,
      },
      transferType === 'trip_final_profit' && markCompleted
    );

    setActiveTab('logs');
  };

  const filteredTransfers = treasury.transfers.filter((trf) => {
    if (filterType === 'all') return true;
    return trf.type === filterType;
  });

  const totalIn = treasury.transfers
    .filter((t) => t.type !== 'direct_withdrawal')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalOut = treasury.transfers
    .filter((t) => t.type === 'direct_withdrawal')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md overflow-y-auto p-2 sm:p-4 md:p-6"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden mx-auto my-2 sm:my-6">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-indigo-700 text-slate-950 p-4 sm:p-5 flex justify-between items-center">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-slate-950/20 backdrop-blur flex items-center justify-center text-slate-950 shrink-0">
              <Landmark className="w-5 h-5 sm:w-7 sm:h-7" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-xl font-black text-slate-950 tracking-tight">
                  الخزنة الرئيسية لشركة كيان
                </h3>
                <span className="bg-slate-950 text-amber-400 font-mono text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-bold">
                  MAIN TREASURY
                </span>
              </div>
              <p className="text-xs font-bold text-slate-900 opacity-90">
                إدارة تحويلات السيولة النقدية وأرباح الرحلات
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-950/20 hover:bg-slate-950/40 text-slate-950 transition active:scale-95 shrink-0"
            title="إغلاق النافذة (Esc)"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Treasury Core Balance Banner */}
        <div className="bg-slate-950 p-4 sm:p-6 border-b border-slate-800">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {/* Main Balance Box */}
            <div className="bg-gradient-to-br from-amber-500/20 to-indigo-900/40 border border-amber-500/40 p-4 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 p-3 opacity-10">
                <Landmark className="w-20 h-20 text-amber-400" />
              </div>
              <span className="text-xs text-amber-400 font-bold uppercase block tracking-wider">
                إجمالي رصيد الخزنة المتاح
              </span>
              <div className="text-2xl sm:text-3xl font-black text-amber-300 font-mono mt-1">
                {(treasury?.currentBalance ?? (treasury as any)?.balance ?? 0).toLocaleString()} <span className="text-xs sm:text-sm font-normal">ج.م</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                السيولة الفعلية الجاهزة بالشركة
              </p>
            </div>

            {/* Total Deposits */}
            <div className="bg-slate-900/90 border border-emerald-500/30 p-4 rounded-2xl">
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                <ArrowDownLeft className="w-4 h-4" /> إجمالي التحويلات والإيداعات
              </span>
              <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono mt-1">
                +{(totalIn ?? 0).toLocaleString()} <span className="text-xs font-normal">ج.م</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">من أرباح الرحلات والإيداعات المباشرة</p>
            </div>

            {/* Active Trip Quick Stat */}
            <div className="bg-slate-900/90 border border-indigo-500/30 p-4 rounded-2xl">
              <span className="text-xs text-indigo-300 font-bold flex items-center gap-1">
                <TrendingUp className="w-4 h-4" /> ربح الرحلة الحالية للتحويل
              </span>
              <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono mt-1">
                {tripNetProfit > 0 ? `${(tripNetProfit ?? 0).toLocaleString()} ج.م` : 'لا توجد سيولة'}
              </div>
              <p className="text-[11px] text-slate-400 truncate mt-1">{activeTrip.settings.tripName}</p>
            </div>
          </div>

          {/* Tab Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition ${
                  activeTab === 'overview'
                    ? 'bg-amber-500 text-slate-950 shadow font-black'
                    : 'text-slate-400 hover:text-white bg-slate-900'
                }`}
              >
                <Landmark className="w-4 h-4" /> ملخص الخزنة
              </button>

              <button
                onClick={() => {
                  handleTripSelect(activeTrip.id);
                  setActiveTab('new_transfer');
                }}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition ${
                  activeTab === 'new_transfer'
                    ? 'bg-amber-500 text-slate-950 shadow font-black'
                    : 'text-slate-400 hover:text-white bg-slate-900'
                }`}
              >
                <PlusCircle className="w-4 h-4" /> تحويل جديد للخزنة
              </button>

              <button
                onClick={() => setActiveTab('logs')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition ${
                  activeTab === 'logs'
                    ? 'bg-amber-500 text-slate-950 shadow font-black'
                    : 'text-slate-400 hover:text-white bg-slate-900'
                }`}
              >
                <FileText className="w-4 h-4" /> سجل العمليات ({treasury.transfers.length})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const filterLabel = filterType !== 'all' ? `تصفية: ${
                    filterType === 'trip_final_profit'
                      ? 'أرباح الرحلات'
                      : filterType === 'partial_cash_out'
                      ? 'تصفيات جزئية'
                      : filterType === 'direct_deposit'
                      ? 'إيداعات مباشرة'
                      : 'سحوبات ومصروفات'
                  }` : undefined;
                  generateTreasuryFullLedgerPDF(treasury, undefined, filteredTransfers, filterLabel);
                }}
                className="bg-indigo-950 hover:bg-indigo-900 text-amber-300 border border-indigo-700/60 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow"
              >
                <Printer className="w-3.5 h-3.5 text-amber-400" />
                <span>كشف حساب الخزنة PDF 🖨️</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body - Natural Page Flow */}
        <div className="p-4 sm:p-6 space-y-6">
          {/* TAB 1: OVERVIEW & QUICK ACTIONS */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Trip Profit Transfer Card Widget */}
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-700/50 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <span className="bg-amber-500/20 text-amber-300 text-[10px] px-2.5 py-0.5 rounded-full font-bold border border-amber-500/30">
                      رحلة جارية للتحويل
                    </span>
                    <h4 className="text-lg font-bold text-white mt-1">{activeTrip.settings.tripName}</h4>
                    <p className="text-xs text-slate-400">
                      تاريخ الرحلة: {activeTrip.settings.tripDate} | الوجهة: {activeTrip.settings.destination}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      handleTripSelect(activeTrip.id);
                      setActiveTab('new_transfer');
                    }}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition shadow active:scale-95 shrink-0"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    تحويل الأرباح الآن
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3 bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-center font-mono text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">المحصل من الطلاب</span>
                    <strong className="text-emerald-400 text-sm font-bold">{(tripCollected ?? 0).toLocaleString()} ج.م</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">المصروفات المسجلة</span>
                    <strong className="text-rose-400 text-sm font-bold">{(tripExpenses ?? 0).toLocaleString()} ج.م</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">صافي السيولة للتحويل</span>
                    <strong className="text-amber-400 text-sm font-bold">{(tripNetProfit ?? 0).toLocaleString()} ج.م</strong>
                  </div>
                </div>
              </div>

              {/* Recent Transfers Log Preview */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" /> أحدث التحويلات المسجلة بالخزنة
                  </h4>
                  <button
                    onClick={() => setActiveTab('logs')}
                    className="text-xs text-amber-400 hover:underline font-bold"
                  >
                    عرض الكل
                  </button>
                </div>

                <div className="space-y-2">
                  {treasury.transfers.slice(0, 3).map((trf) => (
                    <div
                      key={trf.id}
                      className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                            trf.type === 'direct_withdrawal'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {trf.type === 'direct_withdrawal' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="font-bold text-white">{trf.notes}</div>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {trf.referenceNumber} • {trf.date} ({trf.time}) • بواسطة: {trf.transferredBy}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 font-mono shrink-0">
                        <span
                          className={`text-base font-black ${
                            trf.type === 'direct_withdrawal' ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {trf.type === 'direct_withdrawal' ? '-' : '+'}{(trf.amount ?? 0).toLocaleString()} ج.م
                        </span>
                        <div className="flex items-center gap-1 mr-2">
                          <button
                            onClick={() => generateTreasuryTransferPDF(trf)}
                            className="bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 p-1.5 rounded-lg text-xs transition active:scale-95"
                            title="طباعة السند PDF"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {onUpdateTransfer && (
                            <button
                              onClick={() => setEditingTransfer({ ...trf })}
                              className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 p-1.5 rounded-lg text-xs transition active:scale-95"
                              title="تعديل عملية الخزنة"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {onDeleteTransfer && (
                            <button
                              onClick={() => setTransferToDelete(trf)}
                              className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 p-1.5 rounded-lg text-xs transition active:scale-95"
                              title="حذف عملية الخزنة"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: NEW TRANSFER FORM */}
          {activeTab === 'new_transfer' && (
            <form onSubmit={handleFormSubmit} className="space-y-5 bg-slate-950 p-5 rounded-2xl border border-slate-800">
              <div className="border-b border-slate-800 pb-3">
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  تسجيل تحويل أو إيداع جديد بالخزنة الرئيسية
                </h4>
                <p className="text-xs text-slate-400">
                  قم باختيار الرحلة المصدر أو نوع العملية وسيتكفل النظام بتسجيلها في سجل الخزنة
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Select Trip */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">الرحلة المصدر للتحويل</label>
                  <select
                    value={selectedTripId}
                    onChange={(e) => handleTripSelect(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                  >
                    {trips.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.settings.tripName} ({t.status === 'completed' ? 'مكتملة' : 'جارية'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Transfer Type */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">نوع عملية التحويل</label>
                  <select
                    value={transferType}
                    onChange={(e) => setTransferType(e.target.value as TreasuryTransferType)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="trip_final_profit">تحويل صافي الأرباح النهائية للرحلة (بعد الانتهاء)</option>
                    <option value="partial_cash_out">تصفية سيولة نقدية جزئية من الرحلة</option>
                    <option value="direct_deposit">إيداع مباشر بالخزنة الرئيسية (رأس مال / دعم)</option>
                    <option value="direct_withdrawal">سحب / مصروفات شركة من الخزنة</option>
                  </select>
                </div>

                {/* Calculated Suggestion Box */}
                <div className="md:col-span-2 bg-slate-900 border border-amber-500/30 p-3 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <span className="text-slate-400 block">صافي أرباح السيولة المحصلة للرحلة المحددة:</span>
                    <strong className="text-amber-400 font-mono text-sm font-bold">
                      {(tripNetProfit ?? 0).toLocaleString()} ج.م
                    </strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAmount(tripNetProfit > 0 ? tripNetProfit : 0)}
                    className="bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 px-3 py-1 rounded-lg text-xs font-bold transition"
                  >
                    استخدام هذا المبلغ
                  </button>
                </div>

                {/* Amount input */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">المبلغ المحول (بالجنيه المصري)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                    placeholder="مثال: 75000"
                    required
                  />
                </div>

                {/* Transferred By */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">اسم المحوّل / المسؤول</label>
                  <input
                    type="text"
                    value={transferredBy}
                    onChange={(e) => setTransferredBy(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                {/* Notes */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1">ملاحظات التحويل والبيان</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                    placeholder="مثال: تحويل صافي أرباح رحلة رأس سدر بالكامل عقب العودة"
                  />
                </div>

                {/* Mark completed checkbox */}
                {transferType === 'trip_final_profit' && (
                  <div className="md:col-span-2 bg-indigo-950/60 border border-indigo-800 p-3 rounded-xl flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      id="markCompleted"
                      checked={markCompleted}
                      onChange={(e) => setMarkCompleted(e.target.checked)}
                      className="w-4 h-4 accent-amber-500 rounded"
                    />
                    <label htmlFor="markCompleted" className="text-indigo-200 font-bold cursor-pointer">
                      تغيير حالة هذه الرحلة تلقائياً إلى "مكتملة ومُحولة ✅"
                    </label>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className="bg-slate-900 hover:bg-slate-850 text-slate-300 px-4 py-2 rounded-xl text-xs font-bold border border-slate-800"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold px-6 py-2 rounded-xl text-xs flex items-center gap-2 transition shadow-lg shadow-amber-500/20 active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  تأكيد التحويل للخزنة الآن
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: TRANSFERS HISTORY LOG */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h4 className="text-sm font-bold text-white">سجل كافة عمليات الخزنة الرئيسية</h4>

                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-xs font-bold text-slate-300 rounded-xl px-3 py-1.5"
                >
                  <option value="all">كل الأنواع</option>
                  <option value="trip_final_profit">أرباح رحلة مكتملة</option>
                  <option value="partial_cash_out">تصفية جزئية</option>
                  <option value="direct_deposit">إيداع مباشر</option>
                  <option value="direct_withdrawal">سحب / مصروف</option>
                </select>
              </div>

              <div className="space-y-3">
                {filteredTransfers.length === 0 ? (
                  <p className="text-center py-8 text-slate-500 text-xs">لا يوجد تحويلات مسجلة.</p>
                ) : (
                  filteredTransfers.map((trf) => (
                    <div
                      key={trf.id}
                      className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                            {trf.referenceNumber}
                          </span>
                          <span className="text-xs font-bold text-white">{trf.notes}</span>
                        </div>
                        <p className="text-xs text-slate-400">الرحلة المصدر: {trf.tripName || 'الخزنة المركزية'}</p>
                        <p className="text-[11px] text-slate-500 font-mono">
                          التاريخ: {trf.date} {trf.time} • المسؤول: {trf.transferredBy}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <span
                          className={`text-lg font-black font-mono ${
                            trf.type === 'direct_withdrawal' ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {trf.type === 'direct_withdrawal' ? '-' : '+'}{(trf.amount ?? 0).toLocaleString()} ج.م
                        </span>

                        <div className="flex items-center gap-1.5 mr-2">
                          <button
                            onClick={() => generateTreasuryTransferPDF(trf)}
                            className="bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 p-2 rounded-xl text-xs flex items-center gap-1 transition active:scale-95"
                            title="طباعة سند تحويل PDF"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          {onUpdateTransfer && (
                            <button
                              onClick={() => setEditingTransfer({ ...trf })}
                              className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 p-2 rounded-xl text-xs flex items-center gap-1 transition active:scale-95"
                              title="تعديل عملية الخزنة"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}
                          {onDeleteTransfer && (
                            <button
                              onClick={() => setTransferToDelete(trf)}
                              className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 p-2 rounded-xl text-xs flex items-center gap-1 transition active:scale-95"
                              title="حذف عملية الخزنة"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* EDIT TREASURY TRANSFER MODAL */}
      {editingTransfer && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h4 className="text-base font-bold text-amber-300 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-400" />
                تعديل عملية الخزنة الرئيسية ({editingTransfer.referenceNumber})
              </h4>
              <button
                onClick={() => setEditingTransfer(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (onUpdateTransfer && editingTransfer) {
                  onUpdateTransfer(editingTransfer);
                  setEditingTransfer(null);
                }
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block text-slate-300 font-semibold mb-1">المبلغ (ج.م)</label>
                <input
                  type="number"
                  required
                  value={editingTransfer.amount}
                  onChange={(e) =>
                    setEditingTransfer({ ...editingTransfer, amount: Number(e.target.value) })
                  }
                  className="w-full bg-slate-950 border border-slate-800 text-amber-300 font-mono font-bold text-sm rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">نوع العملية</label>
                <select
                  value={editingTransfer.type}
                  onChange={(e) =>
                    setEditingTransfer({
                      ...editingTransfer,
                      type: e.target.value as TreasuryTransferType,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none"
                >
                  <option value="trip_final_profit">أرباح رحلة مكتملة (إيداع)</option>
                  <option value="partial_cash_out">تصفية جزئية (إيداع)</option>
                  <option value="direct_deposit">إيداع مباشر (إيداع)</option>
                  <option value="direct_withdrawal">سحب / مصروفات شركة (سحب 🔴)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">اسم المسؤول المحوّل</label>
                <input
                  type="text"
                  required
                  value={editingTransfer.transferredBy}
                  onChange={(e) =>
                    setEditingTransfer({ ...editingTransfer, transferredBy: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">بيان وملاحظات التحويل</label>
                <input
                  type="text"
                  value={editingTransfer.notes}
                  onChange={(e) =>
                    setEditingTransfer({ ...editingTransfer, notes: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">التاريخ</label>
                  <input
                    type="text"
                    value={editingTransfer.date}
                    onChange={(e) =>
                      setEditingTransfer({ ...editingTransfer, date: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 text-slate-300 rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">الوقت</label>
                  <input
                    type="text"
                    value={editingTransfer.time}
                    onChange={(e) =>
                      setEditingTransfer({ ...editingTransfer, time: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 text-slate-300 rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingTransfer(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 text-slate-950 font-black rounded-xl hover:bg-amber-400 transition shadow"
                >
                  حفظ التعديلات ✅
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE TREASURY TRANSFER CONFIRMATION MODAL */}
      {transferToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/40 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-2xl flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-white">تأكيد حذف عملية الخزنة</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              هل أنت متأكد من حذف السند رقم <strong className="text-amber-400 font-mono">{transferToDelete.referenceNumber}</strong> بقيمة <strong className="text-emerald-400 font-mono">{transferToDelete.amount.toLocaleString()} ج.م</strong>؟
              <br />
              سيؤدي الحذف إلى خصم/إعادة الضبط التلقائي لرصيد الخزنة الرئيسية.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setTransferToDelete(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-700 transition"
              >
                تراجع وإلغاء
              </button>
              <button
                onClick={() => {
                  if (onDeleteTransfer && transferToDelete) {
                    onDeleteTransfer(transferToDelete.id);
                    setTransferToDelete(null);
                  }
                }}
                className="px-5 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-500 transition shadow"
              >
                تأكيد الحذف النهائي 🗑️
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

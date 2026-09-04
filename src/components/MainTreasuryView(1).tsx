import React, { useState, useMemo } from 'react';
import {
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
  Search,
  Filter,
  Download,
  ShieldCheck,
  Building2,
  PieChart,
  Wallet,
  ArrowRightLeft,
  ChevronDown,
  Layers,
  BarChart3,
  Check,
  AlertCircle,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { CompanyTreasury, TreasuryTransfer, TreasuryTransferType, Trip } from '../types';
import { generateTreasuryTransferPDF, generateTreasuryFullLedgerPDF } from '../services/pdfGenerator';

interface MainTreasuryProps {
  treasury: CompanyTreasury;
  trips: Trip[];
  activeTripId: string;
  onAddTransfer: (transfer: Omit<TreasuryTransfer, 'id' | 'referenceNumber'>, markTripCompleted?: boolean) => void;
  onUpdateTransfer?: (transfer: TreasuryTransfer) => void;
  onDeleteTransfer?: (transferId: string) => void;
  companyName?: string;
}

export const MainTreasuryView: React.FC<MainTreasuryProps> = ({
  treasury,
  trips,
  activeTripId,
  onAddTransfer,
  onUpdateTransfer,
  onDeleteTransfer,
  companyName = 'شركة كيان للفعاليات والرحلات',
}) => {
  // Navigation & Sub-views
  const [activeTab, setActiveTab] = useState<'dashboard' | 'new_transfer' | 'ledger' | 'trips_analytics'>('dashboard');

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  const [tripFilter, setTripFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const activeTrip = trips.find((t) => t.id === activeTripId) || trips[0];

  // New Transfer Form state
  const [selectedTripId, setSelectedTripId] = useState<string>(activeTrip?.id || '');
  const [transferType, setTransferType] = useState<TreasuryTransferType>('trip_final_profit');
  const [amount, setAmount] = useState<number>(0);
  const [transferredBy, setTransferredBy] = useState<string>('أحمد الكياني - المسؤول المالي');
  const [notes, setNotes] = useState<string>('');
  const [markCompleted, setMarkCompleted] = useState<boolean>(true);
  const [customRefDate, setCustomRefDate] = useState<string>(new Date().toISOString().slice(0, 10));

  // Edit & Delete Modal States
  const [editingTransfer, setEditingTransfer] = useState<TreasuryTransfer | null>(null);
  const [transferToDelete, setTransferToDelete] = useState<TreasuryTransfer | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState<boolean>(false);

  // Selected Trip for Transfer Calculation
  const selectedTrip = trips.find((t) => t.id === selectedTripId) || activeTrip || trips[0];

  // Financial calculations for selected trip
  const tripCollected = selectedTrip?.students ? selectedTrip.students.reduce((sum, s) => sum + (s.paidAmount || 0), 0) : 0;
  const tripExpenses = selectedTrip?.expenses ? selectedTrip.expenses.reduce((sum, e) => sum + (e.amount || 0), 0) : 0;
  const tripNetProfit = tripCollected - tripExpenses;

  // Auto set suggested amount on trip change
  const handleTripSelect = (tripId: string) => {
    setSelectedTripId(tripId);
    const target = trips.find((t) => t.id === tripId);
    if (target) {
      const col = target.students.reduce((s, std) => s + (std.paidAmount || 0), 0);
      const exp = target.expenses.reduce((s, e) => s + (e.amount || 0), 0);
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
        tripName: selectedTrip?.settings?.tripName || 'الخزنة المركزية',
        amount,
        type: transferType,
        date: customRefDate || new Date().toISOString().slice(0, 10),
        time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        transferredBy: transferredBy || 'إدارة الشركة',
        notes: notes || `تحويل إلى الخزنة الرئيسية من ${selectedTrip?.settings?.tripName || 'الرحلة'}`,
      },
      transferType === 'trip_final_profit' && markCompleted
    );

    setActiveTab('ledger');
  };

  // Comprehensive Financial Aggregations
  const totalIn = useMemo(() => {
    return (treasury.transfers || [])
      .filter((t) => t.type !== 'direct_withdrawal')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  }, [treasury.transfers]);

  const totalOut = useMemo(() => {
    return (treasury.transfers || [])
      .filter((t) => t.type === 'direct_withdrawal')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  }, [treasury.transfers]);

  const currentBal = useMemo(() => {
    return treasury.currentBalance ?? (treasury as any)?.balance ?? (totalIn - totalOut);
  }, [treasury, totalIn, totalOut]);

  // Breakdown by Transfer Type
  const typeBreakdown = useMemo(() => {
    const tripProfits = (treasury.transfers || [])
      .filter((t) => t.type === 'trip_final_profit')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const partialCash = (treasury.transfers || [])
      .filter((t) => t.type === 'partial_cash_out')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const directDeposits = (treasury.transfers || [])
      .filter((t) => t.type === 'direct_deposit')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const companyWithdrawals = (treasury.transfers || [])
      .filter((t) => t.type === 'direct_withdrawal')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    return { tripProfits, partialCash, directDeposits, companyWithdrawals };
  }, [treasury.transfers]);

  // Filtered Transactions
  const filteredTransfers = useMemo(() => {
    return (treasury.transfers || []).filter((trf) => {
      // Filter by Type
      if (filterType !== 'all' && trf.type !== filterType) return false;

      // Filter by Trip
      if (tripFilter !== 'all' && trf.tripId !== tripFilter) return false;

      // Filter by Dates
      if (startDate && trf.date < startDate) return false;
      if (endDate && trf.date > endDate) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchRef = (trf.referenceNumber || '').toLowerCase().includes(q);
        const matchNotes = (trf.notes || '').toLowerCase().includes(q);
        const matchTrip = (trf.tripName || '').toLowerCase().includes(q);
        const matchBy = (trf.transferredBy || '').toLowerCase().includes(q);
        const matchAmount = (trf.amount || 0).toString().includes(q);
        return matchRef || matchNotes || matchTrip || matchBy || matchAmount;
      }

      return true;
    });
  }, [treasury.transfers, filterType, tripFilter, startDate, endDate, searchQuery]);

  // Trips Readiness Matrix for Transfer
  const tripsReadiness = useMemo(() => {
    return trips.map((t) => {
      const col = t.students ? t.students.reduce((s, std) => s + (std.paidAmount || 0), 0) : 0;
      const exp = t.expenses ? t.expenses.reduce((s, e) => s + (e.amount || 0), 0) : 0;
      const net = col - exp;
      const transferredToTreasury = (treasury.transfers || [])
        .filter((tr) => tr.tripId === t.id && tr.type !== 'direct_withdrawal')
        .reduce((sum, tr) => sum + (tr.amount || 0), 0);

      const remainingPending = Math.max(0, net - transferredToTreasury);

      return {
        trip: t,
        collected: col,
        expenses: exp,
        netProfit: net,
        transferred: transferredToTreasury,
        pending: remainingPending,
        isFullySettled: t.status === 'completed' && remainingPending <= 0,
      };
    });
  }, [trips, treasury.transfers]);

  const handleExportFullLedger = async (useFiltered = true) => {
    setIsExportingPDF(true);
    try {
      let filterTitle = '';
      if (useFiltered) {
        const parts: string[] = [];
        if (tripFilter !== 'all') {
          const matchedTrip = trips.find((t) => t.id === tripFilter);
          if (matchedTrip) parts.push(`رحلة: ${matchedTrip.settings.tripName}`);
        }
        if (filterType !== 'all') {
          const typeName =
            filterType === 'trip_final_profit'
              ? 'أرباح الرحلات'
              : filterType === 'partial_cash_out'
              ? 'تصفيات نقدية'
              : filterType === 'direct_deposit'
              ? 'إيداعات مباشرة'
              : 'مصروفات وسحوبات';
          parts.push(`نوع: ${typeName}`);
        }
        if (searchQuery.trim()) {
          parts.push(`بحث: "${searchQuery}"`);
        }
        filterTitle = parts.join(' • ');
      }

      const transfersToExport = useFiltered ? filteredTransfers : treasury.transfers;
      await generateTreasuryFullLedgerPDF(treasury, companyName, transfersToExport, filterTitle || undefined);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* 1. Header Hero Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none translate-x-1/3 translate-y-1/3"></div>

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm">
                <Landmark className="w-4 h-4 text-amber-400" />
                الخزنة المركزية الرئيسية لشركة كيان (Master Corporate Treasury)
              </span>
              <span className="bg-slate-800 text-slate-300 text-xs font-mono font-bold px-3 py-1.5 rounded-xl border border-slate-700">
                {companyName}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight flex items-center gap-2.5">
              الإدارة المالية المركزية وحركة السيولة النقدية
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-3xl leading-relaxed">
              إدارة ترحيل وتصفية أرباح الرحلات المنتهية، السندات المعتمدة، مصروفات الشركة التشغيلية، وكشف الحساب المالي الموحد مع إمكانية التصدير والطباعة الرسمية.
            </p>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-start lg:justify-end">
            <button
              onClick={() => {
                handleTripSelect(activeTrip.id);
                setActiveTab('new_transfer');
              }}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-2 transition shadow-lg shadow-amber-500/20 active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>إيداع / تحويل جديد 💵</span>
            </button>

            <button
              onClick={handleExportFullLedger}
              disabled={isExportingPDF}
              className="bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-2 transition active:scale-95 shadow"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>{isExportingPDF ? 'جاري التصدير...' : 'كشف حساب الخزنة PDF 🖨️'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top Financial KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Current Net Balance */}
        <div className="bg-slate-900 border border-amber-500/40 p-5 rounded-2xl shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-2 h-full bg-amber-500"></div>
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              صافي السيولة المتاحة بالخزنة
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-300 font-mono mt-2 tracking-tight">
            {currentBal.toLocaleString()} <span className="text-xs font-bold text-slate-400 font-sans">ج.م</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            الرصيد الفعلي الجاهز للصرف بالشركة
          </p>
        </div>

        {/* Metric 2: Total Deposits & Profits */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl relative overflow-hidden group hover:border-emerald-500/40 transition">
          <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500"></div>
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              إجمالي الإيداعات والأرباح (+)
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono mt-2 tracking-tight">
            +{(totalIn ?? 0).toLocaleString()} <span className="text-xs font-bold text-slate-400 font-sans">ج.م</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            من أرباح {trips.length} رحلة وتصفيات نقدية
          </p>
        </div>

        {/* Metric 3: Total Company Withdrawals */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl relative overflow-hidden group hover:border-rose-500/40 transition">
          <div className="absolute top-0 right-0 w-2 h-full bg-rose-500"></div>
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
              إجمالي السحوبات والمصروفات (-)
            </span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-400 font-mono mt-2 tracking-tight">
            -{(totalOut ?? 0).toLocaleString()} <span className="text-xs font-bold text-slate-400 font-sans">ج.م</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            مصروفات إدارية وتجهيزات الشركة
          </p>
        </div>

        {/* Metric 4: Active Trip Net Readiness */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl relative overflow-hidden group hover:border-indigo-500/40 transition">
          <div className="absolute top-0 right-0 w-2 h-full bg-indigo-500"></div>
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
              أرباح الرحلة الجارية ({activeTrip.settings.tripName?.slice(0, 15)}...)
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono mt-2 tracking-tight">
            {tripNetProfit > 0 ? `${tripNetProfit.toLocaleString()} ج.م` : '0 ج.م'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">
            جاهزة للتصفية والترحيل للخزنة
          </p>
        </div>
      </div>

      {/* 3. Section Navigation Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-900 border border-slate-800 p-2 rounded-2xl shadow-xl">
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`p-3 rounded-xl border transition flex items-center justify-center gap-2 text-xs sm:text-sm font-black ${
            activeTab === 'dashboard'
              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
              : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>1. لوحة تحكم الخزنة ومؤشرات السيولة</span>
        </button>

        <button
          type="button"
          onClick={() => {
            handleTripSelect(activeTrip.id);
            setActiveTab('new_transfer');
          }}
          className={`p-3 rounded-xl border transition flex items-center justify-center gap-2 text-xs sm:text-sm font-black ${
            activeTab === 'new_transfer'
              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
              : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          <span>2. نموذج تحويل وإيداع جديد</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ledger')}
          className={`p-3 rounded-xl border transition flex items-center justify-center gap-2 text-xs sm:text-sm font-black ${
            activeTab === 'ledger'
              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
              : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>3. كشف الحساب وسجل السندات ({treasury.transfers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('trips_analytics')}
          className={`p-3 rounded-xl border transition flex items-center justify-center gap-2 text-xs sm:text-sm font-black ${
            activeTab === 'trips_analytics'
              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
              : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>4. موقف أرباح الرحلات ومصفوفة التسوية</span>
        </button>
      </div>

      {/* 4. TAB 1: Main Dashboard Overview */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Active Trip Transfer Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-700/50 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-amber-500/20 text-amber-300 text-xs px-2.5 py-0.5 rounded-full font-bold border border-amber-500/30">
                    رحلة جاهزة للتحويل الفوري
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {activeTrip.settings.tripDate || 'تاريخ الفعالية'}
                  </span>
                </div>
                <h3 className="text-xl font-black text-white mt-1">{activeTrip.settings.tripName}</h3>
                <p className="text-xs text-slate-400">
                  الوجهة: {activeTrip.settings.destination || 'الموقع المحدد'} • إجمالي الطلاب: {activeTrip.students.length} مشترك
                </p>
              </div>

              <button
                onClick={() => {
                  handleTripSelect(activeTrip.id);
                  setActiveTab('new_transfer');
                }}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-2 transition shadow-lg shadow-amber-500/20 active:scale-95 shrink-0"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>ترحيل صافي الأرباح للخزنة الآن</span>
              </button>
            </div>

            {/* Financial Quick Grid for Active Trip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/80 p-4 rounded-xl border border-slate-800 text-center font-mono">
              <div className="p-2 border-b sm:border-b-0 sm:border-l border-slate-800">
                <span className="text-xs text-slate-400 block font-sans mb-1">المحصل من الطلاب</span>
                <strong className="text-emerald-400 text-lg font-bold">{(tripCollected ?? 0).toLocaleString()} ج.م</strong>
              </div>
              <div className="p-2 border-b sm:border-b-0 sm:border-l border-slate-800">
                <span className="text-xs text-slate-400 block font-sans mb-1">المصروفات والتجهيزات</span>
                <strong className="text-rose-400 text-lg font-bold">{(tripExpenses ?? 0).toLocaleString()} ج.م</strong>
              </div>
              <div className="p-2">
                <span className="text-xs text-slate-400 block font-sans mb-1">صافي السيولة النقدية للترحيل</span>
                <strong className="text-amber-400 text-lg font-black">{(tripNetProfit ?? 0).toLocaleString()} ج.م</strong>
              </div>
            </div>
          </div>

          {/* Breakdown by Revenue Streams Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Transfer Streams Distribution */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <h3 className="text-sm font-black text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <PieChart className="w-4 h-4 text-amber-400" />
                توزيع مصادر وتدفقات الخزنة الرئيسية
              </h3>

              <div className="space-y-3 text-xs">
                {/* 1. Trip Final Profits */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                    <div>
                      <span className="font-bold text-white block">أرباح الرحلات المكتملة 🏆</span>
                      <span className="text-[10px] text-slate-400">صافي الأرباح المحولة بعد إغلاق الفعاليات</span>
                    </div>
                  </div>
                  <span className="text-emerald-400 font-mono font-black text-sm">
                    +{typeBreakdown.tripProfits.toLocaleString()} ج.م
                  </span>
                </div>

                {/* 2. Partial Cash Outs */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-indigo-400"></div>
                    <div>
                      <span className="font-bold text-white block">تصفيات نقدية جزئية 💵</span>
                      <span className="text-[10px] text-slate-400">سحب سيولة نقدية مؤقتة من الرحلات الجارية</span>
                    </div>
                  </div>
                  <span className="text-indigo-300 font-mono font-black text-sm">
                    +{typeBreakdown.partialCash.toLocaleString()} ج.م
                  </span>
                </div>

                {/* 3. Direct Capital Deposits */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                    <div>
                      <span className="font-bold text-white block">إيداعات رأس مال ودعم مباشر 📥</span>
                      <span className="text-[10px] text-slate-400">تمويلات إضافية ومساهمات الشركاء</span>
                    </div>
                  </div>
                  <span className="text-amber-400 font-mono font-black text-sm">
                    +{typeBreakdown.directDeposits.toLocaleString()} ج.م
                  </span>
                </div>

                {/* 4. Direct Withdrawals */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-rose-400"></div>
                    <div>
                      <span className="font-bold text-white block">مصروفات وسحوبات الشركة 🔴</span>
                      <span className="text-[10px] text-slate-400">إيجارات، مرتبات، ومصروفات إدارية</span>
                    </div>
                  </div>
                  <span className="text-rose-400 font-mono font-black text-sm">
                    -{typeBreakdown.companyWithdrawals.toLocaleString()} ج.م
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Quick Recent Operations Widget */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  أحدث العمليات المقيدة بالخزنة
                </h3>
                <button
                  onClick={() => setActiveTab('ledger')}
                  className="text-xs text-amber-400 hover:underline font-bold"
                >
                  عرض السجل بالكامل ({treasury.transfers.length})
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                {treasury.transfers.slice(0, 4).map((trf) => {
                  const isOut = trf.type === 'direct_withdrawal';
                  return (
                    <div
                      key={trf.id}
                      className="bg-slate-950 border border-slate-800/80 p-3 rounded-xl flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                            isOut
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {isOut ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownLeft className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span className="font-mono text-amber-400 text-[10px] bg-slate-900 px-1 rounded border border-slate-800">
                              {trf.referenceNumber}
                            </span>
                            <span>{trf.tripName || 'الخزنة المركزية'}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {trf.date} • {trf.transferredBy}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono font-black text-sm ${
                            isOut ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {isOut ? '-' : '+'}{(trf.amount || 0).toLocaleString()} ج.م
                        </span>
                        <button
                          onClick={() => generateTreasuryTransferPDF(trf)}
                          className="bg-slate-900 hover:bg-slate-800 text-amber-400 p-1.5 rounded-lg border border-slate-800 transition"
                          title="طباعة السند"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. TAB 2: New Transfer & Deposit Form */}
      {activeTab === 'new_transfer' && (
        <form onSubmit={handleFormSubmit} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-amber-400" />
                تسجيل حركة مالية جديدة بالخزنة الرئيسية (New Transaction)
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                سند تحويل معتمد ومقيد رسمياً بدفتر الأستاذ وحسابات الشركة المركزية
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className="bg-slate-800 text-slate-300 px-3.5 py-1.5 rounded-xl text-xs font-bold hover:bg-slate-700 transition"
            >
              العودة للوحة الخزنة
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Select Trip */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">الرحلة المصدر للتحويل</label>
              <select
                value={selectedTripId}
                onChange={(e) => handleTripSelect(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-amber-500 transition"
              >
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.settings.tripName} ({t.status === 'completed' ? 'مكتملة ومغلقة ✅' : 'جارية نشطة ⏳'})
                  </option>
                ))}
              </select>
            </div>

            {/* Transfer Type */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">نوع العملية المالية</label>
              <select
                value={transferType}
                onChange={(e) => setTransferType(e.target.value as TreasuryTransferType)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-amber-500 transition"
              >
                <option value="trip_final_profit">تحويل صافي الأرباح النهائية للرحلة (بعد الانتهاء) 🏆</option>
                <option value="partial_cash_out">تصفية سيولة نقدية جزئية من الرحلة 💵</option>
                <option value="direct_deposit">إيداع مباشر بالخزنة الرئيسية (رأس مال / دعم) 📥</option>
                <option value="direct_withdrawal">سحب / مصروفات شركة من الخزنة الرئيسية 🔴</option>
              </select>
            </div>

            {/* Calculated Suggestion Box */}
            <div className="md:col-span-2 bg-slate-950 border border-amber-500/30 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <span className="text-slate-400 text-xs block">صافي أرباح السيولة المحصلة للرحلة المحددة:</span>
                <strong className="text-amber-400 font-mono text-base sm:text-lg font-black">
                  {(tripNetProfit ?? 0).toLocaleString()} ج.م
                </strong>
                <span className="text-[10px] text-slate-500 block">
                  (إجمالي المحصل {(tripCollected ?? 0).toLocaleString()} - المصروفات {(tripExpenses ?? 0).toLocaleString()})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAmount(tripNetProfit > 0 ? tripNetProfit : 0)}
                className="bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 px-3.5 py-1.5 rounded-xl text-xs font-bold transition active:scale-95"
              >
                استخدام هذا المبلغ المقترح ⚡
              </button>
            </div>

            {/* Amount input */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">المبلغ المحول (بالجنيه المصري)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-base font-mono font-black text-amber-400 focus:outline-none focus:border-amber-500 transition"
                placeholder="مثال: 75000"
                required
              />
            </div>

            {/* Transferred By */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">اسم المحوّل / المسؤول المالي</label>
              <input
                type="text"
                value={transferredBy}
                onChange={(e) => setTransferredBy(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-amber-500 transition"
                required
              />
            </div>

            {/* Date Picker */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">تاريخ الحركة</label>
              <input
                type="date"
                value={customRefDate}
                onChange={(e) => setCustomRefDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-amber-500 transition"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">البيان وملاحظات التحويل</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-amber-500 transition"
                placeholder="مثال: تحويل صافي أرباح رحلة رأس سدر بالكامل عقب العودة"
              />
            </div>

            {/* Mark completed checkbox */}
            {transferType === 'trip_final_profit' && (
              <div className="md:col-span-2 bg-indigo-950/60 border border-indigo-800 p-3.5 rounded-xl flex items-center gap-2.5 text-xs">
                <input
                  type="checkbox"
                  id="markCompletedView"
                  checked={markCompleted}
                  onChange={(e) => setMarkCompleted(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
                <label htmlFor="markCompletedView" className="text-indigo-200 font-bold cursor-pointer">
                  تغيير حالة هذه الرحلة تلقائياً إلى "مكتملة ومُحولة بالكامل للخزنة ✅"
                </label>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-5 py-2.5 rounded-xl text-xs font-bold transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-7 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-2 transition shadow-lg shadow-amber-500/20 active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>تأكيد تسجيل السند بالخزنة الآن</span>
            </button>
          </div>
        </form>
      )}

      {/* 6. TAB 3: Full Ledger & Transaction Logs */}
      {activeTab === 'ledger' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                دفتر أستاذ وسجل حركات الخزنة الرئيسية المركزية
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                سجل تفصيلي دقيق لكافة السندات المقيدة مع إمكانية الفلترة والطباعة الفردية والجماعية
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleExportFullLedger}
                disabled={isExportingPDF}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition active:scale-95 shadow"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة الكشف المالي PDF</span>
              </button>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs">
            {/* Search Box */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث برقم المرجع، البيان، المسؤول..."
                className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl pr-9 pl-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* Type Filter */}
            <div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:border-amber-500 focus:outline-none"
              >
                <option value="all">كل أنواع الحركات</option>
                <option value="trip_final_profit">أرباح رحلة مكتملة 🏆</option>
                <option value="partial_cash_out">تصفية جزئية 💵</option>
                <option value="direct_deposit">إيداع مباشر 📥</option>
                <option value="direct_withdrawal">سحب / مصروفات 🔴</option>
              </select>
            </div>

            {/* Trip Filter */}
            <div>
              <select
                value={tripFilter}
                onChange={(e) => setTripFilter(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:border-amber-500 focus:outline-none"
              >
                <option value="all">كل الرحلات المصدر</option>
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.settings.tripName}
                  </option>
                ))}
              </select>
            </div>

            {/* Reset Filters */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterType('all');
                  setTripFilter('all');
                  setStartDate('');
                  setEndDate('');
                }}
                className="w-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl py-2 font-bold transition flex items-center justify-center gap-1 border border-slate-800"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>إعادة ضبط</span>
              </button>
            </div>
          </div>

          {/* Transactions Ledger Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th className="p-3.5">#</th>
                  <th className="p-3.5">رقم المرجع</th>
                  <th className="p-3.5">التاريخ والوقت</th>
                  <th className="p-3.5">نوع الحركة</th>
                  <th className="p-3.5">الرحلة المصدر / البيان</th>
                  <th className="p-3.5">المسؤول المنفذ</th>
                  <th className="p-3.5 text-center">المبلغ (ج.م)</th>
                  <th className="p-3.5 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {filteredTransfers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      لا توجد عمليات مطابقة لمعايير البحث والفلترة.
                    </td>
                  </tr>
                ) : (
                  filteredTransfers.map((trf, idx) => {
                    const isOut = trf.type === 'direct_withdrawal';
                    const typeLabel =
                      trf.type === 'trip_final_profit'
                        ? 'أرباح رحلة مكتملة 🏆'
                        : trf.type === 'partial_cash_out'
                        ? 'تصفية جزئية 💵'
                        : trf.type === 'direct_deposit'
                        ? 'إيداع مباشر 📥'
                        : 'سحب / مصروف 🔴';

                    return (
                      <tr key={trf.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3.5 font-mono text-slate-500">{idx + 1}</td>
                        <td className="p-3.5">
                          <span className="font-mono text-xs font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg">
                            {trf.referenceNumber}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-slate-400 text-[11px]">
                          {trf.date} <span className="text-slate-500">{trf.time}</span>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold inline-block border ${
                              isOut
                                ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            }`}
                          >
                            {typeLabel}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <strong className="text-white block">{trf.tripName || 'الخزنة المركزية'}</strong>
                          <span className="text-[11px] text-slate-400">{trf.notes}</span>
                        </td>
                        <td className="p-3.5 text-slate-300 font-medium">{trf.transferredBy}</td>
                        <td className="p-3.5 text-center font-mono font-black text-sm">
                          <span className={isOut ? 'text-rose-400' : 'text-emerald-400'}>
                            {isOut ? '-' : '+'}{(trf.amount || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => generateTreasuryTransferPDF(trf)}
                              className="bg-slate-950 hover:bg-slate-800 text-amber-400 border border-slate-800 p-1.5 rounded-lg text-xs transition active:scale-95"
                              title="طباعة السند PDF"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            {onUpdateTransfer && (
                              <button
                                onClick={() => setEditingTransfer({ ...trf })}
                                className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 p-1.5 rounded-lg text-xs transition active:scale-95"
                                title="تعديل السند"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {onDeleteTransfer && (
                              <button
                                onClick={() => setTransferToDelete(trf)}
                                className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 p-1.5 rounded-lg text-xs transition active:scale-95"
                                title="حذف السند"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. TAB 4: Trips Profit Matrix & Settlement Tracker */}
      {activeTab === 'trips_analytics' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <PieChart className="w-5 h-5 text-indigo-400" />
              مصفوفة تسوية أرباح الرحلات المنعقدة بالشركة ({trips.length} رحلات)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              متابعة موقف ترحيل أرباح كل رحلة إلى الخزنة المركزية ومعرفة المتبقي المعلق
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tripsReadiness.map((item) => {
              const { trip, collected, expenses, netProfit, transferred, pending, isFullySettled } = item;

              return (
                <div
                  key={trip.id}
                  className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition relative overflow-hidden"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isFullySettled
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : pending > 0
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {isFullySettled
                          ? 'مكتملة ومرحلة بالكامل ✅'
                          : pending > 0
                          ? 'أرباح جاهزة للترحيل ⏳'
                          : 'رحلة جارية'}
                      </span>
                      <h4 className="text-base font-black text-white mt-1.5">{trip.settings.tripName}</h4>
                      <p className="text-xs text-slate-400">{trip.settings.tripDate || 'تاريخ غير محدد'}</p>
                    </div>

                    <span className="text-xs font-mono font-bold bg-slate-900 px-2 py-1 rounded-lg border border-slate-800 text-slate-300">
                      👥 {trip.students.length} طالب
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans">المحصل الإجمالي</span>
                      <strong className="text-slate-200">{collected.toLocaleString()} ج.م</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans">المصروفات</span>
                      <strong className="text-rose-400">{expenses.toLocaleString()} ج.م</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans">صافي الربح</span>
                      <strong className="text-emerald-400 font-bold">{netProfit.toLocaleString()} ج.م</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans">المُرحل للخزنة</span>
                      <strong className="text-amber-400 font-bold">{transferred.toLocaleString()} ج.م</strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                    <div>
                      <span className="text-[10px] text-slate-400 block">المتبقي المعلق:</span>
                      <strong className={`font-mono text-sm font-black ${pending > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                        {pending.toLocaleString()} ج.م
                      </strong>
                    </div>

                    {pending > 0 ? (
                      <button
                        onClick={() => {
                          handleTripSelect(trip.id);
                          setActiveTab('new_transfer');
                        }}
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 transition active:scale-95 shadow"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        <span>تحويل الأرباح</span>
                      </button>
                    ) : (
                      <span className="text-emerald-400 text-xs font-bold flex items-center gap-1">
                        <Check className="w-4 h-4" />
                        <span>تمت التسوية</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* EDIT TREASURY TRANSFER MODAL */}
      {editingTransfer && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h4 className="text-base font-bold text-amber-300 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-400" />
                تعديل سند الخزنة الرئيسية ({editingTransfer.referenceNumber})
              </h4>
              <button
                onClick={() => setEditingTransfer(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
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
            <h4 className="text-base font-bold text-white">تأكيد حذف سند الخزنة</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              هل أنت متأكد من حذف السند رقم <strong className="text-amber-400 font-mono">{transferToDelete.referenceNumber}</strong> بقيمة <strong className="text-emerald-400 font-mono">{transferToDelete.amount.toLocaleString()} ج.م</strong>؟
              <br />
              سيؤدي الحذف إلى تعديل رصيد الخزنة المركزية تلقائياً.
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

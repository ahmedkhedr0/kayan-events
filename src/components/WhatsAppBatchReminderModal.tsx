import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  Settings,
  Sparkles,
  Pause,
  Play,
  Download,
  ShieldCheck,
  Smartphone,
  Server,
  FileText,
  UserCheck,
  Zap,
  Filter,
  Key,
  MapPin,
  Bus,
  Calendar,
  MessageSquare,
  Users,
  Copy,
  Info
} from 'lucide-react';
import { Student, TripSettings } from '../types';
import {
  MetaWhatsAppConfig,
  WhatsAppMessageResult,
  BroadcastCategory,
  BroadcastParams,
  BROADCAST_CATEGORY_DETAILS,
  buildBroadcastText,
  loadMetaWhatsAppConfig,
  saveMetaWhatsAppConfig,
  sendSingleWhatsAppCloudApi,
} from '../services/whatsappCloudApi';

interface WhatsAppBatchReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  settings: TripSettings;
}

export const WhatsAppBatchReminderModal: React.FC<WhatsAppBatchReminderModalProps> = ({
  isOpen,
  onClose,
  students,
  settings,
}) => {
  const [activeTab, setActiveTab] = useState<'dispatch' | 'settings'>('dispatch');
  const [config, setConfig] = useState<MetaWhatsAppConfig>(loadMetaWhatsAppConfig());

  // Broadcast category & parameter state
  const [selectedCategory, setSelectedCategory] = useState<BroadcastCategory>('assembly_reminder');
  const [broadcastParams, setBroadcastParams] = useState<BroadcastParams>({
    category: 'assembly_reminder',
    assemblyTime: settings.assemblyTime || '06:00 صباحاً',
    assemblyLocation: settings.assemblyLocation || settings.destination || 'بوابة الجامعة الرئيسية',
    driverName: 'كابتن الرحلة',
    busNotes: 'التواجد قبل التحرك بـ 15 دقيقة والتأكد من الأمتعة',
    destinationName: settings.destination || 'الفندق / القرية السياحية',
    pickupType: 'استلام مفاتيح الغرف وتذاكر الدخول',
    pickupLocation: 'ريسبشن الفندق الرئيسي',
    supervisorName: settings.supportPhone || 'مشرف الرحلة',
    returnTime: '05:00 مساءً',
    returnLocation: 'أمام الباب الرئيسي للفندق',
    customSubject: 'تنبيه عاجل لمشتركي الرحلة',
    customBody: `أهلاً بك يا {name} 👋

تنبيه هام وعاجل بخصوص {trip}:
نود إحاطتكم علماً بأنه تقرر [اكتب تفاصيل التنبيه هنا].

نتمنى لكم جميعاً وقتاً سعيداً! ✨`,
  });

  // Target audience filter state
  const [targetFilter, setTargetFilter] = useState<'all' | 'bus' | 'paid' | 'unpaid'>('all');
  const [selectedBusFilter, setSelectedBusFilter] = useState<string>('all');

  // Dispatch Queue State
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<WhatsAppMessageResult[]>([]);

  const stopRequestedRef = useRef(false);
  const isPausedRef = useRef(false);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      const loaded = loadMetaWhatsAppConfig();
      setConfig(loaded);
      setBroadcastParams((prev) => ({
        ...prev,
        assemblyTime: settings.assemblyTime || prev.assemblyTime || '06:00 صباحاً',
        assemblyLocation: settings.assemblyLocation || settings.destination || prev.assemblyLocation || 'بوابة الجامعة الرئيسية',
        destinationName: settings.destination || prev.destinationName || 'مقر الإقامة والوجهة',
      }));
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  // Derive unique bus list
  const availableBuses = Array.from(new Set(students.map((s) => s.busNumber).filter(Boolean)));

  // Filter students according to target filter
  const targetStudents = students.filter((student) => {
    if (targetFilter === 'bus' && selectedBusFilter !== 'all') {
      return String(student.busNumber) === String(selectedBusFilter);
    }
    if (targetFilter === 'paid') {
      return student.paymentStatus === 'مكتمل' || student.remainingAmount === 0;
    }
    if (targetFilter === 'unpaid') {
      return (student.remainingAmount || 0) > 0 || student.paymentStatus === 'متبقي';
    }
    return true;
  });

  const totalTargetCount = targetStudents.length;
  const successCount = results.filter((r) => r.status === 'success').length;
  const failureCount = results.filter((r) => r.status === 'failed').length;
  const progressPercent = totalTargetCount > 0 ? Math.round((results.length / totalTargetCount) * 100) : 0;

  // Sample student preview
  const sampleStudent: Student = targetStudents[0] || {
    id: 'sample-1',
    name: 'أحمد محمود العبد',
    phone: '01012345678',
    nationalId: '30000000000000',
    busNumber: '1',
    seatNumber: '12',
    ticketNumber: 'KY-102',
    totalPrice: 1500,
    paidAmount: 1500,
    remainingAmount: 0,
    paymentStatus: 'مكتمل',
    attendanceStatus: 'حاضر',
  };

  const samplePreviewText = buildBroadcastText(sampleStudent, settings, {
    ...broadcastParams,
    category: selectedCategory,
  });

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveMetaWhatsAppConfig(config);

    fetch('/api/whatsapp/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    }).catch((err) => console.error('Error syncing config to server:', err));

    alert('تم حفظ وتحديث إعدادات Meta WhatsApp API بنجاح ✅');
    setActiveTab('dispatch');
  };

  const startBatchDispatch = async () => {
    if (targetStudents.length === 0) {
      alert('لا يوجد مشتركين ينطبق عليهم الفلتر المحدد لإرسال الرسالة.');
      return;
    }

    setIsProcessing(true);
    setIsPaused(false);
    stopRequestedRef.current = false;
    isPausedRef.current = false;
    setResults([]);
    setCurrentIndex(0);

    const activeParams: BroadcastParams = {
      ...broadcastParams,
      category: selectedCategory,
    };

    const newResults: WhatsAppMessageResult[] = [];

    for (let i = 0; i < targetStudents.length; i++) {
      if (stopRequestedRef.current) break;

      while (isPausedRef.current) {
        await new Promise((res) => setTimeout(res, 300));
        if (stopRequestedRef.current) break;
      }

      if (stopRequestedRef.current) break;

      setCurrentIndex(i);
      const student = targetStudents[i];

      // Mark sending
      const pendingResult: WhatsAppMessageResult = {
        studentId: student.id,
        studentName: student.name,
        phone: student.phone,
        status: 'sending',
      };
      setResults([...newResults, pendingResult]);

      // Execute Meta Cloud API Call
      const res = await sendSingleWhatsAppCloudApi(student, settings, config, activeParams);
      newResults.push(res);
      setResults([...newResults]);

      // Delay between requests to respect Meta API rate limits
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    setIsProcessing(false);
    setIsPaused(false);
  };

  const handlePause = () => setIsPaused(true);
  const handleResume = () => setIsPaused(false);
  const handleStop = () => {
    stopRequestedRef.current = true;
    setIsProcessing(false);
    setIsPaused(false);
  };

  const handleExportCSV = () => {
    if (results.length === 0) {
      alert('لا توجد نتائج تصدير حالياً');
      return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
    csvContent += 'اسم الطالب,رقم الهاتف,نوع الرسالة,الحالة,كود Meta WAMID,تاريخ ووقت الإرسال,ملاحظات\n';

    results.forEach((r) => {
      const statusText = r.status === 'success' ? 'تم الإرسال بنجاح' : 'فشل الإرسال';
      csvContent += `"${r.studentName}","${r.phone}","${BROADCAST_CATEGORY_DETAILS[selectedCategory].title}","${statusText}","${r.messageId || ''}","${r.timestamp || ''}","${r.error || ''}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Kayan_WhatsApp_Broadcast_${selectedCategory}_${settings.tripName.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const appendCustomTag = (tag: string) => {
    setBroadcastParams((prev) => ({
      ...prev,
      customBody: (prev.customBody || '') + ` ${tag} `,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 p-4 sm:p-5 border-b border-slate-800 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
              <Zap className="w-6 h-6 animate-pulse text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Meta Official Cloud API
                </span>
                <span className="text-xs text-slate-400 font-mono">REST Broadcast v2.0</span>
              </div>
              <h3 className="text-base sm:text-xl font-black text-white mt-0.5">
                مركز البث الفوري الموحد للواتساب (تجمع • وصول • استلام غرف • عودة)
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isProcessing && !isPaused}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Bar */}
        <div className="bg-slate-950/90 p-3 px-4 sm:px-6 border-b border-slate-800 flex justify-between items-center gap-2 shrink-0 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('dispatch')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'dispatch'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>منصة الإرسال والبث ({targetStudents.length} مستهدف)</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'settings'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>إعدادات السيرفر والمفاتيح</span>
            </button>
          </div>

          {results.length > 0 && (
            <button
              onClick={handleExportCSV}
              className="bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>تصدير تقرير الإرسال CSV</span>
            </button>
          )}
        </div>

        {/* Modal Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'dispatch' && (
            <>
              {/* Category Selector Cards */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" /> اختر نوع رسالة البث الفوري المطلوبة:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {(Object.keys(BROADCAST_CATEGORY_DETAILS) as BroadcastCategory[]).map((catKey) => {
                    const cat = BROADCAST_CATEGORY_DETAILS[catKey];
                    const isSelected = selectedCategory === catKey;
                    return (
                      <button
                        key={catKey}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(catKey);
                          setBroadcastParams((prev) => ({ ...prev, category: catKey }));
                        }}
                        disabled={isProcessing}
                        className={`p-3 rounded-2xl border text-right transition flex flex-col justify-between relative overflow-hidden ${
                          isSelected
                            ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-500/10'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                        }`}
                      >
                        <div>
                          <div className="text-xl mb-1">{cat.icon}</div>
                          <h5 className="font-bold text-xs leading-tight">{cat.title}</h5>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-tight">
                          {cat.description}
                        </p>
                        {isSelected && (
                          <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Target Audience Filter Bar */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold text-slate-200">تحديد الجمهور المستهدف:</span>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <select
                    value={targetFilter}
                    onChange={(e: any) => setTargetFilter(e.target.value)}
                    disabled={isProcessing}
                    className="bg-slate-900 border border-slate-800 text-white text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="all">جميع المشتركين ({students.length})</option>
                    <option value="bus">تصفية برقم الأتوبيس 🚌</option>
                    <option value="paid">المسددين بالكامل فقط ✅</option>
                    <option value="unpaid">أصحاب المبالغ المتبقية 💵</option>
                  </select>

                  {targetFilter === 'bus' && (
                    <select
                      value={selectedBusFilter}
                      onChange={(e) => setSelectedBusFilter(e.target.value)}
                      disabled={isProcessing}
                      className="bg-slate-900 border border-indigo-500/50 text-indigo-300 text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-none"
                    >
                      <option value="all">كل الأتوبيسات</option>
                      {availableBuses.map((bus) => (
                        <option key={bus} value={bus}>
                          أتوبيس رقم ({bus})
                        </option>
                      ))}
                    </select>
                  )}

                  <span className="text-xs text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl">
                    المستهدفين الآن: {targetStudents.length} شخص
                  </span>
                </div>
              </div>

              {/* Category-Specific Inputs Panel */}
              <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-4">
                <h5 className="text-xs font-bold text-indigo-300 flex items-center gap-2 border-b border-slate-800/80 pb-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  تخصيص متغيرات رسالة: ({BROADCAST_CATEGORY_DETAILS[selectedCategory].title})
                </h5>

                {/* 1. Assembly Category */}
                {selectedCategory === 'assembly_reminder' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">موعد التجمع والدخول</label>
                      <input
                        type="text"
                        value={broadcastParams.assemblyTime || ''}
                        onChange={(e) => setBroadcastParams({ ...broadcastParams, assemblyTime: e.target.value })}
                        placeholder="مثال: 06:00 صباحاً"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-bold focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">نقطة ومكان الانطلاق</label>
                      <input
                        type="text"
                        value={broadcastParams.assemblyLocation || ''}
                        onChange={(e) => setBroadcastParams({ ...broadcastParams, assemblyLocation: e.target.value })}
                        placeholder="مثال: بوابة الجامعة الرئيسية أمام المسجد"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-bold focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* 2. Bus Departure Category */}
                {selectedCategory === 'bus_departure' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">اسم كابتن الحافلة / السائق</label>
                      <input
                        type="text"
                        value={broadcastParams.driverName || ''}
                        onChange={(e) => setBroadcastParams({ ...broadcastParams, driverName: e.target.value })}
                        placeholder="مثال: كابتن محمد الشريف"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-bold focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">توجيهات الطريق والأمتعة</label>
                      <input
                        type="text"
                        value={broadcastParams.busNotes || ''}
                        onChange={(e) => setBroadcastParams({ ...broadcastParams, busNotes: e.target.value })}
                        placeholder="مثال: يرجى ربط الحزام والرجوع للمشرف للضرورة"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-bold focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* 3. Destination Arrival Category */}
                {selectedCategory === 'destination_arrival' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">اسم الوجهة / الفندق / القرية</label>
                      <input
                        type="text"
                        value={broadcastParams.destinationName || ''}
                        onChange={(e) => setBroadcastParams({ ...broadcastParams, destinationName: e.target.value })}
                        placeholder="مثال: فندق هيلتون دهب / محمية راس محمد"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-bold focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">نقطة التجمع الفورية بالوجهة</label>
                      <input
                        type="text"
                        value={broadcastParams.pickupLocation || ''}
                        onChange={(e) => setBroadcastParams({ ...broadcastParams, pickupLocation: e.target.value })}
                        placeholder="مثال: بهو الفندق الرئيسي / الريسبشن"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-bold focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* 4. Reception / Pickup Category */}
                {selectedCategory === 'reception_pickup' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">نوع الاستلام والتسليم</label>
                      <input
                        type="text"
                        value={broadcastParams.pickupType || ''}
                        onChange={(e) => setBroadcastParams({ ...broadcastParams, pickupType: e.target.value })}
                        placeholder="مثال: استلام الغرف والمفاتيح / كروت الدخول"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-bold focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">مكان ونقطة الاستلام</label>
                      <input
                        type="text"
                        value={broadcastParams.pickupLocation || ''}
                        onChange={(e) => setBroadcastParams({ ...broadcastParams, pickupLocation: e.target.value })}
                        placeholder="مثال: مكتب الاستقبال بمنتصف القاعة"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-bold focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">المشرف المسؤول عن التسليم</label>
                      <input
                        type="text"
                        value={broadcastParams.supervisorName || ''}
                        onChange={(e) => setBroadcastParams({ ...broadcastParams, supervisorName: e.target.value })}
                        placeholder="مثال: أ. محمود السكندري (01012345678)"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-bold focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* 5. Return Assembly Category */}
                {selectedCategory === 'return_assembly' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">موعد تجمع العودة</label>
                      <input
                        type="text"
                        value={broadcastParams.returnTime || ''}
                        onChange={(e) => setBroadcastParams({ ...broadcastParams, returnTime: e.target.value })}
                        placeholder="مثال: 05:00 مساءً"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-bold focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">مكان وجود الحافلات للعودة</label>
                      <input
                        type="text"
                        value={broadcastParams.returnLocation || ''}
                        onChange={(e) => setBroadcastParams({ ...broadcastParams, returnLocation: e.target.value })}
                        placeholder="مثال: البارك الخارجي للفندق"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-bold focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* 6. Custom Broadcast Editor */}
                {selectedCategory === 'custom_broadcast' && (
                  <div className="space-y-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="block text-slate-300 font-bold">محرر الرسالة الحرة المخصصة</label>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400">إدراج متغير تلقائي:</span>
                        <button
                          type="button"
                          onClick={() => appendCustomTag('{name}')}
                          className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-400 rounded-lg text-[10px] font-mono"
                        >
                          + &#123;name&#125;
                        </button>
                        <button
                          type="button"
                          onClick={() => appendCustomTag('{trip}')}
                          className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-400 rounded-lg text-[10px] font-mono"
                        >
                          + &#123;trip&#125;
                        </button>
                        <button
                          type="button"
                          onClick={() => appendCustomTag('{bus}')}
                          className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-400 rounded-lg text-[10px] font-mono"
                        >
                          + &#123;bus&#125;
                        </button>
                        <button
                          type="button"
                          onClick={() => appendCustomTag('{seat}')}
                          className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-400 rounded-lg text-[10px] font-mono"
                        >
                          + &#123;seat&#125;
                        </button>
                      </div>
                    </div>

                    <textarea
                      rows={5}
                      value={broadcastParams.customBody || ''}
                      onChange={(e) => setBroadcastParams({ ...broadcastParams, customBody: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white font-sans text-xs leading-relaxed focus:border-indigo-500 focus:outline-none"
                      placeholder="اكتب رسالتك الحرة هنا..."
                    />
                  </div>
                )}
              </div>

              {/* Dynamic Live Preview Box */}
              <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <h5 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-400" /> معاينة الرسالة الحية
                    تفاعلياً للمشترك العينة ({sampleStudent.name})
                  </h5>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    Live Preview
                  </span>
                </div>

                <div className="bg-slate-900 border border-emerald-900/30 rounded-xl p-3.5 text-xs text-slate-100 font-sans leading-relaxed whitespace-pre-wrap shadow-inner">
                  {samplePreviewText}
                </div>
              </div>

              {/* Main Launch Button & Progress Bar */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h5 className="text-sm font-bold text-white flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-indigo-400" /> إطلاق البث الفوري الموحد عبر Meta REST API
                    </h5>
                    <p className="text-xs text-slate-400">
                      سيتم إرسال نوع ({BROADCAST_CATEGORY_DETAILS[selectedCategory].title}) لـ{' '}
                      <strong className="text-amber-400 font-bold">{targetStudents.length} شخص</strong> بالتوالي.
                    </p>
                  </div>

                  {!isProcessing ? (
                    <button
                      onClick={startBatchDispatch}
                      className="bg-gradient-to-r from-emerald-600 via-indigo-600 to-indigo-500 hover:from-emerald-500 hover:to-indigo-400 text-white font-black px-6 py-3 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-600/30 active:scale-95 w-full sm:w-auto"
                    >
                      <Zap className="w-4 h-4 text-amber-300 animate-bounce" />
                      إرسال البث الفوري ({targetStudents.length} شخص) الآن 🚀
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      {!isPaused ? (
                        <button
                          onClick={handlePause}
                          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition"
                        >
                          <Pause className="w-4 h-4" /> إيقاف مؤقت
                        </button>
                      ) : (
                        <button
                          onClick={handleResume}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition"
                        >
                          <Play className="w-4 h-4" /> استئناف
                        </button>
                      )}

                      <button
                        onClick={handleStop}
                        className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition"
                      >
                        <X className="w-4 h-4" /> إلغاء العملية
                      </button>
                    </div>
                  )}
                </div>

                {/* Progress Tracking Bar */}
                {(isProcessing || results.length > 0) && (
                  <div className="space-y-3 pt-2 border-t border-slate-800">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-slate-300">
                        مستوى إنجاز البث: {progressPercent}% ({results.length} / {totalTargetCount})
                      </span>
                      {isProcessing && (
                        <span className="text-indigo-400 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
                          جاري معالجة المشترك رقم {currentIndex + 1}...
                        </span>
                      )}
                    </div>

                    <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden border border-slate-800">
                      <div
                        className="bg-gradient-to-r from-indigo-600 via-amber-500 to-emerald-400 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      ></div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center text-xs font-mono">
                      <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-sans">إجمالي المستهدف</span>
                        <span className="text-white font-black text-sm">{totalTargetCount}</span>
                      </div>
                      <div className="bg-slate-900 p-2.5 rounded-xl border border-emerald-900/40">
                        <span className="text-[10px] text-emerald-400 block font-sans">نجاح الإرسال ✅</span>
                        <span className="text-emerald-400 font-black text-sm">{successCount}</span>
                      </div>
                      <div className="bg-slate-900 p-2.5 rounded-xl border border-rose-900/40">
                        <span className="text-[10px] text-rose-400 block font-sans">فشل الإرسال ❌</span>
                        <span className="text-rose-400 font-black text-sm">{failureCount}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Delivery Logs Table */}
              {results.length > 0 && (
                <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden space-y-2">
                  <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex justify-between items-center">
                    <h5 className="text-xs font-bold text-white flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-amber-400" /> سجل حالة تسليم البث المباشر
                    </h5>
                    <span className="text-[10px] text-slate-400 font-mono">
                      مكتمل: {results.length}/{totalTargetCount}
                    </span>
                  </div>

                  <div className="max-h-60 overflow-y-auto p-2">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-800/60 pb-2">
                          <th className="p-2 font-bold">المشترك</th>
                          <th className="p-2 font-bold">الهاتف</th>
                          <th className="p-2 font-bold">الحالة</th>
                          <th className="p-2 font-bold">كود Meta WAMID</th>
                          <th className="p-2 font-bold">الوقت</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900/80">
                        {results.map((res, idx) => (
                          <tr key={res.studentId || idx} className="hover:bg-slate-900/50">
                            <td className="p-2 font-bold text-white">{res.studentName}</td>
                            <td className="p-2 font-mono text-slate-300">{res.phone}</td>
                            <td className="p-2">
                              {res.status === 'success' && (
                                <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 text-[10px] inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> تم الإرسال
                                </span>
                              )}
                              {res.status === 'failed' && (
                                <span className="text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20 text-[10px] inline-flex items-center gap-1" title={res.error}>
                                  <AlertCircle className="w-3 h-3" /> فشل ({res.error || 'خطأ'})
                                </span>
                              )}
                              {res.status === 'sending' && (
                                <span className="text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20 text-[10px] inline-flex items-center gap-1">
                                  <Clock className="w-3 h-3 animate-spin" /> جاري الإرسال...
                                </span>
                              )}
                            </td>
                            <td className="p-2 font-mono text-[10px] text-slate-400 truncate max-w-[120px]">
                              {res.messageId || '-'}
                            </td>
                            <td className="p-2 font-mono text-[10px] text-slate-400">{res.timestamp || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* TAB 2: META REST API CONFIGURATION */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSaveSettings} className="space-y-4 bg-slate-950 p-5 rounded-2xl border border-slate-800">
              <div className="border-b border-slate-800 pb-3">
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <Server className="w-5 h-5 text-indigo-400" /> إعدادات بيئة Meta WhatsApp Official Cloud API
                </h4>
                <p className="text-xs text-slate-400">
                  قم بإدخال بيانات الاعتماد الخاصة بـ Facebook Developer Portal للربط المباشر مع خوادم الواتساب الرسمية.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Phone Number ID (معرّف الرقم)</label>
                  <input
                    type="text"
                    value={config.phoneNumberId}
                    onChange={(e) => setConfig({ ...config, phoneNumberId: e.target.value })}
                    placeholder="مثال: 100609346382901"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-mono focus:border-indigo-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Business Account ID (معرّف حساب الأعمال)</label>
                  <input
                    type="text"
                    value={config.businessAccountId}
                    onChange={(e) => setConfig({ ...config, businessAccountId: e.target.value })}
                    placeholder="اختياري"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-slate-300 font-bold mb-1">
                    Meta Permanent Access Token (رمز الوصول الدائم)
                  </label>
                  <textarea
                    rows={3}
                    value={config.accessToken}
                    onChange={(e) => setConfig({ ...config, accessToken: e.target.value })}
                    placeholder="EAAG..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-mono text-xs focus:border-indigo-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    عند ترك الرمز فارغاً، يتم التبديل آلياً إلى نظام المحاكاة السريع المدمج للاختبار الآمن.
                  </p>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">اسم قالب القوالب المعتمد (Template Name)</label>
                  <input
                    type="text"
                    value={config.templateName}
                    onChange={(e) => setConfig({ ...config, templateName: e.target.value })}
                    placeholder="trip_assembly_reminder"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-mono focus:border-indigo-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">رمز اللغة (Language Code)</label>
                  <select
                    value={config.languageCode}
                    onChange={(e) => setConfig({ ...config, languageCode: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-bold focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="ar">العربية (ar)</option>
                    <option value="en_US">الإنجليزية (en_US)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('dispatch')}
                  className="bg-slate-900 text-slate-300 px-4 py-2 rounded-xl text-xs font-bold border border-slate-800"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-6 py-2 rounded-xl text-xs shadow-lg shadow-indigo-600/20 active:scale-95"
                >
                  حفظ الإعدادات والتفعيل
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

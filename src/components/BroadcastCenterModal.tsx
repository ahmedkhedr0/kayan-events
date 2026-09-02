import React, { useState, useMemo } from 'react';
import {
  Send,
  Users,
  Copy,
  Check,
  Filter,
  Sparkles,
  MessageSquare,
  Bus,
  Shirt,
  DollarSign,
  X,
  ExternalLink,
  CheckCircle2,
  Clock,
  Search,
  ChevronLeft,
} from 'lucide-react';
import { Student, TripSettings } from '../types';

interface BroadcastCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  settings: TripSettings;
}

type AudienceFilter = 'all' | 'bus' | 'unpaid' | 'tshirt_pending' | 'departure_checked' | 'departure_absent';

export const BroadcastCenterModal: React.FC<BroadcastCenterModalProps> = ({
  isOpen,
  onClose,
  students,
  settings,
}) => {
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>('all');
  const [selectedBusNumber, setSelectedBusNumber] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Template selection
  const [selectedTemplate, setSelectedTemplate] = useState<
    'custom' | 'general_alert' | 'assembly_info' | 'ticket_pass' | 'tshirt_notice' | 'payment_reminder'
  >('assembly_info');

  // Custom text template with placeholder tags
  const [customMessageTemplate, setCustomMessageTemplate] = useState<string>(
    `📢 *تنبيه هام لجميع المشاركين في {اسم_الرحلة}* 📢\n\nمرحباً {اسم_الطالب} 👋\nنود تذكيركم بموعد تجمع الرحلة في *{تاريخ_الرحلة}* الساعة *{ساعة_التجمع}* صباحاً.\n\n📍 *مكان التجمع:* {مكان_التجمع}\n🚌 *الأتوبيس الخاص بك:* أتوبيس رقم ({رقم_الأتوبيس})\n💺 *رقم المقعد:* #{رقم_المقعد}\n🎟️ *كود التذكرة:* [{كود_التذكرة}]\n\nيرجى التواجد في الموعد المحدد لضمان الانطلاق بالجدول الزمني المحدد. نتمنى لكم رحلة ممتعة مع كيان! 🎉`
  );

  // Track sent status in this session
  const [sentStudentIds, setSentStudentIds] = useState<Record<string, boolean>>({});
  const [copiedNumbers, setCopiedNumbers] = useState(false);
  const [activePreviewStudentId, setActivePreviewStudentId] = useState<string | null>(null);

  // Filtered Students according to audience choice
  const targetStudents = useMemo(() => {
    return students.filter((s) => {
      // Search
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.phone.includes(searchQuery) ||
        s.ticketCode.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (audienceFilter === 'bus') {
        return s.busNumber === selectedBusNumber;
      }
      if (audienceFilter === 'unpaid') {
        return s.paymentStatus !== 'paid' && s.remainingAmount > 0;
      }
      if (audienceFilter === 'tshirt_pending') {
        return !s.tshirtReceived;
      }
      if (audienceFilter === 'departure_checked') {
        return s.checkInDeparture;
      }
      if (audienceFilter === 'departure_absent') {
        return !s.checkInDeparture;
      }
      return true;
    });
  }, [students, audienceFilter, selectedBusNumber, searchQuery]);

  if (!isOpen) return null;

  // Helper to personalize message template for a specific student
  const compileMessageForStudent = (student: Student) => {
    let msg = customMessageTemplate;
    msg = msg.replace(/\{اسم_الطالب\}/g, student.name);
    msg = msg.replace(/\{كود_التذكرة\}/g, student.ticketCode);
    msg = msg.replace(/\{رقم_الأتوبيس\}/g, `أتوبيس ${student.busNumber}`);
    msg = msg.replace(/\{رقم_المقعد\}/g, student.seatNumber ? `${student.seatNumber}` : 'سيحدد عند الصعود');
    msg = msg.replace(/\{مقاس_التيشرت\}/g, student.tshirtSize || 'L');
    msg = msg.replace(/\{المبلغ_المتبقي\}/g, `${student.remainingAmount} ج.م`);
    msg = msg.replace(/\{اسم_الرحلة\}/g, settings.tripName || 'رحلة كيان');
    msg = msg.replace(/\{تاريخ_الرحلة\}/g, settings.tripDate || 'اليوم المحدد');
    msg = msg.replace(/\{ساعة_التجمع\}/g, settings.assemblyTime || '6:00 AM');
    msg = msg.replace(/\{مكان_التجمع\}/g, settings.assemblyLocation || 'أمام البوابة الرئيسية');
    msg = msg.replace(/\{رابط_الواتساب\}/g, settings.whatsappGroupLink || '');
    return msg;
  };

  // Change preset template
  const handleSelectPresetTemplate = (presetKey: typeof selectedTemplate) => {
    setSelectedTemplate(presetKey);
    if (presetKey === 'assembly_info') {
      setCustomMessageTemplate(
        `📢 *تنبيه موعد ومكان التجمع وانطلاق الرحلة* 🚌\n✨ KAYAN EVENTS & TRAVELS ✨\n\nمرحباً عزيزي الطالب: *{اسم_الطالب}* 👋\n\nنود إعلامكم بالتفاصيل النهائية لانطلاق *{اسم_الرحلة}*:\n\n📅 *تاريخ الرحلة:* {تاريخ_الرحلة}\n⏰ *ساعة التجمع:* {ساعة_التجمع} صباحاً\n📍 *نقطة التجمع:* {مكان_التجمع}\n\n💺 *بياناتك الشخصية في الحافلة:*\n• الأتوبيس: *أتوبيس رقم ({رقم_الأتوبيس})*\n• رقم المقعد: *#{رقم_المقعد}*\n• كود التذكرة: \`[ {كود_التذكرة} ]\`\n\nنتمنى لكم يوماً رائعاً ورحلة ممتعة معنا! 🎉`
      );
    } else if (presetKey === 'ticket_pass') {
      setCustomMessageTemplate(
        `🎟️ *تذكرتك الرقمية الرسمية مع كيان* 🎟️\n✨ KAYAN EVENTS & TRAVELS ✨\n\nمرحباً *{اسم_الطالب}* 👋\nإليك بيانات تذكرتك الخاصة برحلة *{اسم_الرحلة}*:\n\n• كود التذكرة: *{كود_التذكرة}*\n• الأتوبيس: *أتوبيس رقم ({رقم_الأتوبيس})*\n• المقعد: *#{رقم_المقعد}*\n• مقاس التيشرت: *{مقاس_التيشرت}*\n\nيرجى إبراز هذه التذكرة أو الكود عند بوابات الصعود للأتوبيس. نتمنى لك رحلة سعيدة! 🥳`
      );
    } else if (presetKey === 'tshirt_notice') {
      setCustomMessageTemplate(
        `👕 *تنبيه استلام تيشرت الرحلة الرسمي* 👕\n\nمرحباً *{اسم_الطالب}* 👋\nتذكر استلام التيشرت الخاص بك بمقاس *({مقاس_التيشرت})* من مشرف أتوبيسك (*{رقم_الأتوبيس}*) فور الوصول لنقطة التجمع.\n\nرحلة سعيدة وموفقة! 🌟`
      );
    } else if (presetKey === 'payment_reminder') {
      setCustomMessageTemplate(
        `💰 *تذكير بسداد المتبقي من رسوم الرحلة* 💰\n\nمرحباً *{اسم_الطالب}* 👋\nنود تذكيرك بوجود مبلغ متبقي عليك بقيمة *({المبلغ_المتبقي})* لرحلة *{اسم_الرحلة}*.\n\nيرجى تسديد المبلغ عند التجمع لمشرف أتوبيسك (*{رقم_الأتوبيس}*).\nشاكرين تعاونكم! 🙏`
      );
    } else if (presetKey === 'general_alert') {
      setCustomMessageTemplate(
        `📣 *تنبيه هام وعاجل من إدارة كيان* 📣\n\nإلى جميع طلاب *{اسم_الرحلة}* (عزيزي/تي {اسم_الطالب}):\n\nيرجى العلم بأنه تم تحديث تعليمات الانطلاق. يرجى التواجد في مكان التجمع (*{مكان_التجمع}*) في الموعد المحدد.\n\nشاكرين التزامكم الدائم! ❤️`
      );
    }
  };

  // Insert tag helper
  const handleInsertTag = (tag: string) => {
    setCustomMessageTemplate((prev) => prev + ` ${tag} `);
  };

  // Dispatch single WhatsApp message
  const handleSendSingleWhatsApp = (student: Student) => {
    const rawPhone = student.phone.replace(/[^0-9]/g, '');
    const formattedPhone = rawPhone.startsWith('0') ? `2${rawPhone}` : rawPhone;
    const compiledText = compileMessageForStudent(student);

    const url = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(compiledText)}`;
    window.open(url, '_blank');

    setSentStudentIds((prev) => ({ ...prev, [student.id]: true }));
  };

  // Send Next Unsent Student
  const handleSendNextUnsent = () => {
    const nextStudent = targetStudents.find((s) => !sentStudentIds[s.id]);
    if (nextStudent) {
      handleSendSingleWhatsApp(nextStudent);
    } else {
      alert('تهانينا! تم إرسال الرسالة لجميع الطلاب المستهدفين في القائمة.');
    }
  };

  // Copy All Target Phone Numbers
  const handleCopyAllPhones = () => {
    const phones = targetStudents
      .map((s) => {
        const raw = s.phone.replace(/[^0-9]/g, '');
        return raw.startsWith('0') ? `+2${raw}` : `+${raw}`;
      })
      .filter(Boolean)
      .join(', ');

    navigator.clipboard.writeText(phones);
    setCopiedNumbers(true);
    setTimeout(() => setCopiedNumbers(false), 3000);
  };

  const sentCount = targetStudents.filter((s) => sentStudentIds[s.id]).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-5xl rounded-3xl p-4 sm:p-6 shadow-2xl space-y-5 max-h-[95vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
              <Send className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                مركز الرسائل الجماعية والتنبيهات (Broadcast Hub)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                إرسال تنبيهات وتذاكر مخصصة عبر واتساب لجميع المشاركين دفعة واحدة
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/60 border border-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 overflow-y-auto pr-1">
          
          {/* LEFT PANEL: Audience Filters & Message Editor (5 cols) */}
          <div className="lg:col-span-5 space-y-4 flex flex-col">
            
            {/* 1. Target Audience Selector */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <label className="text-xs font-bold text-amber-300 uppercase flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                تحديد الفئة المستهدفة بالرسالة:
              </label>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setAudienceFilter('all')}
                  className={`p-2.5 rounded-xl font-bold border transition text-right ${
                    audienceFilter === 'all'
                      ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-md font-extrabold'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  📢 جميع الطلاب ({students.length})
                </button>

                <button
                  type="button"
                  onClick={() => setAudienceFilter('bus')}
                  className={`p-2.5 rounded-xl font-bold border transition text-right ${
                    audienceFilter === 'bus'
                      ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-md font-extrabold'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  🚌 أتوبيس محدد
                </button>

                <button
                  type="button"
                  onClick={() => setAudienceFilter('unpaid')}
                  className={`p-2.5 rounded-xl font-bold border transition text-right ${
                    audienceFilter === 'unpaid'
                      ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-md font-extrabold'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  💰 المتبقي عليهم مبالغ
                </button>

                <button
                  type="button"
                  onClick={() => setAudienceFilter('tshirt_pending')}
                  className={`p-2.5 rounded-xl font-bold border transition text-right ${
                    audienceFilter === 'tshirt_pending'
                      ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-md font-extrabold'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  👕 لم يستلموا التيشرت
                </button>
              </div>

              {/* Sub-Selector for specific bus */}
              {audienceFilter === 'bus' && (
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-bold">اختر رقم الأتوبيس:</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5, 6].map((busNo) => (
                      <button
                        key={busNo}
                        type="button"
                        onClick={() => setSelectedBusNumber(busNo)}
                        className={`w-7 h-7 rounded-lg font-mono font-bold text-xs flex items-center justify-center ${
                          selectedBusNumber === busNo
                            ? 'bg-amber-400 text-slate-950 shadow'
                            : 'bg-slate-900 text-slate-300 border border-slate-800'
                        }`}
                      >
                        {busNo}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Preset Message Templates */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <label className="text-xs font-bold text-indigo-300 uppercase flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                اختر قالب الرسالة النصية:
              </label>

              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'assembly_info', label: '🚌 موعد ومكان التجمع' },
                  { id: 'ticket_pass', label: '🎟️ التذكر الرقمية والمقعد' },
                  { id: 'tshirt_notice', label: '👕 استلام التيشرتات' },
                  { id: 'payment_reminder', label: '💰 تذكير السداد' },
                  { id: 'general_alert', label: '📣 تنبيه عام عاجل' },
                ].map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleSelectPresetTemplate(tmpl.id as any)}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition ${
                      selectedTemplate === tmpl.id
                        ? 'bg-indigo-600 border-indigo-400 text-white shadow-md'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {tmpl.label}
                  </button>
                ))}
              </div>

              {/* Tag Insertion Buttons */}
              <div>
                <span className="text-[10px] text-slate-400 font-bold block mb-1.5">
                  إدراج متغيرات تلقائية في النص:
                </span>
                <div className="flex flex-wrap gap-1">
                  {[
                    '{اسم_الطالب}',
                    '{كود_التذكرة}',
                    '{رقم_الأتوبيس}',
                    '{رقم_المقعد}',
                    '{مقاس_التيشرت}',
                    '{المبلغ_المتبقي}',
                  ].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleInsertTag(tag)}
                      className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-amber-300 hover:bg-slate-800 transition"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Area Template Editor */}
              <textarea
                rows={7}
                value={customMessageTemplate}
                onChange={(e) => setCustomMessageTemplate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-3 text-xs leading-relaxed focus:border-amber-500 focus:outline-none font-mono"
                placeholder="اكتب نص الرسالة الجماعية هنا..."
              />
            </div>
          </div>

          {/* RIGHT PANEL: Target Audience List & Live Dispatch Hub (7 cols) */}
          <div className="lg:col-span-7 bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-4 flex flex-col justify-between">
            
            {/* Header & Stats */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    قائمة الطلاب المستهدفين بالرسالة
                    <span className="bg-amber-500/20 text-amber-300 font-mono font-bold px-2 py-0.5 rounded-full text-xs">
                      {targetStudents.length} طالب
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    تم إرسال {sentCount} من أصل {targetStudents.length}
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleCopyAllPhones}
                    className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shrink-0"
                  >
                    {copiedNumbers ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        تم نسخ الأرقام!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-amber-400" />
                        نسخ الأرقام لجروب واتساب
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleSendNextUnsent}
                    disabled={targetStudents.length === 0 || sentCount === targetStudents.length}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-lg shadow-emerald-600/20 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    إرسال للعميل التالي ➔
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full transition-all duration-300"
                  style={{
                    width: `${targetStudents.length > 0 ? (sentCount / targetStudents.length) * 100 : 0}%`,
                  }}
                />
              </div>

              {/* Search in target list */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  placeholder="بحث في الطلاب المستهدفين..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl pr-8 pl-3 py-1.5 text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Target Students Interactive List */}
            <div className="flex-1 overflow-y-auto space-y-2 max-h-[350px] pr-1">
              {targetStudents.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  لا يوجد طلاب يطابقون تصفية الفئة المستهدفة المحددة.
                </div>
              ) : (
                targetStudents.map((stud) => {
                  const isSent = sentStudentIds[stud.id];
                  const previewMsg = compileMessageForStudent(stud);

                  return (
                    <div
                      key={stud.id}
                      className={`p-3 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs ${
                        isSent
                          ? 'bg-emerald-950/20 border-emerald-500/30'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-white text-sm">{stud.name}</strong>
                          <span className="font-mono text-[10px] bg-slate-950 text-indigo-300 px-2 py-0.5 rounded border border-slate-800">
                            {stud.ticketCode}
                          </span>
                          <span className="font-mono text-[10px] text-amber-400">
                            أتوبيس #{stud.busNumber} {stud.seatNumber ? `(م${stud.seatNumber})` : ''}
                          </span>
                        </div>
                        <p className="text-slate-400 text-[11px] mt-0.5 font-mono">
                          {stud.phone} • باقي: {stud.remainingAmount} ج.م • تيشرت: {stud.tshirtSize}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() =>
                            setActivePreviewStudentId(
                              activePreviewStudentId === stud.id ? null : stud.id
                            )
                          }
                          className="text-[10px] text-slate-400 hover:text-amber-300 underline font-semibold"
                        >
                          معاينة النص
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSendSingleWhatsApp(stud)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow ${
                            isSent
                              ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          }`}
                        >
                          <Send className="w-3.5 h-3.5" />
                          {isSent ? 'تم الإرسال ✓' : 'إرسال WhatsApp 📲'}
                        </button>
                      </div>

                      {/* Expandable Preview Text */}
                      {activePreviewStudentId === stud.id && (
                        <div className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] text-emerald-300 font-mono whitespace-pre-wrap mt-2">
                          {previewMsg}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Notice */}
            <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
              <span>
                💡 عند النقر على إرسال، يتم فتح تطبيق WhatsApp تلقائياً بالرسالة المخصصة للشخص المحدد.
              </span>
              <button
                type="button"
                onClick={onClose}
                className="bg-slate-800 text-slate-300 font-bold px-4 py-1.5 rounded-xl text-xs"
              >
                إغلاق
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

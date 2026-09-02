import React, { useState, useMemo } from 'react';
import {
  Camera,
  Search,
  ExternalLink,
  QrCode,
  Sparkles,
  Download,
  Share2,
  CheckCircle2,
  Bus,
  Shirt,
  Calendar,
  Phone,
  FolderGit2,
  Video,
  Image as ImageIcon,
  Users,
  Copy,
  Check,
  Zap,
  SlidersHorizontal,
  Flame,
  Music,
  Award,
  Compass,
  Utensils,
  Eye,
  Send,
  UserCheck,
  CreditCard,
  ShieldCheck,
  AlertCircle,
  FileText,
  Clock,
  MapPin,
  HeartHandshake,
  MessageCircle,
  FolderPlus,
  RefreshCw,
  Info,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Student, TripSettings, PARTICIPANT_ROLES_CONFIG, getStudentMealInfo, isApparelAddon, isMealAddon } from '../types';
import { DigitalTicketCard } from './DigitalTicketCard';
import { generateStudentTicketPDF, exportTicketAsHighResImage } from '../services/pdfGenerator';
import { sendWhatsAppReceipt, sendCustomWhatsAppMessage } from '../services/storage';

interface StudentPortalMediaProps {
  students: Student[];
  settings: TripSettings;
  onUpdateDriveLink: (link: string) => void;
}

interface CustomFolderLink {
  id: string;
  title: string;
  category: 'drone' | 'beach' | 'party' | 'ceremony' | 'raw' | 'other';
  url: string;
  photoCount?: string;
  description?: string;
}

export const StudentPortalMedia: React.FC<StudentPortalMediaProps> = ({
  students,
  settings,
  onUpdateDriveLink,
}) => {
  // Navigation / View Tabs inside Portal
  const [activePortalTab, setActivePortalTab] = useState<'ticket_lookup' | 'media_hub' | 'whatsapp_broadcast' | 'directory'>('ticket_lookup');

  // Search & Student Selection
  const [lookupQuery, setLookupQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [busFilter, setBusFilter] = useState<string>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Drive Master Link Management
  const [driveInput, setDriveInput] = useState(settings.driveLink || '');
  const [isEditingDrive, setIsEditingDrive] = useState(false);

  // Custom Category Folders
  const [customFolders, setCustomFolders] = useState<CustomFolderLink[]>([
    {
      id: 'f-drone',
      title: 'فيديوهات الدرون السينمائية 4K 🚁',
      category: 'drone',
      url: settings.driveLink,
      photoCount: '15+ لقطة فيديو 4K',
      description: 'لقطات استعراضية جوية لشعار الدفعة وحركات التجمع',
    },
    {
      id: 'f-beach',
      title: 'ألبوم الشاطئ ومدفع الفوم 🌊',
      category: 'beach',
      url: settings.driveLink,
      photoCount: '500+ صورة عالية الدقة',
      description: 'سيشن الصور على البحر، فعاليات مدفع الفوم والألوان',
    },
    {
      id: 'f-party',
      title: 'حفلة الـ DJ والمسرح والمسابقات 🎧',
      category: 'party',
      url: settings.driveLink,
      photoCount: '350+ لقطة حماسية',
      description: 'صور المسرح، الألعاب النارية الباردة والأنيميشن',
    },
    {
      id: 'f-ceremony',
      title: 'سيشن التكريم وتسليم الدروع 🏆',
      category: 'ceremony',
      url: settings.driveLink,
      photoCount: '200+ لقطة تذكارية',
      description: 'طابور العرض الرسمي والصور الفردية والجماعية',
    },
  ]);

  const [newFolderTitle, setNewFolderTitle] = useState('');
  const [newFolderUrl, setNewFolderUrl] = useState('');
  const [newFolderCategory, setNewFolderCategory] = useState<'drone' | 'beach' | 'party' | 'ceremony' | 'raw' | 'other'>('beach');
  const [newFolderDesc, setNewFolderDesc] = useState('');
  const [isAddingFolder, setIsAddingFolder] = useState(false);

  // Ticket Preview Mode: 'digital_pass' or 'classic_card'
  const [ticketViewStyle, setTicketViewStyle] = useState<'interactive' | 'minimal_qr'>('interactive');

  // Currently selected student object
  const currentStudent = useMemo(() => {
    return students.find((s) => s.id === selectedStudentId) || students[0] || null;
  }, [students, selectedStudentId]);

  // Filtered Students for Quick Lookup List
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      // Bus filter
      if (busFilter !== 'all' && student.busNumber.toString() !== busFilter) {
        return false;
      }
      // Query filter
      if (lookupQuery.trim()) {
        const q = lookupQuery.toLowerCase().trim();
        const matchCode = (student.ticketCode || '').toLowerCase().includes(q);
        const matchName = (student.name || '').toLowerCase().includes(q);
        const matchPhone = (student.phone || '').includes(q);
        const matchFaculty = (student.faculty || '').toLowerCase().includes(q);
        const matchNatId = (student.nationalId || '').includes(q);
        return matchCode || matchName || matchPhone || matchFaculty || matchNatId;
      }
      return true;
    });
  }, [students, lookupQuery, busFilter]);

  // Statistics Summary
  const stats = useMemo(() => {
    const total = students.length;
    const paidCount = students.filter((s) => s.paymentStatus === 'paid').length;
    const depositCount = students.filter((s) => s.paymentStatus === 'deposit').length;
    const checkInDept = students.filter((s) => s.checkInDeparture).length;
    const tshirtRec = students.filter((s) => s.tshirtReceived).length;
    const mealRec = students.filter((s) => s.mealReceived).length;
    return { total, paidCount, depositCount, checkInDept, tshirtRec, mealRec };
  }, [students]);

  // Handle Search Submission
  const handleStudentSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupQuery.trim()) return;

    const found = students.find(
      (s) =>
        s.ticketCode.toLowerCase() === lookupQuery.trim().toLowerCase() ||
        s.phone.includes(lookupQuery.trim()) ||
        s.name.toLowerCase().includes(lookupQuery.trim().toLowerCase()) ||
        (s.nationalId && s.nationalId.includes(lookupQuery.trim()))
    );

    if (found) {
      setSelectedStudentId(found.id);
    } else {
      alert('لم يتم العثور على طالب بهذا الكود أو برقم الهاتف! يرجى التأكد من كتابة الكود أو الاسم بدقة.');
    }
  };

  const handleSaveDrive = () => {
    onUpdateDriveLink(driveInput);
    setIsEditingDrive(false);
  };

  const handleAddFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderTitle.trim() || !newFolderUrl.trim()) return;

    const newFolder: CustomFolderLink = {
      id: `f-${Date.now()}`,
      title: newFolderTitle.trim(),
      category: newFolderCategory,
      url: newFolderUrl.trim(),
      photoCount: 'مجلد سحابي مباشر',
      description: newFolderDesc.trim() || 'مجلد صور مخصص للطلاب',
    };

    setCustomFolders([...customFolders, newFolder]);
    setNewFolderTitle('');
    setNewFolderUrl('');
    setNewFolderDesc('');
    setIsAddingFolder(false);
  };

  const handleDeleteFolder = (id: string) => {
    setCustomFolders(customFolders.filter((f) => f.id !== id));
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // WhatsApp Message Generator for Media Announcement
  const generateWhatsAppMediaAnnouncement = () => {
    const tripName = settings.tripName || 'رحلة وفعالية كيان';
    const driveLink = settings.driveLink || 'سيتم إضافته قريباً';

    let text = `📸 *ألبوم صور وفيديوهات الدرون الرسمية | ${tripName}* 🎬\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `أهلاً بكم يا شباب! يسعدنا إعلامكم باكتمال فرز ومعالجة صور وفيديوهات الرحلة بأعلى دقة 4K.\n\n`;
    text += `📂 *رابط جوجل درايف الموحد:* \n${driveLink}\n\n`;
    text += `🌟 *محتويات الألبوم السحابي:* \n`;
    customFolders.forEach((f, i) => {
      text += `• ${f.title}: ${f.url}\n`;
    });
    text += `\n━━━━━━━━━━━━━━━━━━━━\n`;
    text += `👑 *نتمنى أن تكون الصور قد نالت إعجابكم ولحظاتكم خالدة معنا دائماً!* \n`;
    text += `*فريق ميديا وإنتاج KAYAN Events*`;
    return text;
  };

  const handleShareMediaAnnouncement = () => {
    const text = generateWhatsAppMediaAnnouncement();
    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  // WhatsApp Message Generator for Individual Student Pass
  const generateStudentWhatsAppPassText = (student: Student) => {
    const tripName = settings.tripName || 'رحلة كيان';
    const destination = settings.destination || 'الوجهة الرسمية';
    const tripDate = settings.tripDate || 'تاريخ الرحلة';
    const assemblyTime = settings.assemblyTime || '04:00 ص';
    const assemblyLoc = settings.assemblyLocation || 'نقطة التجمع الرئيسية';

    let text = `🎫 *تذكرة الحجز الإلكترونية الرقمية | KAYAN Digital Pass* 🎫\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `👤 *اسم المشترك:* ${student.name}\n`;
    text += `🔢 *كود التذكرة والـ QR:* ${student.ticketCode}\n`;
    text += `📍 *الرحلة:* ${tripName} (${destination})\n`;
    text += `📅 *التاريخ:* ${tripDate}\n`;
    text += `⏰ *موعد التجمع:* ${assemblyTime}\n`;
    text += `🚩 *نقطة الانطلاق:* ${assemblyLoc}\n`;
    text += `🚌 *رقم الأتوبيس:* حافلة ${student.busNumber}\n`;
    text += `💺 *المقعد المخصص:* ${student.seatNumber ? `مقعد رقم ${student.seatNumber}` : 'تسكين عند الصعود'}\n`;
    text += `👕 *مقاس التيشرت:* ${student.tshirtSize}\n`;

    const meal = getStudentMealInfo(student, settings);
    if (meal.hasMeal) {
      text += `🍗 *الوجبة المعتمدة:* ${meal.mealName}\n`;
    }

    if (student.hasCompanion && student.companionName) {
      text += `👥 *المرافق المسجل:* ${student.companionName} (${student.companionPhone || 'بدون هاتف'})\n`;
    }

    text += `💰 *حالة السداد:* ${student.isFreeTicket ? 'تذكرة مجانية VIP 🎁' : student.paymentStatus === 'paid' ? 'خالص السداد بالكامل ✅' : `متبقي ${(student.remainingAmount || 0)} ج.م`}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `⚠️ *تعليمات هامة:* يرجى إبراز كود الـ QR عند بوابات التسكين والاستلام.\n`;
    text += `👑 *تيم KAYAN Events يتمنى لكم تجربة لا تُنسى!*`;
    return text;
  };

  const handleSendSingleStudentPass = (student: Student) => {
    const text = generateStudentWhatsAppPassText(student);
    const cleanPhone = student.phone.replace(/[^0-9]/g, '');
    let fullPhone = cleanPhone;
    if (fullPhone.startsWith('01')) {
      fullPhone = '2' + fullPhone;
    }
    const encoded = encodeURIComponent(text);
    if (fullPhone.length >= 10) {
      window.open(`https://api.whatsapp.com/send?phone=${fullPhone}&text=${encoded}`, '_blank');
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Hero Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none translate-x-1/3 translate-y-1/3"></div>

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black px-3 py-1 rounded-xl flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                بوابة التذاكر الرقمية والميديا السحابية (Student Pass & Media Center)
              </span>
              <span className="bg-slate-800 text-slate-300 text-xs font-mono font-bold px-2.5 py-1 rounded-xl border border-slate-700">
                {settings.tripName || 'رحلة كيان'}
              </span>
              <span className="bg-indigo-950 text-indigo-300 text-xs font-mono font-black px-2.5 py-1 rounded-xl border border-indigo-500/30">
                👥 {stats.total} طالب مشترك
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight flex items-center gap-2">
              بوابة الطالب الذكية وأرشيف الميديا والدرون
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              إصدار التذاكر الرقمية الفورية، كشوفات الـ QR Code، مشاركة التذاكر عبر واتساب للطلاب، وإدارة روابط Google Drive لصور وفيديوهات الدرون بعد انتهاء الفعالية.
            </p>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start lg:justify-end">
            <a
              href={settings.driveLink}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow-lg shadow-indigo-600/20 active:scale-95"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>فتح درايف الميديا ☁️</span>
            </a>

            <button
              onClick={handleShareMediaAnnouncement}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow-lg shadow-emerald-600/20 active:scale-95"
              title="إرسال رسالة جاهزة بروابط الألبومات لجروب الواتساب"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>إعلان الميديا للجروب 📢</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top Portal Section Navigation Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-900 border border-slate-800 p-2 rounded-2xl shadow-xl">
        <button
          type="button"
          onClick={() => setActivePortalTab('ticket_lookup')}
          className={`p-3 rounded-xl border transition flex items-center justify-center gap-2 text-xs font-black ${
            activePortalTab === 'ticket_lookup'
              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
              : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>1. التذكرة الرقمية واستعلام الطالب</span>
        </button>

        <button
          type="button"
          onClick={() => setActivePortalTab('media_hub')}
          className={`p-3 rounded-xl border transition flex items-center justify-center gap-2 text-xs font-black ${
            activePortalTab === 'media_hub'
              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
              : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>2. مركز الميديا وألبومات الصور</span>
        </button>

        <button
          type="button"
          onClick={() => setActivePortalTab('whatsapp_broadcast')}
          className={`p-3 rounded-xl border transition flex items-center justify-center gap-2 text-xs font-black ${
            activePortalTab === 'whatsapp_broadcast'
              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
              : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          <span>3. إرسال تذاكر الواتساب السريعة</span>
        </button>

        <button
          type="button"
          onClick={() => setActivePortalTab('directory')}
          className={`p-3 rounded-xl border transition flex items-center justify-center gap-2 text-xs font-black ${
            activePortalTab === 'directory'
              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
              : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>4. دليل الحضور والتسكين السريع</span>
        </button>
      </div>

      {/* 3. TAB 1: Digital Ticket Lookup & Interactive Pass */}
      {activePortalTab === 'ticket_lookup' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Search & Student Selection List (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Search Box */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                  <Search className="w-4 h-4 text-amber-400" />
                  بحث واستعلام التذاكر
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  {filteredStudents.length} من {students.length}
                </span>
              </div>

              <form onSubmit={handleStudentSearch} className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={lookupQuery}
                    onChange={(e) => setLookupQuery(e.target.value)}
                    placeholder="ابحث بالاسم، كود التذكرة (KYN-...) أو رقم الهاتف..."
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl pr-9 pl-3 py-2.5 text-xs focus:border-amber-500 focus:outline-none"
                  />
                </div>

                {/* Bus Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-slate-400 font-bold ml-1">الحافلة:</span>
                  {['all', '1', '2', '3', '4', '5', '6'].map((bus) => (
                    <button
                      key={bus}
                      type="button"
                      onClick={() => setBusFilter(bus)}
                      className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold border transition ${
                        busFilter === bus
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {bus === 'all' ? 'الكل' : `باص ${bus}`}
                    </button>
                  ))}
                </div>
              </form>

              {/* Student Scrollable Selection List */}
              <div className="max-h-[420px] overflow-y-auto space-y-1.5 pr-1 text-xs">
                {filteredStudents.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    لا يوجد طالب مطابق لمعايير البحث.
                  </div>
                ) : (
                  filteredStudents.map((st) => {
                    const isSelected = st.id === selectedStudentId;
                    return (
                      <button
                        key={st.id}
                        onClick={() => setSelectedStudentId(st.id)}
                        className={`w-full text-right p-3 rounded-xl border transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-500 text-white shadow-md'
                            : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs">{st.name}</span>
                            <span className="font-mono text-[10px] text-amber-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                              {st.ticketCode}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            حافلة {st.busNumber} • {st.phone}
                          </p>
                        </div>

                        <div className="text-left">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold block ${
                              st.paymentStatus === 'paid'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {st.paymentStatus === 'paid' ? 'خالص ✅' : `متبقي ${st.remainingAmount}`}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right Column: High Quality Ticket Presentation (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {currentStudent ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      بطاقة التذكرة الرقمية المعتمدة (KAYAN Official Pass)
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      تذكرة الطالب الرسمية مزودة بالباركود وتفاصيل الحجز والإضافات
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSendSingleStudentPass(currentStudent)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition active:scale-95"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>واتساب للطالب</span>
                    </button>
                  </div>
                </div>

                {/* Render the full Digital Ticket Card component */}
                <DigitalTicketCard
                  student={currentStudent}
                  settings={settings}
                  showActions={true}
                />
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 space-y-3">
                <QrCode className="w-12 h-12 text-slate-700 mx-auto" />
                <p className="text-sm font-bold text-slate-400">لا يوجد طلاب محددون لعرض التذكرة.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. TAB 2: Media Drive & Photo Albums Hub */}
      {activePortalTab === 'media_hub' && (
        <div className="space-y-6">
          {/* Master Google Drive Banner */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <FolderGit2 className="w-5 h-5 text-indigo-400" />
                  رابط درايف الميديا الرئيسي الموحد (Google Drive Master Hub)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  الرابط السحابي المركزي الذي يضم كافة صور الشاطئ، حفلات الفوم، سيشنات الدرون وتكريم الخريجين
                </p>
              </div>

              <button
                onClick={() => setIsEditingDrive(!isEditingDrive)}
                className="bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 font-bold px-3 py-1.5 rounded-xl text-xs transition"
              >
                {isEditingDrive ? 'إلغاء التعديل' : '✏️ تعديل الرابط الرئيسي'}
              </button>
            </div>

            {/* Drive Link Editor / Display */}
            {isEditingDrive ? (
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <label className="block text-xs font-bold text-slate-300">
                  أدخل رابط مجلد Google Drive العام:
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={driveInput}
                    onChange={(e) => setDriveInput(e.target.value)}
                    placeholder="https://drive.google.com/drive/folders/..."
                    className="flex-1 bg-slate-900 border border-slate-800 text-white text-xs rounded-xl px-3 py-2.5 focus:border-amber-500 focus:outline-none font-mono"
                  />
                  <button
                    onClick={handleSaveDrive}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs transition"
                  >
                    حفظ الرابط الجديد
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2 bg-slate-950 border border-slate-800 p-3.5 rounded-xl flex items-center justify-between text-xs font-mono truncate">
                  <span className="text-amber-300 truncate">{settings.driveLink || 'لم يتم إدخال الرابط بعد'}</span>
                  <button
                    onClick={() => copyToClipboard(settings.driveLink, 'master-drive')}
                    className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition shrink-0 ml-2"
                    title="نسخ الرابط"
                  >
                    {copiedKey === 'master-drive' ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <a
                  href={settings.driveLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-black p-3.5 rounded-xl flex items-center justify-center gap-2 text-xs shadow-lg shadow-indigo-600/20 active:scale-95 transition"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>فتح المجلد في Google Drive</span>
                </a>
              </div>
            )}
          </div>

            {/* Sub-Folders Categorized Albums Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-amber-400" />
                  ألبومات الصور المفروزة والمقسمة للطلاب ({customFolders.length} مجلدات)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  روابط مجلدات مخصصة لكل فقرة لتسهيل عثور الطلاب على صورهم بدون تشتت
                </p>
              </div>

              <button
                onClick={() => setIsAddingFolder(!isAddingFolder)}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition"
              >
                <FolderPlus className="w-4 h-4" />
                <span>إضافة مجلد جديد ➕</span>
              </button>
            </div>

            {/* Add New Folder Form */}
            {isAddingFolder && (
              <form
                onSubmit={handleAddFolder}
                className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 animate-in fade-in text-xs"
              >
                <h4 className="font-bold text-white text-xs">إضافة مجلد صور فرعي جديد</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">اسم المجلد / الألبوم</label>
                    <input
                      type="text"
                      required
                      value={newFolderTitle}
                      onChange={(e) => setNewFolderTitle(e.target.value)}
                      placeholder="مثال: سيشن تيشرتات الدفعة 📸"
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-2 focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">الفئة</label>
                    <select
                      value={newFolderCategory}
                      onChange={(e) => setNewFolderCategory(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-2 focus:border-amber-500 focus:outline-none"
                    >
                      <option value="drone">فيديوهات ودرون 🚁</option>
                      <option value="beach">الشاطئ والبحر 🌊</option>
                      <option value="party">حفلات وفوم 🥳</option>
                      <option value="ceremony">تكريم وتخرج 🎓</option>
                      <option value="raw">صور وفيديوهات خام 💾</option>
                      <option value="other">أخرى 📌</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">رابط المجلد (URL)</label>
                    <input
                      type="text"
                      required
                      value={newFolderUrl}
                      onChange={(e) => setNewFolderUrl(e.target.value)}
                      placeholder="https://drive.google.com/..."
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-2 focus:border-amber-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">وصف مختصر</label>
                  <input
                    type="text"
                    value={newFolderDesc}
                    onChange={(e) => setNewFolderDesc(e.target.value)}
                    placeholder="تفاصيل المحتوى أو أرقام الباصات المشمولة..."
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-2 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingFolder(false)}
                    className="bg-slate-800 text-slate-300 px-3 py-1.5 rounded-xl text-xs"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="bg-amber-500 text-slate-950 font-bold px-4 py-1.5 rounded-xl text-xs hover:bg-amber-400 transition"
                  >
                    حفظ المجلد
                  </button>
                </div>
              </form>
            )}

            {/* Folder Grid Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customFolders.map((folder) => {
                const isDrone = folder.category === 'drone';
                const isParty = folder.category === 'party';
                const isCeremony = folder.category === 'ceremony';

                return (
                  <div
                    key={folder.id}
                    className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3 hover:border-slate-700 transition"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`p-2.5 rounded-xl border ${
                            isDrone
                              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                              : isParty
                              ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                              : isCeremony
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                              : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                          }`}
                        >
                          {isDrone ? (
                            <Video className="w-5 h-5" />
                          ) : (
                            <ImageIcon className="w-5 h-5" />
                          )}
                        </div>

                        <div>
                          <h4 className="text-sm font-black text-white">{folder.title}</h4>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {folder.photoCount || 'ألبوم سحابي'}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteFolder(folder.id)}
                        className="text-slate-500 hover:text-rose-400 text-xs transition"
                        title="حذف هذا المجلد"
                      >
                        ✕
                      </button>
                    </div>

                    {folder.description && (
                      <p className="text-xs text-slate-400">{folder.description}</p>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <a
                        href={folder.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 transition group"
                      >
                        <span>تصفح الألبوم</span>
                        <ExternalLink className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition" />
                      </a>

                      <button
                        onClick={() => copyToClipboard(folder.url, folder.id)}
                        className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs p-2 rounded-xl transition"
                        title="نسخ الرابط"
                      >
                        {copiedKey === folder.id ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 5. TAB 3: Fast WhatsApp Pass Broadcaster */}
      {activePortalTab === 'whatsapp_broadcast' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-emerald-400" />
                  إرسال التذاكر الرقمية المباشرة للطلاب عبر WhatsApp
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  إرسال نص التذكرة الفردي وكود الحجز والـ QR لكل طالب على رقمه المسجل بنقرة واحدة
                </p>
              </div>

              <button
                onClick={handleShareMediaAnnouncement}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition"
              >
                <Share2 className="w-4 h-4" />
                <span>إرسال إعلان الميديا العام للجروب</span>
              </button>
            </div>

            {/* Quick Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={lookupQuery}
                  onChange={(e) => setLookupQuery(e.target.value)}
                  placeholder="ابحث بالاسم أو رقم الهاتف..."
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl pr-9 pl-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1">
                {['all', '1', '2', '3', '4', '5', '6'].map((bus) => (
                  <button
                    key={bus}
                    type="button"
                    onClick={() => setBusFilter(bus)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                      busFilter === bus
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {bus === 'all' ? 'الكل' : `باص ${bus}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Students WhatsApp Dispatch Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredStudents.map((st) => (
                <div
                  key={st.id}
                  className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5 hover:border-slate-700 transition"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xs font-black text-white">{st.name}</h4>
                      <span className="text-[10px] text-amber-400 font-mono font-bold block">
                        {st.ticketCode} • باص {st.busNumber}
                      </span>
                    </div>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                        st.paymentStatus === 'paid'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {st.paymentStatus === 'paid' ? 'خالص' : `متبقي ${st.remainingAmount}`}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 font-mono">{st.phone}</p>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleSendSingleStudentPass(st)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 rounded-lg text-xs flex items-center justify-center gap-1 transition active:scale-95"
                    >
                      <Send className="w-3 h-3" />
                      <span>إرسال التذكرة واتساب</span>
                    </button>

                    <button
                      onClick={() => {
                        const text = generateStudentWhatsAppPassText(st);
                        copyToClipboard(text, st.id);
                      }}
                      className="bg-slate-900 hover:bg-slate-800 text-slate-300 p-1.5 rounded-lg border border-slate-800 text-xs transition"
                      title="نسخ نص التذكرة"
                    >
                      {copiedKey === st.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6. TAB 4: Fast Student Directory & Check-in Overview */}
      {activePortalTab === 'directory' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                دليل الطلاب والتسكين السريع ({students.length} طالب)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                كشف إحصائي وسريع لحالة الحضور، الأتوبيسات، استلام التيشرتات والوجبات
              </p>
            </div>

            {/* Quick KPI stats */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="bg-slate-950 text-emerald-400 border border-slate-800 px-2.5 py-1 rounded-xl font-bold">
                ✅ مسدد: {stats.paidCount}
              </span>
              <span className="bg-slate-950 text-amber-400 border border-slate-800 px-2.5 py-1 rounded-xl font-bold">
                👕 استلم تيشرت: {stats.tshirtRec}
              </span>
              <span className="bg-slate-950 text-rose-400 border border-slate-800 px-2.5 py-1 rounded-xl font-bold">
                🍗 استلم وجبة: {stats.mealRec}
              </span>
            </div>
          </div>

          {/* Directory Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">الطالب</th>
                  <th className="p-3">كود التذكرة</th>
                  <th className="p-3">الحافلة والمقعد</th>
                  <th className="p-3">التيشرت والوجبة</th>
                  <th className="p-3">حالة السداد</th>
                  <th className="p-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {filteredStudents.map((st, idx) => {
                  const meal = getStudentMealInfo(st, settings);
                  return (
                    <tr key={st.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3 font-mono text-slate-500">{idx + 1}</td>
                      <td className="p-3">
                        <span className="font-bold text-white block">{st.name}</span>
                        <span className="text-[10px] text-slate-400">{st.phone}</span>
                      </td>
                      <td className="p-3 font-mono text-amber-400 font-bold">{st.ticketCode}</td>
                      <td className="p-3">
                        <span className="font-bold text-white block">باص {st.busNumber}</span>
                        <span className="text-[10px] text-slate-400">
                          {st.seatNumber ? `مقعد ${st.seatNumber}` : 'عند الصعود'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-amber-300 block">تيشرت: {st.tshirtSize}</span>
                        <span className="text-[10px] text-slate-400">
                          {meal.hasMeal ? `وجبة: ${meal.mealName}` : 'بدون وجبة'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold inline-block ${
                            st.paymentStatus === 'paid'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {st.paymentStatus === 'paid' ? 'خالص' : `متبقي ${st.remainingAmount}`}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedStudentId(st.id);
                              setActivePortalTab('ticket_lookup');
                            }}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-2.5 py-1 rounded-lg text-xs transition"
                            title="عرض التذكرة"
                          >
                            التذكرة 🎫
                          </button>
                          <button
                            onClick={() => handleSendSingleStudentPass(st)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold p-1 rounded-lg text-xs transition"
                            title="إرسال واتساب"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

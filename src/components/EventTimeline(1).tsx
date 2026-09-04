import React, { useState, useMemo, useEffect } from 'react';
import {
  Clock,
  Send,
  Bell,
  CheckCircle2,
  PlayCircle,
  AlertCircle,
  MapPin,
  Users,
  Plus,
  Radio,
  Sparkles,
  Trash2,
  Edit3,
  Printer,
  Share2,
  Calendar,
  Award,
  Music,
  Camera,
  Utensils,
  Bus,
  Compass,
  Search,
  Filter,
  Layers,
  List,
  LayoutGrid,
  Copy,
  Check,
  Zap,
  Flame,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Volume2,
  SlidersHorizontal,
  FileText,
} from 'lucide-react';
import { TimelineEvent, BroadcastNotice, Student, TripSettings, EventCategory } from '../types';
import { BroadcastCenterModal } from './BroadcastCenterModal';
import { CompanySeal } from './CompanySeal';
import { generateRunOfShowPDF } from '../services/pdfGenerator';

interface EventTimelineProps {
  timeline: TimelineEvent[];
  notices: BroadcastNotice[];
  onUpdateTimelineStatus: (id: string, status: 'pending' | 'in_progress' | 'completed') => void;
  onSendNotice: (notice: Omit<BroadcastNotice, 'id' | 'time'>) => void;
  onAddTimelineEvent?: (event: Omit<TimelineEvent, 'id'>) => void;
  onUpdateTimelineEvent?: (updatedEvent: TimelineEvent) => void;
  onDeleteTimelineEvent?: (id: string) => void;
  students?: Student[];
  settings?: TripSettings;
}

export const EventTimeline: React.FC<EventTimelineProps> = ({
  timeline,
  notices,
  onUpdateTimelineStatus,
  onSendNotice,
  onAddTimelineEvent,
  onUpdateTimelineEvent,
  onDeleteTimelineEvent,
  students = [],
  settings,
}) => {
  // Modal states
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);
  const [eventToDelete, setEventToDelete] = useState<TimelineEvent | null>(null);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [showBroadcastBox, setShowBroadcastBox] = useState(false);

  // 4 View Modes: 'timeline' | 'kanban' | 'table' | 'print'
  const [viewMode, setViewMode] = useState<'timeline' | 'kanban' | 'table' | 'print'>('timeline');

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>('all');

  // Broadcast Notice Form State
  const [noticeMessage, setNoticeMessage] = useState('');
  const [targetGroup, setTargetGroup] = useState<'all' | 'supervisors' | 'students'>('all');
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');

  // Add / Edit form state
  const [newEvent, setNewEvent] = useState({
    time: '04:00 ص',
    title: '',
    description: '',
    location: 'نقطة التجمع',
    assignedTeam: 'لجنة التنظيم والإشراف',
    status: 'pending' as const,
    category: 'party' as EventCategory,
    performer: '',
    isOptionalAddon: false,
    costExtra: 0,
  });

  // Current live clock state
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString('ar-EG', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Category Configuration
  const categoryConfig: Record<
    EventCategory,
    { label: string; bg: string; text: string; border: string; icon: any }
  > = {
    party: {
      label: 'حفلة وفوم 🥳',
      bg: 'bg-purple-500/10',
      text: 'text-purple-400',
      border: 'border-purple-500/30',
      icon: Flame,
    },
    dj: {
      label: 'دي جي وصوتيات 🎧',
      bg: 'bg-indigo-500/10',
      text: 'text-indigo-400',
      border: 'border-indigo-500/30',
      icon: Music,
    },
    photo: {
      label: 'سيشن تصوير ودرون 📸',
      bg: 'bg-cyan-500/10',
      text: 'text-cyan-400',
      border: 'border-cyan-500/30',
      icon: Camera,
    },
    ceremony: {
      label: 'حفل تكريم ودروع 🏆',
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
      icon: Award,
    },
    sports: {
      label: 'مسابقات وبحر ⚽',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
      icon: Compass,
    },
    meals: {
      label: 'وجبات وإعاشة 🍗',
      bg: 'bg-rose-500/10',
      text: 'text-rose-400',
      border: 'border-rose-500/30',
      icon: Utensils,
    },
    travel: {
      label: 'تحرك وسفر 🚌',
      bg: 'bg-sky-500/10',
      text: 'text-sky-400',
      border: 'border-sky-500/30',
      icon: Bus,
    },
    other: {
      label: 'فعالية عامة 📌',
      bg: 'bg-slate-800/60',
      text: 'text-slate-300',
      border: 'border-slate-700',
      icon: Calendar,
    },
  };

  const getCategoryBadge = (category?: string) => {
    const cat = (category as EventCategory) || 'other';
    return categoryConfig[cat] || categoryConfig.other;
  };

  // Comprehensive Preset Packages for 1-Click Trip Program Generation
  const fullTripPresetPackages = [
    {
      id: 'beach_day_use',
      name: 'برنامج داي يوز شاطئي متكامل (شرم / السخنة / دهب / إسكندرية)',
      icon: '🏖️',
      description: 'جدول شامل من الفجر حتى العودة: تجمع، استراحة إفطار، فوم وفستيفال، سيشن درون، غداء، وجولة حرة',
      events: [
        {
          time: '04:00 ص',
          title: 'التجمع وركوب الأتوبيسات وتفقد الـ QR',
          description: 'تجمع الطلاب، توزيع الباندانات والأساور، مطابقة كود التذكرة لكل طالب وركوب الأتوبيسات',
          location: 'نقطة الانطلاق الرئيسية',
          assignedTeam: 'لجنة الاستقبال وتسكين الأتوبيسات',
          category: 'travel' as const,
          performer: 'مشرفي الباصات',
        },
        {
          time: '07:30 ص',
          title: 'استراحة الطريق وتوزيع سناكس الإفطار',
          description: 'التوقف باستراحة الطريق، توزيع زجاجات المياه والعصائر ووجبات الإفطار الخفيفة',
          location: 'استراحة الطريق السريع',
          assignedTeam: 'لجنة الإعاشة والتموين',
          category: 'meals' as const,
          performer: 'مسؤولي البوفيه',
        },
        {
          time: '09:30 ص',
          title: 'الوصول للقرية واستلام الشاليهات والشاطئ',
          description: 'نزول الطلاب للقرية، توزيع مفاتيح الشاليهات وتحديد نقطة ارتكاز الإشراف الطبي',
          location: 'بوابة القرية والشاطئ الخاص',
          assignedTeam: 'لجنة الإسكان والتنظيم',
          category: 'travel' as const,
          performer: 'إدارة القرية والمشرفين',
        },
        {
          time: '11:00 ص',
          title: 'انطلاق مهرجان الألوان ومدفع الفوم الشاطئي',
          description: 'بدء فقرات الدي جي ومهرجان مدفع الفوم وعبوات الألوان والمسابقات الترفيهية',
          location: 'المسرح الشاطئي الرئيسي',
          assignedTeam: 'لجنة الترفيه والأنشطة',
          category: 'party' as const,
          performer: 'DJ الرحلة وفريق الأنيميشن',
        },
        {
          time: '01:30 م',
          title: 'سيشن تصوير الدفعة الرسمي وفيديو الدرون 4K',
          description: 'ارتداء التيشرت الموحد وتشكيل لوجو الدفعة وتصوير لقطات سينمائية بالدرون',
          location: 'ساحة الشاطئ الرئيسية',
          assignedTeam: 'فريق الميديا والتصوير',
          category: 'photo' as const,
          performer: 'كابتن الدرون والمصورين',
        },
        {
          time: '03:00 م',
          title: 'توزيع وجبة الغداء الساخنة VIP',
          description: 'تسليم علب الغداء والمشروبات الباردة بموجب كود الاستلام',
          location: 'مطعم القرية والشاطئ',
          assignedTeam: 'لجنة الإعاشة والضيافة',
          category: 'meals' as const,
          performer: 'مطعم القرية المعتمد',
        },
        {
          time: '05:30 م',
          title: 'جولة حرة والتسوق والكافيهات',
          description: 'وقت حر للطلاب لشراء الهدايا التذكارية والتنزه',
          location: 'الممشى السياحي / السوق التجاري',
          assignedTeam: 'لجنة المتابعة والأمان',
          category: 'sports' as const,
          performer: 'إشراف عام',
        },
        {
          time: '08:30 م',
          title: 'النداء الأخير وتجمع العودة ومطابقة الحضور',
          description: 'تجمع الطلاب عند بوابات الأتوبيسات والتحضير للعودة بسلامة الله',
          location: 'موقف الأتوبيسات الخارجي',
          assignedTeam: 'لجنة الحركة والأسطول',
          category: 'travel' as const,
          performer: 'مشرفي الحافلات',
        },
      ],
    },
    {
      id: 'grad_ceremony',
      name: 'برنامج حفل التخرج والتكريم الرسمي (Graduation Gala)',
      icon: '🎓',
      description: 'جدول بروتوكولي رسمي: استقبال VIP، السلام الوطني، تسليم الدروع، سيشن التخرج، والبوفيه المفتوح',
      events: [
        {
          time: '01:00 م',
          title: 'استقبال الخريجين والضيوف وتسليم الأرواب',
          description: 'تسليم روب وقبعة التخرج وبطاقات دخول أولياء الأمور وكتيب الحفل',
          location: 'بهو الاستقبال الرئيسي',
          assignedTeam: 'لجنة البروتوكول والاستقبال',
          category: 'ceremony' as const,
          performer: 'فريق التنظيم والعلاقات العامة',
        },
        {
          time: '02:30 م',
          title: 'السلام الوطني والافتتاح الرسمي للحفل',
          description: 'عزف السلام الجمهوري، تلاوة القرآن الكريم، وعرض الفيلم الوثائقي للدفعة',
          location: 'المسرح الكبير / القاعة الكبرى',
          assignedTeam: 'لجنة المسرح والمحتوى',
          category: 'ceremony' as const,
          performer: 'مقدم الحفل والضيوف',
        },
        {
          time: '03:30 م',
          title: 'طابور عرض الخريجين وتسليم شهادات التقدير والدروع',
          description: 'صعود الطلاب حسب الترتيب الأبجدي لاستلام دروع التكريم والتقاط الصورة الرسمية',
          location: 'منصة التكريم الرئيسية',
          assignedTeam: 'لجنة التنظيم والشهادات',
          category: 'ceremony' as const,
          performer: 'عميد الكلية وممثلو الإدارة',
        },
        {
          time: '05:30 م',
          title: 'سيشن رمي القبعات وتصوير الدرون الجماعي',
          description: 'التقاط الصورة التاريخية للحفل وقذف القبعات مع إطلاق الألعاب النارية الباردة',
          location: 'الساحة المفتوحة الخارجية',
          assignedTeam: 'فريق الإنتاج المرئي والدرون',
          category: 'photo' as const,
          performer: 'تيم الميديا الاحترافي',
        },
        {
          time: '06:30 م',
          title: 'بوفيه العشاء الفاخر والفقرة الفنية',
          description: 'بدء بوفيه العشاء للطلاب والضيوف والفقرة الموسيقية الهادئة',
          location: 'قاعة العشاء والضيافة VIP',
          assignedTeam: 'لجنة الضيافة والإعاشة',
          category: 'meals' as const,
          performer: 'شيف الحفل وفرقة العزف',
        },
      ],
    },
    {
      id: 'safari_adventure',
      name: 'برنامج رحلة السفاري والتخييم الصحراوي (Safari & Camp)',
      icon: '🏜️',
      description: 'مغامرات بيتش باجي، تزلج رمال، عشاء بدوي، حفلة سمر، ورصد النجوم',
      events: [
        {
          time: '01:00 م',
          title: 'الانطلاق نحو واحة ومحمية السفاري',
          description: 'تحرك أسطول الجيب والأتوبيسات نحو نقطة التخييم الصحراوية',
          location: 'مركز انطلاق السفاري',
          assignedTeam: 'لجنة التوجيه والحركة',
          category: 'travel' as const,
          performer: 'أدلاء الصحراء المحترفون',
        },
        {
          time: '03:00 م',
          title: 'مغامرة ركوب البيتش باجي والتزلج على الرمال',
          description: 'تجهيز الخوذ والنظارات والانطلاق في رحلة الكثبان الرملية',
          location: 'وادي الكثبان الرملية',
          assignedTeam: 'فريق السلامة والأنشطة',
          category: 'sports' as const,
          performer: 'كباتن البيتش باجي',
        },
        {
          time: '05:30 م',
          title: 'جلسة الغروب الصحراوي وجلسة الشاي البدوي',
          description: 'التقاط صور الغروب وشرب الشاي بالأعشاب الصحراوية',
          location: 'الخيمة البدوية المركزية',
          assignedTeam: 'لجنة الضيافة',
          category: 'photo' as const,
          performer: 'تيم الميديا وشيوخ القبيلة',
        },
        {
          time: '07:30 م',
          title: 'عشاء المندي البدوي وحفلة السمر والفلكلور',
          description: 'إخراج المندي من الحفر الصحراوية وبدء عروض التنورة والنار والفلكلور',
          location: 'مسرح المخيم البدوي',
          assignedTeam: 'لجنة الإعاشة والترفيه',
          category: 'party' as const,
          performer: 'شيف المخيم وفرقة الفلكلور',
        },
        {
          time: '09:30 م',
          title: 'رصد النجوم والتلسكوب وتجمع المغادرة',
          description: 'مشاهدة مجرة درب التبانة بالتلسكوب، والنداء الأخير لركوب الحافلات',
          location: 'مرصد المخيم',
          assignedTeam: 'لجنة الأمان والعودة',
          category: 'travel' as const,
          performer: 'مشرفو الرحلة',
        },
      ],
    },
  ];

  // Single event suggestions for modal
  const singleEventPresets = [
    {
      time: '03:30 ص',
      title: 'التجمع والانطلاق وركوب الأتوبيسات',
      description: 'تجمع الطلاب، مطابقة الباركود QR وركوب الأتوبيسات وفقاً لأرقام المقاعد',
      location: 'نقطة التجمع الرئيسية',
      assignedTeam: 'لجنة الاستقبال والتنظيم',
      category: 'travel' as const,
      performer: 'مشرفي الباصات',
    },
    {
      time: '07:30 ص',
      title: 'استراحة الطريق وتوزيع الوجبات الخفيفة',
      description: 'التوقف في الاستراحة، توزيع وجبات الإفطار والمياه والمشروبات',
      location: 'استراحة الطريق الصحراوي',
      assignedTeam: 'لجنة الإعاشة والتموين',
      category: 'meals' as const,
      performer: 'فريق التموين',
    },
    {
      time: '09:30 ص',
      title: 'الوصول واستلام الغرف / الشاليهات',
      description: 'وصول الأسطول، توزيع مفاتيح الغرف والبطاقات التعريفية والأساور',
      location: 'بوابة الفندق / القرية',
      assignedTeam: 'لجنة الإسكان والتنظيم',
      category: 'travel' as const,
      performer: 'مشرفي القرية',
    },
    {
      time: '11:00 ص',
      title: 'مهرجان الفوم والألوان والـ DJ الشاطئي',
      description: 'انطلاق مهرجان الفوم ومدفع الألوان والدي جي والمسابقات الترفيهية',
      location: 'الشاطئ الرئيسي / المسرح',
      assignedTeam: 'لجنة الترفيه والبراندنج',
      category: 'party' as const,
      performer: 'فريق الترفيه والـ DJ',
    },
    {
      time: '01:30 م',
      title: 'سيشن التصوير الجماعي وفيديو الدرون',
      description: 'تجمع الطلاب بالتيشرت الموحد لتصوير صورة الدفعة الرسمية وشعار الكيان بالدرون',
      location: 'ساحة التصوير الرئيسية',
      assignedTeam: 'تيم الميديا والدرون',
      category: 'photo' as const,
      performer: 'فريق المصورين والدرون',
    },
    {
      time: '03:00 م',
      title: 'وجبة الغداء الساخنة VIP',
      description: 'توزيع وجبات الغداء والمياه على الطلاب المعتمدين',
      location: 'مطعم القرية / الشاطئ',
      assignedTeam: 'لجنة الإعاشة',
      category: 'meals' as const,
      performer: 'مطعم القرية',
    },
    {
      time: '05:00 م',
      title: 'حفل التكريم وتوزيع الدروع والشهادات',
      description: 'تسليم دروع التخرج وشهادات التقدير والتقاط الصور التذكارية',
      location: 'القاعة الكبرى / المسرح',
      assignedTeam: 'لجنة التنظيم والبروتوكول',
      category: 'ceremony' as const,
      performer: 'لجنة التكريم وممثلي الكيان',
    },
    {
      time: '06:30 م',
      title: 'جولة حرة والتسوق بالممشى',
      description: 'وقت حر للتسوق وشراء الهدايا والتقاط الصور التذكارية',
      location: 'الممشى السياحي / السوق القديم',
      assignedTeam: 'لجنة الإشراف العام',
      category: 'sports' as const,
      performer: 'إشراف عام',
    },
    {
      time: '09:00 م',
      title: 'النداء الأخير وتجمع العودة',
      description: 'تجمع الطلاب عند الأتوبيسات والتحقق من تحضير كود العودة بالكامل',
      location: 'موقف الأتوبيسات',
      assignedTeam: 'لجنة الحركة والأسطول',
      category: 'travel' as const,
      performer: 'مشرفي الأتوبيسات',
    },
  ];

  // Filtering & Sorting
  const filteredTimeline = useMemo(() => {
    return timeline.filter((event) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (event.title || '').toLowerCase().includes(q);
        const matchDesc = (event.description || '').toLowerCase().includes(q);
        const matchLoc = (event.location || '').toLowerCase().includes(q);
        const matchTeam = (event.assignedTeam || '').toLowerCase().includes(q);
        const matchPerf = (event.performer || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchLoc && !matchTeam && !matchPerf) return false;
      }

      // Category filter
      if (activeCategoryFilter !== 'all' && event.category !== activeCategoryFilter) {
        return false;
      }

      // Status filter
      if (activeStatusFilter !== 'all' && event.status !== activeStatusFilter) {
        return false;
      }

      return true;
    });
  }, [timeline, searchQuery, activeCategoryFilter, activeStatusFilter]);

  // Statistics & KPI calculations
  const stats = useMemo(() => {
    const total = timeline.length;
    const completed = timeline.filter((e) => e.status === 'completed').length;
    const inProgress = timeline.filter((e) => e.status === 'in_progress').length;
    const pending = timeline.filter((e) => e.status === 'pending').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const currentLiveEvent = timeline.find((e) => e.status === 'in_progress');
    const nextPendingEvent = timeline.find((e) => e.status === 'pending');

    return {
      total,
      completed,
      inProgress,
      pending,
      completionRate,
      currentLiveEvent,
      nextPendingEvent,
    };
  }, [timeline]);

  // Handle Broadcast Submission
  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeMessage.trim()) return;

    onSendNotice({
      sender: 'إدارة عمليات كيان 👑',
      message: noticeMessage,
      targetGroup,
      priority,
    });

    setNoticeMessage('');
  };

  // WhatsApp Share Generator for Whole Timeline Program
  const generateWhatsAppProgramText = () => {
    const tripName = settings?.tripName || 'رحلة وفعالية كيان';
    const tripDate = settings?.tripDate ? `\n📅 التاريخ: ${settings.tripDate}` : '';
    const destination = settings?.destination ? `\n📍 الوجهة: ${settings.destination}` : '';

    let text = `🌟 *البرنامج والجدول الزمني الرسمي | ${tripName}* 🌟${tripDate}${destination}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n`;

    timeline.forEach((item, index) => {
      const statusEmoji =
        item.status === 'completed'
          ? '✅ [تم]'
          : item.status === 'in_progress'
          ? '⏳ [جاري الآن]'
          : '📌';
      text += `\n*${index + 1}. ${item.time}* • ${item.title} ${statusEmoji}\n`;
      text += `📍 *المكان:* ${item.location}\n`;
      text += `📝 *التفاصيل:* ${item.description}\n`;
      if (item.assignedTeam) text += `👥 *الفريق المسؤول:* ${item.assignedTeam}\n`;
      if (item.performer) text += `🎤 *المسؤول/الفنان:* ${item.performer}\n`;
    });

    text += `\n━━━━━━━━━━━━━━━━━━━━\n`;
    text += `👑 *نتمنى لكم يوماً استثنائياً ولحظات لا تُنسى مع تيم KAYAN Events!*`;
    return text;
  };

  const handleCopyProgramToClipboard = () => {
    const text = generateWhatsAppProgramText();
    navigator.clipboard.writeText(text);
    setCopiedText('program');
    setTimeout(() => setCopiedText(null), 2500);
  };

  const handleShareToWhatsAppGroup = () => {
    const text = generateWhatsAppProgramText();
    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  // Bulk Apply Preset
  const handleApplyPresetPackage = (pkg: (typeof fullTripPresetPackages)[0]) => {
    if (!onAddTimelineEvent) return;
    const confirmMsg = `هل ترغب في استيراد باقة "${pkg.name}"؟ سيتم إضافة ${pkg.events.length} محطات وفقرات جديدة للجدول.`;
    if (!window.confirm(confirmMsg)) return;

    pkg.events.forEach((ev) => {
      onAddTimelineEvent({
        time: ev.time,
        title: ev.title,
        description: ev.description,
        location: ev.location,
        assignedTeam: ev.assignedTeam,
        status: 'pending',
        category: ev.category,
        performer: ev.performer,
      });
    });

    setIsPresetModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Live Clock Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none translate-x-1/3 translate-y-1/3"></div>

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black px-3 py-1 rounded-xl flex items-center gap-1.5 shadow-sm">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                غرفة العمليات وإدارة اليوم (Run-of-Show Hub)
              </span>
              <span className="bg-slate-800 text-slate-300 text-xs font-mono font-bold px-2.5 py-1 rounded-xl border border-slate-700">
                {settings?.tripName || 'رحلة كيان'}
              </span>
              <span className="bg-slate-950 text-amber-400 text-xs font-mono font-black px-3 py-1 rounded-xl border border-amber-500/20">
                ⏰ {currentTimeStr || '--:--'}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight flex items-center gap-2">
              الجدول الزمني الخطي وبرنامج اليوم
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              تنسيق دقيق لفقرات الفعالية دقيقة بدقيقة، متابعة الجاري والمكتمل لحظياً، والتبديل الفوري بين الأنماط الأربعة للتشغيل والطباعة.
            </p>
          </div>

          {/* Header Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start lg:justify-end">
            <button
              onClick={() => setIsPresetModalOpen(true)}
              className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition active:scale-95 shadow-sm"
              title="استيراد برنامج رحلة جاهز بالكامل بنقرة واحدة"
            >
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>برامج جاهزة ⚡</span>
            </button>

            <button
              onClick={() => setShowBroadcastBox(!showBroadcastBox)}
              className={`font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition active:scale-95 border ${
                showBroadcastBox
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-lg shadow-amber-500/20'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              <Bell className="w-4 h-4 text-amber-400" />
              <span>لوحة الإشعارات ({notices.length})</span>
            </button>

            <button
              onClick={() => setIsBroadcastModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow-lg shadow-indigo-600/20 active:scale-95"
            >
              <Send className="w-3.5 h-3.5 text-indigo-200 animate-pulse" />
              <span>رسالة جماعية 📢</span>
            </button>

            {onAddTimelineEvent && (
              <button
                onClick={() => setIsAddEventModalOpen(true)}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow-lg shadow-amber-500/20 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة فقرة ➕</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. THE FOUR VIEW MODES SWITCHER (الأنماط الأربعة الرئيسية للجدول) */}
      <div className="bg-slate-900 border-2 border-amber-500/30 rounded-2xl p-3 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-black text-white uppercase tracking-wider">
              أنماط عرض وتشغيل البرنامج (4 View Modes)
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={handleCopyProgramToClipboard}
              className="text-slate-400 hover:text-amber-300 font-bold flex items-center gap-1 transition px-2 py-1 rounded-lg hover:bg-slate-800"
            >
              {copiedText === 'program' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">تم النسخ</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ نص الواتساب</span>
                </>
              )}
            </button>

            <button
              onClick={handleShareToWhatsAppGroup}
              className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 transition px-2 py-1 rounded-lg hover:bg-emerald-500/10"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>إرسال للجروب</span>
            </button>
          </div>
        </div>

        {/* Big Segmented 4-Mode Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {/* Mode 1: Timeline */}
          <button
            type="button"
            onClick={() => setViewMode('timeline')}
            className={`p-3.5 rounded-xl border transition flex flex-col items-center justify-center gap-1.5 text-center relative ${
              viewMode === 'timeline'
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-lg shadow-amber-500/20 ring-2 ring-amber-400/40'
                : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <List className="w-4 h-4" />
              <span className="text-sm font-black">1. الخط الزمني</span>
            </div>
            <span className={`text-[11px] font-medium ${viewMode === 'timeline' ? 'text-slate-900 font-bold' : 'text-slate-400'}`}>
              عرض تسلسلي زمني تفاعلي
            </span>
          </button>

          {/* Mode 2: Kanban */}
          <button
            type="button"
            onClick={() => setViewMode('kanban')}
            className={`p-3.5 rounded-xl border transition flex flex-col items-center justify-center gap-1.5 text-center relative ${
              viewMode === 'kanban'
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-lg shadow-amber-500/20 ring-2 ring-amber-400/40'
                : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <LayoutGrid className="w-4 h-4" />
              <span className="text-sm font-black">2. لوحة المراحل والكانبان</span>
            </div>
            <span className={`text-[11px] font-medium ${viewMode === 'kanban' ? 'text-slate-900 font-bold' : 'text-slate-400'}`}>
              قادمة / جارية / مكتملة
            </span>
          </button>

          {/* Mode 3: Table Matrix */}
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`p-3.5 rounded-xl border transition flex flex-col items-center justify-center gap-1.5 text-center relative ${
              viewMode === 'table'
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-lg shadow-amber-500/20 ring-2 ring-amber-400/40'
                : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4" />
              <span className="text-sm font-black">3. جدول المنسقين</span>
            </div>
            <span className={`text-[11px] font-medium ${viewMode === 'table' ? 'text-slate-900 font-bold' : 'text-slate-400'}`}>
              مصفوفة التشغيل الميداني
            </span>
          </button>

          {/* Mode 4: Printable A4 */}
          <button
            type="button"
            onClick={() => setViewMode('print')}
            className={`p-3.5 rounded-xl border transition flex flex-col items-center justify-center gap-1.5 text-center relative ${
              viewMode === 'print'
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-lg shadow-amber-500/20 ring-2 ring-amber-400/40'
                : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Printer className="w-4 h-4" />
              <span className="text-sm font-black">4. كشف الطباعة A4</span>
            </div>
            <span className={`text-[11px] font-medium ${viewMode === 'print' ? 'text-slate-900 font-bold' : 'text-slate-400'}`}>
              نسخة معتمدة بختم الشركة
            </span>
          </button>
        </div>
      </div>

      {/* 3. Collapsible Live Broadcast Alert Composer & Feed (Optional / On Demand) */}
      {showBroadcastBox && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl animate-in fade-in">
          {/* Quick Notice Sender */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
                <h3 className="text-sm font-black text-white">إرسال تنبيه مباشر</h3>
              </div>
              <span className="text-[10px] text-slate-400">بث فوري</span>
            </div>

            <form onSubmit={handleBroadcast} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">نص التنبيه أو التوجيه</label>
                <textarea
                  required
                  rows={2}
                  value={noticeMessage}
                  onChange={(e) => setNoticeMessage(e.target.value)}
                  placeholder="مثال: يرجى تجمع الطلاب عند الشاطئ الرئيسي لبدء مسابقة الفوم..."
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-2.5 focus:border-amber-500 focus:outline-none text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">المستهدفون</label>
                  <select
                    value={targetGroup}
                    onChange={(e) => setTargetGroup(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-2 focus:border-amber-500 focus:outline-none text-xs"
                  >
                    <option value="all">الجميع 📢</option>
                    <option value="supervisors">المشرفون فقط 👮‍♂️</option>
                    <option value="students">الطلاب فقط 🎓</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">الأولوية</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-2 focus:border-amber-500 focus:outline-none text-xs"
                  >
                    <option value="normal">عادي</option>
                    <option value="urgent">🚨 عاجل وهام</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2 rounded-xl transition shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                بث التنبيه الفوري
              </button>
            </form>
          </div>

          {/* Live Feed */}
          <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-400" />
                سجل التنبيهات المبثوثة ({notices.length})
              </h3>
              <button
                onClick={() => setShowBroadcastBox(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                ✕ إغلاق
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 text-xs">
              {notices.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  لا توجد تنبيهات مبثوثة بعد.
                </div>
              ) : (
                notices
                  .slice()
                  .reverse()
                  .map((notice) => (
                    <div
                      key={notice.id}
                      className={`p-2.5 rounded-xl border ${
                        notice.priority === 'urgent'
                          ? 'bg-rose-950/40 border-rose-600/50 text-rose-200'
                          : 'bg-slate-900 border-slate-800 text-slate-200'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-white text-xs">{notice.sender}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{notice.time}</span>
                      </div>
                      <p className="text-xs">{notice.message}</p>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Controls, Filters, & Search Bar (Active for Timeline, Kanban, and Table) */}
      {viewMode !== 'print' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث في الفقرات، الأماكن، أسماء المسؤولين أو المنسقين..."
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl pr-9 pl-3 py-2 text-xs focus:border-amber-500 focus:outline-none transition"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              {[
                { id: 'all', label: `الكل (${timeline.length})` },
                { id: 'in_progress', label: `⏳ جاري (${stats.inProgress})` },
                { id: 'pending', label: `📌 قادم (${stats.pending})` },
                { id: 'completed', label: `✅ مكتمل (${stats.completed})` },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActiveStatusFilter(f.id)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition text-[11px] ${
                    activeStatusFilter === f.id
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/80">
            <span className="text-[11px] font-bold text-slate-400 ml-1 flex items-center gap-1">
              <Filter className="w-3 h-3 text-amber-400" /> الفئة:
            </span>
            {[
              { id: 'all', label: 'الكل' },
              { id: 'party', label: '🎉 حفلات وفوم' },
              { id: 'dj', label: '🎧 دي جي وصوتيات' },
              { id: 'photo', label: '📸 سيشن درون' },
              { id: 'ceremony', label: '🏆 حفل تكريم' },
              { id: 'sports', label: '⚽ مسابقات وبحر' },
              { id: 'meals', label: '🍗 وجبات وإعاشة' },
              { id: 'travel', label: '🚌 تحرك وسفر' },
              { id: 'other', label: '📌 أخرى' },
            ].map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setActiveCategoryFilter(filter.id)}
                className={`px-3 py-1 rounded-xl text-[11px] font-bold border transition ${
                  activeCategoryFilter === filter.id
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 5. MAIN CONTENT RENDERING FOR THE 4 VIEW MODES */}

      {/* ========================================================= */}
      {/* VIEW MODE 1: Interactive Chronological Timeline Feed */}
      {/* ========================================================= */}
      {viewMode === 'timeline' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              الخط الزمني التفاعلي للفعاليات ({filteredTimeline.length} محطة)
            </h3>
            <span className="text-xs text-slate-400 font-mono bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
              {stats.completed} مكتمل / {stats.total} إجمالي ({stats.completionRate}%)
            </span>
          </div>

          {filteredTimeline.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm space-y-3">
              <Clock className="w-10 h-10 text-slate-700 mx-auto opacity-50" />
              <p>لا توجد فقرات مطابقة للتصفية أو البحث المحدد.</p>
              {timeline.length === 0 && (
                <button
                  onClick={() => setIsPresetModalOpen(true)}
                  className="bg-amber-500 text-slate-950 font-black px-4 py-2 rounded-xl text-xs hover:bg-amber-400 transition"
                >
                  استيراد باقة برنامج جاهزة بنقرة واحدة 🚀
                </button>
              )}
            </div>
          ) : (
            <div className="relative border-r-2 border-indigo-900/60 mr-4 sm:mr-6 space-y-6 pr-6 sm:pr-8">
              {filteredTimeline.map((event, index) => {
                const isCompleted = event.status === 'completed';
                const isInProgress = event.status === 'in_progress';
                const badge = getCategoryBadge(event.category);
                const CategoryIcon = badge.icon || Calendar;

                return (
                  <div key={event.id} className="relative group">
                    {/* Node Dot / Status Indicator on the Line */}
                    <div
                      className={`absolute -right-[33px] sm:-right-[41px] top-2 w-6 h-6 rounded-full border-2 font-bold flex items-center justify-center text-xs transition shadow-md ${
                        isCompleted
                          ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                          : isInProgress
                          ? 'bg-amber-500 border-amber-400 text-slate-950 ring-4 ring-amber-500/20 animate-pulse'
                          : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="w-3.5 h-3.5 font-black" />
                      ) : isInProgress ? (
                        <PlayCircle className="w-3.5 h-3.5" />
                      ) : (
                        <span className="font-mono text-[10px]">{index + 1}</span>
                      )}
                    </div>

                    {/* Event Card */}
                    <div
                      className={`p-4 sm:p-5 rounded-2xl border transition ${
                        isInProgress
                          ? 'bg-amber-950/30 border-amber-500/60 shadow-xl shadow-amber-500/10'
                          : isCompleted
                          ? 'bg-slate-950/60 border-slate-800/80 opacity-85'
                          : 'bg-slate-950/90 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 mb-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="bg-amber-500 text-slate-950 font-black text-xs px-2.5 py-1 rounded-xl font-mono shadow-sm">
                            {event.time}
                          </span>
                          <h4 className="text-base sm:text-lg font-black text-white">
                            {event.title}
                          </h4>

                          {/* Category Badge */}
                          <span
                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-xl border flex items-center gap-1 ${badge.bg} ${badge.text} ${badge.border}`}
                          >
                            <CategoryIcon className="w-3 h-3" />
                            {badge.label}
                          </span>

                          {event.isOptionalAddon && (
                            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-xl bg-pink-500/20 text-pink-300 border border-pink-500/40">
                              ⭐ فعالية اختيارية {event.costExtra ? `(+${event.costExtra} ج.م)` : ''}
                            </span>
                          )}
                        </div>

                        {/* Status Switcher Toggle */}
                        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                          <button
                            onClick={() => onUpdateTimelineStatus(event.id, 'completed')}
                            className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                              isCompleted
                                ? 'bg-emerald-600 text-white font-black shadow-sm'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            <Check className="w-3 h-3" />
                            اكتمل
                          </button>
                          <button
                            onClick={() => onUpdateTimelineStatus(event.id, 'in_progress')}
                            className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                              isInProgress
                                ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            <PlayCircle className="w-3 h-3" />
                            جاري الآن
                          </button>
                          <button
                            onClick={() => onUpdateTimelineStatus(event.id, 'pending')}
                            className={`px-2.5 py-1 rounded-lg font-bold transition ${
                              !isCompleted && !isInProgress
                                ? 'bg-slate-800 text-slate-300 font-bold'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            قادم 📌
                          </button>
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                        {event.description}
                      </p>

                      {/* Event Meta Details & Quick Actions */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3 pt-3 border-t border-slate-900 text-xs text-slate-400">
                        <div className="flex flex-wrap items-center gap-4">
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                            المكان: <strong className="text-slate-200">{event.location}</strong>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-amber-400" />
                            الفريق: <strong className="text-slate-200">{event.assignedTeam}</strong>
                          </span>
                          {event.performer && (
                            <span className="flex items-center gap-1.5 text-cyan-300">
                              🎤 المسؤول / المؤدي: <strong className="text-white">{event.performer}</strong>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setShowBroadcastBox(true);
                              setNoticeMessage(
                                `تذكير بموعد (${event.time}): ${event.title} - ${event.location}. ${event.description}`
                              );
                              setPriority('urgent');
                            }}
                            className="bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-800 text-[11px] font-bold px-2.5 py-1 rounded-xl transition flex items-center gap-1"
                            title="تجهيز إشعار فوري للجميع عن هذه الفعالية"
                          >
                            <Send className="w-3 h-3 text-indigo-400" />
                            تنبيه فوري 📢
                          </button>

                          <button
                            onClick={() => setEditingEvent({ ...event })}
                            className="text-amber-400 hover:text-amber-300 font-bold text-xs flex items-center gap-1 transition p-1 hover:bg-amber-500/10 rounded-lg"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            تعديل
                          </button>

                          {onDeleteTimelineEvent && (
                            <button
                              onClick={() => setEventToDelete(event)}
                              className="text-slate-500 hover:text-rose-400 font-bold transition text-xs p-1 hover:bg-rose-500/10 rounded-lg"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW MODE 2: Kanban Stage Board (لوحة المراحل والكانبان) */}
      {/* ========================================================= */}
      {viewMode === 'kanban' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Column 1: Pending (قادمة) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
                  <h4 className="text-sm font-black text-slate-300 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
                    فقرات قادمة (Pending)
                  </h4>
                  <span className="text-xs bg-slate-800 text-slate-300 font-bold px-2 py-0.5 rounded-lg font-mono">
                    {filteredTimeline.filter((e) => e.status === 'pending').length}
                  </span>
                </div>

                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {filteredTimeline.filter((e) => e.status === 'pending').length === 0 ? (
                    <div className="text-center py-12 text-slate-500 text-xs">
                      لا توجد فقرات قادمة حالياً.
                    </div>
                  ) : (
                    filteredTimeline
                      .filter((e) => e.status === 'pending')
                      .map((event) => {
                        const badge = getCategoryBadge(event.category);
                        return (
                          <div
                            key={event.id}
                            className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 space-y-2.5 transition shadow-sm"
                          >
                            <div className="flex items-center justify-between">
                              <span className="bg-slate-800 text-amber-300 font-black text-[11px] px-2 py-0.5 rounded font-mono">
                                {event.time}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badge.bg} ${badge.text} ${badge.border}`}>
                                {badge.label}
                              </span>
                            </div>

                            <h5 className="text-xs sm:text-sm font-black text-white">{event.title}</h5>
                            <p className="text-[11px] text-slate-400 line-clamp-2">{event.description}</p>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-[10px] text-slate-400">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-indigo-400" />
                                {event.location}
                              </span>
                              <span className="text-slate-300">{event.assignedTeam}</span>
                            </div>

                            {/* Status Shift Action */}
                            <div className="flex items-center justify-between pt-1">
                              <button
                                onClick={() => setEditingEvent(event)}
                                className="text-[10px] text-slate-400 hover:text-amber-400 font-bold"
                              >
                                تعديل ✏️
                              </button>
                              <button
                                onClick={() => onUpdateTimelineStatus(event.id, 'in_progress')}
                                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] px-3 py-1 rounded-lg transition flex items-center gap-1 shadow-sm"
                              >
                                بدء الآن ⏳ <ArrowLeft className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            </div>

            {/* Column 2: In Progress (جاري الآن) */}
            <div className="bg-slate-900 border-2 border-amber-500/50 rounded-2xl p-4 shadow-2xl space-y-3 flex flex-col justify-between shadow-amber-500/10">
              <div>
                <div className="flex items-center justify-between border-b border-amber-500/30 pb-2.5 mb-3">
                  <h4 className="text-sm font-black text-amber-400 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
                    جاري تنفيذها الآن (Live Now)
                  </h4>
                  <span className="text-xs bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-lg font-mono">
                    {filteredTimeline.filter((e) => e.status === 'in_progress').length}
                  </span>
                </div>

                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {filteredTimeline.filter((e) => e.status === 'in_progress').length === 0 ? (
                    <div className="text-center py-12 text-slate-500 text-xs">
                      لا توجد فقرة جارية الآن. اضغط "بدء الآن ⏳" لنقل فقرة إلى هذه المرحلة.
                    </div>
                  ) : (
                    filteredTimeline
                      .filter((e) => e.status === 'in_progress')
                      .map((event) => {
                        const badge = getCategoryBadge(event.category);
                        return (
                          <div
                            key={event.id}
                            className="bg-amber-950/40 border border-amber-500/60 rounded-xl p-3.5 space-y-2.5 shadow-lg shadow-amber-500/10"
                          >
                            <div className="flex items-center justify-between">
                              <span className="bg-amber-500 text-slate-950 font-black text-[11px] px-2 py-0.5 rounded font-mono">
                                {event.time}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badge.bg} ${badge.text} ${badge.border}`}>
                                {badge.label}
                              </span>
                            </div>

                            <h5 className="text-xs sm:text-sm font-black text-white">{event.title}</h5>
                            <p className="text-[11px] text-slate-300">{event.description}</p>

                            <div className="flex items-center justify-between pt-2 border-t border-amber-900/40 text-[10px] text-slate-300">
                              <span className="flex items-center gap-1 text-amber-300">
                                <MapPin className="w-3 h-3 text-amber-400" />
                                {event.location}
                              </span>
                              <span className="text-white font-semibold">{event.assignedTeam}</span>
                            </div>

                            {/* Status Shift Action */}
                            <div className="flex items-center justify-between pt-1 gap-2">
                              <button
                                onClick={() => onUpdateTimelineStatus(event.id, 'pending')}
                                className="bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-[10px] font-bold px-2 py-1 rounded-lg transition"
                                title="إعادة للقائمة القادمة"
                              >
                                <RotateCcw className="w-3 h-3 inline ml-1" />
                                تراجع
                              </button>
                              <button
                                onClick={() => onUpdateTimelineStatus(event.id, 'completed')}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] px-3 py-1 rounded-lg transition flex items-center gap-1 shadow-md flex-1 justify-center"
                              >
                                <Check className="w-3 h-3" />
                                إنهاء واكتمال ✅
                              </button>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            </div>

            {/* Column 3: Completed (مكتملة) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
                  <h4 className="text-sm font-black text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    فقرات مكتملة بنجاح (Done)
                  </h4>
                  <span className="text-xs bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-lg font-mono">
                    {filteredTimeline.filter((e) => e.status === 'completed').length}
                  </span>
                </div>

                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {filteredTimeline.filter((e) => e.status === 'completed').length === 0 ? (
                    <div className="text-center py-12 text-slate-500 text-xs">
                      لم تكتمل أي فقرة بعد.
                    </div>
                  ) : (
                    filteredTimeline
                      .filter((e) => e.status === 'completed')
                      .map((event) => (
                        <div
                          key={event.id}
                          className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2 opacity-85 hover:opacity-100 transition"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono text-emerald-400 font-bold">
                              {event.time}
                            </span>
                            <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40 font-bold">
                              مكتمل ✅
                            </span>
                          </div>
                          <h5 className="text-xs font-bold text-slate-200">{event.title}</h5>
                          <p className="text-[10px] text-slate-400 truncate">{event.location} • {event.assignedTeam}</p>

                          <div className="flex items-center justify-between pt-1">
                            <button
                              onClick={() => onUpdateTimelineStatus(event.id, 'in_progress')}
                              className="text-[10px] text-slate-400 hover:text-amber-400 font-bold flex items-center gap-1"
                            >
                              <RotateCcw className="w-3 h-3" />
                              إعادة للجاري
                            </button>
                            <button
                              onClick={() => setEditingEvent(event)}
                              className="text-[10px] text-slate-400 hover:text-white"
                            >
                              تعديل ✏️
                            </button>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW MODE 3: Run-of-Show Dense Matrix Table */}
      {/* ========================================================= */}
      {viewMode === 'table' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden space-y-0">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
            <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              مصفوفة التشغيل والمنسقين الميدانية (Run-of-Show Matrix)
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              {filteredTimeline.length} بنود مدرجة
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">التوقيت</th>
                  <th className="p-3">عنوان الفقرة / النشاط</th>
                  <th className="p-3">الفئة</th>
                  <th className="p-3">المكان</th>
                  <th className="p-3">الفريق المسؤول</th>
                  <th className="p-3">المؤدي / المنسق</th>
                  <th className="p-3 text-center">الحالة</th>
                  <th className="p-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredTimeline.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500">
                      لا توجد فقرات مطابقة.
                    </td>
                  </tr>
                ) : (
                  filteredTimeline.map((item, idx) => {
                    const badge = getCategoryBadge(item.category);
                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-800/40 transition ${
                          item.status === 'in_progress' ? 'bg-amber-950/20' : ''
                        }`}
                      >
                        <td className="p-3 font-mono text-slate-500">{idx + 1}</td>
                        <td className="p-3 font-mono font-black text-amber-400 whitespace-nowrap">
                          {item.time}
                        </td>
                        <td className="p-3 font-bold text-white">
                          <div>{item.title}</div>
                          <div className="text-[10px] text-slate-400 font-normal line-clamp-1">
                            {item.description}
                          </div>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${badge.bg} ${badge.text} ${badge.border}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="p-3 text-slate-300">{item.location}</td>
                        <td className="p-3 text-slate-300 font-medium">{item.assignedTeam}</td>
                        <td className="p-3 text-cyan-300">{item.performer || '-'}</td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <select
                            value={item.status}
                            onChange={(e) => onUpdateTimelineStatus(item.id, e.target.value as any)}
                            className={`text-[11px] font-bold px-2 py-1 rounded-lg border focus:outline-none ${
                              item.status === 'completed'
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                                : item.status === 'in_progress'
                                ? 'bg-amber-950 text-amber-300 border-amber-600 font-black'
                                : 'bg-slate-950 text-slate-400 border-slate-800'
                            }`}
                          >
                            <option value="pending">📌 قادم</option>
                            <option value="in_progress">⏳ جاري الآن</option>
                            <option value="completed">✅ مكتمل</option>
                          </select>
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setEditingEvent({ ...item })}
                              className="p-1 text-amber-400 hover:text-amber-300 rounded hover:bg-slate-800"
                              title="تعديل"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            {onDeleteTimelineEvent && (
                              <button
                                onClick={() => setEventToDelete(item)}
                                className="p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-800"
                                title="حذف"
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

      {/* ========================================================= */}
      {/* VIEW MODE 4: Printable Official A4 Document (كشف الطباعة المعتمد) */}
      {/* ========================================================= */}
      {viewMode === 'print' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Printer className="w-4 h-4 text-amber-400" />
              <span>معاينة جاهزة للطباعة والتصدير بتنسيق A4 الرسمي</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('timeline')}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-4 py-2 rounded-xl transition"
              >
                العودة للجدول التفاعلي
              </button>
              <button
                onClick={() => {
                  if (settings) {
                    generateRunOfShowPDF(timeline, settings, settings.companyNameAr || 'شركة كيان لتنظيم الفعاليات والرحلات');
                  } else {
                    window.print();
                  }
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition active:scale-95"
              >
                <FileText className="w-4 h-4" />
                تحميل PDF رسمي 📑
              </button>
              <button
                onClick={() => window.print()}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-5 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition active:scale-95"
              >
                <Printer className="w-4 h-4" />
                طباعة الكشف المعتمد الآن (Print A4) 🖨️
              </button>
            </div>
          </div>

          {/* Printable Sheet */}
          <div className="bg-white text-slate-900 rounded-2xl p-8 shadow-2xl border border-slate-200 print:border-none print:shadow-none print:p-0 max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-slate-900 text-amber-400 flex items-center justify-center font-black text-xl">
                    K
                  </div>
                  <h2 className="text-xl font-black text-slate-900">
                    {settings?.companyNameAr || 'مؤسسة كيان لتنظيم الفعاليات والمؤتمرات (KAYAN)'}
                  </h2>
                </div>
                <p className="text-xs text-slate-600 mt-1 font-semibold">
                  برنامج سير اليوم والخطة التشغيلية الميدانية المعتمدة (Run-of-Show)
                </p>
              </div>

              <div className="text-left text-xs font-mono">
                <div className="font-bold text-slate-800">
                  الفعالية: <span className="text-indigo-600 font-black">{settings?.tripName || 'رحلة كيان'}</span>
                </div>
                <div className="text-slate-600">التاريخ: {settings?.tripDate || '2026-08-25'}</div>
                <div className="text-slate-600">الوجهة: {settings?.destination || 'الموقع المحدد'}</div>
              </div>
            </div>

            {/* Program Items Table */}
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-black">
                  <th className="p-2.5 border border-slate-300 w-12 text-center">م</th>
                  <th className="p-2.5 border border-slate-300 w-24">التوقيت</th>
                  <th className="p-2.5 border border-slate-300">الفقرة / النشاط والتعليمات</th>
                  <th className="p-2.5 border border-slate-300 w-36">المكان المحدد</th>
                  <th className="p-2.5 border border-slate-300 w-36">اللجنة المسؤولة</th>
                  <th className="p-2.5 border border-slate-300 w-24 text-center">التأكيد</th>
                </tr>
              </thead>
              <tbody>
                {timeline.map((item, idx) => (
                  <tr key={item.id} className="border-b border-slate-200">
                    <td className="p-2.5 border border-slate-300 text-center font-mono font-bold">
                      {idx + 1}
                    </td>
                    <td className="p-2.5 border border-slate-300 font-mono font-bold text-indigo-700 whitespace-nowrap">
                      {item.time}
                    </td>
                    <td className="p-2.5 border border-slate-300">
                      <div className="font-black text-slate-900 text-xs">{item.title}</div>
                      <div className="text-[11px] text-slate-600">{item.description}</div>
                      {item.performer && (
                        <div className="text-[10px] text-indigo-600 font-semibold mt-0.5">
                          المسؤول/الفنان: {item.performer}
                        </div>
                      )}
                    </td>
                    <td className="p-2.5 border border-slate-300 font-medium">{item.location}</td>
                    <td className="p-2.5 border border-slate-300 font-medium">{item.assignedTeam}</td>
                    <td className="p-2.5 border border-slate-300 text-center">
                      <div className="w-5 h-5 border-2 border-slate-400 rounded mx-auto"></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Footer Signatures */}
            <div className="pt-6 border-t-2 border-slate-900 flex justify-between items-center text-xs">
              <div className="text-center space-y-8">
                <span className="font-bold text-slate-700">توقيع مسؤول العمليات والليدر</span>
                <div className="text-slate-400 font-mono">...................................</div>
              </div>

              <div className="flex items-center justify-center">
                <CompanySeal
                  companyNameAr={settings?.companyNameAr || 'كيان لتنظيم الفعاليات'}
                  companyNameEn={settings?.companyNameEn || 'KAYAN EVENTS'}
                  licenseNumber={settings?.companyLicenseNo || 'EG-78921-OPS'}
                  sealColor={settings?.companySealColor || '#1e3a8a'}
                  size={100}
                />
              </div>

              <div className="text-center space-y-8">
                <span className="font-bold text-slate-700">اعتماد إدارة الكيان</span>
                <div className="text-slate-400 font-mono">...................................</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODALS & DIALOGS */}

      {/* Modal 1: 1-Click Trip Program Packages Preset Selector */}
      {isPresetModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  حزم برامج الفعاليات الجاهزة (1-Click Event Programs)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  اختر باقة متكاملة لإدراج جدول اليوم بالكامل تلقائياً بنقرة واحدة
                </p>
              </div>
              <button
                onClick={() => setIsPresetModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {fullTripPresetPackages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="bg-slate-950 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-4 transition space-y-3 group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl p-2 bg-slate-900 rounded-xl border border-slate-800">
                        {pkg.icon}
                      </span>
                      <div>
                        <h4 className="text-sm sm:text-base font-black text-white group-hover:text-amber-400 transition">
                          {pkg.name}
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">{pkg.description}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleApplyPresetPackage(pkg)}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow-lg shadow-amber-500/20 active:scale-95 whitespace-nowrap"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      استيراد البرنامج 🚀
                    </button>
                  </div>

                  {/* Highlights */}
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-900">
                    {pkg.events.map((ev, i) => (
                      <span
                        key={i}
                        className="text-[10px] bg-slate-900 text-slate-300 px-2 py-0.5 rounded border border-slate-800 font-mono"
                      >
                        {ev.time} {ev.title}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsPresetModalOpen(false)}
                className="bg-slate-800 text-slate-300 font-bold px-5 py-2 rounded-xl text-xs hover:bg-slate-700 transition"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Add Timeline Event Modal */}
      {isAddEventModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                إضافة فقرة / محطة جديدة للجدول
              </h3>
              <button
                onClick={() => setIsAddEventModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            {/* Quick Presets Selector */}
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 space-y-2">
              <span className="text-xs text-amber-400 font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                اقتراحات سريعة بنقرة واحدة:
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                {singleEventPresets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setNewEvent({
                        time: preset.time,
                        title: preset.title,
                        description: preset.description,
                        location: preset.location,
                        assignedTeam: preset.assignedTeam,
                        status: 'pending',
                        category: preset.category,
                        performer: preset.performer,
                        isOptionalAddon: false,
                        costExtra: 0,
                      });
                    }}
                    className="bg-slate-900 hover:bg-amber-500/20 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 border border-slate-800 text-[11px] px-2.5 py-1 rounded-lg transition font-medium"
                  >
                    {preset.time} • {preset.title}
                  </button>
                ))}
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (onAddTimelineEvent) {
                  onAddTimelineEvent(newEvent);
                }
                setIsAddEventModalOpen(false);
                setNewEvent({
                  time: '04:00 ص',
                  title: '',
                  description: '',
                  location: 'نقطة التجمع',
                  assignedTeam: 'لجنة التنظيم والإشراف',
                  status: 'pending',
                  category: 'party',
                  performer: '',
                  isOptionalAddon: false,
                  costExtra: 0,
                });
              }}
              className="space-y-3 text-xs sm:text-sm"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">التوقيت (مثال: 08:30 ص)</label>
                  <input
                    type="text"
                    required
                    value={newEvent.time}
                    onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 font-mono focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">عنوان الفعالية / المحطة</label>
                  <input
                    type="text"
                    required
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none"
                    placeholder="مثال: مهرجان الفوم والألوان"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">تفاصيل وتعليمات النشاط</label>
                <textarea
                  rows={2}
                  required
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none"
                  placeholder="اكتب التعليمات التي يجب على الطلاب والمشرفين اتباعها..."
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">فئة الفعالية / النشاط</label>
                  <select
                    value={newEvent.category}
                    onChange={(e) => setNewEvent({ ...newEvent, category: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="party">🎉 حفلة وفوم (Party)</option>
                    <option value="dj">🎧 دي جي وصوتيات (DJ & Music)</option>
                    <option value="photo">📸 سيشن تصوير ودرون (Photo & Drone)</option>
                    <option value="ceremony">🏆 حفل تكريم ودروع (Ceremony)</option>
                    <option value="sports">⚽ مسابقات وبحر (Sports & Beach)</option>
                    <option value="meals">🍗 وجبات وإعاشة (Meals)</option>
                    <option value="travel">🚌 تحرك وسفر (Travel & Buses)</option>
                    <option value="other">📌 أخرى (Other)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">المسؤول / الفنان / الـ DJ</label>
                  <input
                    type="text"
                    value={newEvent.performer}
                    onChange={(e) => setNewEvent({ ...newEvent, performer: e.target.value })}
                    placeholder="مثال: DJ Mido / كابتن كريم"
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">المكان المحدد</label>
                  <input
                    type="text"
                    required
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none"
                    placeholder="مثال: الشاطئ الرئيسي"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">اللجنة / الفريق المسؤول</label>
                  <input
                    type="text"
                    required
                    value={newEvent.assignedTeam}
                    onChange={(e) => setNewEvent({ ...newEvent, assignedTeam: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none"
                    placeholder="مثال: لجنة الترفيه والميديا"
                  />
                </div>
              </div>

              {/* Optional VIP Addon Toggle */}
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2">
                <label className="flex items-center gap-2 text-slate-200 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newEvent.isOptionalAddon}
                    onChange={(e) => setNewEvent({ ...newEvent, isOptionalAddon: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700 focus:ring-amber-500"
                  />
                  <span>⭐ هذه فعالية اختيارية ذات رسم إضافي (VIP Addon)</span>
                </label>

                {newEvent.isOptionalAddon && (
                  <div className="pt-2 border-t border-slate-900">
                    <label className="block text-slate-300 text-xs font-bold mb-1">الرسوم الإضافية (بالجنية)</label>
                    <input
                      type="number"
                      value={newEvent.costExtra || ''}
                      onChange={(e) => setNewEvent({ ...newEvent, costExtra: Number(e.target.value) })}
                      placeholder="مثال: 150 ج.م"
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-1.5 focus:border-amber-500 focus:outline-none font-mono"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddEventModalOpen(false)}
                  className="bg-slate-800 text-slate-300 font-bold px-4 py-2 rounded-xl text-xs hover:bg-slate-700 transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="bg-amber-500 text-slate-950 font-black px-6 py-2 rounded-xl text-xs shadow-lg shadow-amber-500/20 hover:bg-amber-400 transition"
                >
                  إضافة الفقرة للجدول
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Edit Timeline Event Modal */}
      {editingEvent && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                تعديل بيانات المحطة / الفقرة
              </h3>
              <button
                onClick={() => setEditingEvent(null)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (onUpdateTimelineEvent) {
                  onUpdateTimelineEvent(editingEvent);
                }
                setEditingEvent(null);
              }}
              className="space-y-3 text-xs sm:text-sm"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">التوقيت</label>
                  <input
                    type="text"
                    required
                    value={editingEvent.time}
                    onChange={(e) => setEditingEvent({ ...editingEvent, time: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 font-mono focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">عنوان الفعالية / المحطة</label>
                  <input
                    type="text"
                    required
                    value={editingEvent.title}
                    onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">تفاصيل وتعليمات النشاط</label>
                <textarea
                  rows={2}
                  required
                  value={editingEvent.description}
                  onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">فئة الفعالية / النشاط</label>
                  <select
                    value={editingEvent.category || 'party'}
                    onChange={(e) => setEditingEvent({ ...editingEvent, category: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="party">🎉 حفلة وفوم (Party)</option>
                    <option value="dj">🎧 دي جي وصوتيات (DJ & Music)</option>
                    <option value="photo">📸 سيشن تصوير ودرون (Photo & Drone)</option>
                    <option value="ceremony">🏆 حفل تكريم ودروع (Ceremony)</option>
                    <option value="sports">⚽ مسابقات وبحر (Sports & Beach)</option>
                    <option value="meals">🍗 وجبات وإعاشة (Meals)</option>
                    <option value="travel">🚌 تحرك وسفر (Travel & Buses)</option>
                    <option value="other">📌 أخرى (Other)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">المسؤول / الفنان / الـ DJ</label>
                  <input
                    type="text"
                    value={editingEvent.performer || ''}
                    onChange={(e) => setEditingEvent({ ...editingEvent, performer: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">المكان المحدد</label>
                  <input
                    type="text"
                    required
                    value={editingEvent.location}
                    onChange={(e) => setEditingEvent({ ...editingEvent, location: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">اللجنة / الفريق المسؤول</label>
                  <input
                    type="text"
                    required
                    value={editingEvent.assignedTeam}
                    onChange={(e) => setEditingEvent({ ...editingEvent, assignedTeam: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Optional VIP Addon Toggle */}
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2">
                <label className="flex items-center gap-2 text-slate-200 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingEvent.isOptionalAddon || false}
                    onChange={(e) => setEditingEvent({ ...editingEvent, isOptionalAddon: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700 focus:ring-amber-500"
                  />
                  <span>⭐ هذه فعالية اختيارية ذات رسم إضافي (VIP Addon)</span>
                </label>

                {editingEvent.isOptionalAddon && (
                  <div className="pt-2 border-t border-slate-900">
                    <label className="block text-slate-300 text-xs font-bold mb-1">الرسوم الإضافية (بالجنية)</label>
                    <input
                      type="number"
                      value={editingEvent.costExtra || ''}
                      onChange={(e) => setEditingEvent({ ...editingEvent, costExtra: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-1.5 focus:border-amber-500 focus:outline-none font-mono"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingEvent(null)}
                  className="bg-slate-800 text-slate-300 font-bold px-4 py-2 rounded-xl text-xs hover:bg-slate-700 transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="bg-amber-500 text-slate-950 font-black px-6 py-2 rounded-xl text-xs shadow-lg shadow-amber-500/20 hover:bg-amber-400 transition"
                >
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Delete Event Confirmation Modal */}
      {eventToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-500" />
                تأكيد حذف محطة من الجدول
              </h3>
              <button onClick={() => setEventToDelete(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              هل أنت متأكد من حذف حدث <strong className="text-amber-400">{eventToDelete.title}</strong> في تمام الساعة <span className="text-indigo-400 font-mono font-bold">{eventToDelete.time}</span>؟
            </p>
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEventToDelete(null)}
                className="bg-slate-800 text-slate-300 font-bold px-4 py-2 rounded-xl text-xs hover:bg-slate-700 transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteTimelineEvent) onDeleteTimelineEvent(eventToDelete.id);
                  setEventToDelete(null);
                }}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-5 py-2 rounded-xl text-xs shadow-lg shadow-rose-600/20 transition"
              >
                نعم، حذف الحدث
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 5: Broadcast Center Modal */}
      <BroadcastCenterModal
        isOpen={isBroadcastModalOpen}
        onClose={() => setIsBroadcastModalOpen(false)}
        students={students}
        settings={
          settings || {
            tripName: 'رحلة كيان',
            tripDate: '',
            destination: '',
            totalSeats: 300,
            ticketPrice: 800,
            driveLink: '',
            whatsappGroupLink: '',
            supportPhone: '',
            assemblyTime: '',
            assemblyLocation: '',
          }
        }
      />
    </div>
  );
};

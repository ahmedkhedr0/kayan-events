import React, { useState } from 'react';
import {
  FileText,
  Printer,
  Download,
  Plus,
  Receipt,
  FileCheck,
  Building,
  Utensils,
  Bus,
  Camera,
  Music,
  Printer as PrintIcon,
  UserCheck,
  Edit3,
  Trash2,
  Eye,
  Check,
  X,
  Sparkles,
  ShieldCheck,
  Scale,
  Bold,
  Italic,
  Underline,
  AlignRight,
  AlignCenter,
  AlignLeft,
  Type,
  Palette,
  Highlighter,
  Sliders,
  RefreshCw,
  FileSignature,
  CreditCard,
  Search,
  Users,
  CheckCircle2,
  Image as ImageIcon,
  Briefcase,
  Award,
  Shield,
  QrCode,
  PenTool,
  Copy,
  CheckCheck,
  Stamp,
  Layers,
  Lock,
  BookOpen,
  FileSpreadsheet,
  ShieldAlert,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { ContractData, ReceiptVoucher, ContractType, ContractStatus, TripSettings, Student, PaymentMethod } from '../types';
import {
  generateContractPDF,
  generateReceiptPDF,
  exportReceiptAsHighResImage,
  exportContractAsHighResImage,
  exportDOMElementToPDF,
} from '../services/pdfGenerator';
import { CompanySeal } from './CompanySeal';
import { DigitalSignaturePad } from './DigitalSignaturePad';
import { LEGAL_CLAUSE_LIBRARY, LegalClauseTemplate } from '../data/legalClauseLibrary';
import kayanBadge from '../assets/images/kayan_badge_1785354902221.jpg';

interface ContractsReceiptsProps {
  contracts: ContractData[];
  receipts: ReceiptVoucher[];
  students?: Student[];
  settings: TripSettings;
  onAddContract: (contract: ContractData) => void;
  onUpdateContract?: (contract: ContractData) => void;
  onDeleteContract?: (id: string) => void;
  onAddReceipt: (receipt: ReceiptVoucher) => void;
  onUpdateReceipt?: (receipt: ReceiptVoucher) => void;
  onDeleteReceipt?: (id: string) => void;
  onUpdateStudent?: (student: Student) => void;
}

// Arabic Tafqit Helper: Convert Numbers to Arabic Spoken Currency Words
export function numberToArabicWords(amount: number): string {
  if (!amount || amount <= 0) return 'صفر جنيه مصري لا غير';

  const units = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

  function convertGroup(num: number): string {
    if (num < 20) return units[num];
    if (num < 100) {
      const u = num % 10;
      const t = Math.floor(num / 10);
      return u > 0 ? `${units[u]} و${tens[t]}` : tens[t];
    }
    const h = Math.floor(num / 100);
    const rem = num % 100;
    const remStr = rem > 0 ? ` و${convertGroup(rem)}` : '';
    return `${hundreds[h]}${remStr}`;
  }

  if (amount < 1000) {
    return `${convertGroup(amount)} جنيه مصري لا غير`;
  }

  if (amount < 1000000) {
    const thousands = Math.floor(amount / 1000);
    const remainder = amount % 1000;
    let thStr = '';
    if (thousands === 1) thStr = 'ألف';
    else if (thousands === 2) thStr = 'ألفان';
    else if (thousands >= 3 && thousands <= 10) thStr = `${units[thousands]} آلاف`;
    else thStr = `${convertGroup(thousands)} ألف`;

    const remStr = remainder > 0 ? ` و${convertGroup(remainder)}` : '';
    return `${thStr}${remStr} جنيه مصري لا غير`;
  }

  return `${amount.toLocaleString('ar-EG')} جنيه مصري لا غير`;
}

// Preset standard legal clauses templates for all 10 corporate contract types (صيغ قانونية رسمية ومحكمة للشركات)
export const LEGAL_PRESETS: Record<ContractType, {
  name: string;
  icon: any;
  defaultTitle: string;
  partyPlaceholder: string;
  defaultClauses: string[];
}> = {
  student_rep: {
    name: 'عقد ممثل الدفعة / الطلاب',
    icon: UserCheck,
    defaultTitle: 'عقد اتفاق وتنظيم رحلة جماعية ملزم مع ممثل الدفعة الطلابية',
    partyPlaceholder: 'أحمد محمود (رئيس اتحاد / ممثل دفعة 2026)',
    defaultClauses: [
      'البند الأول (موضوع العقد والالتزامات العامة): اتفقت جميع الأطراف بكامل إرادتها على إسناد تنظيم وتنفيذ الفعالية والرحلة الجماعية إلى شركة كيان لتنظيم الفعاليات، وتلتزم الشركة بتوفير حافلات سياحية حديثة VIP، وتأمين حجز القرية، والبرنامج الترفيهي والتصوير المعتمد.',
      'البند الثاني (الكشوف المعتمدة والتسوية المالية): يلتزم الطرف الثاني (ممثل الدفعة) بتسليم الكشوف النهائية المعتمدة لأسماء المشاركين ورقم الهواتف، وتصفية وسداد كافة المبالغ والمستحقات المتبقية قبل موعد التحرك بـ 48 ساعة على الأقل.',
      'البند الثالث (تعليمات الانضباط والسلامة): يتعهد الطرف الثاني بضرورة إبلاغ كافة المشاركين بالتزام قواعد السلامة والتعليمات الصادرة من مشرفي الرحلة، والالتزام بمواعيد التجمع والتحرك المحددة بالمخطط التنفيذي.',
      'البند الرابع (الشرط الجزائي وسياسة الإلغاء المحكمة): في حالة إلغاء الحجز أو انسحاب الطرف الثاني قبل موعد الفعالية بأقل من 72 ساعة، يخصم 50% من إجمالي المبلغ المقدم كشرط جزائي ملزم لتغطية الحجوزات المسبقة غير المرتجعة لدى الفنادق والموردين.',
      'البند الخامس (إخلاء المسؤولية عن الممتلكات الشخصية): الشركة غير مسؤولة عن فقدان أو تلف أية أجهزة إلكترونية أو متعلقات شخصية خاصة بالطلاب لم يتم تسليمها رسمياً للأمانات بموجب إيصال استلام.',
      'البند السادس (القوة القاهرة والنظام القانوني): يُعفى أي طرف من مسؤولية التأخير في حالة حدوث قوة قاهرة خارجة عن الإرادة (كالظروف الجوية الطارئة أو القرارات السيادية). يُعتبر هذا العقد وثيقة سند رسمية ملزمة للطرفين وخاضعة لأحكام والقوانين النافذة.',
    ],
  },
  resort: {
    name: 'عقد القرية / الفندق',
    icon: Building,
    defaultTitle: 'عقد حجز واستخدام مرافق وشواطئ القرية والخدمات الفندقية',
    partyPlaceholder: 'إدارة قرية ريتال فيو - العين السخنة',
    defaultClauses: [
      'البند الأول (الاستقبال والتأمين الشاطئي): يلتزم الطرف الثاني (إدارة القرية) بتخصيص المساحات الشاطئية والمظلات والراحات الكافية لاستقبال المجموعة، وتوفير طاقم إنقاذ بحري مؤهل ومتواجد بشكل دائم طوال فترة تواجد الطلاب بالبحر وحمامات السباحة.',
      'البند الثاني (جاهزية المرافق والإعاشة): يلتزم الطرف الثاني بجهوزية ونظافة غرف إبدال الملابس والمطاعم والمرافق العامة وتوفير مصادر الكهرباء والماء طوال ساعات الفعالية.',
      'البند الثالث (حفظ النظام وسلوك المجموعة): يلتزم الطرف الأول بالحفاظ على النظام العام والنظافة العامة واتباع التعليمات الأمنية بالقرية تحت إشراف طاقم المنظمين.',
      'البند الرابع (إثبات التلفيات العمدية): في حالة حدوث أي تلفيات متعمدة بمرافق القرية، يتم تقييمها ومعاينتها بموجب محضر مشترك وموقع بين المشرف العام وإدارة القرية لحصر التكلفة الفعلية للترميم.',
      'البند الخامس (تثبيت الأسعار والشروط المباشرة): يتعهد الطرف الثاني بعدم فرض أية رسوم إضافية أو زيادات غير مدونة بالعقد على أسعار الدخول واستخدام المرافق والأنشطة المعتمدة.',
    ],
  },
  meals: {
    name: 'عقد مطعم الوجبات والإعاشة',
    icon: Utensils,
    defaultTitle: 'عقد توريد وجبات الغداء والمشروبات المعتمدة للرحلة',
    partyPlaceholder: 'مطعم وكافيه البحر الأبيض للإعاشة',
    defaultClauses: [
      'البند الأول (المواصفات والتغليف الصحي): يلتزم الطرف الثاني (المطعم) بتوريد عدد الوجبات المطلوب مغلفة في طرود حرارية ألومنيوم صحية ومطابقة لأعلى معايير سلامة الأغذية والمواصفات المعتمدة.',
      'البند الثاني (الالتزام بمواعيد التسليم): التزام المطعم بالدقة المتناهية في مواعيد التسليم في الموقع المحدد (الساعة 02:30 مساءً) بحالة طازجة وسخونة ممتازة.',
      'البند الثالث (المسؤولية الطبية والصحية): يتحمل المطعم المسؤولية القانونية والصحية الكاملة عن سلامة كافة المواد الغذائية والمشروبات الموردة للطلاب.',
      'البند الرابع (غرامة التأخير والجودة): في حالة تأخر التسليم عن الموعد بمدة تزيد عن 30 دقيقة أو وجود نقص في جودة الوجبات، يُخصم 20% من القيمة الإجمالية للعقد كشرط جزائي مع إلزام المطعم بالتعويض الفوري.',
    ],
  },
  bus_company: {
    name: 'عقد شركة الأتوبيسات والأسطول',
    icon: Bus,
    defaultTitle: 'عقد إيجار أسطول حافلات مرسيدس VIP لنقل المسافرين',
    partyPlaceholder: 'شركة النيل للنقل السياحي والرحلات',
    defaultClauses: [
      'البند الأول (جاهزية الأسطول والتكييف): يلتزم الطرف الثاني (شركة النقل) بتوفير أسطول الحافلات المحدد موديلات حديثة (مرسيدس VIP) مجهزة بتكييف عالي الكفاءة وشاشات عرض ونظام صوتي ممتاز.',
      'البند الثاني (انضباط السائقين والتعليمات): يلتزم سائقو الحافلات بالسرعات القانونية المحددة من المرور، والالتزام الكامل بمواعيد التحرك والاستراحات والعودة، والتعاون الكامل مع مشرفي الفعالية.',
      'البند الثالث (بديل الحافلة الفوري): في حالة حدوث عطل مفاجئ بأي حافلة أثناء الطريق، تلتزم شركة النقل بتوفير حافلة بديلة بنفس الجودة والمواصفات خلال مدة لا تتجاوز 60 دقيقة من أوقات التوقف.',
      'البند الرابع (رسوم الطرق والتأمين الشامل): يلتزم الطرف الثاني بسداد كافة كارتات الطرق والرسوم والتأمين الشامل على الركاب طوال فترة الرحلة.',
    ],
  },
  media: {
    name: 'عقد تيم الميديا والدرون',
    icon: Camera,
    defaultTitle: 'عقد تغطية وتوثيق الفعالية ميديا وكاميرا درون طائرة',
    partyPlaceholder: 'تيم فوتو ماسترز للتصوير والإنتاج',
    defaultClauses: [
      'البند الأول (طاقم التغطية والمعدات): يلتزم الطرف الثاني (تيم التصوير) بتوفير طاقم احترافي وكاميرات سينمائية وطائرة درون للتغطية الجوية لكافة الفقرات والبرامج من التجمع وحتى العودة.',
      'البند الثاني (تسليم المواد المونتاجة): يلتزم تيم الميديا بتسليم جميع الصور المرفوعة والمعدلة بجودة عالية HD وفيديو المونتاج الترويجي الرسمي خلال 5 أيام عمل من تاريخ الفعالية عبر رابط درايف.',
      'البند الثالث (الملكية الفكرية والحقوق): تؤول كافة حقوق الملكية الفكرية والنشر والاستخدام الإعلامي حصرياً لشركة كيان لتنظيم الفعاليات، ولا يحق للطرف الثاني إتاحتها لأي جهة بدون إذن كتابي.',
    ],
  },
  dj: {
    name: 'عقد الـ DJ والتجهيزات',
    icon: Music,
    defaultTitle: 'عقد تجهيزات مسرح الصوت والـ DJ والفقرات الترفيهية',
    partyPlaceholder: 'فريق لايف ساوند للـ DJ والتجهيزات',
    defaultClauses: [
      'البند الأول (التجهيزات والتحضير المبكر): يلتزم الطرف الثاني بتجهيز مسرح الصوت (Sound System Line Array)، وإضاءات الليزر ومدافع الفوم والألوان، مع التواجد بمقر الفعالية قبل موعد الاستقبال بساعتين.',
      'البند الثاني (الالتزام ببرنامج الفعالية): التشغيل المستمر وفق البرنامج المعتمد، والالتزام بالذوق العام وقائمة الصوتيات والأغاني المحددة مع مشرفي الفعالية.',
      'البند الثالث (عوامل الأمان): يتحمل مهندس الصوت والـ DJ المسؤولية عن سلامة الوصلات والمعدات وتجنب الأحمال الزائدة وتأمين الكهرباء.',
    ],
  },
  printing: {
    name: 'عقد مطبعة التيشرتات والبراندنج',
    icon: PrintIcon,
    defaultTitle: 'عقد طباعة وتوريد تيشرتات وبنرات البراندنج',
    partyPlaceholder: 'مطبعة الأهرام للدعاية والطباعة الديجيتال',
    defaultClauses: [
      'البند الأول (الخامات ومواصفات الطباعة): يلتزم الطرف الثاني (المطبعة) بتوريد عدد التيشرتات والمطبوعات المطلوبة بخامة قطن 100% وطباعة ثابتة لا تتأثر بالغسيل والاستهلاك.',
      'البند الثاني (المطابقة الدقيقة): المطابقة التامة للمقاسات والألوان وشعارات الفعالية ورعاتها طبقاً للملفات الديجيتال المعتمدة من شركة كيان.',
      'البند الثالث (موعد التسليم المسبق): تسليم جميع الطلبيات والبنرات بمقر الشركة قبل موعد الفعالية بـ 48 ساعة على الأقل، مع تطبيق غرامة 15% عند التأخير.',
    ],
  },
  sponsorship: {
    name: 'عقد الرعاية والشراكة التسويقية',
    icon: Award,
    defaultTitle: 'عقد رعاية رسمية وشراكة تجارية وتسويقية للفعالية',
    partyPlaceholder: 'شركة إكس للحلول والخدمات (الراعي البلاتيني)',
    defaultClauses: [
      'البند الأول (المزايا والحقوق الحصرية): يلتزم الطرف الأول بإبراز شعار الراعي الرسمي في جميع المواد الدعائية والمطبوعات والبث المرئي للفعالية وذكر اسم الراعي في كافة التغطيات الإعلامية.',
      'البند الثاني (الالتزام المالي للدفعات): يلتزم الطرف الثاني بسداد قيمة الرعاية المتفق عليها وفق جدول الدفعات المحدد دون تأخير.',
      'البند الثالث (المساحات الترويجية): تخصيص جناح ترويجي ومساحات عرض متميزة للراعي بمقر إقامة الفعالية للتواصل المباشر مع المشاركين.',
      'البند الرابع (حماية العلامة التجارية): يلتزم الطرفان بعدم استخدام شعارات أو علامات الطرف الآخر في غير الأغراض المحددة بهذا العقد.',
    ],
  },
  security: {
    name: 'عقد الحراسة وتأمين الفعالية',
    icon: Shield,
    defaultTitle: 'عقد تأمين وحراسة وإدارة الحشود والسلامة الميدانية',
    partyPlaceholder: 'شركة فالكون لحراسة وتأمين الفعاليات',
    defaultClauses: [
      'البند الأول (أطقم التأمين والانضباط): يلتزم الطرف الثاني بتوفير طاقم حراسة وأمن مدرب بالزي الرسمي الموحد لتنظيم وتأمين البوابات ومحيط الفعالية والحفاظ على النظام العام.',
      'البند الثاني (إدارة الحشود والتدخل السريع): التعامل بحرفية وسرعة مع حالات التدافع والتنسيق الفوري مع مشرفي شركة كيان والجهات المعنية عند اللزوم.',
      'البند الثالث (خطة الإخلاء والطوارئ): مراجعة مخارج الطوارئ ومسارات الحركة الآمنة وتأمين معدات الإطفاء والإسعافات الأولية قبل بدء استقبال الحضور.',
    ],
  },
  conference: {
    name: 'عقد تنظيم المؤتمرات والندوات',
    icon: Briefcase,
    defaultTitle: 'عقد تنظيم وإدارة مؤتمر علمي وملتقى أكاديمي متكامل',
    partyPlaceholder: 'الأمانة العامة للمؤتمر الدولي للتكنولوجيا والابتكار',
    defaultClauses: [
      'البند الأول (التجهيزات الفنية والقاعات): تلتزم شركة كيان بتوفير قاعات المؤتمر المجهزة بأحدث الشاشات وأنظمة الصوت والترجمة الفورية وشبكات الإنترنت فائقة السرعة.',
      'البند الثاني (الاستقبال والضيافة): توفير طاقم استقبال وتنسيق دخول الوفود والشخصيات العامة وخدمات الضيافة VIP وإعداد حقائب المؤتمر والمطبوعات.',
      'البند الثالث (إصدار الشهادات والتوثيق): إعداد وطباعة شهادات الحضور المعتمدة وتوثيق الجلسات والورش بالصوت والصورة وتسليم الأرشيف الكامل خلال أسبوع.',
    ],
  },
};

export const ContractsReceipts: React.FC<ContractsReceiptsProps> = ({
  contracts,
  receipts,
  students = [],
  settings,
  onAddContract,
  onUpdateContract,
  onDeleteContract,
  onAddReceipt,
  onUpdateReceipt,
  onDeleteReceipt,
  onUpdateStudent,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'contracts' | 'receipts'>('contracts');

  // Modal State
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Student Deposit Payment States inside ContractsReceipts
  const [isStudentDepositModalOpen, setIsStudentDepositModalOpen] = useState(false);
  const [selectedStudentForDeposit, setSelectedStudentForDeposit] = useState<Student | null>(null);
  const [studentDepositAmount, setStudentDepositAmount] = useState<number>(500);
  const [studentDepositMethod, setStudentDepositMethod] = useState<PaymentMethod>('cash');
  const [studentDepositSupervisor, setStudentDepositSupervisor] = useState<string>('إدارة مالية شركة كيان');
  const [studentDepositNotes, setStudentDepositNotes] = useState<string>('');
  const [studentSearchTerm, setStudentSearchTerm] = useState<string>('');

  // Receipts Section Subtab & Filter States
  const [receiptsSectionTab, setReceiptsSectionTab] = useState<'students' | 'vouchers'>('students');
  const [receiptSearchTerm, setReceiptSearchTerm] = useState<string>('');
  const [receiptTypeFilter, setReceiptTypeFilter] = useState<'all' | 'receipt' | 'payment'>('all');

  // Live Inspector Document Sheet State & Refs
  const [viewingContract, setViewingContract] = useState<ContractData | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<ReceiptVoucher | null>(null);
  const [isContractFullscreen, setIsContractFullscreen] = useState(false);
  const [isReceiptFullscreen, setIsReceiptFullscreen] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<ContractData | null>(null);
  const [receiptToDelete, setReceiptToDelete] = useState<ReceiptVoucher | null>(null);
  const contractSheetRef = React.useRef<HTMLDivElement>(null);
  const receiptSheetRef = React.useRef<HTMLDivElement>(null);

  // Enterprise Contract Management States
  const [isClauseLibraryOpen, setIsClauseLibraryOpen] = useState(false);
  const [clauseCategoryFilter, setClauseCategoryFilter] = useState<string>('all');
  const [clauseSearchTerm, setClauseSearchTerm] = useState<string>('');
  const [isSignaturePadOpen, setIsSignaturePadOpen] = useState(false);
  const [signatureTarget, setSignatureTarget] = useState<'first_party' | 'second_party'>('second_party');
  const [contractStatusFilter, setContractStatusFilter] = useState<'all' | ContractStatus>('all');
  const [contractTypeFilter, setContractTypeFilter] = useState<'all' | ContractType>('all');
  const [contractSearchTerm, setContractSearchTerm] = useState<string>('');

  // Rich Text Formatting & Styling State
  const [docFormatting, setDocFormatting] = useState({
    fontFamily: "'Tajawal', sans-serif",
    fontSize: '14px',
    textColor: '#0f172a',
    highlightBg: 'transparent',
    textAlign: 'right' as 'right' | 'center' | 'left',
    isBold: true,
    isItalic: false,
    isUnderline: false,
    lineHeight: 'leading-relaxed',
    showWatermark: true,
    showSeal: true,
    theme: 'royal_gold' as 'royal_gold' | 'corporate_navy' | 'modern_emerald',
  });

  // Official Company Seal Configuration State
  const [sealConfig, setSealConfig] = useState({
    companyNameAr: settings.companyNameAr || 'شركة كيان لتنظيم الفعاليات والرحلات',
    companyNameEn: settings.companyNameEn || 'KAYAN EVENTS & ORGANIZING SERVICES',
    licenseNo: settings.companyLicenseNo || '98231',
    sealStatusText: 'معتمد رسمياً • OFFICIAL SEAL',
    color: settings.companySealColor || '#1d4ed8',
    rotation: -10,
  });

  // Zoom & Proportional Paper Scaling States (Prevents mobile text-wrapping anomalies & squishing)
  const [contractZoom, setContractZoom] = useState<'fit' | number>('fit');
  const [receiptZoom, setReceiptZoom] = useState<'fit' | number>('fit');
  const contractContainerRef = React.useRef<HTMLDivElement>(null);
  const receiptContainerRef = React.useRef<HTMLDivElement>(null);
  const [contractContainerWidth, setContractContainerWidth] = useState<number>(800);
  const [receiptContainerWidth, setReceiptContainerWidth] = useState<number>(720);
  const [contractSheetHeight, setContractSheetHeight] = useState<number>(1100);
  const [receiptSheetHeight, setReceiptSheetHeight] = useState<number>(800);

  // ResizeObserver for Contract container & paper sheet
  React.useEffect(() => {
    if (!contractContainerRef.current) return;
    const updateW = () => {
      if (contractContainerRef.current) {
        setContractContainerWidth(contractContainerRef.current.clientWidth || 800);
      }
    };
    updateW();
    const ro = new ResizeObserver(updateW);
    ro.observe(contractContainerRef.current);
    window.addEventListener('resize', updateW);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateW);
    };
  }, [viewingContract, isContractFullscreen]);

  React.useEffect(() => {
    if (!contractSheetRef.current) return;
    const updateH = () => {
      if (contractSheetRef.current) {
        setContractSheetHeight(contractSheetRef.current.offsetHeight || 1100);
      }
    };
    updateH();
    const ro = new ResizeObserver(updateH);
    ro.observe(contractSheetRef.current);
    return () => ro.disconnect();
  }, [viewingContract, docFormatting]);

  // ResizeObserver for Receipt container & paper sheet
  React.useEffect(() => {
    if (!receiptContainerRef.current) return;
    const updateW = () => {
      if (receiptContainerRef.current) {
        setReceiptContainerWidth(receiptContainerRef.current.clientWidth || 720);
      }
    };
    updateW();
    const ro = new ResizeObserver(updateW);
    ro.observe(receiptContainerRef.current);
    window.addEventListener('resize', updateW);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateW);
    };
  }, [viewingReceipt, isReceiptFullscreen]);

  React.useEffect(() => {
    if (!receiptSheetRef.current) return;
    const updateH = () => {
      if (receiptSheetRef.current) {
        setReceiptSheetHeight(receiptSheetRef.current.offsetHeight || 800);
      }
    };
    updateH();
    const ro = new ResizeObserver(updateH);
    ro.observe(receiptSheetRef.current);
    return () => ro.disconnect();
  }, [viewingReceipt, docFormatting]);

  const contractBaseWidth = 780;
  const effectiveContractScale = contractZoom === 'fit'
    ? Math.min(1, Math.max(0.35, (contractContainerWidth - 28) / contractBaseWidth))
    : (typeof contractZoom === 'number' ? contractZoom : 1);

  const receiptBaseWidth = 700;
  const effectiveReceiptScale = receiptZoom === 'fit'
    ? Math.min(1, Math.max(0.35, (receiptContainerWidth - 28) / receiptBaseWidth))
    : (typeof receiptZoom === 'number' ? receiptZoom : 1);

  React.useEffect(() => {
    if (settings) {
      setSealConfig((prev) => ({
        ...prev,
        companyNameAr: settings.companyNameAr || prev.companyNameAr,
        companyNameEn: settings.companyNameEn || prev.companyNameEn,
        licenseNo: settings.companyLicenseNo || prev.licenseNo,
        color: settings.companySealColor || prev.color,
      }));
    }
  }, [settings]);

  // Fully customizable contract paper wording state (صياغة عربية قانونية رفيعة المستوى تليق بكيان)
  const [contractLabels, setContractLabels] = useState({
    companyName: 'KAYAN EVENTS & TOURS',
    companySub: 'شركة كيان لتنظيم الفعاليات والرحلات والمؤتمرات',
    regDetails: 'سجل تجاري وترخيص رحلات رقم: 98231 • هاتف الدعم والتعاقدات:',
    contractIdLabel: 'رقم العقد المعتمد:',
    dateLabel: 'التاريخ:',
    dayLabel: 'إنه في يوم',
    cityLabel: 'الموافق، بمدينة',
    preambleEnd: 'تم بحمد الله وتوفيقه إبرام هذا العقد والاتفاق القانوني الملزم بين كل من:',
    firstPartyLabel: 'الطرف الأول (المنظم المعتمد):',
    firstPartyText: 'شركة كيان لتنظيم الفعاليات والرحلات والمؤتمرات (KAYAN Events & Tours)، ويمثلها بالتعاقد إدارة الفعالية، هاتف التواصل:',
    secondPartyLabel: 'الطرف الثاني (الجهة المتعاقدة / العميل):',
    secondPartyNameLabel: 'السيد / المنشأة:',
    phoneLabel: '• هاتف التواصل:',
    nationalIdLabel: '• الرقم القومي / السجل التجاري:',
    financialTitle: '❶ البنود والشروط المالية والتكاليف المعتمدة',
    colTotal: 'إجمالي قيمة العقد',
    colDeposit: 'المبلغ المدفوع (العربون)',
    colRemaining: 'المبلغ المتبقي المستحق',
    clausesTitle: '❷ البنود والالتزامات القانونية المتبادلة بين الطرفين',
    firstPartySigTitle: 'توقيع وخاتم الطرف الأول (شركة كيان)',
    firstPartySeal: 'معتمد رسمياً • OFFICIAL SEAL',
    firstPartySigSub: 'الإدارة العامة ومسؤول التعاقدات والفعاليات',
    secondPartySigTitle: 'توقيع واعتماد الطرف الثاني (العميل / المقاول)',
    secondPartySigPlaceholder: 'التوقيع بالموافقة والاعتماد الرسمي',
    secondPartySigNameLabel: 'اسم الموقع:',
    footerText: 'وثيقة تعاقد رسمية معتمدة صادرة إلكترونياً من نظام كيان لإدارة الفعاليات والرحلات • صالحة وسارية قانونياً دون كشط أو تعديل',
  });

  // Fully customizable receipt/voucher paper wording state
  const [receiptLabels, setReceiptLabels] = useState({
    companyName: 'شركة كيان لتنظيم الفعاليات والرحلات',
    typeReceipt: 'إيصال استلام نقدية (Receipt Voucher)',
    typePayment: 'إيصال صرف نقدية (Payment Voucher)',
    numberLabel: 'رقم:',
    dateLabel: 'التاريخ:',
    amountNumLabel: 'المبلغ بالأرقام:',
    amountWordsLabel: 'المبلغ بالحروف (التفقيط):',
    personReceiptLabel: 'استلمنا من السيد/ة:',
    personPaymentLabel: 'صرفنا إلى السيد/ة:',
    reasonLabel: 'وذلك عن قيمة (السبب):',
    methodLabel: 'طريقة السداد:',
    tripLabel: 'الفعالية / الرحلة:',
    supervisorLabel: 'المحاسب / المشرف المسؤول',
    recipientSigLabel: 'توقيع المستلم / العميل',
    footerText: 'إيصال نقدية رسمي معتمد صادر من نظام كيان لإدارة الرحلات',
  });

  // Contract Modal Form
  const [contractForm, setContractForm] = useState({
    id: '',
    type: 'student_rep' as ContractType,
    title: LEGAL_PRESETS.student_rep.defaultTitle,
    partyName: '',
    partyPhone: '',
    partyNationalId: '',
    totalCost: 100000,
    depositPaid: 50000,
    location: settings.destination || 'قرية ريتال فيو - العين السخنة',
    eventDate: settings.tripDate || '2026-08-15',
    clauses: LEGAL_PRESETS.student_rep.defaultClauses,
  });

  // Receipt Modal Form
  const [receiptForm, setReceiptForm] = useState({
    id: '',
    voucherNumber: '',
    type: 'receipt' as 'receipt' | 'payment',
    personName: '',
    amount: 1200,
    reason: `عربون حجز تذكرة ${settings.tripName}`,
    paymentMethod: 'vodafone_cash' as const,
    supervisorName: 'إدارة كيان (KAYAN)',
  });

  // Handle open modal for new contract
  const handleOpenNewContract = () => {
    const defaultMeta = LEGAL_PRESETS.student_rep;
    setContractForm({
      id: '',
      type: 'student_rep',
      title: defaultMeta.defaultTitle,
      partyName: '',
      partyPhone: '',
      partyNationalId: '',
      totalCost: 100000,
      depositPaid: 50000,
      location: settings.destination || 'قرية ريتال فيو - العين السخنة',
      eventDate: settings.tripDate || '2026-08-15',
      clauses: [...defaultMeta.defaultClauses],
    });
    setIsContractModalOpen(true);
  };

  // Handle Edit Existing Contract in Modal
  const handleEditContractModal = (contract: ContractData) => {
    setContractForm({
      id: contract.id,
      type: contract.type,
      title: contract.title,
      partyName: contract.partyName,
      partyPhone: contract.partyPhone,
      partyNationalId: contract.partyNationalId || '',
      totalCost: contract.totalCost,
      depositPaid: contract.depositPaid,
      location: contract.location,
      eventDate: contract.eventDate,
      clauses: contract.clauseNotes && contract.clauseNotes.length > 0
        ? [...contract.clauseNotes]
        : [...(LEGAL_PRESETS[contract.type]?.defaultClauses || [])],
    });
    setIsContractModalOpen(true);
  };

  // Save Contract Form
  const handleSaveContract = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractForm.partyName.trim()) {
      alert('برجاء إدخال اسم الطرف الثاني في العقد');
      return;
    }

    const cleanClauses = contractForm.clauses.map((c) => c.trim()).filter((c) => c.length > 0);

    const contractData: ContractData = {
      id: contractForm.id || `cnt-${Date.now()}`,
      type: contractForm.type,
      title: contractForm.title,
      partyName: contractForm.partyName,
      partyPhone: contractForm.partyPhone,
      partyNationalId: contractForm.partyNationalId,
      totalCost: Number(contractForm.totalCost),
      depositPaid: Number(contractForm.depositPaid),
      remainingBalance: Number(contractForm.totalCost) - Number(contractForm.depositPaid),
      eventDate: contractForm.eventDate,
      location: contractForm.location,
      clauseNotes: cleanClauses,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    if (contractForm.id && onUpdateContract) {
      onUpdateContract(contractData);
    } else {
      onAddContract(contractData);
    }

    setIsContractModalOpen(false);
    if (viewingContract?.id === contractData.id) {
      setViewingContract(contractData);
    }
  };

  // Handle Open New Receipt Modal
  const handleOpenNewReceipt = () => {
    const prefix = 'RC';
    const num = String(receipts.length + 1).padStart(3, '0');
    setReceiptForm({
      id: '',
      voucherNumber: `${prefix}-2026-${num}`,
      type: 'receipt',
      personName: '',
      amount: 1200,
      reason: `عربون حجز تذكرة ${settings.tripName}`,
      paymentMethod: 'vodafone_cash',
      supervisorName: 'إدارة كيان (KAYAN)',
    });
    setIsReceiptModalOpen(true);
  };

  // Save Receipt Form
  const handleSaveReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptForm.personName.trim()) {
      alert('برجاء كتابة اسم الشخص بشكل صحيح');
      return;
    }

    const amountInWords = numberToArabicWords(Number(receiptForm.amount));
    const receiptData: ReceiptVoucher = {
      id: receiptForm.id || `rc-${Date.now()}`,
      voucherNumber: receiptForm.voucherNumber,
      type: receiptForm.type,
      personName: receiptForm.personName,
      amount: Number(receiptForm.amount),
      amountInWords,
      reason: receiptForm.reason,
      paymentMethod: receiptForm.paymentMethod,
      date: new Date().toISOString().slice(0, 10),
      supervisorName: receiptForm.supervisorName,
    };

    if (receiptForm.id && onUpdateReceipt) {
      onUpdateReceipt(receiptData);
    } else {
      onAddReceipt(receiptData);
    }

    setIsReceiptModalOpen(false);
    if (viewingReceipt?.id === receiptData.id) {
      setViewingReceipt(receiptData);
    }
  };

  // Open Student Deposit Payment Modal
  const handleOpenStudentDeposit = (student?: Student) => {
    const target = student || students.find((s) => (s.totalAmount - s.paidAmount) > 0) || students[0];
    if (target) {
      setSelectedStudentForDeposit(target);
      const rem = Math.max(0, target.totalAmount - target.paidAmount);
      setStudentDepositAmount(rem > 0 ? Math.min(500, rem) : target.totalAmount);
      setStudentDepositNotes(`عربون/دفعة حجز رحلة (${settings.tripName})`);
    }
    setIsStudentDepositModalOpen(true);
  };

  // Confirm Student Deposit Payment & Auto-Issue Receipt Voucher
  const handleConfirmStudentDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForDeposit) return;
    if (studentDepositAmount <= 0) {
      alert('برجاء كتابة مبلغ عربون أكبر من صفر');
      return;
    }

    const currentPaid = selectedStudentForDeposit.paidAmount || 0;
    const newTotalPaid = currentPaid + studentDepositAmount;
    const newRemaining = Math.max(0, selectedStudentForDeposit.totalAmount - newTotalPaid);
    const newStatus = newRemaining <= 0 ? 'paid' : 'deposit';

    if (onUpdateStudent) {
      onUpdateStudent({
        ...selectedStudentForDeposit,
        paidAmount: newTotalPaid,
        remainingAmount: newRemaining,
        paymentStatus: newStatus,
        paymentMethod: studentDepositMethod,
      });
    }

    const receiptNum = `RC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const reasonText = studentDepositNotes.trim()
      ? `${studentDepositNotes.trim()} - كود الطالب: ${selectedStudentForDeposit.ticketCode} - المتبقي بعد السداد: ${newRemaining} ج.م`
      : `دفعة/عربون حجز رحلة (${settings.tripName}) - كود: ${selectedStudentForDeposit.ticketCode} - المتبقي: ${newRemaining} ج.م`;

    const newReceipt: ReceiptVoucher = {
      id: `rcpt-${Date.now()}`,
      voucherNumber: receiptNum,
      type: 'receipt',
      personName: selectedStudentForDeposit.name,
      amount: studentDepositAmount,
      amountInWords: numberToArabicWords(studentDepositAmount),
      reason: reasonText,
      paymentMethod: studentDepositMethod,
      date: new Date().toISOString().slice(0, 10),
      supervisorName: studentDepositSupervisor || 'مسؤول المالية',
    };

    onAddReceipt(newReceipt);
    setIsStudentDepositModalOpen(false);
    setViewingReceipt(newReceipt);
  };

  // Live field editor handlers
  const handleContractFieldChange = (field: keyof ContractData, value: any) => {
    if (!viewingContract) return;
    const updated = { ...viewingContract, [field]: value };
    if (field === 'totalCost' || field === 'depositPaid') {
      const total = Number(field === 'totalCost' ? value : updated.totalCost) || 0;
      const dep = Number(field === 'depositPaid' ? value : updated.depositPaid) || 0;
      updated.totalCost = total;
      updated.depositPaid = dep;
      updated.remainingBalance = total - dep;
    }
    setViewingContract(updated);
    if (onUpdateContract) onUpdateContract(updated);
  };

  // Helper to add a new legal clause directly to live contract view
  const handleAddClauseToViewingContract = () => {
    if (!viewingContract) return;
    const current = viewingContract.clauseNotes || [];
    const newClause = `بند قانوني جديد (${current.length + 1}): التزام الطرفين بتطبيق كافة التعليمات والتعهدات المذكورة بالعقد.`;
    const updated = [...current, newClause];
    handleContractFieldChange('clauseNotes', updated);
  };

  // Helper to reorder clauses up or down
  const handleMoveClause = (index: number, direction: 'up' | 'down') => {
    if (!viewingContract || !viewingContract.clauseNotes) return;
    const list = [...viewingContract.clauseNotes];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;
    handleContractFieldChange('clauseNotes', list);
  };

  const handleReceiptFieldChange = (field: keyof ReceiptVoucher, value: any) => {
    if (!viewingReceipt) return;
    const updated = { ...viewingReceipt, [field]: value };
    if (field === 'amount') {
      const amt = Number(value) || 0;
      updated.amount = amt;
      updated.amountInWords = numberToArabicWords(amt);
    }
    setViewingReceipt(updated);
    if (onUpdateReceipt) onUpdateReceipt(updated);
  };

  // Direct Browser Print Window for Clean White A4 Paper
  const handleDirectBrowserPrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Subtab switcher */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl no-print">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-lg sm:text-2xl font-black text-white flex items-center gap-2">
              <Scale className="w-6 h-6 sm:w-7 h-7 text-amber-400 shrink-0" />
              <span>مركز العقود القانونية والإيصالات</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              محرر ومستندات قانونية معتمدة قابلة للاطلاع، التعديل المباشر، الطباعة الرسمية وحفظ PDF
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 w-full md:w-auto">
            <button
              onClick={() => setActiveSubTab('contracts')}
              className={`flex-1 md:flex-none px-3 sm:px-4 py-2.5 rounded-lg text-xs font-bold transition min-h-[44px] flex items-center justify-center gap-1.5 ${
                activeSubTab === 'contracts'
                  ? 'bg-amber-500 text-slate-950 shadow-lg font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              <span>
                <span className="hidden sm:inline">العقود المعتمدة</span>
                <span className="sm:hidden">العقود</span> ({contracts.length})
              </span>
            </button>
            <button
              onClick={() => setActiveSubTab('receipts')}
              className={`flex-1 md:flex-none px-3 sm:px-4 py-2.5 rounded-lg text-xs font-bold transition min-h-[44px] flex items-center justify-center gap-1.5 ${
                activeSubTab === 'receipts'
                  ? 'bg-amber-500 text-slate-950 shadow-lg font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>
                <span className="hidden sm:inline">الإيصالات والسندات</span>
                <span className="sm:hidden">السندات</span> ({receipts.length})
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Company Seal Quick Settings Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/60 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 no-print shadow-xl">
        <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
          <div className="bg-white/10 p-1.5 sm:p-2 rounded-2xl border border-white/10 shrink-0">
            <CompanySeal
              companyNameAr={sealConfig.companyNameAr}
              companyNameEn={sealConfig.companyNameEn}
              licenseNo={sealConfig.licenseNo}
              sealStatusText={sealConfig.sealStatusText}
              color={sealConfig.color}
              rotation={sealConfig.rotation}
              size={70}
              showControls={true}
              onUpdateSeal={(updated) => setSealConfig({ ...sealConfig, ...updated })}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                الختم الرسمي المعتمد
              </span>
              <span className="text-[11px] text-slate-400 font-mono">ترخيص #{sealConfig.licenseNo}</span>
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-white mt-1 truncate">{sealConfig.companyNameAr}</h3>
            <p className="text-[10px] sm:text-[11px] text-indigo-300 font-mono truncate">{sealConfig.companyNameEn}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <CompanySeal
            companyNameAr={sealConfig.companyNameAr}
            companyNameEn={sealConfig.companyNameEn}
            licenseNo={sealConfig.licenseNo}
            sealStatusText={sealConfig.sealStatusText}
            color={sealConfig.color}
            rotation={sealConfig.rotation}
            size={36}
            showControls={true}
            onUpdateSeal={(updated) => setSealConfig({ ...sealConfig, ...updated })}
          />
          <span className="text-[11px] text-slate-300 font-bold hidden md:inline">انقر للتعديل أو لتغيير لون الحبر ورقم الترخيص</span>
        </div>
      </div>

      {activeSubTab === 'contracts' && (
        <div className="space-y-4 sm:space-y-6 no-print">
          {/* Contracts Executive KPI Dashboard */}
          {(() => {
            const totalContractsVal = contracts.reduce((sum, c) => sum + (c.totalCost || 0), 0);
            const totalDeposits = contracts.reduce((sum, c) => sum + (c.depositPaid || 0), 0);
            const totalRemaining = contracts.reduce((sum, c) => sum + (c.remainingBalance || 0), 0);
            const activeCount = contracts.filter((c) => (c.status || 'active') === 'active').length;

            return (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                <div className="bg-slate-900 border border-indigo-500/30 p-3 sm:p-4 rounded-2xl shadow-xl space-y-1">
                  <div className="flex justify-between items-center text-[11px] sm:text-xs text-slate-400">
                    <span>إجمالي العقود</span>
                    <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {contracts.length} عقد
                    </span>
                  </div>
                  <p className="text-lg sm:text-xl font-mono font-black text-white">
                    {contracts.length} <span className="text-[10px] sm:text-xs font-normal text-slate-400">({activeCount} ساري)</span>
                  </p>
                </div>

                <div className="bg-slate-900 border border-amber-500/30 p-3 sm:p-4 rounded-2xl shadow-xl space-y-1">
                  <div className="flex justify-between items-center text-[11px] sm:text-xs text-slate-400">
                    <span>قيمة التعاقدات</span>
                    <span className="text-amber-400 text-[10px] font-bold">حجم الأعمال</span>
                  </div>
                  <p className="text-lg sm:text-xl font-mono font-black text-amber-400">
                    {totalContractsVal.toLocaleString()} <span className="text-[10px] sm:text-xs font-normal">ج.م</span>
                  </p>
                </div>

                <div className="bg-slate-900 border border-emerald-500/30 p-3 sm:p-4 rounded-2xl shadow-xl space-y-1">
                  <div className="flex justify-between items-center text-[11px] sm:text-xs text-slate-400">
                    <span>العربين المسددة</span>
                    <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      مدفوع
                    </span>
                  </div>
                  <p className="text-lg sm:text-xl font-mono font-black text-emerald-400">
                    {totalDeposits.toLocaleString()} <span className="text-[10px] sm:text-xs font-normal">ج.م</span>
                  </p>
                </div>

                <div className="bg-slate-900 border border-rose-500/30 p-3 sm:p-4 rounded-2xl shadow-xl space-y-1">
                  <div className="flex justify-between items-center text-[11px] sm:text-xs text-slate-400">
                    <span>المتبقي المستحق</span>
                    <span className="bg-rose-500/20 text-rose-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      مستحق
                    </span>
                  </div>
                  <p className="text-lg sm:text-xl font-mono font-black text-rose-400">
                    {totalRemaining.toLocaleString()} <span className="text-[10px] sm:text-xs font-normal">ج.م</span>
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Section Navigation & Header Actions */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xl space-y-3.5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-indigo-400 shrink-0" />
                  <span>سجل وإدارة العقود القانونية الـ 10</span>
                </h3>
                <p className="text-xs text-slate-400">
                  توثيق قانوني متكامل، توقيعات إلكترونية، أختام رقمية، وباركود تحقق أمني
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleOpenNewContract}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-amber-500/20 active:scale-95 w-full sm:w-auto min-h-[44px]"
                >
                  <Plus className="w-4 h-4" />
                  <span>
                    <span className="hidden sm:inline">إنشاء عقد اتفاق جديد</span>
                    <span className="sm:hidden">عقد جديد +</span>
                  </span>
                </button>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-2.5 pt-2 border-t border-slate-800">
              <div className="sm:col-span-2 md:col-span-6 relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={contractSearchTerm}
                  onChange={(e) => setContractSearchTerm(e.target.value)}
                  placeholder="ابحث برقم العقد، اسم المتعاقد، الهاتف..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-amber-500 focus:outline-none min-h-[40px]"
                />
              </div>

              <div className="md:col-span-3">
                <select
                  value={contractTypeFilter}
                  onChange={(e) => setContractTypeFilter(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white font-bold focus:border-amber-500 focus:outline-none cursor-pointer min-h-[40px]"
                >
                  <option value="all">جميع أنواع العقود الـ 10</option>
                  {Object.entries(LEGAL_PRESETS).map(([key, val]) => (
                    <option key={key} value={key}>
                      {val.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3">
                <select
                  value={contractStatusFilter}
                  onChange={(e) => setContractStatusFilter(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white font-bold focus:border-amber-500 focus:outline-none cursor-pointer min-h-[40px]"
                >
                  <option value="all">جميع الحالات القانونية</option>
                  <option value="active">🟢 ساري ومعتمد رسميًا</option>
                  <option value="draft">⚪ مسودة مبدئية</option>
                  <option value="under_review">🔵 قيد المراجعة</option>
                  <option value="completed">🟣 منتهي ومسوى</option>
                  <option value="terminated">🔴 ملغى / مفسوخ</option>
                </select>
              </div>
            </div>
          </div>

          {/* Preset Quick Generator Bar */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 sm:p-4 space-y-2.5">
            <div className="flex items-center justify-between text-amber-400 text-xs font-bold">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>نماذج العقود المعتمدة (اختر لتوليد فوري):</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">10 نماذج جاهزة</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-1.5 sm:gap-2">
              {(Object.keys(LEGAL_PRESETS) as ContractType[]).map((typeKey) => {
                const meta = LEGAL_PRESETS[typeKey];
                const Icon = meta.icon;
                return (
                  <button
                    key={typeKey}
                    onClick={() => {
                      setContractForm({
                        id: '',
                        type: typeKey,
                        title: meta.defaultTitle,
                        partyName: '',
                        partyPhone: '',
                        partyNationalId: '',
                        totalCost: typeKey === 'student_rep' ? 100000 : 25000,
                        depositPaid: typeKey === 'student_rep' ? 50000 : 10000,
                        location: settings.destination || 'القرية السياحية',
                        eventDate: settings.tripDate || '2026-08-15',
                        clauses: [...meta.defaultClauses],
                      });
                      setIsContractModalOpen(true);
                    }}
                    className="bg-slate-950 hover:bg-amber-500/10 hover:border-amber-500/40 border border-slate-800 p-2 sm:p-2.5 rounded-xl text-center transition group flex flex-col items-center justify-center min-h-[60px] active:scale-95"
                  >
                    <Icon className="w-4 h-4 text-amber-400 mb-1 group-hover:scale-110 transition-transform shrink-0" />
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-200 group-hover:text-amber-300 leading-tight line-clamp-2">
                      {meta.name.replace('عقد ', '')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contracts Grid List */}
          {(() => {
            const filteredContracts = contracts.filter((c) => {
              const matchesType = contractTypeFilter === 'all' || c.type === contractTypeFilter;
              const matchesStatus = contractStatusFilter === 'all' || (c.status || 'active') === contractStatusFilter;
              const q = contractSearchTerm.trim().toLowerCase();
              const matchesSearch =
                !q ||
                c.title?.toLowerCase().includes(q) ||
                c.partyName?.toLowerCase().includes(q) ||
                c.partyPhone?.toLowerCase().includes(q) ||
                c.id?.toLowerCase().includes(q) ||
                c.contractNumber?.toLowerCase().includes(q);

              return matchesType && matchesStatus && matchesSearch;
            });

            if (filteredContracts.length === 0) {
              return (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 sm:p-10 text-center space-y-3">
                  <Scale className="w-12 h-12 text-slate-600 mx-auto" />
                  <h4 className="text-white font-bold text-sm">لا توجد عقود مطابقة للشروط المحددة</h4>
                  <p className="text-slate-400 text-xs">قم بتغيير خيارات التصفية أو إنشاء عقد قانوني جديد</p>
                  <button
                    onClick={handleOpenNewContract}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs inline-flex items-center gap-1.5 transition active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إنشاء عقد جديد الآن</span>
                  </button>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {filteredContracts.map((contract) => {
                  const meta = LEGAL_PRESETS[contract.type] || LEGAL_PRESETS.student_rep;
                  const Icon = meta.icon;
                  const status = contract.status || 'active';

                  const statusBadges: Record<ContractStatus, { label: string; color: string }> = {
                    active: { label: 'ساري ومعتمد', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
                    draft: { label: 'مسودة مبدئية', color: 'bg-slate-500/20 text-slate-300 border-slate-500/40' },
                    under_review: { label: 'قيد المراجعة', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' },
                    completed: { label: 'منتهي ومسوى', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
                    terminated: { label: 'ملغى / مفسوخ', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
                  };

                  const currentBadge = statusBadges[status] || statusBadges.active;
                  const hasFirstPartySig = Boolean(contract.signatures?.firstParty);
                  const hasSecondPartySig = Boolean(contract.signatures?.secondParty);

                  return (
                    <div
                      key={contract.id}
                      className="bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-4 sm:p-5 shadow-xl transition space-y-3.5 relative overflow-hidden flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                            <div className="p-2.5 sm:p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20 shrink-0">
                              <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full truncate max-w-[140px]">
                                  {meta.name}
                                </span>
                                <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full ${currentBadge.color}`}>
                                  {currentBadge.label}
                                </span>
                              </div>
                              <h4 className="text-xs sm:text-sm font-bold text-white mt-1 leading-snug line-clamp-1">{contract.title}</h4>
                              <span className="text-[10px] font-mono text-slate-500 block mt-0.5 truncate">
                                #{contract.contractNumber || contract.id.toUpperCase()} • {contract.createdAt}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {hasFirstPartySig && hasSecondPartySig ? (
                              <span className="text-[9px] sm:text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap">
                                <CheckCheck className="w-3 h-3" />
                                <span>موقع إلكترونياً</span>
                              </span>
                            ) : hasSecondPartySig || hasFirstPartySig ? (
                              <span className="text-[9px] sm:text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap">
                                <PenTool className="w-3 h-3" />
                                <span>توقيع جزئي</span>
                              </span>
                            ) : (
                              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                                بانتظار التوقيع
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 text-xs space-y-1.5">
                          <div className="flex justify-between items-center text-slate-300">
                            <span className="text-slate-400">الطرف الثاني:</span>
                            <strong className="text-white font-bold truncate max-w-[180px]">{contract.partyName}</strong>
                          </div>
                          <div className="flex justify-between items-center text-slate-300">
                            <span className="text-slate-400">بيانات الاتصال:</span>
                            <span className="font-mono text-amber-300 text-[11px] truncate">
                              {contract.partyPhone} {contract.partyNationalId ? `• ${contract.partyNationalId}` : ''}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-900 text-center font-mono">
                            <div className="bg-slate-900 p-1.5 sm:p-2 rounded-lg">
                              <span className="text-[9px] sm:text-[10px] text-slate-400 block">الإجمالي</span>
                              <span className="font-bold text-white text-xs sm:text-sm">{contract.totalCost.toLocaleString()} ج.م</span>
                            </div>
                            <div className="bg-slate-900 p-1.5 sm:p-2 rounded-lg">
                              <span className="text-[9px] sm:text-[10px] text-slate-400 block">العربون</span>
                              <span className="font-bold text-emerald-400 text-xs sm:text-sm">{contract.depositPaid.toLocaleString()} ج.م</span>
                            </div>
                            <div className="bg-slate-900 p-1.5 sm:p-2 rounded-lg">
                              <span className="text-[9px] sm:text-[10px] text-slate-400 block">المتبقي</span>
                              <span className="font-bold text-rose-400 text-xs sm:text-sm">{contract.remainingBalance.toLocaleString()} ج.م</span>
                            </div>
                          </div>
                        </div>

                        {/* Clauses preview snippet */}
                        <div className="text-xs text-slate-400 space-y-1">
                          <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 block">
                            أبرز البنود ({contract.clauseNotes?.length || 0} بنود قانونية):
                          </span>
                          <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-300">
                            {(contract.clauseNotes || []).slice(0, 2).map((clause, idx) => (
                              <li key={idx} className="truncate">{clause}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Actions Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800/80">
                        <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                          <button
                            onClick={() => setViewingContract(contract)}
                            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow active:scale-95 flex-1 min-h-[38px]"
                          >
                            <Eye className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              <span className="hidden sm:inline">المعاينة والمستند الحي 👁️</span>
                              <span className="sm:hidden">معاينة العقد 👁️</span>
                            </span>
                          </button>
                          <button
                            onClick={() => handleEditContractModal(contract)}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-2.5 py-2 rounded-xl text-xs flex items-center gap-1 transition border border-slate-700 min-h-[38px] active:scale-95"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>تعديل</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => generateContractPDF(contract, settings)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow min-h-[38px] active:scale-95"
                            title="تحميل PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>PDF</span>
                          </button>
                          {onDeleteContract && (
                            <button
                              onClick={() => setContractToDelete(contract)}
                              className="text-slate-500 hover:text-rose-400 p-2 rounded-xl transition border border-slate-800 hover:border-rose-500/30 hover:bg-rose-500/10 min-h-[38px] min-w-[38px] flex items-center justify-center"
                              title="حذف العقد"
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
            );
          })()}
        </div>
      )}

      {/* SUBTAB 2: RECEIPTS SECTION */}
      {activeSubTab === 'receipts' && (
        <div className="space-y-4 sm:space-y-6 no-print">
          {/* Treasury Summary Dashboard */}
          {(() => {
            const totalCollected = receipts
              .filter((r) => r.type === 'receipt')
              .reduce((sum, r) => sum + r.amount, 0);
            const totalPaidOut = receipts
              .filter((r) => r.type === 'payment')
              .reduce((sum, r) => sum + r.amount, 0);
            const netTreasury = totalCollected - totalPaidOut;
            const totalStudentsRem = students.reduce(
              (sum, s) => sum + Math.max(0, s.totalAmount - s.paidAmount),
              0
            );

            return (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                <div className="bg-slate-900 border border-emerald-500/30 p-3 sm:p-4 rounded-2xl shadow-xl space-y-1">
                  <div className="flex justify-between items-center text-[11px] sm:text-xs text-slate-400">
                    <span>المقبوضات</span>
                    <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      +{receipts.filter((r) => r.type === 'receipt').length} إيصال
                    </span>
                  </div>
                  <p className="text-lg sm:text-xl font-mono font-black text-emerald-400">
                    {totalCollected.toLocaleString()} <span className="text-[10px] sm:text-xs font-normal">ج.م</span>
                  </p>
                </div>

                <div className="bg-slate-900 border border-rose-500/30 p-3 sm:p-4 rounded-2xl shadow-xl space-y-1">
                  <div className="flex justify-between items-center text-[11px] sm:text-xs text-slate-400">
                    <span>المصروفات</span>
                    <span className="bg-rose-500/20 text-rose-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      -{receipts.filter((r) => r.type === 'payment').length} إيصال
                    </span>
                  </div>
                  <p className="text-lg sm:text-xl font-mono font-black text-rose-400">
                    {totalPaidOut.toLocaleString()} <span className="text-[10px] sm:text-xs font-normal">ج.م</span>
                  </p>
                </div>

                <div className="bg-slate-900 border border-amber-500/30 p-3 sm:p-4 rounded-2xl shadow-xl space-y-1">
                  <div className="flex justify-between items-center text-[11px] sm:text-xs text-slate-400">
                    <span>صافي الخزينة</span>
                    <span className="text-amber-400 text-[10px] font-bold">نقداً متوفر</span>
                  </div>
                  <p className="text-lg sm:text-xl font-mono font-black text-amber-400">
                    {netTreasury.toLocaleString()} <span className="text-[10px] sm:text-xs font-normal">ج.م</span>
                  </p>
                </div>

                <div className="bg-slate-900 border border-indigo-500/30 p-3 sm:p-4 rounded-2xl shadow-xl space-y-1">
                  <div className="flex justify-between items-center text-[11px] sm:text-xs text-slate-400">
                    <span>المتبقي طرف الطلاب</span>
                    <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {students.filter((s) => s.totalAmount - s.paidAmount > 0).length} طالب
                    </span>
                  </div>
                  <p className="text-lg sm:text-xl font-mono font-black text-indigo-300">
                    {totalStudentsRem.toLocaleString()} <span className="text-[10px] sm:text-xs font-normal">ج.م</span>
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Section Navigation Header & Actions */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xl space-y-3.5">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>إدارة السندات والإيصالات المالية والخزينة</span>
                </h3>
                <p className="text-xs text-slate-400">
                  تحصيل عربون الطلاب، متابعة الأقساط، وإصدار سندات قبض وصرف رسمية بالختم والتفقيط
                </p>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <button
                  onClick={() => handleOpenStudentDeposit()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-600/20 active:scale-95 flex-1 md:flex-none min-h-[44px]"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>
                    <span className="hidden sm:inline">تحصيل عربون طالب 💳</span>
                    <span className="sm:hidden">تحصيل عربون 💳</span>
                  </span>
                </button>

                <button
                  onClick={handleOpenNewReceipt}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-amber-500/20 active:scale-95 flex-1 md:flex-none min-h-[44px]"
                >
                  <Plus className="w-4 h-4" />
                  <span>
                    <span className="hidden sm:inline">إصدار سند مخصص 🧾</span>
                    <span className="sm:hidden">إصدار سند 🧾</span>
                  </span>
                </button>
              </div>
            </div>

            {/* Subtab Toggle Buttons */}
            <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
              <button
                onClick={() => setReceiptsSectionTab('students')}
                className={`flex-1 py-2.5 px-2.5 sm:px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 min-h-[44px] ${
                  receiptsSectionTab === 'students'
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <CreditCard className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  <span className="hidden sm:inline">كشف الطلاب والعربين</span>
                  <span className="sm:hidden">كشف العربين</span> ({students.length})
                </span>
              </button>

              <button
                onClick={() => setReceiptsSectionTab('vouchers')}
                className={`flex-1 py-2.5 px-2.5 sm:px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 min-h-[44px] ${
                  receiptsSectionTab === 'vouchers'
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Receipt className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  <span className="hidden sm:inline">سجل الإيصالات والسندات</span>
                  <span className="sm:hidden">سجل السندات</span> ({receipts.length})
                </span>
              </button>
            </div>
          </div>

          {/* TAB 1: Student Deposit & Balances */}
          {receiptsSectionTab === 'students' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="relative w-full sm:max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="ابحث باسم الطالب، رقم الهاتف، أو كود التذكرة..."
                    value={studentSearchTerm}
                    onChange={(e) => setStudentSearchTerm(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs rounded-xl pr-9 pl-4 py-2.5 focus:border-amber-500 focus:outline-none min-h-[40px]"
                  />
                </div>

                <div className="text-xs text-slate-400 font-medium self-end sm:self-center">
                  عرض {students.filter(s => !studentSearchTerm || s.name.includes(studentSearchTerm) || s.phone.includes(studentSearchTerm) || s.ticketCode.toLowerCase().includes(studentSearchTerm.toLowerCase())).length} من {students.length} طالب
                </div>
              </div>

              {/* Mobile Student Cards View */}
              <div className="block md:hidden space-y-3">
                {students.filter(
                  (s) =>
                    !studentSearchTerm.trim() ||
                    s.name.includes(studentSearchTerm) ||
                    s.phone.includes(studentSearchTerm) ||
                    s.ticketCode.toLowerCase().includes(studentSearchTerm.toLowerCase())
                ).length === 0 ? (
                  <div className="text-center py-10 text-slate-500 text-xs">
                    لا يوجد طلاب مسجلين يطابقون البحث.
                  </div>
                ) : (
                  students
                    .filter(
                      (s) =>
                        !studentSearchTerm.trim() ||
                        s.name.includes(studentSearchTerm) ||
                        s.phone.includes(studentSearchTerm) ||
                        s.ticketCode.toLowerCase().includes(studentSearchTerm.toLowerCase())
                    )
                    .map((student) => {
                      const remaining = Math.max(0, student.totalAmount - student.paidAmount);
                      return (
                        <div key={student.id} className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-white text-sm">{student.name}</h4>
                              <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                                <span className="font-mono text-amber-400 font-bold">{student.ticketCode}</span>
                                <span>•</span>
                                <span>📱 {student.phone}</span>
                              </div>
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                student.paymentStatus === 'paid'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : student.paymentStatus === 'deposit'
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              }`}
                            >
                              {student.paymentStatus === 'paid'
                                ? 'مسدد بالكامل ✅'
                                : student.paymentStatus === 'deposit'
                                ? 'عربون / قسط ⏳'
                                : 'غير مدفوع ❌'}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-xs bg-slate-900/90 p-2 rounded-lg border border-slate-800/80">
                            <div>
                              <span className="text-[10px] text-slate-400 block font-sans">الإجمالي</span>
                              <span className="font-bold text-slate-200">{student.totalAmount.toLocaleString()} ج.م</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block font-sans">المسدد</span>
                              <span className="font-bold text-emerald-400">{student.paidAmount.toLocaleString()} ج.م</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block font-sans">المتبقي</span>
                              <span className={`font-bold ${remaining > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {remaining.toLocaleString()} ج.م
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleOpenStudentDeposit(student)}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow active:scale-95 min-h-[40px]"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>{remaining > 0 ? 'سداد عربون / قسط واحتساب المتبقي' : 'استخراج إيصال سداد رسمي'}</span>
                          </button>
                        </div>
                      );
                    })
                )}
              </div>

              {/* Students Desktop Table */}
              <div className="hidden md:block overflow-x-auto max-h-[500px] overflow-y-auto rounded-xl border border-slate-800">
                <table className="w-full text-right border-collapse text-xs sm:text-sm">
                  <thead className="sticky top-0 bg-slate-950 z-10 border-b border-slate-800">
                    <tr className="text-slate-400 text-xs font-bold">
                      <th className="py-3 px-3">اسم الطالب</th>
                      <th className="py-3 px-3">كود التذكرة</th>
                      <th className="py-3 px-3">إجمالي الرحلة</th>
                      <th className="py-3 px-3">المسدد (العربون)</th>
                      <th className="py-3 px-3">المتبقي (عرف باقي كام)</th>
                      <th className="py-3 px-3">حالة الدفع</th>
                      <th className="py-3 px-3 text-center">الإجراء والإيصال</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                    {students.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-slate-500">
                          لا يوجد طلاب مسجلين في الرحلة بعد.
                        </td>
                      </tr>
                    ) : (
                      students
                        .filter(
                          (s) =>
                            !studentSearchTerm.trim() ||
                            s.name.includes(studentSearchTerm) ||
                            s.phone.includes(studentSearchTerm) ||
                            s.ticketCode.toLowerCase().includes(studentSearchTerm.toLowerCase())
                        )
                        .map((student) => {
                          const remaining = Math.max(0, student.totalAmount - student.paidAmount);
                          return (
                            <tr key={student.id} className="hover:bg-slate-800/50 transition">
                              <td className="py-3 px-3 font-bold text-white">
                                {student.name}
                                <span className="block text-[10px] text-slate-400 font-normal font-mono">
                                  📱 {student.phone}
                                </span>
                              </td>
                              <td className="py-3 px-3 font-mono font-bold text-amber-400">
                                {student.ticketCode}
                              </td>
                              <td className="py-3 px-3 font-mono text-slate-300">
                                {student.totalAmount.toLocaleString()} ج.م
                              </td>
                              <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                                {student.paidAmount.toLocaleString()} ج.م
                              </td>
                              <td className="py-3 px-3 font-mono font-black">
                                {remaining > 0 ? (
                                  <span className="text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                                    متبقي {remaining.toLocaleString()} ج.م
                                  </span>
                                ) : (
                                  <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                    خالص السداد (0 ج.م)
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3">
                                <span
                                  className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                                    student.paymentStatus === 'paid'
                                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                      : student.paymentStatus === 'deposit'
                                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                  }`}
                                >
                                  {student.paymentStatus === 'paid'
                                    ? 'مسدد بالكامل ✅'
                                    : student.paymentStatus === 'deposit'
                                    ? 'عربون / قسط ⏳'
                                    : 'غير مدفوع ❌'}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <button
                                  onClick={() => handleOpenStudentDeposit(student)}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition shadow active:scale-95 mx-auto"
                                >
                                  <CreditCard className="w-3.5 h-3.5" />
                                  {remaining > 0 ? 'سداد عربون / قسط 🧾' : 'استخراج إيصال'}
                                </button>
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

          {/* TAB 2: Issued Vouchers Register */}
          {receiptsSectionTab === 'vouchers' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-6 shadow-xl space-y-4">
              {/* Search & Filter Toolbar */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3 sm:pb-4">
                <div className="relative w-full sm:max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="ابحث برقم السند، اسم المستلم، أو البيان..."
                    value={receiptSearchTerm}
                    onChange={(e) => setReceiptSearchTerm(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs rounded-xl pr-9 pl-4 py-2.5 focus:border-amber-500 focus:outline-none min-h-[40px]"
                  />
                </div>

                <div className="flex items-center gap-1.5 self-stretch sm:self-auto bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setReceiptTypeFilter('all')}
                    className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition min-h-[36px] ${
                      receiptTypeFilter === 'all'
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    الكل ({receipts.length})
                  </button>
                  <button
                    onClick={() => setReceiptTypeFilter('receipt')}
                    className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition min-h-[36px] ${
                      receiptTypeFilter === 'receipt'
                        ? 'bg-emerald-500 text-slate-950 font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    قبض 🟢 ({receipts.filter((r) => r.type === 'receipt').length})
                  </button>
                  <button
                    onClick={() => setReceiptTypeFilter('payment')}
                    className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition min-h-[36px] ${
                      receiptTypeFilter === 'payment'
                        ? 'bg-rose-500 text-white font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    صرف 🔴 ({receipts.filter((r) => r.type === 'payment').length})
                  </button>
                </div>
              </div>

              {/* Vouchers List View */}
              <div className="overflow-hidden rounded-xl border border-slate-800">
                {/* Mobile Card List */}
                <div className="block md:hidden divide-y divide-slate-800">
                  {receipts
                    .filter((r) => {
                      const matchesSearch =
                        !receiptSearchTerm ||
                        r.voucherNumber.toLowerCase().includes(receiptSearchTerm.toLowerCase()) ||
                        r.personName.includes(receiptSearchTerm) ||
                        r.reason.includes(receiptSearchTerm);
                      const matchesType =
                        receiptTypeFilter === 'all' || r.type === receiptTypeFilter;
                      return matchesSearch && matchesType;
                    })
                    .map((voucher) => {
                      const isReceipt = voucher.type === 'receipt';
                      return (
                        <div key={voucher.id} className="p-3.5 space-y-2.5 bg-slate-900/90">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                                {voucher.voucherNumber}
                              </span>
                              <h4 className="font-bold text-white text-sm mt-1">{voucher.personName}</h4>
                            </div>
                            <span
                              className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${
                                isReceipt
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              }`}
                            >
                              {isReceipt ? 'إيصال قبض 🟢' : 'إيصال صرف 🔴'}
                            </span>
                          </div>

                          <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 text-xs space-y-1">
                            <div className="flex justify-between text-slate-300">
                              <span className="text-slate-400">المبلغ:</span>
                              <strong className="text-amber-300 font-mono font-black">{voucher.amount.toLocaleString()} ج.م</strong>
                            </div>
                            <p className="text-slate-400 text-[11px] font-semibold">{voucher.amountInWords || numberToArabicWords(voucher.amount)}</p>
                            <p className="text-slate-300 text-xs pt-1 border-t border-slate-900">{voucher.reason}</p>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
                            <span className="text-slate-400 font-mono text-[11px]">{voucher.date} • {voucher.paymentMethod}</span>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => setViewingReceipt(voucher)}
                                className="bg-amber-500 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 min-h-[36px] active:scale-95"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>المعاينة</span>
                              </button>
                              <button
                                onClick={() => generateReceiptPDF(voucher, settings)}
                                className="bg-indigo-600 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 min-h-[36px] active:scale-95"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>PDF</span>
                              </button>
                              {onDeleteReceipt && (
                                <button
                                  onClick={() => setReceiptToDelete(voucher)}
                                  className="text-slate-500 hover:text-rose-400 p-2 rounded-xl transition border border-slate-800 hover:border-rose-500/30 hover:bg-rose-500/10 min-h-[36px] min-w-[36px] flex items-center justify-center"
                                  title="حذف السند"
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

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-right border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-950 text-slate-400 text-xs border-b border-slate-800 uppercase font-bold">
                        <th className="py-3.5 px-4">رقم الإيصال</th>
                        <th className="py-3.5 px-4">نوع السند</th>
                        <th className="py-3.5 px-4">اسم الشخص / الجهة</th>
                        <th className="py-3.5 px-4">المبلغ والسبب (التفقيط)</th>
                        <th className="py-3.5 px-4">طريقة الدفع والتاريخ</th>
                        <th className="py-3.5 px-4 text-center">إجراءات المعاينة والطباعة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                      {receipts.filter((r) => {
                        const matchesSearch =
                          !receiptSearchTerm ||
                          r.voucherNumber.toLowerCase().includes(receiptSearchTerm.toLowerCase()) ||
                          r.personName.includes(receiptSearchTerm) ||
                          r.reason.includes(receiptSearchTerm);
                        const matchesType =
                          receiptTypeFilter === 'all' || r.type === receiptTypeFilter;
                        return matchesSearch && matchesType;
                      }).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-12 text-slate-500">
                            لا توجد إيصالات تطابق بحثك.
                          </td>
                        </tr>
                      ) : (
                        receipts
                          .filter((r) => {
                            const matchesSearch =
                              !receiptSearchTerm ||
                              r.voucherNumber.toLowerCase().includes(receiptSearchTerm.toLowerCase()) ||
                              r.personName.includes(receiptSearchTerm) ||
                              r.reason.includes(receiptSearchTerm);
                            const matchesType =
                              receiptTypeFilter === 'all' || r.type === receiptTypeFilter;
                            return matchesSearch && matchesType;
                          })
                          .map((voucher) => {
                            const isReceipt = voucher.type === 'receipt';

                            return (
                              <tr key={voucher.id} className="hover:bg-slate-800/50 transition">
                                <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                                  {voucher.voucherNumber}
                                </td>
                                <td className="py-3.5 px-4">
                                  <span
                                    className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                                      isReceipt
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                    }`}
                                  >
                                    {isReceipt ? 'إيصال قبض (استلام) 🟢' : 'إيصال صرف (مورد) 🔴'}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 font-bold text-white">
                                  {voucher.personName}
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className="font-mono font-black text-amber-300 block text-sm">
                                    {voucher.amount.toLocaleString()} ج.م
                                  </span>
                                  <span className="text-xs text-slate-300 block font-semibold">{voucher.reason}</span>
                                  <span className="text-[10px] text-emerald-400 block italic font-bold">
                                    {voucher.amountInWords || numberToArabicWords(voucher.amount)}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-slate-300">
                                  <span className="block font-semibold uppercase">{voucher.paymentMethod}</span>
                                  <span className="text-xs text-slate-500 font-mono">{voucher.date}</span>
                                </td>
                                <td className="py-3.5 px-4 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      onClick={() => setViewingReceipt(voucher)}
                                      className="bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-slate-950 font-bold px-3 py-1.5 rounded-lg transition text-xs flex items-center gap-1.5 border border-amber-500/30 active:scale-95"
                                      title="معاينة المستند ورئياً والتعديل"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>اطلاع ورقي 👁️</span>
                                    </button>
                                    <button
                                      onClick={() => generateReceiptPDF(voucher, settings)}
                                      className="bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600 hover:text-white p-1.5 rounded-lg transition border border-indigo-500/30"
                                      title="تصدير PDF"
                                    >
                                      <Printer className="w-4 h-4" />
                                    </button>
                                    {onDeleteReceipt && (
                                      <button
                                        onClick={() => setReceiptToDelete(voucher)}
                                        className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg transition"
                                        title="حذف السند"
                                      >
                                        <Trash2 className="w-4 h-4" />
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
            </div>
          )}
        </div>
      )}

      {/* 📄 LIVE OFFICIAL CONTRACT PAPER VIEW & INTERACTIVE EDITOR */}
      {viewingContract && (
        <div className={`fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 overflow-y-auto ${isContractFullscreen ? 'mobile-fullscreen-modal' : ''}`}>
          <div className={`bg-slate-900 border border-slate-800 w-full ${isContractFullscreen ? 'max-w-none h-full min-h-screen rounded-none p-2 sm:p-4' : 'max-w-4xl rounded-2xl p-3 sm:p-6 my-auto max-h-[95vh]'} shadow-2xl space-y-4 sm:space-y-6 overflow-y-auto`}>
            {/* Rich Text & Document Formatting Control Bar */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 sm:p-4 space-y-3 no-print shadow-xl">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                    <FileSignature className="w-5 h-5 text-amber-400 shrink-0" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                        عقد اتفاق رسمي معتمد • نظام كيان للمحررات القانونية
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                        #{viewingContract.contractNumber || viewingContract.id.toUpperCase()}
                      </span>
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-white line-clamp-1">{viewingContract.title}</h3>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                  {/* Fullscreen Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setIsContractFullscreen(!isContractFullscreen)}
                    className="bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition active:scale-95 min-h-[40px] flex-1 sm:flex-initial"
                    title={isContractFullscreen ? "تصغير النافذة" : "ملء الشاشة للموبايل"}
                  >
                    {isContractFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    <span>
                      <span className="hidden sm:inline">{isContractFullscreen ? 'تصغير' : 'ملء الشاشة'}</span>
                      <span className="sm:hidden">{isContractFullscreen ? 'تصغير 🔲' : 'شاشة كاملة 📱'}</span>
                    </span>
                  </button>

                  {/* Open Official Clause Library */}
                  <button
                    type="button"
                    onClick={() => setIsClauseLibraryOpen(true)}
                    className="bg-indigo-600/20 hover:bg-indigo-600 hover:text-white border border-indigo-500/40 text-indigo-300 font-bold px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm min-h-[40px] flex-1 sm:flex-initial"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>
                      <span className="hidden sm:inline">مكتبة البنود</span>
                      <span className="sm:hidden">البنود</span> (13+)
                    </span>
                  </button>

                  <button
                    onClick={async () => {
                      if (viewingContract) {
                        await exportContractAsHighResImage(viewingContract, settings, contractSheetRef.current);
                      }
                    }}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3.5 py-2 rounded-xl text-xs flex items-center justify-center gap-1 shadow-lg shadow-amber-500/20 transition active:scale-95 min-h-[40px] flex-1 sm:flex-initial"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>صورة HD</span>
                  </button>

                  <button
                    onClick={async () => {
                      if (viewingContract) {
                        await generateContractPDF(viewingContract, settings, contractSheetRef.current);
                      }
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center justify-center gap-1 shadow transition active:scale-95 min-h-[40px] flex-1 sm:flex-initial"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>PDF</span>
                  </button>

                  <button
                    onClick={handleDirectBrowserPrint}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-3.5 py-2 rounded-xl text-xs flex items-center justify-center gap-1 shadow transition active:scale-95 min-h-[40px] flex-1 sm:flex-initial"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>طباعة</span>
                  </button>

                  <button
                    onClick={() => {
                      setViewingContract(null);
                      setIsContractFullscreen(false);
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-3.5 py-2 rounded-xl text-xs transition min-h-[40px] min-w-[40px] flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Status and Theme Controls Row */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300 pt-1 border-b border-slate-800/80 pb-2.5">
                <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
                  <span className="text-[11px] font-bold text-slate-400">الحالة:</span>
                  <select
                    value={viewingContract.status || 'active'}
                    onChange={(e) => handleContractFieldChange('status', e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-amber-300 font-bold rounded-lg px-2.5 py-1 outline-none text-xs cursor-pointer min-h-[38px] flex-1 sm:flex-initial"
                  >
                    <option value="active">🟢 ساري ومعتمد</option>
                    <option value="draft">⚪ مسودة مبدئية</option>
                    <option value="under_review">🔵 قيد المراجعة</option>
                    <option value="completed">🟣 منتهي ومسوى</option>
                    <option value="terminated">🔴 ملغى / مفسوخ</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
                  <span className="text-[11px] font-bold text-slate-400">الطابع:</span>
                  <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl flex-1 sm:flex-initial justify-between sm:justify-start">
                    {[
                      { id: 'royal_gold', label: 'ذهبي ⚜️', fullLabel: 'ملكي ذهبي ⚜️' },
                      { id: 'corporate_navy', label: 'كحلي 🏛️', fullLabel: 'رسمي كحلي 🏛️' },
                      { id: 'modern_emerald', label: 'زمردي 🌿', fullLabel: 'زمردي معتمد 🌿' },
                    ].map((th) => (
                      <button
                        key={th.id}
                        onClick={() => setDocFormatting({ ...docFormatting, theme: th.id as any })}
                        className={`px-2 sm:px-2.5 py-1 rounded-lg text-[11px] font-bold transition min-h-[34px] flex-1 sm:flex-initial text-center ${
                          docFormatting.theme === th.id
                            ? 'bg-amber-500 text-slate-950 font-black'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="hidden sm:inline">{th.fullLabel}</span>
                        <span className="sm:hidden">{th.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setSignatureTarget('first_party');
                      setIsSignaturePadOpen(true);
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition min-h-[38px] flex-1 sm:flex-initial active:scale-95"
                  >
                    <PenTool className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      <span className="hidden sm:inline">توقيع الطرف الأول</span>
                      <span className="sm:hidden">توقيع الإدارة</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSignatureTarget('second_party');
                      setIsSignaturePadOpen(true);
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition min-h-[38px] flex-1 sm:flex-initial active:scale-95"
                  >
                    <PenTool className="w-3.5 h-3.5 text-indigo-400" />
                    <span>
                      <span className="hidden sm:inline">توقيع الطرف الثاني</span>
                      <span className="sm:hidden">توقيع العميل</span>
                    </span>
                  </button>
                </div>
              </div>

              {/* Formatting Tools Row */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 pt-1">
                {/* Font Selector */}
                <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-xl min-h-[36px]">
                  <Type className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={docFormatting.fontFamily}
                    onChange={(e) => setDocFormatting({ ...docFormatting, fontFamily: e.target.value })}
                    className="bg-transparent text-white font-bold text-xs outline-none cursor-pointer"
                  >
                    <option value="'Tajawal', sans-serif" className="bg-slate-900">
                      خط تجوال (عصري)
                    </option>
                    <option value="'Amiri', serif" className="bg-slate-900">
                      خط أميري (قانوني)
                    </option>
                    <option value="'Cairo', sans-serif" className="bg-slate-900">
                      خط كايرو (عريض)
                    </option>
                    <option value="monospace" className="bg-slate-900">
                      خط الآلة (Monospace)
                    </option>
                  </select>
                </div>

                {/* Font Size Selector */}
                <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-bold px-1">الحجم:</span>
                  {['12px', '14px', '16px', '18px'].map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setDocFormatting({ ...docFormatting, fontSize: sz })}
                      className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold transition min-h-[30px] ${
                        docFormatting.fontSize === sz ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {sz.replace('px', '')}
                    </button>
                  ))}
                </div>

                {/* Text Formatting Toggles */}
                <div className="flex items-center gap-0.5 bg-slate-900 border border-slate-800 p-1 rounded-xl">
                  <button
                    onClick={() => setDocFormatting({ ...docFormatting, isBold: !docFormatting.isBold })}
                    className={`p-2 rounded-lg transition min-w-[32px] min-h-[32px] flex items-center justify-center ${
                      docFormatting.isBold ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                    title="خط عريض"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDocFormatting({ ...docFormatting, isItalic: !docFormatting.isItalic })}
                    className={`p-2 rounded-lg transition min-w-[32px] min-h-[32px] flex items-center justify-center ${
                      docFormatting.isItalic ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                    title="خط مائل"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDocFormatting({ ...docFormatting, isUnderline: !docFormatting.isUnderline })}
                    className={`p-2 rounded-lg transition min-w-[32px] min-h-[32px] flex items-center justify-center ${
                      docFormatting.isUnderline ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                    title="تسطير"
                  >
                    <Underline className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Alignment Controls */}
                <div className="flex items-center gap-0.5 bg-slate-900 border border-slate-800 p-1 rounded-xl">
                  <button
                    onClick={() => setDocFormatting({ ...docFormatting, textAlign: 'right' })}
                    className={`p-2 rounded-lg transition min-w-[32px] min-h-[32px] flex items-center justify-center ${
                      docFormatting.textAlign === 'right' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                    title="محاذاة لليمين"
                  >
                    <AlignRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDocFormatting({ ...docFormatting, textAlign: 'center' })}
                    className={`p-2 rounded-lg transition min-w-[32px] min-h-[32px] flex items-center justify-center ${
                      docFormatting.textAlign === 'center' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                    title="محاذاة للوسط"
                  >
                    <AlignCenter className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDocFormatting({ ...docFormatting, textAlign: 'left' })}
                    className={`p-2 rounded-lg transition min-w-[32px] min-h-[32px] flex items-center justify-center ${
                      docFormatting.textAlign === 'left' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                    title="محاذاة لليار"
                  >
                    <AlignLeft className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Color Swatches */}
                <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1.5 rounded-xl">
                  <Palette className="w-3.5 h-3.5 text-slate-400 ml-1" />
                  {[
                    { label: 'داكن', color: '#0f172a' },
                    { label: 'كحلي', color: '#1e1b4b' },
                    { label: 'أزرق', color: '#1d4ed8' },
                    { label: 'زمردي', color: '#047857' },
                    { label: 'عنابي', color: '#991b1b' },
                  ].map((c) => (
                    <button
                      key={c.color}
                      onClick={() => setDocFormatting({ ...docFormatting, textColor: c.color })}
                      style={{ backgroundColor: c.color }}
                      className={`w-4 h-4 rounded-full transition transform hover:scale-125 ${
                        docFormatting.textColor === c.color ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-950' : ''
                      }`}
                      title={c.label}
                    />
                  ))}
                </div>

                {/* Seal Ink Swatches */}
                <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-xl">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-[10px] text-slate-400 font-bold">الختم:</span>
                  {[
                    { label: 'أزرق', color: '#1d4ed8' },
                    { label: 'كحلي', color: '#1e1b4b' },
                    { label: 'أخضر', color: '#047857' },
                    { label: 'أحمر', color: '#b91c1c' },
                    { label: 'ذهبي', color: '#b45309' },
                  ].map((sc) => (
                    <button
                      key={sc.color}
                      onClick={() => setSealConfig({ ...sealConfig, color: sc.color })}
                      style={{ backgroundColor: sc.color }}
                      className={`w-3.5 h-3.5 rounded-full transition transform hover:scale-125 ${
                        sealConfig.color === sc.color ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-slate-950' : ''
                      }`}
                      title={sc.label}
                    />
                  ))}
                </div>

                <button
                  onClick={() => setDocFormatting({ ...docFormatting, showSeal: !docFormatting.showSeal })}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition border min-h-[32px] ${
                    docFormatting.showSeal
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                      : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}
                >
                  {docFormatting.showSeal ? 'إظهار الختم ✓' : 'إخفاء الختم'}
                </button>
              </div>

              {/* Zoom & Paper Scale Control Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl">
                  <span className="text-[11px] text-slate-400 font-bold px-2">
                    طريقة العرض:
                  </span>
                  <button
                    type="button"
                    onClick={() => setContractZoom('fit')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 min-h-[34px] ${
                      contractZoom === 'fit' ? 'bg-amber-500 text-slate-950 font-black shadow' : 'text-slate-300 hover:text-white bg-slate-800/80'
                    }`}
                    title="ملاءمة مقاس الورقة تلقائياً مع شاشة الهاتف بدون تشويه أو كسر للنصوص"
                  >
                    📱 ملاءمة كاملة للشاشة
                  </button>
                  <button
                    type="button"
                    onClick={() => setContractZoom(1.0)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 min-h-[34px] ${
                      contractZoom === 1.0 ? 'bg-indigo-600 text-white font-black shadow' : 'text-slate-300 hover:text-white bg-slate-800/80'
                    }`}
                    title="العرض بالحجم الطبيعي 100% للتعديل والكتابة"
                  >
                    🔍 100% (أصلي للتعديل)
                  </button>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      const cur = effectiveContractScale;
                      const next = Math.max(0.35, Number((cur - 0.15).toFixed(2)));
                      setContractZoom(next);
                    }}
                    className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg min-w-[34px] min-h-[34px] flex items-center justify-center font-bold transition"
                    title="تصغير"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-mono font-bold text-amber-300 px-2 min-w-[50px] text-center">
                    {Math.round(effectiveContractScale * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const cur = effectiveContractScale;
                      const next = Math.min(1.5, Number((cur + 0.15).toFixed(2)));
                      setContractZoom(next);
                    }}
                    className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg min-w-[34px] min-h-[34px] flex items-center justify-center font-bold transition"
                    title="تكبير"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Interactive hint notice */}
            <div className="no-print bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs p-2.5 rounded-xl flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>انقر على أي حرف أو كلمة أو عنوان داخل هذه الورقة لتعديله فوراً قبل الطباعة أو الحفظ!</span>
            </div>

            {/* A4 SIMULATED LEGAL PAPER SHEET - PROPORTIONAL ADAPTIVE SCALE CONTAINER */}
            <div
              ref={contractContainerRef}
              className="overflow-x-auto overflow-y-auto max-w-full p-1 sm:p-4 bg-slate-950/70 rounded-2xl border border-slate-800 flex justify-center custom-scrollbar"
            >
              <div
                style={{
                  width: `${Math.round(contractBaseWidth * effectiveContractScale)}px`,
                  height: `${Math.round(contractSheetHeight * effectiveContractScale)}px`,
                  overflow: 'hidden',
                  transition: 'width 0.15s ease-out, height 0.15s ease-out',
                }}
              >
                <div
                  style={{
                    transform: `scale(${effectiveContractScale})`,
                    transformOrigin: 'top right',
                    width: `${contractBaseWidth}px`,
                    minWidth: `${contractBaseWidth}px`,
                  }}
                >
                  <div
                    ref={contractSheetRef}
                    dir="rtl"
                    style={{
                      fontFamily: docFormatting.fontFamily,
                      fontSize: docFormatting.fontSize,
                      color: docFormatting.textColor,
                      fontWeight: docFormatting.isBold ? 700 : 400,
                      fontStyle: docFormatting.isItalic ? 'italic' : 'normal',
                      textDecoration: docFormatting.isUnderline ? 'underline' : 'none',
                      textAlign: docFormatting.textAlign,
                    }}
                    className="printable-sheet bg-white text-slate-900 rounded-2xl p-6 sm:p-10 shadow-2xl border-4 border-double border-indigo-950 space-y-6 text-right leading-relaxed print:shadow-none print:border-none print:p-0 relative w-[780px] min-w-[780px]"
                  >
                {/* Top Luxury Gold Accent Bar */}
                <div className="h-1.5 bg-gradient-to-r from-indigo-950 via-amber-500 to-indigo-950 rounded-full mb-4"></div>

                {/* Letterhead Header with Official Emblem */}
                <div className="border-b-2 border-indigo-950 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-3.5 flex-1 w-full sm:w-auto">
                    <img
                      src={kayanBadge}
                      alt="KAYAN Badge"
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl border-2 border-amber-500 object-cover shadow-sm shrink-0"
                    />
                    <div className="space-y-1 text-right flex-1 min-w-0">
                      <input
                        type="text"
                        value={contractLabels.companyName}
                        onChange={(e) => setContractLabels({ ...contractLabels, companyName: e.target.value })}
                        className="w-full text-base sm:text-xl font-black text-indigo-950 bg-transparent border-b border-dashed border-slate-300 hover:border-indigo-600 focus:bg-amber-50 outline-none print:border-none"
                      />
                      <input
                        type="text"
                        value={contractLabels.companySub}
                        onChange={(e) => setContractLabels({ ...contractLabels, companySub: e.target.value })}
                        className="w-full text-xs sm:text-sm font-extrabold text-amber-700 bg-transparent border-b border-dashed border-slate-300 hover:border-indigo-600 focus:bg-amber-50 outline-none print:border-none"
                      />
                      <div className="flex flex-wrap items-center gap-1 text-[11px] text-slate-500 font-bold">
                        <input
                          type="text"
                          value={contractLabels.regDetails}
                          onChange={(e) => setContractLabels({ ...contractLabels, regDetails: e.target.value })}
                          className="bg-transparent border-b border-dashed border-slate-300 hover:border-indigo-600 focus:bg-amber-50 outline-none w-full sm:w-64 print:border-none"
                        />
                        <span className="font-mono text-slate-700">{settings.supportPhone || '01038574977'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right bg-slate-50 border-2 border-slate-200 p-2.5 rounded-xl shrink-0 space-y-1 w-full sm:w-auto min-w-[170px]">
                    <div className="flex items-center gap-1 justify-between font-black text-indigo-950 text-xs">
                      <input
                        type="text"
                        value={contractLabels.contractIdLabel}
                        onChange={(e) => setContractLabels({ ...contractLabels, contractIdLabel: e.target.value })}
                        className="bg-transparent font-bold text-slate-600 outline-none text-right border-none"
                      />
                      <input
                        type="text"
                        value={viewingContract.id}
                        onChange={(e) => handleContractFieldChange('id', e.target.value)}
                        className="bg-transparent font-black uppercase text-indigo-950 font-mono outline-none w-20 text-left border-b border-dashed border-indigo-300 focus:bg-indigo-100 print:border-none"
                      />
                    </div>
                    <div className="text-slate-600 text-[11px] flex items-center gap-1 justify-between font-bold border-t border-slate-200 pt-1">
                      <input
                        type="text"
                        value={contractLabels.dateLabel}
                        onChange={(e) => setContractLabels({ ...contractLabels, dateLabel: e.target.value })}
                        className="bg-transparent text-slate-500 outline-none text-right border-none"
                      />
                      <input
                        type="text"
                        value={viewingContract.createdAt}
                        onChange={(e) => handleContractFieldChange('createdAt', e.target.value)}
                        className="bg-transparent text-slate-800 font-mono outline-none w-24 text-left border-b border-dashed border-slate-300 focus:bg-amber-50 print:border-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Title Header Ribbon */}
                <div className="text-center py-3 px-4 bg-gradient-to-r from-indigo-950 via-indigo-900 to-indigo-950 text-white rounded-xl shadow-md border-r-4 border-amber-500 space-y-1">
                  <input
                    type="text"
                    value={viewingContract.title}
                    onChange={(e) => handleContractFieldChange('title', e.target.value)}
                    className="w-full text-center text-sm sm:text-lg font-black text-white bg-transparent border-b border-dashed border-amber-400/50 hover:border-amber-400 focus:bg-indigo-800 px-2 py-0.5 outline-none transition print:border-none"
                  />
                  <span className="text-[10px] sm:text-[11px] text-amber-300 font-bold block">
                    عقد رسمي معتمد ملزم بجميع الآثار القانونية والمالية صادر عن شركة كيان
                  </span>
                </div>

                {/* Legal Preamble */}
                <div className="space-y-3 bg-slate-50 p-3.5 sm:p-5 border border-slate-200 rounded-xl">
                  <div className="font-semibold leading-relaxed flex flex-wrap items-center gap-1.5 text-slate-900 text-xs sm:text-sm">
                    <input
                      type="text"
                      value={contractLabels.dayLabel}
                      onChange={(e) => setContractLabels({ ...contractLabels, dayLabel: e.target.value })}
                      className="bg-transparent font-bold text-slate-900 outline-none w-16 sm:w-20 border-b border-dashed border-slate-300 print:border-none"
                    />
                    <input
                      type="text"
                      value={viewingContract.createdAt}
                      onChange={(e) => handleContractFieldChange('createdAt', e.target.value)}
                      className="font-bold underline px-1 text-amber-700 bg-transparent border-b border-dashed border-amber-400 hover:border-indigo-600 focus:bg-amber-100 outline-none w-24 sm:w-28 text-center print:border-none"
                    />
                    <input
                      type="text"
                      value={contractLabels.cityLabel}
                      onChange={(e) => setContractLabels({ ...contractLabels, cityLabel: e.target.value })}
                      className="bg-transparent font-bold text-slate-900 outline-none w-20 sm:w-28 border-b border-dashed border-slate-300 print:border-none"
                    />
                    <input
                      type="text"
                      value={viewingContract.location || 'القاهرة / الإسماعيلية'}
                      onChange={(e) => handleContractFieldChange('location', e.target.value)}
                      className="font-bold underline px-1 text-indigo-950 bg-transparent border-b border-dashed border-amber-400 hover:border-indigo-600 focus:bg-amber-100 outline-none w-36 sm:w-44 text-center print:border-none"
                    />
                    <input
                      type="text"
                      value={contractLabels.preambleEnd}
                      onChange={(e) => setContractLabels({ ...contractLabels, preambleEnd: e.target.value })}
                      className="bg-transparent font-bold text-slate-900 outline-none flex-1 border-b border-dashed border-slate-300 print:border-none min-w-[140px]"
                    />
                  </div>

                  <div className="space-y-2.5 pt-3 border-t border-slate-200 text-slate-900 text-xs sm:text-sm">
                    <div className="flex flex-wrap items-center gap-1.5 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200">
                      <input
                        type="text"
                        value={contractLabels.firstPartyLabel}
                        onChange={(e) => setContractLabels({ ...contractLabels, firstPartyLabel: e.target.value })}
                        className="text-indigo-950 font-black bg-transparent outline-none w-full sm:w-48 border-b border-dashed border-indigo-300 print:border-none"
                      />
                      <input
                        type="text"
                        value={contractLabels.firstPartyText}
                        onChange={(e) => setContractLabels({ ...contractLabels, firstPartyText: e.target.value })}
                        className="flex-1 min-w-[180px] bg-transparent text-slate-900 font-semibold outline-none border-b border-dashed border-slate-300 hover:border-indigo-500 focus:bg-amber-50 print:border-none"
                      />
                      <span className="font-mono font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs">
                        {settings.supportPhone || '01038574977'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200">
                      <input
                        type="text"
                        value={contractLabels.secondPartyLabel}
                        onChange={(e) => setContractLabels({ ...contractLabels, secondPartyLabel: e.target.value })}
                        className="text-indigo-950 font-black bg-transparent outline-none w-full sm:w-48 border-b border-dashed border-indigo-300 print:border-none"
                      />
                      <input
                        type="text"
                        value={contractLabels.secondPartyNameLabel}
                        onChange={(e) => setContractLabels({ ...contractLabels, secondPartyNameLabel: e.target.value })}
                        className="bg-transparent font-bold outline-none w-24 sm:w-28 border-b border-dashed border-slate-300 print:border-none"
                      />
                      <input
                        type="text"
                        value={viewingContract.partyName}
                        onChange={(e) => handleContractFieldChange('partyName', e.target.value)}
                        className="font-black text-amber-900 bg-amber-100 px-3 py-1 rounded-lg border border-amber-300 hover:border-indigo-600 focus:bg-amber-200 outline-none text-xs sm:text-sm print:border-none print:bg-transparent print:p-0 flex-1 sm:flex-initial min-w-[120px]"
                      />
                      <input
                        type="text"
                        value={contractLabels.phoneLabel}
                        onChange={(e) => setContractLabels({ ...contractLabels, phoneLabel: e.target.value })}
                        className="bg-transparent font-bold outline-none w-20 sm:w-24 border-b border-dashed border-slate-300 print:border-none"
                      />
                      <input
                        type="text"
                        value={viewingContract.partyPhone}
                        onChange={(e) => handleContractFieldChange('partyPhone', e.target.value)}
                        className="font-mono font-black text-slate-900 bg-transparent border-b border-dashed border-slate-400 hover:border-indigo-600 focus:bg-amber-100 px-2 py-0.5 outline-none w-28 sm:w-32 text-center print:border-none"
                      />
                      <input
                        type="text"
                        value={contractLabels.nationalIdLabel}
                        onChange={(e) => setContractLabels({ ...contractLabels, nationalIdLabel: e.target.value })}
                        className="bg-transparent font-bold outline-none w-28 sm:w-40 border-b border-dashed border-slate-300 print:border-none"
                      />
                      <input
                        type="text"
                        value={viewingContract.partyNationalId || ''}
                        onChange={(e) => handleContractFieldChange('partyNationalId', e.target.value)}
                        className="font-mono font-bold text-slate-900 bg-transparent border-b border-dashed border-slate-400 hover:border-indigo-600 focus:bg-amber-100 px-2 py-0.5 outline-none w-32 sm:w-36 text-center print:border-none"
                        placeholder="الرقم القومي"
                      />
                    </div>
                  </div>
                </div>

                {/* Financial Terms Table */}
                <div>
                  <input
                    type="text"
                    value={contractLabels.financialTitle}
                    onChange={(e) => setContractLabels({ ...contractLabels, financialTitle: e.target.value })}
                    className="font-black text-indigo-950 mb-2 border-r-4 border-amber-500 pr-2 bg-transparent w-full outline-none border-b border-dashed border-slate-300 hover:border-indigo-600 text-xs sm:text-sm print:border-none"
                  />
                  <div className="overflow-x-auto max-w-full">
                    <table className="w-full border-collapse text-center border-2 border-indigo-950 text-xs sm:text-sm overflow-hidden rounded-lg shadow-sm min-w-[480px]">
                      <thead>
                        <tr className="bg-indigo-950 text-white font-black">
                          <th className="border border-indigo-800 p-2.5">
                            <input
                              type="text"
                              value={contractLabels.colTotal}
                              onChange={(e) => setContractLabels({ ...contractLabels, colTotal: e.target.value })}
                              className="w-full text-center bg-transparent border-none outline-none font-black text-white"
                            />
                          </th>
                          <th className="border border-indigo-800 p-2.5">
                            <input
                              type="text"
                              value={contractLabels.colDeposit}
                              onChange={(e) => setContractLabels({ ...contractLabels, colDeposit: e.target.value })}
                              className="w-full text-center bg-transparent border-none outline-none font-black text-white"
                            />
                          </th>
                          <th className="border border-indigo-800 p-2.5">
                            <input
                              type="text"
                              value={contractLabels.colRemaining}
                              onChange={(e) => setContractLabels({ ...contractLabels, colRemaining: e.target.value })}
                              className="w-full text-center bg-transparent border-none outline-none font-black text-white"
                            />
                          </th>
                          <th className="border border-indigo-800 p-2.5">
                            طريقة السداد المعتمدة
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="font-mono font-bold bg-white">
                          <td className="border border-slate-300 p-3 text-slate-950 font-black text-xs sm:text-base">
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                value={viewingContract.totalCost}
                                onChange={(e) => handleContractFieldChange('totalCost', Number(e.target.value))}
                                className="w-24 sm:w-28 text-center font-mono font-black text-slate-900 bg-transparent border-b border-dashed border-slate-400 hover:border-indigo-600 focus:bg-amber-100 outline-none py-1 print:border-none"
                              />
                              <span>ج.م</span>
                            </div>
                          </td>
                          <td className="border border-slate-300 p-3 text-emerald-800 bg-emerald-50/50 font-black text-xs sm:text-base">
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                value={viewingContract.depositPaid}
                                onChange={(e) => handleContractFieldChange('depositPaid', Number(e.target.value))}
                                className="w-24 sm:w-28 text-center font-mono font-black text-emerald-800 bg-transparent border-b border-dashed border-emerald-400 hover:border-emerald-600 focus:bg-emerald-100 outline-none py-1 print:border-none"
                              />
                              <span>ج.م</span>
                            </div>
                          </td>
                          <td className="border border-slate-300 p-3 text-rose-700 bg-rose-50/50 font-black text-xs sm:text-base">
                            {viewingContract.remainingBalance.toLocaleString()} ج.م
                          </td>
                          <td className="border border-slate-300 p-3 text-indigo-950 font-sans font-bold text-xs sm:text-sm">
                            نقداً / فودافون كاش / تحويل بنكي
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Legal Clauses List with Live Editing & Reordering Controls */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 no-print">
                    <input
                      type="text"
                      value={contractLabels.clausesTitle}
                      onChange={(e) => setContractLabels({ ...contractLabels, clausesTitle: e.target.value })}
                      className="font-black text-indigo-950 border-r-4 border-amber-500 pr-2 bg-transparent w-full sm:w-1/2 outline-none border-b border-dashed border-slate-300 text-xs sm:text-sm print:border-none"
                    />
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => setIsClauseLibraryOpen(true)}
                        className="text-xs bg-amber-500 text-slate-950 hover:bg-amber-400 font-black px-3 py-2 rounded-lg flex items-center justify-center gap-1 shadow transition active:scale-95 min-h-[36px] flex-1 sm:flex-initial"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>مكتبة البنود (13+)</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleAddClauseToViewingContract}
                        className="text-xs bg-indigo-50 border border-indigo-300 text-indigo-900 hover:bg-indigo-100 font-black px-3 py-2 rounded-lg flex items-center justify-center gap-1 shadow-sm transition active:scale-95 min-h-[36px] flex-1 sm:flex-initial"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>إضافة بند مخصص</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {(viewingContract.clauseNotes || []).map((clause, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-50 hover:bg-amber-50/60 p-3 rounded-xl border border-slate-200 border-r-4 border-r-amber-500 group relative leading-relaxed transition shadow-sm"
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="font-black text-xs text-white bg-indigo-950 px-2.5 py-1 rounded-md shrink-0 mt-0.5">
                            بند {idx + 1}
                          </span>
                          <textarea
                            value={clause}
                            onChange={(e) => {
                              const updatedClauses = [...(viewingContract.clauseNotes || [])];
                              updatedClauses[idx] = e.target.value;
                              handleContractFieldChange('clauseNotes', updatedClauses);
                            }}
                            rows={2}
                            className="w-full bg-transparent border border-dashed border-slate-300 hover:border-indigo-500 focus:border-indigo-700 focus:bg-white rounded-lg p-2 text-xs sm:text-sm font-bold text-slate-900 outline-none leading-relaxed resize-y transition print:border-none print:bg-transparent print:p-0"
                          />
                        </div>

                        <div className="no-print flex items-center justify-between mt-1.5 pt-1.5 border-t border-slate-200 text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleMoveClause(idx, 'up')}
                              disabled={idx === 0}
                              className="px-2.5 py-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 disabled:opacity-30 text-[10px] font-bold min-h-[28px]"
                            >
                              ▲ للأعلى
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveClause(idx, 'down')}
                              disabled={idx === (viewingContract.clauseNotes?.length || 0) - 1}
                              className="px-2.5 py-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 disabled:opacity-30 text-[10px] font-bold min-h-[28px]"
                            >
                              ▼ للأسفل
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const updatedClauses = viewingContract.clauseNotes.filter((_, i) => i !== idx);
                              handleContractFieldChange('clauseNotes', updatedClauses);
                            }}
                            className="text-rose-600 hover:text-rose-800 font-bold hover:underline py-1"
                          >
                            🗑️ حذف البند
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Universal Legal Binding Clause */}
                    <div className="bg-amber-50 border border-amber-200 border-r-4 border-r-amber-600 p-3 rounded-xl text-amber-950 text-xs sm:text-sm font-bold leading-relaxed flex items-start gap-2.5">
                      <span className="font-black text-xs text-white bg-amber-600 px-2.5 py-1 rounded-md shrink-0 mt-0.5">
                        إقرار
                      </span>
                      <div>
                        يلتزم الطرفان بكافة البنود والشروط المذكورة أعلاه، وفي حالة الإخلال يتحمل الطرف المخالف كافة الآثار القانونية والمالية والشروط الجزائية المترتبة على ذلك، وتختص محاكم جمهورية مصر العربية بالفصل في أي نزاع.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Signatures & Legal Seals */}
                <div className="pt-6 border-t-2 border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 text-center items-start">
                  {/* First Party (Kayan Management) */}
                  <div className="space-y-2 flex flex-col items-center min-h-[160px] bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 md:bg-transparent md:p-0 md:border-none">
                    <input
                      type="text"
                      value={contractLabels.firstPartySigTitle}
                      onChange={(e) => setContractLabels({ ...contractLabels, firstPartySigTitle: e.target.value })}
                      className="font-black text-indigo-950 text-center w-full bg-transparent border-b border-dashed border-slate-300 outline-none text-xs sm:text-sm print:border-none"
                    />

                    {/* Signature / Seal Area */}
                    {viewingContract.signatures?.firstParty ? (
                      <div className="border border-indigo-200 bg-indigo-50/30 p-2 rounded-xl text-center space-y-1 relative w-full">
                        <img
                          src={viewingContract.signatures.firstParty}
                          alt="توقيع الطرف الأول"
                          className="max-h-20 max-w-[180px] mx-auto object-contain"
                        />
                        <span className="text-[10px] text-emerald-700 font-bold block font-mono">
                          ✓ توقيع إلكتروني موثق #{viewingContract.contractNumber || viewingContract.id.slice(0, 6)}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSignatureTarget('first_party');
                            setIsSignaturePadOpen(true);
                          }}
                          className="no-print text-[10px] text-indigo-600 hover:underline font-bold py-1"
                        >
                          إعادة التوقيع
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSignatureTarget('first_party');
                          setIsSignaturePadOpen(true);
                        }}
                        className="no-print h-20 w-full sm:w-44 border-2 border-dashed border-amber-400 hover:border-amber-600 bg-amber-50/40 rounded-xl flex flex-col items-center justify-center text-amber-900 text-xs font-bold transition"
                      >
                        <PenTool className="w-5 h-5 text-amber-600 mb-1" />
                        <span>توقيع الإدارة إلكترونياً</span>
                      </button>
                    )}

                    {docFormatting.showSeal && (
                      <div className="py-1 flex items-center justify-center">
                        <CompanySeal
                          companyNameAr={sealConfig.companyNameAr}
                          companyNameEn={sealConfig.companyNameEn}
                          licenseNo={sealConfig.licenseNo}
                          sealStatusText={sealConfig.sealStatusText}
                          color={sealConfig.color}
                          rotation={sealConfig.rotation}
                          size={120}
                          showControls={true}
                          onUpdateSeal={(updated) => setSealConfig({ ...sealConfig, ...updated })}
                        />
                      </div>
                    )}

                    <input
                      type="text"
                      value={contractLabels.firstPartySigSub}
                      onChange={(e) => setContractLabels({ ...contractLabels, firstPartySigSub: e.target.value })}
                      className="text-xs font-bold text-slate-600 text-center w-full bg-transparent border-b border-dashed border-slate-300 outline-none print:border-none"
                    />
                  </div>

                  {/* Second Party (Contractor/Client) */}
                  <div className="space-y-3 text-center bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 md:bg-transparent md:p-0 md:border-none">
                    <input
                      type="text"
                      value={contractLabels.secondPartySigTitle}
                      onChange={(e) => setContractLabels({ ...contractLabels, secondPartySigTitle: e.target.value })}
                      className="font-black text-indigo-950 text-center w-full bg-transparent border-b border-dashed border-slate-300 outline-none text-xs sm:text-sm print:border-none"
                    />

                    {/* Second Party Signature Box */}
                    {viewingContract.signatures?.secondParty ? (
                      <div className="border border-indigo-200 bg-slate-50 p-2.5 rounded-xl text-center space-y-1 w-full">
                        <img
                          src={viewingContract.signatures.secondParty}
                          alt="توقيع الطرف الثاني"
                          className="max-h-20 max-w-[180px] mx-auto object-contain"
                        />
                        <span className="text-[10px] text-emerald-700 font-bold block font-mono">
                          ✓ تم التوقيع بواسطة: {viewingContract.partyName}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSignatureTarget('second_party');
                            setIsSignaturePadOpen(true);
                          }}
                          className="no-print text-[10px] text-indigo-600 hover:underline font-bold py-1"
                        >
                          إعادة التوقيع
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => {
                          setSignatureTarget('second_party');
                          setIsSignaturePadOpen(true);
                        }}
                        className="h-24 border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-xl flex flex-col items-center justify-center bg-slate-50 p-2 cursor-pointer group transition w-full"
                      >
                        <PenTool className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 mb-1" />
                        <span className="font-black text-slate-900 text-sm">{viewingContract.partyName}</span>
                        <span className="text-slate-400 group-hover:text-indigo-600 text-xs font-bold">
                          اضغط هنا للتوقيع الإلكتروني ✍️
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-center gap-1 text-xs font-bold text-slate-700">
                      <input
                        type="text"
                        value={contractLabels.secondPartySigNameLabel}
                        onChange={(e) => setContractLabels({ ...contractLabels, secondPartySigNameLabel: e.target.value })}
                        className="w-16 text-right bg-transparent outline-none border-b border-dashed border-slate-300 print:border-none"
                      />
                      <span className="font-black text-indigo-950">{viewingContract.partyName}</span>
                    </div>
                  </div>
                </div>

                {/* Verification QR Code & Security Barcode */}
                <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/60 p-3 rounded-xl">
                  <div className="flex items-center gap-3 text-right">
                    <div className="p-1 bg-white border border-slate-300 rounded-lg shrink-0">
                      <QRCodeSVG
                        value={`https://kayan-events.com/verify-contract?id=${viewingContract.id}&code=${viewingContract.contractNumber || viewingContract.id}&total=${viewingContract.totalCost}&status=${viewingContract.status || 'active'}`}
                        size={55}
                        level="M"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-indigo-950 block">
                        كود التحقق الرقمي المعتمد (QR Verification)
                      </span>
                      <p className="text-[9px] text-slate-500 font-mono">
                        DOCUMENT HASH: KAYAN-SEC-{viewingContract.id.slice(0, 8).toUpperCase()}-2026
                      </p>
                      <p className="text-[9px] text-emerald-700 font-bold">
                        ✓ مسجل إلكترونياً بقاعدة بيانات شركة كيان للفعاليات
                      </p>
                    </div>
                  </div>

                  <div className="text-left font-mono text-[10px] text-slate-500 space-y-0.5">
                    <div>SERIAL: {viewingContract.id.toUpperCase()}</div>
                    <div>ISSUED: {viewingContract.createdAt}</div>
                    <div>SYSTEM: KAYAN-ERP-V4.2</div>
                  </div>
                </div>

                {/* Footer text */}
                <div className="text-center text-[10px] sm:text-[11px] text-slate-500 pt-2 border-t border-slate-200 font-bold">
                  <input
                    type="text"
                    value={contractLabels.footerText}
                    onChange={(e) => setContractLabels({ ...contractLabels, footerText: e.target.value })}
                    className="w-full text-center bg-transparent outline-none border-b border-dashed border-slate-300 print:border-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )}

      {/* 📚 OFFICIAL LEGAL CLAUSE LIBRARY MODAL */}
      {isClauseLibraryOpen && viewingContract && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto no-print">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5 my-auto max-h-[90vh] overflow-y-auto text-right">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-xl">
                  <BookOpen className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">مكتبة البنود القانونية الرسمية المعتمدة</h3>
                  <p className="text-xs text-slate-400">
                    اختر البنود والشروط الملزمة لإدراجها بضغطة زر داخل ورقة العقد الحالية
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsClauseLibraryOpen(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 w-8 h-8 rounded-xl font-bold flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            {/* Search & Category Filter */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                <input
                  type="text"
                  value={clauseSearchTerm}
                  onChange={(e) => setClauseSearchTerm(e.target.value)}
                  placeholder="ابحث في نص البند أو العنوان (مثلاً: القوة القاهرة، السرية، الشرط الجزائي...)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-4 py-2 text-xs text-white placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'all', label: 'جميع البنود (الكل)' },
                  { id: 'force_majeure', label: 'القوة القاهرة' },
                  { id: 'financial', label: 'الشروط المالية والغرامات' },
                  { id: 'cancellation', label: 'الإلغاء والاسترداد' },
                  { id: 'safety', label: 'السلامة والصحة المهنية' },
                  { id: 'nda', label: 'السرية وحماية البيانات' },
                  { id: 'ip', label: 'الملكية الفكرية والحصرية' },
                  { id: 'logistics', label: 'اللوجستيات والمنشآت' },
                  { id: 'jurisdiction', label: 'الاختصاص القضائي' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setClauseCategoryFilter(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition min-h-[38px] flex items-center justify-center ${
                      clauseCategoryFilter === cat.id
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Clauses List */}
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {LEGAL_CLAUSE_LIBRARY.filter((item) => {
                const matchesCat = clauseCategoryFilter === 'all' || item.category === clauseCategoryFilter;
                const matchesSearch =
                  !clauseSearchTerm ||
                  item.title.includes(clauseSearchTerm) ||
                  item.text.includes(clauseSearchTerm) ||
                  item.categoryLabel.includes(clauseSearchTerm);
                return matchesCat && matchesSearch;
              }).map((item) => {
                const isAlreadyAdded = (viewingContract.clauseNotes || []).some((c) => c.includes(item.title) || c.includes(item.text.slice(0, 30)));

                return (
                  <div
                    key={item.id}
                    className="bg-slate-950 border border-slate-800 hover:border-indigo-500/40 rounded-xl p-3.5 space-y-2 transition group"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div>
                        <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                          {item.categoryLabel}
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-white mt-1">{item.title}</h4>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const current = viewingContract.clauseNotes || [];
                          const updated = [...current, item.text];
                          handleContractFieldChange('clauseNotes', updated);
                        }}
                        disabled={isAlreadyAdded}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition min-h-[38px] w-full sm:w-auto ${
                          isAlreadyAdded
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white active:scale-95 shadow'
                        }`}
                      >
                        {isAlreadyAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            مدرج بالعقد
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            إدراج في العقد
                          </>
                        )}
                      </button>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed font-sans bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                      {item.text}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsClauseLibraryOpen(false)}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-6 py-2.5 rounded-xl text-xs sm:text-sm transition min-h-[44px] w-full sm:w-auto flex items-center justify-center"
              >
                إغلاق والعودة لورقة العقد ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✍️ DIGITAL SIGNATURE PAD MODAL */}
      {isSignaturePadOpen && viewingContract && (
        <DigitalSignaturePad
          isOpen={isSignaturePadOpen}
          onClose={() => setIsSignaturePadOpen(false)}
          partyLabel={signatureTarget === 'first_party' ? 'ممثل إدارة شركة كيان' : viewingContract.partyName}
          initialSignerName={signatureTarget === 'first_party' ? 'إدارة تعاقدات كيان' : viewingContract.partyName}
          title={
            signatureTarget === 'first_party'
              ? 'توقيع الطرف الأول الرسمي (شركة كيان للفعاليات)'
              : `توقيع الطرف الثاني المعتمد (${viewingContract.partyName})`
          }
          onSave={(signatureBase64, signerName) => {
            const currentSignatures = viewingContract.signatures || {};
            const updated = {
              ...viewingContract,
              signatures: {
                ...currentSignatures,
                [signatureTarget === 'first_party' ? 'firstParty' : 'secondParty']: signatureBase64,
              },
            };
            if (signatureTarget === 'second_party' && signerName) {
              updated.partyName = signerName;
            }
            setViewingContract(updated);
            if (onUpdateContract) onUpdateContract(updated);
            setIsSignaturePadOpen(false);
          }}
        />
      )}

      {/* 🧾 LIVE OFFICIAL RECEIPT SHEET & EDITOR */}
      {viewingReceipt && (
        <div className={`fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 overflow-y-auto ${isReceiptFullscreen ? 'mobile-fullscreen-modal' : ''}`}>
          <div className={`bg-slate-900 border border-slate-800 w-full ${isReceiptFullscreen ? 'max-w-none h-full min-h-screen rounded-none p-2 sm:p-4' : 'max-w-3xl rounded-3xl p-4 sm:p-6 my-auto max-h-[95vh]'} shadow-2xl space-y-5 overflow-y-auto`}>
            {/* Rich Formatting & Control Toolbar */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 sm:p-4 space-y-3 no-print shadow-xl">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                    <Receipt className="w-5 h-5 text-emerald-400 shrink-0" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                      سند نقدية رسمي معتمد • A5 Certificate Voucher
                    </span>
                    <h3 className="text-xs sm:text-sm font-bold text-white line-clamp-1">
                      {viewingReceipt.voucherNumber} - {viewingReceipt.personName}
                    </h3>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                  {/* Fullscreen Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setIsReceiptFullscreen(!isReceiptFullscreen)}
                    className="bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition active:scale-95 min-h-[40px] flex-1 sm:flex-initial"
                    title={isReceiptFullscreen ? "تصغير النافذة" : "ملء الشاشة للموبايل"}
                  >
                    {isReceiptFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    <span>
                      <span className="hidden sm:inline">{isReceiptFullscreen ? 'تصغير' : 'ملء الشاشة'}</span>
                      <span className="sm:hidden">{isReceiptFullscreen ? 'تصغير 🔲' : 'شاشة كاملة 📱'}</span>
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      const words = numberToArabicWords(viewingReceipt.amount);
                      handleReceiptFieldChange('amountInWords', words);
                    }}
                    className="bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/50 text-emerald-300 font-bold px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1 transition active:scale-95 min-h-[40px] flex-1 sm:flex-initial"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>
                      <span className="hidden sm:inline">تحديث التفقيط</span>
                      <span className="sm:hidden">تفقيط 🔄</span>
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      if (viewingReceipt) {
                        exportReceiptAsHighResImage(viewingReceipt, settings, receiptSheetRef.current);
                      }
                    }}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3.5 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow transition active:scale-95 min-h-[40px] flex-1 sm:flex-initial"
                    title="تحميل الإيصال كصورة فائقة الجودة PNG"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>
                      <span className="hidden sm:inline">صورة HD</span>
                      <span className="sm:hidden">صورة</span>
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      if (viewingReceipt) {
                        generateReceiptPDF(viewingReceipt, settings, receiptSheetRef.current);
                      }
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow transition active:scale-95 min-h-[40px] flex-1 sm:flex-initial"
                    title="تصدير السند بصيغة PDF عالية الدقة"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>PDF</span>
                  </button>

                  <button
                    onClick={handleDirectBrowserPrint}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-3.5 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow transition active:scale-95 min-h-[40px] flex-1 sm:flex-initial"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>طباعة</span>
                  </button>

                  <button
                    onClick={() => {
                      setViewingReceipt(null);
                      setIsReceiptFullscreen(false);
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-3.5 py-2 rounded-xl text-xs transition min-h-[40px] min-w-[40px] flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Formatting Controls Bar */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 pt-1">
                {/* Font Selector */}
                <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-xl">
                  <Type className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={docFormatting.fontFamily}
                    onChange={(e) => setDocFormatting({ ...docFormatting, fontFamily: e.target.value })}
                    className="bg-transparent text-white font-bold text-xs outline-none cursor-pointer"
                  >
                    <option value="'Tajawal', sans-serif" className="bg-slate-900">
                      خط تجوال (عصري)
                    </option>
                    <option value="'Amiri', serif" className="bg-slate-900">
                      خط أميري (رسمي)
                    </option>
                    <option value="'Cairo', sans-serif" className="bg-slate-900">
                      خط كايرو (عريض)
                    </option>
                    <option value="monospace" className="bg-slate-900">
                      خط الآلة (Monospace)
                    </option>
                  </select>
                </div>

                {/* Font Size Selector */}
                <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-bold px-1">الحجم:</span>
                  {['12px', '14px', '16px', '18px'].map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setDocFormatting({ ...docFormatting, fontSize: sz })}
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold transition ${
                        docFormatting.fontSize === sz ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {sz.replace('px', '')}
                    </button>
                  ))}
                </div>

                {/* Text Style Controls */}
                <div className="flex items-center gap-0.5 bg-slate-900 border border-slate-800 p-1 rounded-xl">
                  <button
                    onClick={() => setDocFormatting({ ...docFormatting, isBold: !docFormatting.isBold })}
                    className={`p-1.5 rounded-lg transition ${
                      docFormatting.isBold ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                    title="خط عريض"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDocFormatting({ ...docFormatting, isItalic: !docFormatting.isItalic })}
                    className={`p-1.5 rounded-lg transition ${
                      docFormatting.isItalic ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                    title="خط مائل"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDocFormatting({ ...docFormatting, isUnderline: !docFormatting.isUnderline })}
                    className={`p-1.5 rounded-lg transition ${
                      docFormatting.isUnderline ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                    title="تسطير"
                  >
                    <Underline className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Seal Ink Color Controls */}
                <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-xl">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-[10px] text-slate-400 font-bold">حبر الختم:</span>
                  {[
                    { label: 'أخضر معتمد', color: '#047857' },
                    { label: 'أزرق رسمياً', color: '#1d4ed8' },
                    { label: 'كحلي ملكي', color: '#1e1b4b' },
                    { label: 'عنابي أحمر', color: '#b91c1c' },
                    { label: 'ذهبي شمعي', color: '#b45309' },
                  ].map((sc) => (
                    <button
                      key={sc.color}
                      onClick={() => setSealConfig({ ...sealConfig, color: sc.color })}
                      style={{ backgroundColor: sc.color }}
                      className={`w-3.5 h-3.5 rounded-full transition transform hover:scale-125 ${
                        sealConfig.color === sc.color ? 'ring-2 ring-emerald-400 ring-offset-1 ring-offset-slate-950' : ''
                      }`}
                      title={sc.label}
                    />
                  ))}
                </div>

                <button
                  onClick={() => setDocFormatting({ ...docFormatting, showSeal: !docFormatting.showSeal })}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition border ${
                    docFormatting.showSeal
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                      : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}
                >
                  {docFormatting.showSeal ? 'الختم ظاهراً ✓' : 'إخفاء الختم'}
                </button>
              </div>

              {/* Zoom & Paper Scale Control Bar for Receipt */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl">
                  <span className="text-[11px] text-slate-400 font-bold px-2">
                    طريقة العرض:
                  </span>
                  <button
                    type="button"
                    onClick={() => setReceiptZoom('fit')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 min-h-[34px] ${
                      receiptZoom === 'fit' ? 'bg-emerald-500 text-slate-950 font-black shadow' : 'text-slate-300 hover:text-white bg-slate-800/80'
                    }`}
                    title="ملاءمة مقاس السند تلقائياً مع شاشة الهاتف بدون تشويه أو كسر للنصوص"
                  >
                    📱 ملاءمة كاملة للشاشة
                  </button>
                  <button
                    type="button"
                    onClick={() => setReceiptZoom(1.0)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 min-h-[34px] ${
                      receiptZoom === 1.0 ? 'bg-indigo-600 text-white font-black shadow' : 'text-slate-300 hover:text-white bg-slate-800/80'
                    }`}
                    title="العرض بالحجم الطبيعي 100% للتعديل والكتابة"
                  >
                    🔍 100% (أصلي للتعديل)
                  </button>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      const cur = effectiveReceiptScale;
                      const next = Math.max(0.35, Number((cur - 0.15).toFixed(2)));
                      setReceiptZoom(next);
                    }}
                    className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg min-w-[34px] min-h-[34px] flex items-center justify-center font-bold transition"
                    title="تصغير"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-mono font-bold text-emerald-300 px-2 min-w-[50px] text-center">
                    {Math.round(effectiveReceiptScale * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const cur = effectiveReceiptScale;
                      const next = Math.min(1.5, Number((cur + 0.15).toFixed(2)));
                      setReceiptZoom(next);
                    }}
                    className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg min-w-[34px] min-h-[34px] flex items-center justify-center font-bold transition"
                    title="تكبير"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Interactive hint notice */}
            <div className="no-print bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs p-2.5 rounded-xl flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>يمكنك النقر مباشرة على أي نص أو مبلغ أو بيان بالسند لتعديله فورياً قبل الطباعة!</span>
              </div>
              <span className="bg-emerald-500/20 text-emerald-300 font-mono text-[10px] px-2 py-0.5 rounded font-bold">
                A5 Printable Format
              </span>
            </div>

            {/* A5 CERTIFICATE RECEIPT SHEET - PROPORTIONAL ADAPTIVE SCALE CONTAINER */}
            <div
              ref={receiptContainerRef}
              className="overflow-x-auto overflow-y-auto max-w-full p-1 sm:p-4 bg-slate-950/70 rounded-2xl border border-slate-800 flex justify-center custom-scrollbar"
            >
              <div
                style={{
                  width: `${Math.round(receiptBaseWidth * effectiveReceiptScale)}px`,
                  height: `${Math.round(receiptSheetHeight * effectiveReceiptScale)}px`,
                  overflow: 'hidden',
                  transition: 'width 0.15s ease-out, height 0.15s ease-out',
                }}
              >
                <div
                  style={{
                    transform: `scale(${effectiveReceiptScale})`,
                    transformOrigin: 'top right',
                    width: `${receiptBaseWidth}px`,
                    minWidth: `${receiptBaseWidth}px`,
                  }}
                >
                  <div
                    ref={receiptSheetRef}
                    dir="rtl"
                    style={{
                      fontFamily: docFormatting.fontFamily,
                      fontSize: docFormatting.fontSize,
                      color: docFormatting.textColor,
                      textAlign: docFormatting.textAlign,
                    }}
                    className={`printable-sheet bg-white text-slate-900 rounded-2xl p-6 sm:p-8 shadow-2xl border-8 border-double ${
                      viewingReceipt.type === 'receipt' ? 'border-emerald-800' : 'border-rose-800'
                    } space-y-4 text-right relative overflow-hidden w-[700px] min-w-[700px] print:shadow-none print:border-4 print:p-6 ${
                      docFormatting.isBold ? 'font-semibold' : 'font-normal'
                    } ${docFormatting.isItalic ? 'italic' : ''} ${docFormatting.isUnderline ? 'underline' : ''}`}
                  >
                {/* Background Watermark Seal */}
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
                  <CompanySeal
                    companyNameAr={sealConfig.companyNameAr}
                    companyNameEn={sealConfig.companyNameEn}
                    licenseNo={sealConfig.licenseNo}
                    color={sealConfig.color}
                    size={320}
                    showControls={false}
                  />
                </div>

                {/* Top Decorative Gold/Theme Banner Header */}
                <div className={`p-4 rounded-xl text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-md border ${
                  viewingReceipt.type === 'receipt'
                    ? 'bg-gradient-to-r from-emerald-950 via-emerald-800 to-emerald-950 border-emerald-600/30'
                    : 'bg-gradient-to-r from-rose-950 via-rose-800 to-rose-950 border-rose-600/30'
                }`}>
                  <div className="flex-1 space-y-1 w-full sm:w-auto text-right">
                    <input
                      type="text"
                      dir="rtl"
                      value={receiptLabels.companyName}
                      onChange={(e) => setReceiptLabels({ ...receiptLabels, companyName: e.target.value })}
                      className="text-lg sm:text-xl font-extrabold bg-transparent text-amber-300 border-b border-dashed border-emerald-400/50 outline-none w-full print:border-none leading-normal"
                    />
                    <input
                      type="text"
                      dir="rtl"
                      value={viewingReceipt.type === 'receipt' ? receiptLabels.typeReceipt : receiptLabels.typePayment}
                      onChange={(e) =>
                        setReceiptLabels({
                          ...receiptLabels,
                          [viewingReceipt.type === 'receipt' ? 'typeReceipt' : 'typePayment']: e.target.value,
                        })
                      }
                      className="text-xs sm:text-sm text-emerald-100 bg-transparent border-b border-dashed border-emerald-400/50 outline-none w-full print:border-none font-bold"
                    />
                  </div>

                  <div className="text-right space-y-1.5 shrink-0 bg-black/30 p-2.5 rounded-lg border border-white/15 w-full sm:w-auto min-w-[170px]">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-slate-300 font-bold">رقم السند:</span>
                      <input
                        type="text"
                        dir="ltr"
                        value={viewingReceipt.voucherNumber}
                        onChange={(e) => handleReceiptFieldChange('voucherNumber', e.target.value)}
                        className="bg-transparent font-mono font-black text-amber-300 text-xs sm:text-sm outline-none w-28 text-left border-b border-dashed border-amber-300 focus:bg-emerald-800/80 print:border-none"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-slate-300 font-bold">التاريخ:</span>
                      <input
                        type="text"
                        dir="ltr"
                        value={viewingReceipt.date}
                        onChange={(e) => handleReceiptFieldChange('date', e.target.value)}
                        className="bg-transparent font-mono font-bold text-white text-xs outline-none w-28 text-left border-b border-dashed border-white/50 focus:bg-emerald-800/80 print:border-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Amount Display Frame */}
                <div className="bg-amber-50/90 p-3 sm:p-4 rounded-xl border-2 border-amber-300 flex flex-col sm:flex-row justify-between items-stretch sm:items-center font-bold gap-3 shadow-sm">
                  <div className="flex items-center justify-between sm:justify-start bg-white px-3 py-2 rounded-lg border border-amber-200 shadow-sm">
                    <span className="text-slate-600 text-xs font-bold shrink-0 ml-2">المبلغ بالأرقام:</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        dir="ltr"
                        value={viewingReceipt.amount}
                        onChange={(e) => handleReceiptFieldChange('amount', Number(e.target.value))}
                        className="w-28 text-xl font-mono font-black text-emerald-800 bg-transparent border-b-2 border-emerald-600 focus:bg-emerald-50 outline-none px-1 py-0.5 text-center print:border-none"
                      />
                      <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs px-2 py-0.5 rounded font-black">
                        ج.م
                      </span>
                    </div>
                  </div>

                  <div className="text-right text-slate-800 text-xs flex-1 bg-white px-3 py-2 rounded-lg border border-amber-200 shadow-sm">
                    <span className="block text-slate-500 text-[10px] font-bold mb-0.5">المبلغ بالحروف (التفقيط المعتمد):</span>
                    <input
                      type="text"
                      dir="rtl"
                      value={viewingReceipt.amountInWords || numberToArabicWords(viewingReceipt.amount)}
                      onChange={(e) => handleReceiptFieldChange('amountInWords', e.target.value)}
                      className="w-full text-emerald-900 font-extrabold bg-transparent border-b border-dashed border-emerald-400 focus:bg-emerald-50 outline-none px-1 text-right print:border-none text-xs sm:text-sm"
                    />
                  </div>
                </div>

                {/* Voucher Content Lines */}
                <div className="space-y-3 bg-slate-50/90 p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm text-sm">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-300 pb-2.5 gap-2">
                    <span className="text-slate-700 font-bold shrink-0 text-xs">
                      {viewingReceipt.type === 'receipt' ? 'استلمنا من السيد / السيدة:' : 'صرفنا إلى السيد / السيدة:'}
                    </span>
                    <input
                      type="text"
                      dir="rtl"
                      value={viewingReceipt.personName}
                      onChange={(e) => handleReceiptFieldChange('personName', e.target.value)}
                      className="w-full font-black text-slate-950 text-base bg-white/70 border-b border-dashed border-slate-400 focus:bg-amber-100 outline-none px-2 py-1 rounded text-right print:border-none"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-300 pb-2.5 gap-2">
                    <span className="text-slate-700 font-bold shrink-0 text-xs">
                      وذلك عن قيمة (البيان / السبب):
                    </span>
                    <input
                      type="text"
                      dir="rtl"
                      value={viewingReceipt.reason}
                      onChange={(e) => handleReceiptFieldChange('reason', e.target.value)}
                      className="w-full text-slate-900 font-bold text-xs sm:text-sm bg-white/70 border-b border-dashed border-slate-400 focus:bg-amber-100 outline-none px-2 py-1 rounded text-right print:border-none"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-300 pb-2.5 gap-2">
                    <span className="text-slate-700 font-bold shrink-0 text-xs">
                      طريقة السداد:
                    </span>
                    <input
                      type="text"
                      dir="rtl"
                      value={viewingReceipt.paymentMethod}
                      onChange={(e) => handleReceiptFieldChange('paymentMethod', e.target.value)}
                      className="w-full text-indigo-950 font-bold bg-white/70 border-b border-dashed border-indigo-400 focus:bg-indigo-50 outline-none px-2 py-1 rounded text-right print:border-none text-xs sm:text-sm"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <span className="text-slate-700 font-bold shrink-0 text-xs">
                      الفعالية / الرحلة:
                    </span>
                    <strong className="text-slate-900 font-black text-sm bg-white/70 px-2 py-1 rounded w-full text-right">
                      {settings.tripName || 'فعاليات شركة كيان'}
                    </strong>
                  </div>
                </div>

                {/* Official Signatures & Stamp */}
                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 text-center font-bold text-xs">
                  {/* Supervisor / Accountant */}
                  <div className="relative bg-slate-50/50 p-3 rounded-xl border border-slate-200/60 sm:bg-transparent sm:p-0 sm:border-none">
                    <span className="text-slate-700 text-xs block font-bold mb-1">
                      المحاسب / المشرف المسؤول
                    </span>
                    <div className="mt-2 h-20 border-b-2 border-dashed border-slate-400 flex items-end justify-center relative pb-1">
                      <input
                        type="text"
                        dir="rtl"
                        value={viewingReceipt.supervisorName || 'إدارة مالية شركة كيان'}
                        onChange={(e) => handleReceiptFieldChange('supervisorName', e.target.value)}
                        className="text-center text-slate-950 font-black bg-transparent border-b border-dashed border-slate-400 focus:bg-amber-100 outline-none px-2 py-0.5 w-full z-10 print:border-none text-xs"
                      />
                      <div className="absolute -top-3 left-2 opacity-90 scale-90 pointer-events-none">
                        {docFormatting.showSeal && (
                          <CompanySeal
                            companyNameAr={sealConfig.companyNameAr}
                            companyNameEn={sealConfig.companyNameEn}
                            licenseNo={sealConfig.licenseNo}
                            sealStatusText="سند معتمد • OFFICIAL"
                            color={sealConfig.color}
                            rotation={-8}
                            size={110}
                            showControls={false}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Recipient Signature */}
                  <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-200/60 sm:bg-transparent sm:p-0 sm:border-none">
                    <span className="text-slate-700 text-xs block font-bold mb-1">
                      توقيع المستلم / العميل
                    </span>
                    <div className="mt-2 h-20 border-b-2 border-dashed border-slate-400 flex items-end justify-center pb-1">
                      <span className="text-slate-400 text-[10px]">التوقيع / البصمة</span>
                    </div>
                  </div>
                </div>

                {/* Footer text */}
                <div className="text-center text-[10px] text-slate-500 pt-2 border-t border-slate-200">
                  <input
                    type="text"
                    dir="rtl"
                    value={receiptLabels.footerText}
                    onChange={(e) => setReceiptLabels({ ...receiptLabels, footerText: e.target.value })}
                    className="w-full text-center bg-transparent outline-none border-b border-dashed border-slate-300 print:border-none font-sans"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )}

      {/* Contract Generator / Editor Modal */}
      {isContractModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto custom-scrollbar my-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 gap-2">
              <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2 truncate">
                <FileText className="w-5 h-5 text-amber-400 shrink-0" />
                <span>{contractForm.id ? 'تعديل بيانات العقد القانوني' : 'إنشاء عقد اتفاق قانوني جديد'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsContractModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition shrink-0"
                title="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveContract} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">نوع العقد المطلوب</label>
                <select
                  value={contractForm.type}
                  onChange={(e) => {
                    const type = e.target.value as ContractType;
                    const meta = LEGAL_PRESETS[type];
                    setContractForm({
                      ...contractForm,
                      type,
                      title: meta.defaultTitle,
                      clauses: [...meta.defaultClauses],
                    });
                  }}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2.5 focus:border-amber-500 focus:outline-none min-h-[44px]"
                >
                  {Object.entries(LEGAL_PRESETS).map(([key, val]) => (
                    <option key={key} value={key}>
                      {val.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">عنوان العقد الرئيسي</label>
                <input
                  type="text"
                  required
                  value={contractForm.title}
                  onChange={(e) => setContractForm({ ...contractForm, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3.5 py-2.5 focus:border-amber-500 focus:outline-none min-h-[44px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">اسم الطرف الثاني *</label>
                  <input
                    type="text"
                    required
                    value={contractForm.partyName}
                    onChange={(e) => setContractForm({ ...contractForm, partyName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3.5 py-2.5 focus:border-amber-500 focus:outline-none min-h-[44px]"
                    placeholder={LEGAL_PRESETS[contractForm.type]?.partyPlaceholder || 'اسم الطرف الثاني'}
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">رقم هاتف الطرف الثاني</label>
                  <input
                    type="text"
                    value={contractForm.partyPhone}
                    onChange={(e) => setContractForm({ ...contractForm, partyPhone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3.5 py-2.5 font-mono focus:border-amber-500 focus:outline-none min-h-[44px]"
                    placeholder="01012345678"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">الرقم القومي (اختياري)</label>
                  <input
                    type="text"
                    value={contractForm.partyNationalId}
                    onChange={(e) => setContractForm({ ...contractForm, partyNationalId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3.5 py-2.5 font-mono focus:border-amber-500 focus:outline-none min-h-[44px]"
                    placeholder="2990101..."
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">مكان التنفيذ / الفعالية</label>
                  <input
                    type="text"
                    value={contractForm.location}
                    onChange={(e) => setContractForm({ ...contractForm, location: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3.5 py-2.5 focus:border-amber-500 focus:outline-none min-h-[44px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">إجمالي قيمة التعاقد (ج.م)</label>
                  <input
                    type="number"
                    value={contractForm.totalCost}
                    onChange={(e) => setContractForm({ ...contractForm, totalCost: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3.5 py-2.5 font-mono focus:border-amber-500 focus:outline-none min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">المبلغ المقدم / العربون (ج.م)</label>
                  <input
                    type="number"
                    value={contractForm.depositPaid}
                    onChange={(e) => setContractForm({ ...contractForm, depositPaid: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3.5 py-2.5 font-mono focus:border-amber-500 focus:outline-none min-h-[44px]"
                  />
                </div>
              </div>

              {/* Editable Clauses */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">بنود العقد القانونية (كل بند في سطر)</label>
                <textarea
                  rows={5}
                  value={contractForm.clauses.join('\n')}
                  onChange={(e) =>
                    setContractForm({
                      ...contractForm,
                      clauses: e.target.value.split('\n'),
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2.5 focus:border-amber-500 focus:outline-none leading-relaxed text-xs sm:text-sm"
                ></textarea>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsContractModalOpen(false)}
                  className="bg-slate-800 text-slate-300 font-semibold px-4 py-2.5 rounded-xl text-xs sm:text-sm min-h-[44px] flex items-center justify-center active:scale-95"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-6 py-2.5 rounded-xl text-xs sm:text-sm shadow-lg shadow-amber-500/20 min-h-[44px] flex items-center justify-center active:scale-95"
                >
                  <span className="hidden sm:inline">حفظ وتوليد العقد القانوني ✓</span>
                  <span className="sm:hidden">حفظ وتوليد العقد ✓</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {isReceiptModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 gap-2">
              <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2 truncate">
                <Receipt className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>إصدار سند قبض / إيصال جديد</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsReceiptModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition shrink-0"
                title="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveReceipt} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">نوع السند</label>
                <select
                  value={receiptForm.type}
                  onChange={(e) => setReceiptForm({ ...receiptForm, type: e.target.value as 'receipt' | 'payment' })}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2.5 focus:border-amber-500 focus:outline-none min-h-[44px]"
                >
                  <option value="receipt">إيصال استلام نقدية (من طالب / عميل)</option>
                  <option value="payment">إيصال صرف نقدية (لمورد / مشرف)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">اسم الشخص / الجهة *</label>
                <input
                  type="text"
                  required
                  value={receiptForm.personName}
                  onChange={(e) => setReceiptForm({ ...receiptForm, personName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3.5 py-2.5 focus:border-amber-500 focus:outline-none min-h-[44px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">المبلغ (ج.م)</label>
                  <input
                    type="number"
                    required
                    value={receiptForm.amount}
                    onChange={(e) => setReceiptForm({ ...receiptForm, amount: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3.5 py-2.5 font-mono focus:border-amber-500 focus:outline-none min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">طريقة السداد</label>
                  <select
                    value={receiptForm.paymentMethod}
                    onChange={(e) => setReceiptForm({ ...receiptForm, paymentMethod: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3.5 py-2.5 focus:border-amber-500 focus:outline-none min-h-[44px]"
                  >
                    <option value="vodafone_cash">فودافون كاش</option>
                    <option value="cash">كاش / نقدي</option>
                    <option value="instapay">InstaPay</option>
                    <option value="bank_transfer">تحويل بنكي</option>
                  </select>
                </div>
              </div>

              {/* Automatic Arabic Words Tafqit Preview */}
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs">
                <span className="text-slate-400 block text-[10px]">التفقيط الآلي بالمبلغ (بالكلمات):</span>
                <span className="text-emerald-400 font-bold">{numberToArabicWords(receiptForm.amount)}</span>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">سبب الاستلام / الصرف</label>
                <input
                  type="text"
                  value={receiptForm.reason}
                  onChange={(e) => setReceiptForm({ ...receiptForm, reason: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3.5 py-2.5 focus:border-amber-500 focus:outline-none min-h-[44px]"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsReceiptModalOpen(false)}
                  className="bg-slate-800 text-slate-300 font-semibold px-4 py-2.5 rounded-xl text-xs sm:text-sm min-h-[44px] flex items-center justify-center active:scale-95"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-2.5 rounded-xl text-xs sm:text-sm shadow-lg shadow-emerald-500/20 min-h-[44px] flex items-center justify-center active:scale-95"
                >
                  <span className="hidden sm:inline">حفظ وتوليد السند المالي ✓</span>
                  <span className="sm:hidden">حفظ السند ✓</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Deposit & Installment Modal */}
      {isStudentDepositModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                تحصيل عربون / قسط واحتساب المتبقي وتوليد الإيصال
              </h3>
              <button
                onClick={() => setIsStudentDepositModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-xl px-2 min-h-[36px] min-w-[36px] flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmStudentDeposit} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">اختر الطالب المستهدف *</label>
                <select
                  value={selectedStudentForDeposit?.id || ''}
                  onChange={(e) => {
                    const st = students.find((s) => s.id === e.target.value);
                    if (st) {
                      setSelectedStudentForDeposit(st);
                      const rem = Math.max(0, st.totalAmount - st.paidAmount);
                      setStudentDepositAmount(rem > 0 ? Math.min(500, rem) : st.totalAmount);
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2.5 focus:border-amber-500 focus:outline-none min-h-[44px]"
                >
                  {students.map((s) => {
                    const rem = Math.max(0, s.totalAmount - s.paidAmount);
                    return (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.ticketCode}) - المسدد: {s.paidAmount} ج.م | المتبقي: {rem} ج.م
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedStudentForDeposit && (
                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-1 font-mono text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>إجمالي سعر الرحلة:</span>
                    <strong className="text-amber-300 font-black">{selectedStudentForDeposit.totalAmount.toLocaleString()} ج.م</strong>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>المسدد سابقاً:</span>
                    <strong className="text-emerald-400 font-bold">{selectedStudentForDeposit.paidAmount.toLocaleString()} ج.م</strong>
                  </div>
                  <div className="flex justify-between text-slate-300 pt-1 border-t border-slate-900">
                    <span className="text-rose-400 font-sans font-bold">المتبقي حالياً (عرف باقي كام):</span>
                    <strong className="text-rose-400 font-black">
                      {Math.max(0, selectedStudentForDeposit.totalAmount - selectedStudentForDeposit.paidAmount).toLocaleString()} ج.م
                    </strong>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">مبلغ العربون / القسط المدفوع (ج.م) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={studentDepositAmount}
                    onChange={(e) => setStudentDepositAmount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3.5 py-2.5 font-mono font-bold text-amber-400 focus:border-amber-500 focus:outline-none min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">طريقة الدفع</label>
                  <select
                    value={studentDepositMethod}
                    onChange={(e) => setStudentDepositMethod(e.target.value as PaymentMethod)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3.5 py-2.5 focus:border-amber-500 focus:outline-none min-h-[44px]"
                  >
                    <option value="cash">كاش / نقدي 💵</option>
                    <option value="vodafone_cash">فودافون كاش 📱</option>
                    <option value="instapay">InstaPay 💳</option>
                    <option value="bank_transfer">تحويل بنكي 🏛️</option>
                  </select>
                </div>
              </div>

              {/* Live Remaining Balance After This Payment */}
              {selectedStudentForDeposit && (
                <div className="bg-emerald-950/40 p-3 rounded-xl border border-emerald-500/30 text-xs flex justify-between items-center">
                  <span className="text-emerald-300 font-semibold">المتبقي على الطالب بعد هذا السداد:</span>
                  <strong className="text-amber-300 font-mono font-black text-sm">
                    {Math.max(0, selectedStudentForDeposit.totalAmount - (selectedStudentForDeposit.paidAmount + studentDepositAmount)).toLocaleString()} ج.م
                  </strong>
                </div>
              )}

              {/* Automatic Arabic Words Tafqit Preview */}
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs">
                <span className="text-slate-400 block text-[10px]">التفقيط الآلي للمبلغ بالكلمات:</span>
                <span className="text-emerald-400 font-bold">{numberToArabicWords(studentDepositAmount)}</span>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">اسم المحصل / المحاسب المسؤول</label>
                <input
                  type="text"
                  value={studentDepositSupervisor}
                  onChange={(e) => setStudentDepositSupervisor(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3.5 py-2.5 focus:border-amber-500 focus:outline-none min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">ملاحظات الإيصال / سبب التحصيل</label>
                <input
                  type="text"
                  value={studentDepositNotes}
                  onChange={(e) => setStudentDepositNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3.5 py-2.5 focus:border-amber-500 focus:outline-none min-h-[44px]"
                  placeholder="مثال: عربون حجز رحلة رأس سدر شامل الإقامة والأنشطة"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsStudentDepositModalOpen(false)}
                  className="bg-slate-800 text-slate-300 font-semibold px-4 py-2.5 rounded-xl text-xs sm:text-sm min-h-[44px] flex items-center justify-center active:scale-95"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-2.5 rounded-xl text-xs sm:text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5 min-h-[44px] active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">اعتماد التحصيل واستخراج إيصال القبض</span>
                  <span className="sm:hidden">اعتماد التحصيل والإيصال ✓</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Contract Confirmation Modal */}
      {contractToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-500" />
                تأكيد حذف العقد
              </h3>
              <button onClick={() => setContractToDelete(null)} className="text-slate-400 hover:text-white min-h-[36px] min-w-[36px] flex items-center justify-center font-bold">✕</button>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              هل أنت متأكد من حذف العقد <strong className="text-amber-400">{contractToDelete.title}</strong> الخاص بالمتعاقد <span className="text-white font-bold">{contractToDelete.partyName}</span>؟
            </p>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setContractToDelete(null)}
                className="bg-slate-800 text-slate-300 font-semibold px-4 py-2.5 rounded-xl text-xs sm:text-sm min-h-[44px] flex items-center justify-center"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteContract) onDeleteContract(contractToDelete.id);
                  setContractToDelete(null);
                }}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm shadow-lg shadow-rose-600/20 min-h-[44px] flex items-center justify-center"
              >
                نعم، حذف العقد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Receipt Confirmation Modal */}
      {receiptToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-500" />
                تأكيد حذف الإيصال
              </h3>
              <button onClick={() => setReceiptToDelete(null)} className="text-slate-400 hover:text-white min-h-[36px] min-w-[36px] flex items-center justify-center font-bold">✕</button>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              هل أنت متأكد من حذف السند رقم <strong className="text-amber-400 font-mono">{receiptToDelete.voucherNumber}</strong> بمبلغ <span className="text-emerald-400 font-mono font-bold">{receiptToDelete.amount.toLocaleString()} ج.م</span>؟
            </p>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setReceiptToDelete(null)}
                className="bg-slate-800 text-slate-300 font-semibold px-4 py-2.5 rounded-xl text-xs sm:text-sm min-h-[44px] flex items-center justify-center"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteReceipt) onDeleteReceipt(receiptToDelete.id);
                  setReceiptToDelete(null);
                }}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm shadow-lg shadow-rose-600/20 min-h-[44px] flex items-center justify-center"
              >
                نعم، حذف السند
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

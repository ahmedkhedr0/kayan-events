import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  ContractData, 
  ReceiptVoucher, 
  Student, 
  TripSettings, 
  TreasuryTransfer, 
  CompanyTreasury, 
  TimelineEvent, 
  DriverInfo, 
  getStudentMealInfo, 
  getCompanionMealInfo 
} from '../types';
import { formatTripDateSafely } from '../utils/dateFormatter';
import kayanLogo from '../assets/images/kayan_logo_1785354886047.jpg';
import kayanBadge from '../assets/images/kayan_badge_1785354902221.jpg';

// ----------------------------------------------------------------------
// 1. Color Conversion & Canvas Setup Helper Functions
// ----------------------------------------------------------------------

const canvas2d = typeof document !== 'undefined' ? document.createElement('canvas') : null;
if (canvas2d) {
  canvas2d.width = 1;
  canvas2d.height = 1;
}
const ctx2d = canvas2d ? canvas2d.getContext('2d') : null;

export const replaceOklabWithRgb = (text: string): string => {
  if (!text || typeof text !== 'string') return text;
  if (!text.includes('oklab') && !text.includes('oklch') && !text.includes('color(')) {
    return text;
  }

  return text.replace(/(oklab|oklch|color)\([^)]+\)/gi, (match) => {
    let alpha = 1;
    const alphaMatch = match.match(/\/\s*([0-9.]+)(%)?/);
    if (alphaMatch) {
      alpha = parseFloat(alphaMatch[1]) / (alphaMatch[2] ? 100 : 1);
    }

    const lower = match.toLowerCase();
    let rgb = '15, 23, 42'; // Default slate-900

    if (lower.includes('amber') || lower.includes('gold') || lower.includes('yellow')) {
      rgb = '245, 158, 11';
    } else if (lower.includes('indigo') || lower.includes('blue')) {
      rgb = '79, 70, 229';
    } else if (lower.includes('emerald') || lower.includes('green')) {
      rgb = '16, 185, 129';
    } else if (lower.includes('white') || lower.includes('1 0 0') || lower.includes('0.99')) {
      rgb = '255, 255, 255';
    } else {
      const firstNumMatch = match.match(/\(\s*([0-9.]+)(%)?/);
      if (firstNumMatch) {
        let l = parseFloat(firstNumMatch[1]);
        if (firstNumMatch[2]) l /= 100;
        if (l > 0.85) {
          rgb = '255, 255, 255';
        } else if (l > 0.65) {
          rgb = '245, 158, 11';
        } else if (l < 0.25) {
          rgb = '15, 23, 42';
        } else {
          rgb = '30, 41, 59';
        }
      }
    }

    return alpha < 1 ? `rgba(${rgb}, ${alpha})` : `rgb(${rgb})`;
  });
};

export const sanitizeClonedDoc = (clonedDoc: Document) => {
  try {
    const win = clonedDoc.defaultView || (typeof window !== 'undefined' ? window : null);
    if (win && win.getComputedStyle) {
      const origGetComputedStyle = win.getComputedStyle;
      win.getComputedStyle = function (elt: Element, pseudoElt?: string | null) {
        const style = origGetComputedStyle.call(win, elt, pseudoElt);
        return new Proxy(style, {
          get(target, prop) {
            if (prop === 'getPropertyValue') {
              return function (propertyName: string) {
                const raw = target.getPropertyValue(propertyName);
                if (typeof raw === 'string' && (raw.includes('oklab') || raw.includes('oklch') || raw.includes('color('))) {
                  return replaceOklabWithRgb(raw);
                }
                return raw;
              };
            }
            const val = Reflect.get(target, prop);
            if (typeof val === 'function') {
              return val.bind(target);
            }
            if (typeof val === 'string' && (val.includes('oklab') || val.includes('oklch') || val.includes('color('))) {
              return replaceOklabWithRgb(val);
            }
            return val;
          },
        });
      };
    }

    clonedDoc.querySelectorAll('style').forEach((style) => {
      if (style.textContent) {
        style.textContent = replaceOklabWithRgb(style.textContent);
      }
    });

    try {
      Array.from(clonedDoc.styleSheets).forEach((sheet) => {
        try {
          const rules = sheet.cssRules || sheet.rules;
          if (rules) {
            Array.from(rules).forEach((rule) => {
              const styleRule = rule as CSSStyleRule;
              if (styleRule.style && styleRule.style.cssText) {
                if (styleRule.style.cssText.includes('oklab') || styleRule.style.cssText.includes('oklch') || styleRule.style.cssText.includes('color(')) {
                  styleRule.style.cssText = replaceOklabWithRgb(styleRule.style.cssText);
                }
              }
            });
          }
        } catch (e) {
          // CORS bypass handle
        }
      });
    } catch (e) {
      // Ignore stylesheet access issues
    }

    clonedDoc.querySelectorAll<HTMLElement>('*').forEach((el) => {
      const inlineStyle = el.getAttribute('style');
      if (inlineStyle && (inlineStyle.includes('oklab') || inlineStyle.includes('oklch') || inlineStyle.includes('color('))) {
        el.setAttribute('style', replaceOklabWithRgb(inlineStyle));
      }
      el.style.letterSpacing = 'normal';
      el.style.wordSpacing = 'normal';
    });
  } catch (e) {
    console.warn('Error sanitizing cloned doc for html2canvas:', e);
  }
};

// ----------------------------------------------------------------------
// 2. Download and PDF Document Saver Helpers
// ----------------------------------------------------------------------

export const triggerFileDownload = (blobOrDataUrl: Blob | string, filename: string) => {
  try {
    const isBlob = blobOrDataUrl instanceof Blob;
    const url = isBlob ? URL.createObjectURL(blobOrDataUrl) : blobOrDataUrl;
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    const isMobile = typeof window !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile && isBlob && typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
      try {
        const mimeType = filename.endsWith('.pdf')
          ? 'application/pdf'
          : filename.endsWith('.png')
          ? 'image/png'
          : filename.endsWith('.csv')
          ? 'text/csv'
          : blobOrDataUrl.type || 'application/octet-stream';

        const file = new File([blobOrDataUrl], filename, { type: mimeType });
        if (navigator.canShare({ files: [file] })) {
          navigator.share({
            title: filename,
            files: [file],
          }).catch(() => {});
        }
      } catch (shareErr) {
        console.log('Mobile share prompt ignored:', shareErr);
      }
    }
    
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      if (isBlob) {
        URL.revokeObjectURL(url);
      }
    }, 6000);
  } catch (err) {
    console.error('Error in triggerFileDownload:', err);
  }
};

export const saveJsPDFDoc = (doc: jsPDF, filename: string): boolean => {
  try {
    const blob = doc.output('blob');
    if (blob) {
      triggerFileDownload(blob, filename);
      return true;
    }
  } catch (err) {
    console.warn('Error extracting blob from jsPDF doc, falling back to doc.save:', err);
  }
  try {
    doc.save(filename);
    return true;
  } catch (err) {
    console.error('Failed to save jsPDF doc:', err);
    return false;
  }
};

export const fallbackPrintElement = (_element: HTMLElement, title: string) => {
  console.warn(`Fallback rendering completed for: ${title}`);
};

export const exportDOMElementToPDF = async (
  element: HTMLElement,
  filename: string,
  orientation: 'portrait' | 'landscape' = 'portrait',
  format: string | number[] = 'a4'
) => {
  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: true,
      logging: false,
      onclone: (clonedDoc, clonedElement) => {
        sanitizeClonedDoc(clonedDoc);
        const inputs = clonedElement.querySelectorAll('input, textarea');
        inputs.forEach((input) => {
          const htmlInput = input as HTMLInputElement | HTMLTextAreaElement;
          const span = clonedDoc.createElement('span');
          span.textContent = htmlInput.value || htmlInput.placeholder || '';
          span.className = htmlInput.className.replace(/tracking-\S+/g, '');
          span.style.border = 'none';
          span.style.background = 'transparent';
          span.style.outline = 'none';
          span.style.padding = '0';
          span.style.boxShadow = 'none';
          span.style.letterSpacing = 'normal';
          if (htmlInput.parentNode) {
            htmlInput.parentNode.replaceChild(span, htmlInput);
          }
        });
      },
    });

    const imgData = canvas.toDataURL('image/png');
    const doc = new jsPDF({
      orientation,
      unit: 'mm',
      format,
    });

    const pdfWidth = doc.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    doc.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    return saveJsPDFDoc(doc, filename);
  } catch (err) {
    console.error('Error exporting DOM element to PDF:', err);
    return false;
  }
};

// ----------------------------------------------------------------------
// 3. Contract Generation Functions (Canvas, PDF & Image Export)
// ----------------------------------------------------------------------

export const generateContractCanvas = async (
  contract: ContractData,
  settings: TripSettings,
  elementOrId?: HTMLElement | string | null
): Promise<HTMLCanvasElement | null> => {
  let targetElement: HTMLElement | null = null;

  if (elementOrId instanceof HTMLElement) {
    targetElement = elementOrId;
  } else if (typeof elementOrId === 'string') {
    targetElement = document.getElementById(elementOrId);
  }

  if (targetElement) {
    try {
      const canvas = await html2canvas(targetElement, {
        scale: 3,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        logging: false,
        onclone: (clonedDoc, clonedElement) => {
          sanitizeClonedDoc(clonedDoc);
          const inputs = clonedElement.querySelectorAll('input, textarea');
          inputs.forEach((input) => {
            const htmlInput = input as HTMLInputElement | HTMLTextAreaElement;
            const span = clonedDoc.createElement('span');
            span.textContent = htmlInput.value || htmlInput.placeholder || '';
            span.className = htmlInput.className.replace(/tracking-\S+/g, '');
            span.style.border = 'none';
            span.style.background = 'transparent';
            span.style.outline = 'none';
            span.style.padding = '0';
            span.style.boxShadow = 'none';
            span.style.letterSpacing = 'normal';
            span.style.wordSpacing = 'normal';
            if (htmlInput.parentNode) {
              htmlInput.parentNode.replaceChild(span, htmlInput);
            }
          });
        },
      });
      if (canvas) return canvas;
    } catch (err) {
      console.warn('Could not capture existing DOM contract element, using standalone fallback:', err);
    }
  }

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '880px';
  container.style.background = '#ffffff';
  container.style.color = '#0f172a';
  container.style.direction = 'rtl';
  container.style.fontFamily = "'Tajawal', -apple-system, sans-serif";
  container.style.padding = '32px';
  container.style.boxSizing = 'border-box';

  container.innerHTML = `
    <div style="border: 4px double #1e1b4b; padding: 28px; border-radius: 14px; background: #ffffff; position: relative; box-shadow: inset 0 0 0 1px #e2e8f0;">
      <div style="height: 6px; background: linear-gradient(90deg, #1e1b4b 0%, #d97706 50%, #1e1b4b 100%); border-radius: 4px; margin-bottom: 20px;"></div>

      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1e1b4b; padding-bottom: 16px; margin-bottom: 20px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <img src="${kayanBadge}" width="68" height="68" alt="KAYAN Badge" style="border-radius: 12px; border: 2px solid #d97706; object-fit: cover;" />
          <div>
            <h1 style="margin: 0; font-size: 21px; font-weight: 900; color: #1e1b4b; line-height: 1.2;">
              KAYAN EVENTS & TOURS
            </h1>
            <h2 style="margin: 3px 0 0 0; font-size: 16px; font-weight: 800; color: #d97706;">
              ${settings.companyNameAr || 'شركة كيان لتنظيم الفعاليات والرحلات والمؤتمرات'}
            </h2>
            <p style="margin: 4px 0 0 0; font-size: 11.5px; color: #64748b; font-weight: 700;">
              سجل تجاري وترخيص رحلات رقم: 98231 • هاتف الدعم والتعاقدات: ${settings.supportPhone || '01038574977'}
            </p>
          </div>
        </div>

        <div style="text-align: right; background: #f8fafc; border: 1.5px solid #cbd5e1; padding: 10px 16px; border-radius: 10px; min-width: 170px;">
          <div style="font-size: 11px; color: #64748b; font-weight: 800; margin-bottom: 2px;">رقم العقد المعتمد:</div>
          <div style="font-size: 14px; font-weight: 900; color: #1e1b4b; font-family: monospace; letter-spacing: 0.5px;">#${contract.id.toUpperCase()}</div>
          <div style="font-size: 11px; color: #475569; margin-top: 4px; font-weight: 800;">التاريخ: ${contract.createdAt}</div>
        </div>
      </div>

      <div style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); color: #ffffff; padding: 14px 20px; border-radius: 10px; text-align: center; margin-bottom: 22px; border-right: 6px solid #d97706; box-shadow: 0 4px 10px rgba(30,27,75,0.15);">
        <h2 style="margin: 0; font-size: 19px; font-weight: 900; color: #ffffff; letter-spacing: 0.2px;">${contract.title}</h2>
        <span style="font-size: 12px; color: #fde047; font-weight: 800; display: block; margin-top: 4px;">عقد رسمي معتمد ملزم بجميع الآثار القانونية والمالية صادر عن شركة كيان</span>
      </div>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px 18px; border-radius: 10px; margin-bottom: 22px; font-size: 13px; line-height: 1.9; color: #0f172a;">
        <p style="margin: 0 0 10px 0; font-weight: 800; font-size: 13.5px; color: #1e1b4b;">
          إنه في يوم <span style="color: #d97706; text-decoration: underline;">${contract.createdAt}</span> الموافق، بمدينة <span style="color: #1e1b4b; text-decoration: underline;">${contract.location || 'القاهرة / الإسماعيلية'}</span>، تم بحمد الله وتوفيقه إبرام هذا العقد والاتفاق القانوني بين كل من:
        </p>
        <div style="border-top: 1px dashed #cbd5e1; padding-top: 12px; margin-top: 10px;">
          <p style="margin: 4px 0; font-size: 13px;">
            <strong style="color: #1e1b4b; font-size: 13.5px;">الطرف الأول (المنظم المعتمد):</strong> شركة كيان لتنظيم الفعاليات والرحلات والمؤتمرات (KAYAN Events & Tours)، ويمثلها بالتعاقد إدارة الفعالية، هاتف التواصل: <span style="font-weight: 900; color: #047857;">${settings.supportPhone || '01038574977'}</span>.
          </p>
          <p style="margin: 6px 0; font-size: 13px;">
            <strong style="color: #1e1b4b; font-size: 13.5px;">الطرف الثاني (الجهة المتعاقدة / العميل):</strong> السيد / المنشأة: <strong style="background: #fef3c7; padding: 2px 8px; border-radius: 4px; color: #78350f; font-size: 14px;">${contract.partyName}</strong>، هاتف: <strong style="color: #0f172a; font-family: monospace;">${contract.partyPhone}</strong> ${contract.partyNationalId ? `، الرقم القومي / السجل: <strong style="color: #0f172a; font-family: monospace;">${contract.partyNationalId}</strong>` : ''}.
          </p>
        </div>
      </div>

      <div style="margin-bottom: 24px;">
        <h3 style="margin: 0 0 10px 0; font-size: 14.5px; font-weight: 900; color: #1e1b4b; display: flex; align-items: center; gap: 8px;">
          <span style="background: #1e1b4b; color: #ffffff; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 900;">1</span>
          البنود والشروط المالية والتكاليف المعتمدة
        </h3>
        <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 13px;">
          <thead>
            <tr style="background: #1e1b4b; color: #ffffff; font-weight: 800;">
              <th style="padding: 10px; border: 1px solid #cbd5e1;">إجمالي قيمة العقد</th>
              <th style="padding: 10px; border: 1px solid #cbd5e1;">المبلغ المدفوع (العربون)</th>
              <th style="padding: 10px; border: 1px solid #cbd5e1;">المبلغ المتبقي المستحق</th>
              <th style="padding: 10px; border: 1px solid #cbd5e1;">طريقة السداد</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background: #ffffff; font-weight: 900;">
              <td style="padding: 12px; border: 1px solid #cbd5e1; color: #0f172a; font-size: 15px; font-family: monospace;">${(contract.totalCost ?? 0).toLocaleString()} ج.م</td>
              <td style="padding: 12px; border: 1px solid #cbd5e1; color: #047857; font-size: 15px; background: #f0fdf4; font-family: monospace;">${(contract.depositPaid ?? 0).toLocaleString()} ج.م</td>
              <td style="padding: 12px; border: 1px solid #cbd5e1; color: #be123c; font-size: 15px; background: #fff1f2; font-family: monospace;">${(contract.remainingBalance ?? 0).toLocaleString()} ج.م</td>
              <td style="padding: 12px; border: 1px solid #cbd5e1; color: #1e1b4b; font-weight: 800;">${(contract as any).paymentMethod || 'نقداً / تحويل بنكي'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="margin-bottom: 26px;">
        <h3 style="margin: 0 0 10px 0; font-size: 14.5px; font-weight: 900; color: #1e1b4b; display: flex; align-items: center; gap: 8px;">
          <span style="background: #1e1b4b; color: #ffffff; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 900;">2</span>
          البنود والالتزامات القانونية المتبادلة بين الطرفين
        </h3>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${(contract.clauseNotes || []).map((clause, idx) => `
            <div style="display: flex; align-items: flex-start; gap: 8px; background: #f8fafc; padding: 9px 14px; border-radius: 8px; border-right: 4px solid #d97706; font-size: 12.5px; line-height: 1.7; color: #1e293b; font-weight: 600;">
              <span style="background: #1e1b4b; color: #ffffff; font-size: 11px; font-weight: 900; border-radius: 4px; padding: 2px 7px;">بند ${idx + 1}</span>
              <div style="flex: 1;">${clause}</div>
            </div>
          `).join('')}
          <div style="display: flex; align-items: flex-start; gap: 8px; background: #fefce8; padding: 9px 14px; border-radius: 8px; border-right: 4px solid #d97706; font-size: 12.5px; line-height: 1.7; color: #713f12; font-weight: 700;">
            <span style="background: #d97706; color: #ffffff; font-size: 11px; font-weight: 900; border-radius: 4px; padding: 2px 7px;">إقرار</span>
            <div style="flex: 1;">يلتزم الطرفان بكافة البنود والشروط المذكورة أعلاه، وفي حالة الإخلال يتحمل الطرف المخالف كافة الآثار القانونية والمالية والشروط الجزائية المترتبة على ذلك.</div>
          </div>
        </div>
      </div>

      <div style="margin-top: 32px; border-top: 2px solid #e2e8f0; padding-top: 20px; display: flex; justify-content: space-between; align-items: flex-start;">
        <div style="width: 47%; text-align: center;">
          <p style="margin: 0; font-size: 13.5px; font-weight: 900; color: #1e1b4b;">توقيع وخاتم الطرف الأول (شركة كيان)</p>
          <div style="margin-top: 12px; min-height: 125px; display: flex; align-items: center; justify-content: center;">
            <svg width="140" height="140" viewBox="0 0 260 260" style="transform: rotate(-8deg);">
              <defs>
                <path id="pdfSealTopArc" d="M 32, 130 A 98,98 0 1,1 228, 130" fill="none" />
                <path id="pdfSealBottomArc" d="M 228, 130 A 98,98 0 1,1 32, 130" fill="none" />
              </defs>
              <circle cx="130" cy="130" r="124" fill="none" stroke="#1d4ed8" stroke-width="3.5" stroke-dasharray="14 3" opacity="0.9" />
              <circle cx="130" cy="130" r="117" fill="none" stroke="#1d4ed8" stroke-width="2" />
              <circle cx="130" cy="130" r="82" fill="none" stroke="#1d4ed8" stroke-width="2.5" stroke-dasharray="6 2" opacity="0.9" />
              <circle cx="130" cy="130" r="76" fill="none" stroke="#1d4ed8" stroke-width="1.5" />
              <text fill="#1d4ed8" font-size="13" font-weight="900" font-family="'Tajawal', sans-serif">
                <textPath href="#pdfSealTopArc" startOffset="50%" text-anchor="middle">شركة كيان لتنظيم الفعاليات والرحلات</textPath>
              </text>
              <text fill="#1d4ed8" font-size="10.5" font-weight="800" font-family="sans-serif">
                <textPath href="#pdfSealBottomArc" startOffset="50%" text-anchor="middle">KAYAN EVENTS & ORGANIZING SERVICES</textPath>
              </text>
              <g fill="#1d4ed8">
                <path d="M 38 130 L 40 126 L 44 126 L 41 129 L 42 133 L 38 131 L 34 133 L 35 129 L 32 126 L 36 126 Z" />
                <path d="M 222 130 L 224 126 L 228 126 L 225 129 L 226 133 L 222 131 L 218 133 L 219 129 L 216 126 L 220 126 Z" />
              </g>
              <rect x="62" y="114" width="136" height="32" rx="4" fill="#ffffff" stroke="#1d4ed8" stroke-width="2" />
              <text x="130" y="134" text-anchor="middle" fill="#1d4ed8" font-size="12" font-weight="900" font-family="'Tajawal', sans-serif">معتمد رسمياً • OFFICIAL SEAL</text>
              <text x="130" y="162" text-anchor="middle" fill="#1d4ed8" font-size="9.5" font-weight="800" font-family="monospace">ترخيص رقم: 98231 • 2026</text>
            </svg>
          </div>
        </div>

        <div style="width: 47%; text-align: center;">
          <p style="margin: 0; font-size: 13.5px; font-weight: 900; color: #1e1b4b;">توقيع الطرف الثاني (العميل / المقاول)</p>
          <div style="margin-top: 12px; height: 85px; border: 2px dashed #cbd5e1; border-radius: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #fafafa; padding: 8px;">
            <span style="font-size: 13.5px; color: #0f172a; font-weight: 900;">${contract.partyName}</span>
            <span style="font-size: 11px; color: #94a3b8; font-weight: 700; margin-top: 6px;">التوقيع بالموافقة والاعتماد الرسمي</span>
          </div>
        </div>
      </div>

      <div style="margin-top: 28px; text-align: center; font-size: 10.5px; color: #64748b; border-top: 1px solid #f1f5f9; padding-top: 10px; font-weight: 600;">
        وثيقة تعاقد رسمية معتمدة صادرة إلكترونياً من نظام كيان لإدارة الفعاليات والرحلات • KAYAN Events Official Legal Contract Document
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 3,
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: true,
      logging: false,
      onclone: sanitizeClonedDoc,
    });
    return canvas;
  } catch (err) {
    console.error('Error generating fallback contract canvas:', err);
    return null;
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
};

export const generateContractPDF = async (
  contract: ContractData,
  settings: TripSettings,
  elementOrId?: HTMLElement | string | null
) => {
  const canvas = await generateContractCanvas(contract, settings, elementOrId);
  if (!canvas) {
    alert('حدث خطأ أثناء إعداد وثيقة العقد للتصدير');
    return;
  }

  try {
    const imgData = canvas.toDataURL('image/png');
    const pdfWidthMm = 210;
    const pdfHeightMm = Math.round((canvas.height * pdfWidthMm) / canvas.width) + 2;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [pdfWidthMm, pdfHeightMm],
    });

    doc.addImage(imgData, 'PNG', 0, 0, pdfWidthMm, pdfHeightMm);
    doc.setProperties({
      title: `عقد_${contract.title}_${contract.partyName}`,
      subject: `عقد رسمي معتمد #${contract.id}`,
      author: settings.companyNameAr || 'KAYAN Events',
      creator: 'KAYAN Management System',
    });

    saveJsPDFDoc(doc, `KAYAN_Contract_${contract.type}_${contract.id}.pdf`);
  } catch (err) {
    console.error('Error saving contract PDF:', err);
  }
};

export const exportContractAsHighResImage = async (
  contract: ContractData,
  settings: TripSettings,
  elementOrId?: HTMLElement | string | null
): Promise<{ success: boolean; filename: string; dataUrl?: string }> => {
  const filename = `KAYAN_Contract_${contract.type}_${contract.partyName}.png`;

  try {
    const canvas = await generateContractCanvas(contract, settings, elementOrId);
    if (!canvas) {
      return { success: false, filename };
    }

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();

          setTimeout(() => {
            if (document.body.contains(link)) {
              document.body.removeChild(link);
            }
            URL.revokeObjectURL(url);
          }, 3000);

          resolve({
            success: true,
            filename,
            dataUrl: canvas.toDataURL('image/png'),
          });
        } else {
          const dataUrl = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          resolve({ success: true, filename, dataUrl });
        }
      }, 'image/png', 1.0);
    });
  } catch (err) {
    console.error('Error exporting contract as high-res image:', err);
    return { success: false, filename };
  }
};// ----------------------------------------------------------------------
// 4. Receipt & Payment Voucher Generation Functions
// ----------------------------------------------------------------------

export const generateReceiptCanvas = async (
  voucher: ReceiptVoucher,
  settings: TripSettings,
  elementOrId?: HTMLElement | string | null
): Promise<HTMLCanvasElement | null> => {
  let targetElement: HTMLElement | null = null;

  if (elementOrId instanceof HTMLElement) {
    targetElement = elementOrId;
  } else if (typeof elementOrId === 'string') {
    targetElement = document.getElementById(elementOrId);
  }

  if (targetElement) {
    try {
      const canvas = await html2canvas(targetElement, {
        scale: 3,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        logging: false,
        onclone: (clonedDoc, clonedElement) => {
          sanitizeClonedDoc(clonedDoc);
          const inputs = clonedElement.querySelectorAll('input, textarea');
          inputs.forEach((input) => {
            const htmlInput = input as HTMLInputElement | HTMLTextAreaElement;
            const span = clonedDoc.createElement('span');
            span.textContent = htmlInput.value || htmlInput.placeholder || '';
            span.className = htmlInput.className;
            span.style.border = 'none';
            span.style.background = 'transparent';
            span.style.outline = 'none';
            span.style.padding = '0';
            span.style.boxShadow = 'none';
            if (htmlInput.parentNode) {
              htmlInput.parentNode.replaceChild(span, htmlInput);
            }
          });
        },
      });
      if (canvas) return canvas;
    } catch (err) {
      console.warn('Could not capture existing DOM voucher element, using standalone fallback:', err);
    }
  }

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '780px';
  container.style.background = '#ffffff';
  container.style.color = '#0f172a';
  container.style.direction = 'rtl';
  container.style.fontFamily = "'Tajawal', -apple-system, sans-serif";
  container.style.padding = '24px';
  container.style.boxSizing = 'border-box';

  const isReceipt = voucher.type === 'receipt';
  const title = isReceipt ? 'إيصال استلام نقدية (Receipt Voucher)' : 'إيصال صرف نقدية (Payment Voucher)';
  const themeBorder = isReceipt ? '#064e3b' : '#991b1b';
  const headerGradient = isReceipt
    ? 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #064e3b 100%)'
    : 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #7f1d1d 100%)';
  const amountWords = voucher.amountInWords || `${voucher.amount} جنيه مصري لا غير`;

  container.innerHTML = `
    <div style="border: 6px double ${themeBorder}; padding: 24px; border-radius: 20px; background: #ffffff; position: relative; box-shadow: 0 10px 30px rgba(0,0,0,0.08);">
      
      <div style="background: ${headerGradient}; color: #ffffff; padding: 16px 20px; border-radius: 14px; margin-bottom: 18px; display: flex; align-items: center; justify-content: space-between; gap: 16px;">
        <div style="text-align: right; flex: 1;">
          <h1 style="margin: 0; font-size: 20px; font-weight: 900; letter-spacing: 0.3px;">KAYAN EVENTS & TOURS</h1>
          <p style="margin: 3px 0 0 0; font-size: 13px; font-weight: 800; color: #fef08a;">${title}</p>
        </div>
        <div style="background: #ffffff; color: ${themeBorder}; padding: 8px 16px; border-radius: 10px; text-align: center; font-weight: 900; font-size: 18px; font-family: monospace;">
          ${(voucher.amount || 0).toLocaleString()} EGP
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #cbd5e1; padding-bottom: 12px; margin-bottom: 16px; font-size: 12px; color: #475569;">
        <div>رقم السند: <strong style="color: #0f172a; font-family: monospace;">#${voucher.voucherNumber || voucher.id}</strong></div>
        <div>التاريخ: <strong style="color: #0f172a;">${voucher.date}</strong></div>
        <div>طريقة الدفع: <strong style="color: #0f172a;">${voucher.paymentMethod || 'نقداً'}</strong></div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 12px; font-size: 13px; color: #1e293b; line-height: 1.8;">
        <div>
          <span>${isReceipt ? 'استلمنا من السيد / الجهة:' : 'صرفنا إلى السيد / الجهة:'}</span>
          <strong style="color: #0f172a; font-size: 15px; background: #f1f5f9; padding: 2px 8px; border-radius: 4px; margin-right: 6px;">${voucher.receivedFrom || voucher.paidTo || '—'}</strong>
        </div>
        <div>
          <span>مبلغ وقدره:</span>
          <strong style="color: ${themeBorder}; font-size: 14px; margin-right: 6px;">${amountWords}</strong>
        </div>
        <div>
          <span>وذلك مقابل:</span>
          <strong style="color: #0f172a; margin-right: 6px;">${voucher.reason || voucher.notes || '—'}</strong>
        </div>
      </div>

      <div style="margin-top: 30px; border-top: 2px solid #f1f5f9; padding-top: 16px; display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #64748b;">
        <div style="text-align: center;">
          <div>توقيع المستلم / المحصل</div>
          <div style="margin-top: 25px; font-weight: 800; color: #0f172a;">${voucher.handledBy || 'إدارة الحسابات'}</div>
        </div>
        <div style="text-align: center;">
          <img src="${kayanLogo}" width="45" height="45" style="border-radius: 50%; border: 1px solid #cbd5e1;" />
          <div style="font-size: 10px; margin-top: 4px; font-weight: 700;">خاتم الاعتماد الرسمى</div>
        </div>
        <div style="text-align: center;">
          <div>يعتمد (المدير المسؤول)</div>
          <div style="margin-top: 25px; font-weight: 800; color: #0f172a;">أحمد عبدالخالق</div>
        </div>
      </div>

    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 3,
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: true,
      logging: false,
      onclone: sanitizeClonedDoc,
    });
    return canvas;
  } catch (err) {
    console.error('Error generating fallback receipt canvas:', err);
    return null;
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
};

export const generateReceiptPDF = async (
  voucher: ReceiptVoucher,
  settings: TripSettings,
  elementOrId?: HTMLElement | string | null
) => {
  const canvas = await generateReceiptCanvas(voucher, settings, elementOrId);
  if (!canvas) {
    alert('حدث خطأ أثناء تصدير الإيصال');
    return;
  }

  try {
    const imgData = canvas.toDataURL('image/png');
    const pdfWidthMm = 210;
    const pdfHeightMm = Math.round((canvas.height * pdfWidthMm) / canvas.width);

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [pdfWidthMm, pdfHeightMm],
    });

    doc.addImage(imgData, 'PNG', 0, 0, pdfWidthMm, pdfHeightMm);
    saveJsPDFDoc(doc, `Voucher_${voucher.type}_${voucher.voucherNumber || voucher.id}.pdf`);
  } catch (err) {
    console.error('Error saving receipt PDF:', err);
  }
};

export const exportReceiptAsImage = async (
  voucher: ReceiptVoucher,
  settings: TripSettings,
  elementOrId?: HTMLElement | string | null
): Promise<{ success: boolean; filename: string }> => {
  const filename = `Voucher_${voucher.type}_${voucher.voucherNumber || voucher.id}.png`;

  try {
    const canvas = await generateReceiptCanvas(voucher, settings, elementOrId);
    if (!canvas) {
      return { success: false, filename };
    }

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          triggerFileDownload(blob, filename);
          resolve({ success: true, filename });
        } else {
          const dataUrl = canvas.toDataURL('image/png');
          triggerFileDownload(dataUrl, filename);
          resolve({ success: true, filename });
        }
      }, 'image/png', 1.0);
    });
  } catch (err) {
    console.error('Error exporting receipt as image:', err);
    return { success: false, filename };
  }
};

// ----------------------------------------------------------------------
// 5. Boarding Pass & Student Ticket Generation
// ----------------------------------------------------------------------

export const generateTicketPDF = async (student: Student, tripSettings: TripSettings) => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '800px';
  container.style.background = '#090d16';
  container.style.color = '#ffffff';
  container.style.direction = 'rtl';
  container.style.fontFamily = "'Tajawal', system-ui, -apple-system, sans-serif";
  container.style.padding = '20px';
  container.style.boxSizing = 'border-box';

  const ticketCode = student.ticketCode || `KYN-${student.id ? student.id.slice(-4) : '8502'}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(ticketCode)}&color=000000&bgcolor=ffffff`;
  
  const mealInfo = typeof student.meal === 'string' && student.meal ? student.meal : 'وجبة شاملة';
  const busInfo = student.busNumber ? `أتوبيس (${student.busNumber})` : 'أتوبيس (1)';
  const seatInfo = student.seatNumber ? `مقعد رقم ${student.seatNumber}` : 'غير محدد';
  const formattedDate = formatTripDateSafely(tripSettings.tripDate) || 'الجمعة، 20 نوفمبر 2026';

  container.innerHTML = `
    <div style="border: 2px solid #d97706; border-radius: 16px; padding: 20px; background: #0c1220; position: relative; box-shadow: 0 20px 40px rgba(0,0,0,0.8); overflow: hidden;">
      
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #334155; padding-bottom: 14px; margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <img src="${kayanLogo}" width="46" height="46" style="border-radius: 50%; border: 2px solid #d97706; object-fit: cover;" />
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 16px; font-weight: 900; color: #ffffff;">شركة كيان لتنظيم الرحلات</span>
              <span style="background: #059669; color: #ffffff; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 4px;">✔ معتمدة</span>
            </div>
            <p style="margin: 2px 0 0 0; font-size: 11px; color: #94a3b8; font-weight: 700;">
              تذكرة صعود رقمية رسمية • OFFICIAL BOARDING PASS
            </p>
          </div>
        </div>

        <div style="background: rgba(217, 119, 6, 0.15); border: 1px solid #d97706; padding: 6px 14px; border-radius: 8px; text-align: center;">
          <div style="font-size: 9px; color: #f59e0b; font-weight: 800;">كود التذكرة</div>
          <div style="font-size: 14px; font-weight: 900; color: #ffffff; font-family: monospace;">#${ticketCode}</div>
        </div>
      </div>

      <div style="background: linear-gradient(135deg, #1e1b4b 0%, #311b92 50%, #0f172a 100%); border-radius: 12px; padding: 14px; text-align: center; margin-bottom: 16px; border: 1px solid #3b82f6;">
        <div style="background: rgba(217, 119, 6, 0.2); border: 1px solid #f59e0b; display: inline-block; padding: 2px 12px; border-radius: 20px; font-size: 11px; font-weight: 900; color: #fef08a; margin-bottom: 4px;">
          ✨ ${tripSettings.tripName || 'Fun Day'}
        </div>
        <div style="font-size: 24px; font-weight: 900; color: #ffffff; letter-spacing: 1px;">
          KAYAN TOURS & EVENTS
        </div>
      </div>

      <div style="display: flex; gap: 18px; align-items: stretch;">
        <div style="width: 220px; border-left: 2px dashed #334155; padding-left: 16px; display: flex; flex-direction: column; align-items: center; justify-content: space-between;">
          <div style="background: #ffffff; padding: 10px; border-radius: 12px; text-align: center; width: 100%; box-sizing: border-box;">
            <img src="${qrCodeUrl}" width="150" height="150" style="display: block; margin: 0 auto;" />
            <div style="font-size: 11px; font-weight: 900; color: #0f172a; font-family: monospace; margin-top: 6px;">
              ${ticketCode}
            </div>
          </div>

          <div style="text-align: center; margin-top: 10px; width: 100%;">
            <div style="font-size: 11px; font-weight: 800; color: #10b981; margin-bottom: 6px;">
              ✔ تذكرة صعود إلكترونية معتمدة
            </div>
          </div>
        </div>

        <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between; gap: 10px;">
          <div>
            <div style="font-size: 11px; color: #94a3b8; font-weight: 700;">المسافر | هاتف: <span style="color:#ffffff; font-family:monospace;">${student.phone || '—'}</span></div>
            <div style="font-size: 20px; font-weight: 900; color: #ffffff; margin: 2px 0 6px 0;">
              ${student.name}
            </div>
            <div style="display: flex; gap: 8px;">
              <span style="background: rgba(255,255,255,0.08); border: 1px solid #475569; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 800; color: #cbd5e1;">
                ${student.faculty || 'نظم ومعلومات'}
              </span>
              <span style="background: #b45309; color: #fef3c7; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 900;">
                👑 مشترك : Traveler
              </span>
            </div>
          </div>

          <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid #1e293b; border-radius: 8px; padding: 8px 12px;">
            <div style="display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; font-weight: 700;">
              <span>الوجهة:</span>
              <span>تاريخ الرحلة:</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 2px;">
              <div style="font-size: 12px; font-weight: 900; color: #f59e0b;">
                ${tripSettings.destination || 'السخنة / العين السخنة'}
              </div>
              <div style="font-size: 11px; font-weight: 900; color: #ffffff;">
                ${formattedDate}
              </div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div style="background: rgba(30, 41, 59, 0.5); border: 1px solid #334155; padding: 6px; border-radius: 6px; text-align: center;">
              <div style="font-size: 10px; color: #94a3b8; font-weight: 800;">🚌 الحافلة والمقعد:</div>
              <div style="font-size: 12px; font-weight: 900; color: #ffffff;">${busInfo}</div>
              <div style="font-size: 10px; font-weight: 800; color: #f59e0b;">${seatInfo}</div>
            </div>

            <div style="background: rgba(30, 41, 59, 0.5); border: 1px solid #334155; padding: 6px; border-radius: 6px; text-align: center;">
              <div style="font-size: 10px; color: #94a3b8; font-weight: 800;">💳 الموقف المالي:</div>
              <div style="font-size: 11px; font-weight: 900; color: #34d399;">تم السداد بنجاح</div>
            </div>
          </div>

          <div>
            <div style="font-size: 10px; font-weight: 900; color: #f59e0b; margin-bottom: 4px;">
              ✨ الخدمات المشمولة:
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
              <div style="background: rgba(255,255,255,0.04); border: 1px solid #334155; padding: 4px 8px; border-radius: 4px; font-size: 10px; color: #ffffff;">
                👕 المقاس (${student.tShirtSize || 'L'})
              </div>
              <div style="background: rgba(255,255,255,0.04); border: 1px solid #334155; padding: 4px 8px; border-radius: 4px; font-size: 10px; color: #ffffff;">
                🍔 وجبة: ${mealInfo}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style="margin-top: 14px; background: #020617; border: 1px solid #1e293b; padding: 6px 12px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #cbd5e1;">
        <div>📍 <strong>التجمع:</strong> ${tripSettings.gatheringPoint || 'شارع الاستاد'}</div>
        <div>🆔 <strong>القومي:</strong> <span style="font-family:monospace;">${student.nationalId || '—'}</span></div>
        <div>📞 <strong>طوارئ:</strong> <span style="font-family:monospace; color:#ef4444;">${tripSettings.supportPhone || '—'}</span></div>
      </div>

    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: '#090d16',
      useCORS: true,
      allowTaint: true,
      logging: false,
      onclone: sanitizeClonedDoc,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdfWidthMm = 210;
    const pdfHeightMm = Math.round((canvas.height * pdfWidthMm) / canvas.width);

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [pdfWidthMm, pdfHeightMm],
    });

    doc.addImage(imgData, 'PNG', 0, 0, pdfWidthMm, pdfHeightMm);
    saveJsPDFDoc(doc, `Ticket_${student.name.replace(/\s+/g, '_')}.pdf`);
  } catch (err) {
    console.error('حدث خطأ أثناء تصدير ملف الـ PDF:', err);
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
};// ----------------------------------------------------------------------
// 6. Treasury, Financial & Transfer Reports Generation
// ----------------------------------------------------------------------

export const generateTreasuryReportPDF = async (
  treasury: CompanyTreasury,
  transfers: TreasuryTransfer[],
  vouchers: ReceiptVoucher[],
  settings: TripSettings
) => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '850px';
  container.style.background = '#ffffff';
  container.style.color = '#0f172a';
  container.style.direction = 'rtl';
  container.style.fontFamily = "'Tajawal', system-ui, -apple-system, sans-serif";
  container.style.padding = '28px';
  container.style.boxSizing = 'border-box';

  const totalIncome = vouchers
    .filter((v) => v.type === 'receipt')
    .reduce((sum, v) => sum + (v.amount || 0), 0);

  const totalExpense = vouchers
    .filter((v) => v.type === 'payment')
    .reduce((sum, v) => sum + (v.amount || 0), 0);

  container.innerHTML = `
    <div style="border: 2px solid #1e1b4b; padding: 24px; border-radius: 16px; background: #ffffff;">
      
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1e1b4b; padding-bottom: 16px; margin-bottom: 20px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <img src="${kayanLogo}" width="60" height="60" style="border-radius: 10px; border: 2px solid #d97706; object-fit: cover;" />
          <div>
            <h1 style="margin: 0; font-size: 20px; font-weight: 900; color: #1e1b4b;">KAYAN EVENTS & TOURS</h1>
            <h2 style="margin: 2px 0 0 0; font-size: 15px; font-weight: 800; color: #d97706;">تقرير الخزينة الرئيسية والمركز المالي</h2>
          </div>
        </div>
        <div style="text-align: left; font-size: 11px; color: #64748b; font-weight: 700;">
          <div>تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}</div>
          <div>الشركة: ${settings.companyNameAr || 'كيان لتنظيم الفعاليات'}</div>
        </div>
      </div>

      <!-- Financial Overview Cards -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px;">
        <div style="background: #f0fdf4; border: 1.5px solid #16a34a; padding: 12px; border-radius: 10px; text-align: center;">
          <div style="font-size: 11px; color: #15803d; font-weight: 800;">إجمالي المقبوضات</div>
          <div style="font-size: 18px; font-weight: 900; color: #166534; font-family: monospace; margin-top: 4px;">
            ${totalIncome.toLocaleString()} ج.م
          </div>
        </div>

        <div style="background: #fef2f2; border: 1.5px solid #dc2626; padding: 12px; border-radius: 10px; text-align: center;">
          <div style="font-size: 11px; color: #b91c1c; font-weight: 800;">إجمالي المصروفات</div>
          <div style="font-size: 18px; font-weight: 900; color: #991b1b; font-family: monospace; margin-top: 4px;">
            ${totalExpense.toLocaleString()} ج.م
          </div>
        </div>

        <div style="background: #eff6ff; border: 1.5px solid #2563eb; padding: 12px; border-radius: 10px; text-align: center;">
          <div style="font-size: 11px; color: #1d4ed8; font-weight: 800;">الرصيد الصافي المتاح</div>
          <div style="font-size: 18px; font-weight: 900; color: #1e40af; font-family: monospace; margin-top: 4px;">
            ${(treasury.balance ?? (totalIncome - totalExpense)).toLocaleString()} ج.م
          </div>
        </div>
      </div>

      <!-- Vouchers Table -->
      <div style="margin-bottom: 24px;">
        <h3 style="font-size: 14px; font-weight: 900; color: #1e1b4b; margin: 0 0 10px 0; border-right: 4px solid #d97706; padding-right: 8px;">
          سجل حركة السندات (إيصالات القبض والصرف)
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 11.5px; text-align: right;">
          <thead>
            <tr style="background: #1e1b4b; color: #ffffff;">
              <th style="padding: 8px; border: 1px solid #cbd5e1;">رقم السند</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1;">النوع</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1;">الجهة / الاسم</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1;">البيان / السبب</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1;">المبلغ</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1;">التاريخ</th>
            </tr>
          </thead>
          <tbody>
            ${vouchers.slice(0, 15).map((v, i) => `
              <tr style="background: ${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                <td style="padding: 8px; border: 1px solid #cbd5e1; font-family: monospace; font-weight: 800;">#${v.voucherNumber || v.id}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: 800; color: ${v.type === 'receipt' ? '#166534' : '#991b1b'};">
                  ${v.type === 'receipt' ? 'قبض' : 'صرف'}
                </td>
                <td style="padding: 8px; border: 1px solid #cbd5e1;">${v.receivedFrom || v.paidTo || '—'}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1;">${v.reason || v.notes || '—'}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1; font-family: monospace; font-weight: 900;">${(v.amount || 0).toLocaleString()} ج.م</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1;">${v.date}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Transfers Section -->
      ${transfers.length > 0 ? `
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 14px; font-weight: 900; color: #1e1b4b; margin: 0 0 10px 0; border-right: 4px solid #d97706; padding-right: 8px;">
            سجل التحويلات المالية بين الحسابات
          </h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 11.5px; text-align: right;">
            <thead>
              <tr style="background: #334155; color: #ffffff;">
                <th style="padding: 8px; border: 1px solid #cbd5e1;">من حساب</th>
                <th style="padding: 8px; border: 1px solid #cbd5e1;">إلى حساب</th>
                <th style="padding: 8px; border: 1px solid #cbd5e1;">المبلغ</th>
                <th style="padding: 8px; border: 1px solid #cbd5e1;">بواسطة</th>
                <th style="padding: 8px; border: 1px solid #cbd5e1;">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              ${transfers.slice(0, 8).map((t, i) => `
                <tr style="background: ${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                  <td style="padding: 8px; border: 1px solid #cbd5e1;">${t.fromAccount}</td>
                  <td style="padding: 8px; border: 1px solid #cbd5e1;">${t.toAccount}</td>
                  <td style="padding: 8px; border: 1px solid #cbd5e1; font-family: monospace; font-weight: 900; color: #2563eb;">${(t.amount || 0).toLocaleString()} ج.م</td>
                  <td style="padding: 8px; border: 1px solid #cbd5e1;">${t.transferredBy || 'الإدارة'}</td>
                  <td style="padding: 8px; border: 1px solid #cbd5e1;">${t.date}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      <!-- Footer Signatures -->
      <div style="margin-top: 30px; border-top: 2px solid #e2e8f0; padding-top: 16px; display: flex; justify-content: space-between; font-size: 11px; color: #475569;">
        <div>توقيع مسؤول الخزينة: ........................</div>
        <div>اعتماد المدير المالي: ........................</div>
        <div>ختم الشركة الرسمي</div>
      </div>

    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: true,
      logging: false,
      onclone: sanitizeClonedDoc,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdfWidthMm = 210;
    const pdfHeightMm = Math.round((canvas.height * pdfWidthMm) / canvas.width);

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [pdfWidthMm, pdfHeightMm],
    });

    doc.addImage(imgData, 'PNG', 0, 0, pdfWidthMm, pdfHeightMm);
    saveJsPDFDoc(doc, `KAYAN_Treasury_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
  } catch (err) {
    console.error('Error generating treasury report PDF:', err);
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
};

export const generateTransferReceiptPDF = async (
  transfer: TreasuryTransfer,
  settings: TripSettings
) => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '700px';
  container.style.background = '#ffffff';
  container.style.color = '#0f172a';
  container.style.direction = 'rtl';
  container.style.fontFamily = "'Tajawal', system-ui, -apple-system, sans-serif";
  container.style.padding = '24px';
  container.style.boxSizing = 'border-box';

  container.innerHTML = `
    <div style="border: 4px double #2563eb; padding: 20px; border-radius: 14px; background: #ffffff;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 16px;">
        <div>
          <h2 style="margin: 0; font-size: 18px; font-weight: 900; color: #1e40af;">إيصال تحويل مالي داخلي</h2>
          <p style="margin: 2px 0 0 0; font-size: 11px; color: #64748b;">${settings.companyNameAr || 'KAYAN Events'}</p>
        </div>
        <div style="font-size: 12px; font-weight: 900; color: #1e40af; font-family: monospace;">
          #TR-${transfer.id ? transfer.id.slice(-6) : '0000'}
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; font-size: 12.5px;">
        <div style="background: #f8fafc; padding: 10px; border-radius: 8px;">
          <span style="color: #64748b; font-weight: 700;">من حساب:</span>
          <div style="font-weight: 900; color: #0f172a; margin-top: 2px;">${transfer.fromAccount}</div>
        </div>
        <div style="background: #f8fafc; padding: 10px; border-radius: 8px;">
          <span style="color: #64748b; font-weight: 700;">إلى حساب:</span>
          <div style="font-weight: 900; color: #0f172a; margin-top: 2px;">${transfer.toAccount}</div>
        </div>
      </div>

      <div style="background: #eff6ff; border: 1px solid #93c5fd; padding: 12px; border-radius: 8px; text-align: center; margin-bottom: 16px;">
        <div style="font-size: 11px; color: #1d4ed8; font-weight: 800;">المبلغ المحول</div>
        <div style="font-size: 22px; font-weight: 900; color: #1e40af; font-family: monospace;">
          ${(transfer.amount || 0).toLocaleString()} ج.م
        </div>
      </div>

      <div style="font-size: 12px; color: #334155; margin-bottom: 20px; line-height: 1.6;">
        <div><strong>البيان / السبب:</strong> ${transfer.notes || 'تحويل رصيد داخلي'}</div>
        <div><strong>بواسطة:</strong> ${transfer.transferredBy || 'إدارة الحسابات'}</div>
        <div><strong>التاريخ:</strong> ${transfer.date}</div>
      </div>

      <div style="display: flex; justify-content: space-between; border-top: 1px dashed #cbd5e1; padding-top: 12px; font-size: 11px; color: #64748b;">
        <div>توقيع المحول: ...................</div>
        <div>توقيع المستلم: ...................</div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: true,
      logging: false,
      onclone: sanitizeClonedDoc,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdfWidthMm = 210;
    const pdfHeightMm = Math.round((canvas.height * pdfWidthMm) / canvas.width);

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [pdfWidthMm, pdfHeightMm],
    });

    doc.addImage(imgData, 'PNG', 0, 0, pdfWidthMm, pdfHeightMm);
    saveJsPDFDoc(doc, `Transfer_Receipt_${transfer.id}.pdf`);
  } catch (err) {
    console.error('Error generating transfer receipt PDF:', err);
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
};// ----------------------------------------------------------------------
// 7. Bus Manifests, Crew & Timeline Reports Generation
// ----------------------------------------------------------------------

export const generateBusManifestPDF = async (
  busNumber: number,
  students: Student[],
  tripSettings: TripSettings,
  supervisorName?: string,
  driverInfo?: { name: string; phone: string }
) => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '850px';
  container.style.background = '#ffffff';
  container.style.color = '#0f172a';
  container.style.direction = 'rtl';
  container.style.fontFamily = "'Tajawal', system-ui, -apple-system, sans-serif";
  container.style.padding = '24px';
  container.style.boxSizing = 'border-box';

  const busStudents = students.filter(
    (s) => Number(s.busNumber) === Number(busNumber)
  );

  const formattedDate = formatTripDateSafely(tripSettings.tripDate) || 'تاريخ الرحلة غير محدد';

  container.innerHTML = `
    <div style="border: 2px solid #0284c7; padding: 20px; border-radius: 14px; background: #ffffff;">
      
      <!-- Manifest Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <img src="${kayanLogo}" width="50" height="50" style="border-radius: 8px; border: 1.5px solid #0284c7;" />
          <div>
            <h2 style="margin: 0; font-size: 18px; font-weight: 900; color: #0369a1;">كشف ركاب الأتوبيس (${busNumber})</h2>
            <p style="margin: 2px 0 0 0; font-size: 12px; font-weight: 800; color: #64748b;">
              ${tripSettings.tripName || 'رحلة العين السخنة'} • ${formattedDate}
            </p>
          </div>
        </div>

        <div style="text-align: left; background: #f0f9ff; border: 1px solid #bae6fd; padding: 6px 12px; border-radius: 8px; font-size: 11px;">
          <div><strong>إجمالي الركاب:</strong> ${busStudents.length} مشارك</div>
          <div><strong>نقطة التجمع:</strong> ${tripSettings.gatheringPoint || 'شارع الاستاد'}</div>
        </div>
      </div>

      <!-- Supervisor & Driver Info -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; font-size: 11.5px; background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0;">
        <div>
          <span style="color: #64748b; font-weight: 700;">👔 مشرف الأتوبيس:</span>
          <strong style="color: #0f172a; margin-right: 4px;">${supervisorName || 'غير محدد'}</strong>
        </div>
        <div>
          <span style="color: #64748b; font-weight: 700;">🚌 قائد الحافلة:</span>
          <strong style="color: #0f172a; margin-right: 4px;">${driverInfo?.name || 'غير محدد'} (${driverInfo?.phone || '—'})</strong>
        </div>
      </div>

      <!-- Passenger Table -->
      <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: right;">
        <thead>
          <tr style="background: #0284c7; color: #ffffff;">
            <th style="padding: 6px; border: 1px solid #cbd5e1; width: 35px; text-align: center;">م</th>
            <th style="padding: 6px; border: 1px solid #cbd5e1; width: 60px; text-align: center;">المقعد</th>
            <th style="padding: 6px; border: 1px solid #cbd5e1;">اسم المسافر</th>
            <th style="padding: 6px; border: 1px solid #cbd5e1;">رقم الهاتف</th>
            <th style="padding: 6px; border: 1px solid #cbd5e1;">الكلية / الجهة</th>
            <th style="padding: 6px; border: 1px solid #cbd5e1;">الوجبة / المقاس</th>
            <th style="padding: 6px; border: 1px solid #cbd5e1; width: 50px; text-align: center;">الحضور</th>
          </tr>
        </thead>
        <tbody>
          ${busStudents.map((s, idx) => `
            <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
              <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-weight: 800;">${idx + 1}</td>
              <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-weight: 900; color: #0284c7;">${s.seatNumber || '—'}</td>
              <td style="padding: 6px; border: 1px solid #cbd5e1; font-weight: 800; color: #0f172a;">${s.name}</td>
              <td style="padding: 6px; border: 1px solid #cbd5e1; font-family: monospace;">${s.phone || '—'}</td>
              <td style="padding: 6px; border: 1px solid #cbd5e1;">${s.faculty || '—'}</td>
              <td style="padding: 6px; border: 1px solid #cbd5e1;">${s.meal || 'وجبة'} (${s.tShirtSize || 'L'})</td>
              <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center;">[  ]</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- Footer -->
      <div style="margin-top: 20px; border-top: 1px dashed #cbd5e1; padding-top: 10px; display: flex; justify-content: space-between; font-size: 10px; color: #64748b;">
        <div>توقيع مشرف الأتوبيس: ........................</div>
        <div>اعتماد مسؤول الرحلات: أحمد عبدالخالق</div>
      </div>

    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: true,
      logging: false,
      onclone: sanitizeClonedDoc,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdfWidthMm = 210;
    const pdfHeightMm = Math.round((canvas.height * pdfWidthMm) / canvas.width);

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [pdfWidthMm, pdfHeightMm],
    });

    doc.addImage(imgData, 'PNG', 0, 0, pdfWidthMm, pdfHeightMm);
    saveJsPDFDoc(doc, `Bus_${busNumber}_Manifest.pdf`);
  } catch (err) {
    console.error(`Error generating manifest for Bus ${busNumber}:`, err);
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
};

export const generateTimelineReportPDF = async (
  timeline: { time: string; activity: string; details?: string }[],
  settings: TripSettings
) => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '750px';
  container.style.background = '#ffffff';
  container.style.color = '#0f172a';
  container.style.direction = 'rtl';
  container.style.fontFamily = "'Tajawal', system-ui, -apple-system, sans-serif";
  container.style.padding = '24px';
  container.style.boxSizing = 'border-box';

  container.innerHTML = `
    <div style="border: 2px solid #7c3aed; padding: 20px; border-radius: 14px; background: #ffffff;">
      
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #7c3aed; padding-bottom: 12px; margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <img src="${kayanLogo}" width="50" height="50" style="border-radius: 8px; border: 1.5px solid #7c3aed;" />
          <div>
            <h2 style="margin: 0; font-size: 18px; font-weight: 900; color: #6d28d9;">البرنامج الزمني للرحلة (Timeline)</h2>
            <p style="margin: 2px 0 0 0; font-size: 12px; font-weight: 800; color: #64748b;">
              ${settings.tripName || 'KAYAN Events Trip'}
            </p>
          </div>
        </div>
        <div style="font-size: 11px; font-weight: 800; color: #7c3aed;">
          تاريخ التنفيذ: ${formatTripDateSafely(settings.tripDate) || 'تاريخ غير محدد'}
        </div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 10px;">
        ${timeline.map((item, i) => `
          <div style="display: flex; gap: 14px; background: ${i % 2 === 0 ? '#f5f3ff' : '#ffffff'}; border: 1px solid #ddd6fe; padding: 10px 14px; border-radius: 8px; align-items: center;">
            <div style="background: #7c3aed; color: #ffffff; padding: 6px 12px; border-radius: 6px; font-weight: 900; font-family: monospace; font-size: 12px;">
              ${item.time}
            </div>
            <div style="flex: 1;">
              <div style="font-size: 13px; font-weight: 900; color: #4c1d95;">${item.activity}</div>
              ${item.details ? `<div style="font-size: 11px; color: #6b21a8; margin-top: 2px;">${item.details}</div>` : ''}
            </div>
          </div>
        `).join('')}
      </div>

      <div style="margin-top: 20px; text-align: center; font-size: 10px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 10px;">
        نتمنى لكم رحلة ممتعة وآمنة برفقة فريق <strong>KAYAN Events</strong>
      </div>

    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: true,
      logging: false,
      onclone: sanitizeClonedDoc,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdfWidthMm = 210;
    const pdfHeightMm = Math.round((canvas.height * pdfWidthMm) / canvas.width);

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [pdfWidthMm, pdfHeightMm],
    });

    doc.addImage(imgData, 'PNG', 0, 0, pdfWidthMm, pdfHeightMm);
    saveJsPDFDoc(doc, `Trip_Timeline_${settings.tripName || 'KAYAN'}.pdf`);
  } catch (err) {
    console.error('Error generating timeline PDF:', err);
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
};
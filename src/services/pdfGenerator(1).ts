import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ContractData, ReceiptVoucher, Student, TripSettings, TreasuryTransfer, CompanyTreasury, TimelineEvent, DriverInfo, getStudentMealInfo, getCompanionMealInfo } from '../types';
import kayanLogo from '../assets/images/kayan_logo_1785354886047.jpg';
import kayanBadge from '../assets/images/kayan_badge_1785354902221.jpg';

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
    let rgb = '15, 23, 42'; // default dark slate #0f172a

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

    // 1. Sanitize style tags content
    clonedDoc.querySelectorAll('style').forEach((style) => {
      if (style.textContent) {
        style.textContent = replaceOklabWithRgb(style.textContent);
      }
    });

    // 2. Sanitize CSS Rules in stylesheets
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
          // ignore CORS issues with external stylesheets
        }
      });
    } catch (e) {
      // ignore
    }

    // 3. Sanitize elements with inline style attributes & computed colors
    clonedDoc.querySelectorAll<HTMLElement>('*').forEach((el) => {
      const inlineStyle = el.getAttribute('style');
      if (inlineStyle && (inlineStyle.includes('oklab') || inlineStyle.includes('oklch') || inlineStyle.includes('color('))) {
        el.setAttribute('style', replaceOklabWithRgb(inlineStyle));
      }
      // Never allow letter-spacing on Arabic text as it breaks cursive character joining in html2canvas
      el.style.letterSpacing = 'normal';
      el.style.wordSpacing = 'normal';
    });
  } catch (e) {
    console.warn('Error sanitizing cloned doc for html2canvas:', e);
  }
};

export const fallbackPrintElement = (_element: HTMLElement, title: string) => {
  // Silent fallback - do NOT automatically open browser print dialog without user intent
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
        // Clean up input fields to look like plain crisp typography in PDF
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
    doc.save(filename);
    return true;
  } catch (err) {
    console.error('Error exporting DOM element to PDF:', err);
    return false;
  }
};

/**
 * Generate Contract Canvas (Captures on-screen DOM element or creates official luxury standalone legal contract)
 */
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

  // If on-screen element exists, capture it directly with high-fidelity clone
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
          // Convert input fields and textareas to clean typography
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

  // Standalone luxury legal contract matching exact presidential Kayan design
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
      
      <!-- Top Decorative Gold Accent Bar -->
      <div style="height: 6px; background: linear-gradient(90deg, #1e1b4b 0%, #d97706 50%, #1e1b4b 100%); border-radius: 4px; margin-bottom: 20px;"></div>

      <!-- Header Branding with Official Logo -->
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

      <!-- Contract Header Title Ribbon -->
      <div style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); color: #ffffff; padding: 14px 20px; border-radius: 10px; text-align: center; margin-bottom: 22px; border-right: 6px solid #d97706; box-shadow: 0 4px 10px rgba(30,27,75,0.15);">
        <h2 style="margin: 0; font-size: 19px; font-weight: 900; color: #ffffff; letter-spacing: 0.2px;">${contract.title}</h2>
        <span style="font-size: 12px; color: #fde047; font-weight: 800; display: block; margin-top: 4px;">عقد رسمي معتمد ملزم بجميع الآثار القانونية والمالية صادر عن شركة كيان</span>
      </div>

      <!-- Legal Preamble -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px 18px; border-radius: 10px; margin-bottom: 22px; font-size: 13px; line-height: 1.9; color: #0f172a;">
        <p style="margin: 0 0 10px 0; font-weight: 800; font-size: 13.5px; color: #1e1b4b;">
          إنه في يوم <span style="color: #d97706; text-decoration: underline;">${contract.createdAt}</span> الموافق، بمدينة <span style="color: #1e1b4b; text-decoration: underline;">${contract.location || 'القاهرة / الإسماعيلية'}</span>، تم بحمد الله وتوفيقه إبرام هذا العقد والاتفاق القانوني بين كل من:
        </p>
        <div style="border-top: 1px dashed #cbd5e1; padding-top: 12px; margin-top: 10px; space-y: 6px;">
          <p style="margin: 4px 0; font-size: 13px;">
            <strong style="color: #1e1b4b; font-size: 13.5px;">الطرف الأول (المنظم المعتمد):</strong> شركة كيان لتنظيم الفعاليات والرحلات والمؤتمرات (KAYAN Events & Tours)، ويمثلها بالتعاقد إدارة الفعالية، هاتف التواصل: <span style="font-weight: 900; color: #047857;">${settings.supportPhone || '01038574977'}</span>.
          </p>
          <p style="margin: 6px 0; font-size: 13px;">
            <strong style="color: #1e1b4b; font-size: 13.5px;">الطرف الثاني (الجهة المتعاقدة / العميل):</strong> السيد / المنشأة: <strong style="background: #fef3c7; padding: 2px 8px; border-radius: 4px; color: #78350f; font-size: 14px;">${contract.partyName}</strong>، هاتف: <strong style="color: #0f172a; font-family: monospace;">${contract.partyPhone}</strong> ${contract.partyNationalId ? `، الرقم القومي / السجل: <strong style="color: #0f172a; font-family: monospace;">${contract.partyNationalId}</strong>` : ''}.
          </p>
        </div>
      </div>

      <!-- Financial Table -->
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

      <!-- Clauses List -->
      <div style="margin-bottom: 26px;">
        <h3 style="margin: 0 0 10px 0; font-size: 14.5px; font-weight: 900; color: #1e1b4b; display: flex; align-items: center; gap: 8px;">
          <span style="background: #1e1b4b; color: #ffffff; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 900;">2</span>
          البنود والالتزامات القانونية المتبادلة بين الطرفين
        </h3>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${(contract.clauseNotes || []).map((clause, idx) => `
            <div style="display: flex; align-items: flex-start; gap: 8px; background: #f8fafc; padding: 9px 14px; border-radius: 8px; border-right: 4px solid #d97706; font-size: 12.5px; line-height: 1.7; color: #1e293b; font-weight: 600;">
              <span style="background: #1e1b4b; color: #ffffff; font-size: 11px; font-weight: 900; border-radius: 4px; padding: 2px 7px; shrink: 0;">بند ${idx + 1}</span>
              <div style="flex: 1;">${clause}</div>
            </div>
          `).join('')}
          <div style="display: flex; align-items: flex-start; gap: 8px; background: #fefce8; padding: 9px 14px; border-radius: 8px; border-right: 4px solid #d97706; font-size: 12.5px; line-height: 1.7; color: #713f12; font-weight: 700;">
            <span style="background: #d97706; color: #ffffff; font-size: 11px; font-weight: 900; border-radius: 4px; padding: 2px 7px; shrink: 0;">إقرار</span>
            <div style="flex: 1;">يلتزم الطرفان بكافة البنود والشروط المذكورة أعلاه، وفي حالة الإخلال يتحمل الطرف المخالف كافة الآثار القانونية والمالية والشروط الجزائية المترتبة على ذلك.</div>
          </div>
        </div>
      </div>

      <!-- Signatures Area -->
      <div style="margin-top: 32px; border-top: 2px solid #e2e8f0; padding-top: 20px; display: flex; justify-content: space-between; align-items: flex-start;">
        <!-- Left in LTR / Right in RTL: First Party Kayan -->
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

        <!-- Left in RTL / Second Party Client -->
        <div style="width: 47%; text-align: center;">
          <p style="margin: 0; font-size: 13.5px; font-weight: 900; color: #1e1b4b;">توقيع الطرف الثاني (العميل / المقاول)</p>
          <div style="margin-top: 12px; height: 85px; border: 2px dashed #cbd5e1; border-radius: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #fafafa; padding: 8px;">
            <span style="font-size: 13.5px; color: #0f172a; font-weight: 900;">${contract.partyName}</span>
            <span style="font-size: 11px; color: #94a3b8; font-weight: 700; margin-top: 6px;">التوقيع بالموافقة والاعتماد الرسمي</span>
          </div>
        </div>
      </div>

      <!-- Footer -->
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

/**
 * Generate PDF for any of the 7 Contract Types with perfect Arabic Typography and Official KAYAN Branding
 */
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
    const pdfWidthMm = 210; // Standard A4 width
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

    doc.save(`KAYAN_Contract_${contract.type}_${contract.id}.pdf`);
  } catch (err) {
    console.error('Error saving contract PDF:', err);
  }
};

/**
 * Download Contract as High-Resolution Image (HD PNG)
 */
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
};

/**
 * Generate Receipt or Payment Voucher Canvas (Captures on-screen DOM element or creates official luxury standalone voucher)
 */
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

  // If on-screen element exists, capture it directly with high-fidelity clone
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
          // Convert input fields and textareas to clean typography
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

  // Standalone luxury voucher matching exact official design
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
  const title = isReceipt ? '(Receipt Voucher) إيصال استلام نقدية' : '(Payment Voucher) إيصال صرف نقدية';
  const themeBorder = isReceipt ? '#064e3b' : '#991b1b';
  const headerGradient = isReceipt
    ? 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #064e3b 100%)'
    : 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #7f1d1d 100%)';
  const amountWords = voucher.amountInWords || `${voucher.amount} جنيه مصري لا غير`;

  container.innerHTML = `
    <div style="border: 6px double ${themeBorder}; padding: 24px; border-radius: 20px; background: #ffffff; position: relative; box-shadow: 0 10px 30px rgba(0,0,0,0.08); font-family: 'Tajawal', sans-serif;">
      
      <!-- Subtle Background Watermark Stamp -->
      <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; opacity: 0.035; pointer-events: none; select: none;">
        <svg viewBox="0 0 300 300" width="320" height="320">
          <circle cx="150" cy="150" r="140" fill="none" stroke="#064e3b" stroke-width="8" stroke-dasharray="6,4"/>
          <circle cx="150" cy="150" r="120" fill="none" stroke="#064e3b" stroke-width="4"/>
          <circle cx="150" cy="150" r="85" fill="none" stroke="#064e3b" stroke-width="2"/>
          <text x="150" y="145" text-anchor="middle" font-family="'Tajawal', sans-serif" font-size="22" font-weight="900" fill="#064e3b">KAYAN EVENTS</text>
          <text x="150" y="170" text-anchor="middle" font-family="'Tajawal', sans-serif" font-size="14" font-weight="700" fill="#064e3b">إدارة مالية معتمدة</text>
        </svg>
      </div>

      <!-- Top Header Banner -->
      <div style="background: ${headerGradient}; color: #ffffff; padding: 16px 20px; border-radius: 14px; margin-bottom: 18px; display: flex; align-items: center; justify-content: space-between; gap: 16px; box-shadow: 0 4px 12px rgba(6, 78, 59, 0.25);">
        
        <!-- Right side (in RTL): Company Name & Title -->
        <div style="text-align: right; flex: 1;">
          <h1 style="margin: 0; font-size: 21px; font-weight: 900; color: #fde047; line-height: 1.2;">
            ${settings.companyNameAr || 'شركة كيان لتنظيم الفعاليات والرحلات'}
          </h1>
          <p style="margin: 3px 0 0 0; font-size: 13px; font-weight: 700; color: #ffffff;">
            ${title}
          </p>
        </div>

        <!-- Left side (in RTL): Voucher Number & Date -->
        <div style="text-align: left; background: rgba(0, 0, 0, 0.25); padding: 8px 14px; border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.15); min-width: 170px;">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 12px; margin-bottom: 3px;">
            <span style="color: #cbd5e1; font-weight: 700;">رقم:</span>
            <strong style="color: #fde047; font-family: monospace; font-size: 14px; font-weight: 900;">${voucher.voucherNumber}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 12px;">
            <span style="color: #cbd5e1; font-weight: 700;">التاريخ:</span>
            <strong style="color: #ffffff; font-family: monospace; font-size: 13px;">${voucher.date}</strong>
          </div>
        </div>
      </div>

      <!-- Amount Display Box -->
      <div style="background: #fffbeb; border: 2px solid #f59e0b; padding: 14px 18px; border-radius: 14px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center; gap: 16px; box-shadow: inset 0 1px 2px rgba(0,0,0,0.02);">
        
        <!-- Amount in Numbers (Right in RTL) -->
        <div style="background: #ffffff; border: 1px solid #fde68a; padding: 6px 16px; border-radius: 10px; display: flex; align-items: center; gap: 8px;">
          <span style="color: #64748b; font-size: 12px; font-weight: 700;">المبلغ بالأرقام:</span>
          <strong style="font-size: 24px; font-weight: 900; color: #065f46; font-family: monospace;">
            ${(voucher.amount ?? 0).toLocaleString()}
          </strong>
          <span style="font-size: 14px; font-weight: 900; color: #065f46;">ج.م</span>
        </div>

        <!-- Amount in Words / Tafqit (Left in RTL) -->
        <div style="flex: 1; background: #ffffff; border: 1px solid #fde68a; padding: 8px 14px; border-radius: 10px; text-align: left;">
          <span style="color: #64748b; font-size: 10px; display: block; font-weight: 700; margin-bottom: 1px;">المبلغ بالحروف (التفقيط):</span>
          <strong style="font-size: 13px; font-weight: 800; color: #065f46; display: block;">
            ${amountWords}
          </strong>
        </div>
      </div>

      <!-- Main Voucher Details Table / Rows -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px 20px; margin-bottom: 20px; font-size: 13px;">
        
        <!-- Person Name -->
        <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; margin-bottom: 10px; border-bottom: 1px dashed #cbd5e1;">
          <span style="color: #475569; font-weight: 700; font-size: 13px;">${isReceipt ? 'استلمنا من السيد/ة:' : 'صرفنا إلى السيد/ة:'}</span>
          <strong style="color: #0f172a; font-size: 16px; font-weight: 900; background: #ffffff; padding: 3px 14px; border-radius: 6px; border: 1px solid #e2e8f0;">
            ${voucher.personName}
          </strong>
        </div>

        <!-- Reason / Purpose -->
        <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; margin-bottom: 10px; border-bottom: 1px dashed #cbd5e1;">
          <span style="color: #475569; font-weight: 700; font-size: 13px;">وذلك عن قيمة (السبب):</span>
          <strong style="color: #0f172a; font-size: 14px; font-weight: 800;">
            ${voucher.reason || 'عربون/دفعة حجز رحلة'}
          </strong>
        </div>

        <!-- Payment Method -->
        <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; margin-bottom: 10px; border-bottom: 1px dashed #cbd5e1;">
          <span style="color: #475569; font-weight: 700; font-size: 13px;">طريقة السداد:</span>
          <strong style="color: #1e1b4b; background: #e0e7ff; border: 1px solid #c7d2fe; padding: 3px 12px; border-radius: 6px; font-family: monospace; font-weight: 900; font-size: 13px;">
            ${(voucher.paymentMethod || 'CASH').toUpperCase()}
          </strong>
        </div>

        <!-- Event / Trip Name -->
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="color: #475569; font-weight: 700; font-size: 13px;">الفعالية / الرحلة:</span>
          <strong style="color: #0f172a; font-size: 14px; font-weight: 900;">
            ${settings.tripName || 'فعاليات شركة كيان'}
          </strong>
        </div>
      </div>

      <!-- Signatures & Official Stamp Row -->
      <div style="display: flex; justify-content: space-between; align-items: flex-end; padding-top: 14px; border-top: 1px dashed #cbd5e1; margin-bottom: 12px;">
        
        <!-- Recipient / Client Signature (Right in RTL) -->
        <div style="width: 45%; text-align: center;">
          <p style="margin: 0; font-size: 13px; color: #475569; font-weight: 800;">توقيع المستلم / العميل</p>
          <div style="margin-top: 28px; border-b: 2px dashed #94a3b8; height: 1px; width: 80%; margin-left: auto; margin-right: auto;"></div>
          <span style="color: #94a3b8; font-size: 10px; display: block; margin-top: 6px; font-family: monospace;">التوقيع / البصمة</span>
        </div>

        <!-- Accountant / Supervisor Signature & Official Stamp (Left in RTL) -->
        <div style="width: 45%; text-align: center; position: relative;">
          <p style="margin: 0; font-size: 13px; color: #475569; font-weight: 800;">المحاسب / المشرف المسؤول</p>
          
          <!-- Official Blue Circular Stamp Graphic -->
          <div style="position: absolute; top: -18px; left: 10px; width: 95px; height: 95px; pointer-events: none; opacity: 0.92; transform: rotate(-8deg);">
            <svg viewBox="0 0 200 200" width="95" height="95">
              <circle cx="100" cy="100" r="94" fill="none" stroke="#1d4ed8" stroke-width="4" stroke-dasharray="6,3"/>
              <circle cx="100" cy="100" r="82" fill="none" stroke="#1d4ed8" stroke-width="2.5"/>
              <circle cx="100" cy="100" r="56" fill="none" stroke="#1d4ed8" stroke-width="1.5"/>
              
              <!-- Top Curved Text -->
              <path id="sealTop" d="M 30,100 A 70,70 0 0,1 170,100" fill="none"/>
              <text font-size="14" font-weight="900" fill="#1d4ed8" text-anchor="middle">
                <textPath href="#sealTop" startOffset="50%">شركة كيان لتنظيم الرحلات</textPath>
              </text>
              
              <!-- Center Official Text -->
              <text x="100" y="94" text-anchor="middle" font-size="12" font-weight="900" fill="#1d4ed8">سند معتمد</text>
              <text x="100" y="112" text-anchor="middle" font-size="10" font-weight="800" fill="#1d4ed8">• OFFICIAL •</text>
              
              <!-- Bottom Curved Text -->
              <path id="sealBot" d="M 170,100 A 70,70 0 0,1 30,100" fill="none"/>
              <text font-size="13" font-weight="900" fill="#1d4ed8" text-anchor="middle">
                <textPath href="#sealBot" startOffset="50%">إدارة الحسابات والمالية</textPath>
              </text>
            </svg>
          </div>

          <div style="margin-top: 24px;">
            <strong style="color: #0f172a; font-size: 14px; font-weight: 900; display: block;">
              ${voucher.supervisorName || 'إدارة مالية شركة كيان'}
            </strong>
          </div>
        </div>
      </div>

      <!-- Footnote -->
      <div style="text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #f1f5f9; padding-top: 10px; margin-top: 10px; font-weight: 600;">
        إيصال نقدية رسمي معتمد صادر من نظام كيان لإدارة الرحلات
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

/**
 * Generate Receipt or Payment Voucher PDF with exact dimensions (Never cuts off content)
 */
export const generateReceiptPDF = async (
  voucher: ReceiptVoucher,
  settings: TripSettings,
  elementOrId?: HTMLElement | string | null
) => {
  const canvas = await generateReceiptCanvas(voucher, settings, elementOrId);
  if (!canvas) {
    alert('حدث خطأ أثناء إعداد السند للطباعة والتصدير');
    return;
  }

  try {
    const imgData = canvas.toDataURL('image/png');

    // Calculate exact page dimensions in millimeters to guarantee 0% cutoff
    const pdfWidthMm = 210; // Standard A4 width (210mm)
    const pdfHeightMm = Math.round((canvas.height * pdfWidthMm) / canvas.width) + 2;

    const doc = new jsPDF({
      orientation: pdfHeightMm > pdfWidthMm ? 'portrait' : 'landscape',
      unit: 'mm',
      format: [pdfWidthMm, pdfHeightMm],
    });

    doc.addImage(imgData, 'PNG', 0, 0, pdfWidthMm, pdfHeightMm);

    doc.setProperties({
      title: `سند_${voucher.voucherNumber}_${voucher.personName}`,
      subject: `إيصال استلام نقدية #${voucher.voucherNumber}`,
      author: settings.companyNameAr || 'KAYAN Events',
      creator: 'KAYAN Management System',
    });

    doc.save(`KAYAN_Voucher_${voucher.voucherNumber}.pdf`);
  } catch (err) {
    console.error('Error saving receipt PDF:', err);
  }
};

/**
 * Download Receipt Voucher as High-Resolution Image (HD PNG)
 */
export const exportReceiptAsHighResImage = async (
  voucher: ReceiptVoucher,
  settings: TripSettings,
  elementOrId?: HTMLElement | string | null
): Promise<{ success: boolean; filename: string; dataUrl?: string }> => {
  const filename = `KAYAN_Voucher_${voucher.voucherNumber}_${voucher.personName}.png`;

  try {
    const canvas = await generateReceiptCanvas(voucher, settings, elementOrId);
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
    console.error('Error exporting receipt as high-res image:', err);
    return { success: false, filename };
  }
};

/**
 * Generate Student Digital Pass HTML Canvas (Captures exact standalone ticket pass only)
 */
export const generateStudentTicketCanvas = async (
  student: Student,
  settings: TripSettings,
  elementId?: string
): Promise<HTMLCanvasElement | null> => {
  const targetId = elementId || `kayan-digital-ticket-${student.id}`;
  const existingElement = document.getElementById(targetId);

  if (existingElement) {
    try {
      const canvas = await html2canvas(existingElement, {
        scale: 3,
        backgroundColor: '#090d16',
        useCORS: true,
        allowTaint: true,
        logging: false,
        onclone: sanitizeClonedDoc,
      });
      if (canvas) return canvas;
    } catch (err) {
      console.warn('Could not capture existing DOM ticket element, fallback to standalone container:', err);
    }
  }

  // Fallback to standalone clean container rendering ONLY the ticket pass
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '700px';
  container.style.background = '#090d16';
  container.style.color = '#f8fafc';
  container.style.direction = 'rtl';
  container.style.fontFamily = "'Tajawal', -apple-system, sans-serif";
  container.style.padding = '20px';
  container.style.boxSizing = 'border-box';

  const qrData = encodeURIComponent(
    JSON.stringify({
      ticket: student.ticketCode,
      name: student.name,
      bus: student.busNumber,
      seat: student.seatNumber || 'N/A',
      phone: student.phone,
      pickup: student.pickupPoint || '',
      status: student.paymentStatus,
    })
  );
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${qrData}`;

  const formattedDate = settings.tripDate
    ? new Date(settings.tripDate).toLocaleDateString('ar-EG', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : settings.tripDate || 'سيتم التحديد لاحقاً';

  const paymentText =
    student.isFreeTicket
      ? 'تذكرة مجانية VIP 🎁'
      : student.paymentStatus === 'paid'
      ? 'خالص السداد ✅'
      : `عربون (${(student.paidAmount || 0).toLocaleString()} ج.م)`;

  const selectedAddonsList = (settings.addons || []).filter((a) => (student.selectedAddonIds || []).includes(a.id));

  container.innerHTML = `
    <div style="position: relative; background: linear-gradient(135deg, #020617 0%, #0f172a 45%, #1e1b4b 100%); border: 2px solid #f59e0b; border-radius: 24px; padding: 24px 28px; box-shadow: 0 25px 60px rgba(0,0,0,0.85); overflow: hidden; direction: rtl; font-family: 'Tajawal', sans-serif;">
      <!-- Scalloped Notched Edges on Left and Right -->
      <div style="position: absolute; left: -8px; top: 0; bottom: 0; display: flex; flex-direction: column; justify-content: space-between; padding: 14px 0; z-index: 30; pointer-events: none;">
        <div style="width: 14px; height: 14px; border-radius: 50%; background: #090d16; border: 1px solid rgba(245, 158, 11, 0.5);"></div>
        <div style="width: 14px; height: 14px; border-radius: 50%; background: #090d16; border: 1px solid rgba(245, 158, 11, 0.5);"></div>
        <div style="width: 14px; height: 14px; border-radius: 50%; background: #090d16; border: 1px solid rgba(245, 158, 11, 0.5);"></div>
        <div style="width: 14px; height: 14px; border-radius: 50%; background: #090d16; border: 1px solid rgba(245, 158, 11, 0.5);"></div>
        <div style="width: 14px; height: 14px; border-radius: 50%; background: #090d16; border: 1px solid rgba(245, 158, 11, 0.5);"></div>
      </div>

      <div style="position: absolute; right: -8px; top: 0; bottom: 0; display: flex; flex-direction: column; justify-content: space-between; padding: 14px 0; z-index: 30; pointer-events: none;">
        <div style="width: 14px; height: 14px; border-radius: 50%; background: #090d16; border: 1px solid rgba(245, 158, 11, 0.5);"></div>
        <div style="width: 14px; height: 14px; border-radius: 50%; background: #090d16; border: 1px solid rgba(245, 158, 11, 0.5);"></div>
        <div style="width: 14px; height: 14px; border-radius: 50%; background: #090d16; border: 1px solid rgba(245, 158, 11, 0.5);"></div>
        <div style="width: 14px; height: 14px; border-radius: 50%; background: #090d16; border: 1px solid rgba(245, 158, 11, 0.5);"></div>
        <div style="width: 14px; height: 14px; border-radius: 50%; background: #090d16; border: 1px solid rgba(245, 158, 11, 0.5);"></div>
      </div>

      <!-- Primary Tear Notch Cutouts -->
      <div style="position: absolute; left: -16px; top: 50%; transform: translateY(-50%); width: 32px; height: 32px; border-radius: 50%; background: #090d16; border-right: 2px solid rgba(245, 158, 11, 0.8); z-index: 30;"></div>
      <div style="position: absolute; right: -16px; top: 50%; transform: translateY(-50%); width: 32px; height: 32px; border-radius: 50%; background: #090d16; border-left: 2px solid rgba(245, 158, 11, 0.8); z-index: 30;"></div>

      <!-- Top Header Logo & Company Info -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(245, 158, 11, 0.35); padding-bottom: 12px; margin-bottom: 12px;">
        <!-- Right: Circular Logo Badge & Company Title (In RTL: right side) -->
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="position: relative;">
            <img src="${kayanBadge}" width="52" height="52" alt="KAYAN Badge" style="border-radius: 50%; border: 2px solid #fde047; object-fit: cover; display: block; box-shadow: 0 0 12px rgba(245, 158, 11, 0.4);" />
          </div>
          <div style="text-align: right;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="font-size: 16px; font-weight: 900; color: #fde047; font-family: 'Tajawal', sans-serif;">
                ${settings.companyNameAr || 'شركة كيان لتنظيم رحلات الـ Fun Day'}
              </div>
              <span style="background: rgba(16, 185, 129, 0.2); color: #6ee7b7; border: 1px solid rgba(16, 185, 129, 0.5); font-size: 10px; padding: 2px 8px; border-radius: 6px; font-weight: 800;">
                معتمدة ✓
              </span>
            </div>
            <div style="font-size: 10px; color: #94a3b8; margin-top: 3px; font-family: 'Tajawal', sans-serif;">
              تذكرة صعود رقمية رسمية • OFFICIAL BOARDING PASS
            </div>
          </div>
        </div>

        <!-- Left: Golden Ticket Code Pill (In RTL: left side) -->
        <div style="text-align: left;">
          <div style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(217, 119, 6, 0.35) 100%); color: #fde047; border: 1.5px solid rgba(245, 158, 11, 0.7); font-size: 14px; font-weight: 900; font-family: monospace; padding: 4px 14px; border-radius: 12px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.2); text-align: center;">
            <div style="font-size: 8px; color: rgba(253, 224, 71, 0.8); font-family: 'Tajawal', sans-serif;">كود التذكرة</div>
            #${student.ticketCode}
          </div>
        </div>
      </div>

      <!-- KAYAN Official Promotional Brand Banner -->
      <div style="position: relative; margin-bottom: 14px; border-radius: 16px; overflow: hidden; border: 1px solid rgba(245, 158, 11, 0.45); height: 95px; background: #020617;">
        <img src="${kayanLogo}" style="width: 100%; height: 100%; object-fit: cover; object-position: center; display: block; opacity: 0.95;" alt="KAYAN Banner" />
        <div style="position: absolute; inset: 0; background: linear-gradient(0deg, rgba(2,6,23,0.9) 0%, rgba(2,6,23,0.1) 50%, rgba(2,6,23,0.4) 100%); pointer-events: none;"></div>
        
        <div style="position: absolute; bottom: 8px; right: 12px; left: 12px; display: flex; justify-content: space-between; align-items: center; pointer-events: none;">
          <span style="background: rgba(2,6,23,0.85); color: #fde047; border: 1px solid rgba(245, 158, 11, 0.5); font-size: 11px; font-weight: 900; padding: 4px 12px; border-radius: 10px;">
            ✨ ${settings.tripName || 'رحلات وفاعليات كيان الرسمية'}
          </span>
          <span style="background: rgba(2,6,23,0.85); color: #cbd5e1; border: 1px solid #334155; font-size: 10px; font-family: monospace; padding: 4px 10px; border-radius: 8px; letter-spacing: 1px;">
            KAYAN TOURS & EVENTS
          </span>
        </div>
      </div>

      <!-- Main Content Grid: Main Details (Right in RTL) + Stub (Left in RTL) -->
      <div style="display: flex; gap: 16px; align-items: stretch; direction: rtl;">
        <!-- Right Section: Student & Trip Details -->
        <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between; text-align: right;">
          <!-- Student Header -->
          <div style="margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
              <span style="font-size: 11px; color: #94a3b8; font-weight: 600;">المسافر:</span>
              <span style="font-size: 11px; color: #94a3b8; font-family: monospace;">هاتف: <strong style="color: #e2e8f0;">${student.phone}</strong></span>
            </div>
            <div style="font-size: 24px; font-weight: 900; color: #ffffff; margin-top: 1px; line-height: 1.2; font-family: 'Tajawal', sans-serif;">
              ${student.name}
            </div>
            ${
              student.faculty || student.customRole
                ? `
            <div style="font-size: 13px; color: #fde047; font-weight: 700; margin-top: 2px;">
              ${student.faculty ? student.faculty : ''}
              ${student.customRole ? ` • <span style="color: #67e8f9;">${student.customRole}</span>` : ''}
            </div>
            `
                : ''
            }
          </div>

          <!-- Outer Logistics Box -->
          <div style="background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(51, 65, 85, 0.9); border-radius: 16px; padding: 12px; margin-bottom: 10px;">
            <!-- Row 1: Trip & Date -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding-bottom: 10px; border-bottom: 1px solid #1e293b;">
              <!-- Trip & Destination -->
              <div>
                <span style="color: #94a3b8; font-size: 10px; display: block;">الرحلة والوجهة:</span>
                <strong style="color: #fde047; font-size: 13px; font-weight: 900; display: block; margin-top: 2px;">${settings.tripName}</strong>
                ${settings.destination ? `<span style="color: #cbd5e1; font-size: 11px; display: block; margin-top: 2px;">${settings.destination}</span>` : ''}
              </div>

              <!-- Date & Time -->
              <div>
                <span style="color: #94a3b8; font-size: 10px; display: block;">تاريخ وتوقيت الرحلة:</span>
                <strong style="color: #ffffff; font-size: 13px; font-weight: 800; display: block; margin-top: 2px;">${formattedDate}</strong>
                ${student.departureTime ? `<span style="color: #34d399; font-size: 11px; font-weight: 700; display: block; margin-top: 2px;">${student.departureTime}</span>` : ''}
              </div>
            </div>

            <!-- Row 2: Sub-pills (Bus/Seat & Financial/Payment Status) -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding-top: 10px;">
              <!-- Bus & Seat Pill -->
              <div style="background: rgba(30, 27, 75, 0.85); border: 1px solid rgba(99, 102, 241, 0.45); border-radius: 12px; padding: 8px 12px;">
                <span style="color: #94a3b8; font-size: 10px; display: block; font-weight: 700;">الحافلة والمقعد 🚌:</span>
                <strong style="color: #ffffff; font-size: 13px; font-weight: 900; display: block; margin-top: 2px;">أتوبيس (${student.busNumber})</strong>
                <span style="color: #fde047; font-size: 12px; font-weight: 800; display: block; margin-top: 2px;">${student.seatNumber ? `مقعد رقم ${student.seatNumber}` : 'مقعد حر'}</span>
              </div>

              <!-- Financial Payment Status Pill -->
              <div style="background: rgba(30, 27, 75, 0.85); border: 1px solid rgba(99, 102, 241, 0.45); border-radius: 12px; padding: 8px 12px;">
                <span style="color: #94a3b8; font-size: 10px; display: block; font-weight: 700;">الموقف المالي والسداد 💳:</span>
                <strong style="color: #34d399; font-size: 13px; font-weight: 900; display: block; margin-top: 2px;">${paymentText}</strong>
                <span style="color: #cbd5e1; font-size: 11px; font-weight: 600; display: block; margin-top: 2px;">${student.isFreeTicket ? 'تذكرة ضيافة VIP' : student.remainingAmount > 0 ? `متبقي: ${student.remainingAmount.toLocaleString()} ج.م` : 'كامل الرسوم مسددة'}</span>
              </div>
            </div>

            <!-- Row 3: Dynamic Tshirt 👕 and Meal 🍔 Cards (Only rendered if actually included/selected) -->
            ${(() => {
              const mealInfo = getStudentMealInfo(student, settings);
              const hasTshirt = Boolean(
                student.tshirtSize &&
                student.tshirtSize !== 'none'
              );
              const hasMeal = Boolean(mealInfo.hasMeal);

              if (!hasTshirt && !hasMeal) return '';

              const isTwoCols = hasTshirt && hasMeal;
              const gridTemplate = isTwoCols ? 'grid-template-columns: 1fr 1fr;' : 'grid-template-columns: 1fr;';

              return `
                <div style="display: grid; ${gridTemplate} gap: 10px; margin-top: 8px;">
                  ${
                    hasTshirt
                      ? `
                    <!-- Tshirt Status Box -->
                    <div style="background: rgba(2, 6, 23, 0.85); border: 1px solid rgba(168, 85, 247, 0.4); border-radius: 12px; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
                      <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 14px;">👕</span>
                        <div>
                          <span style="color: #94a3b8; font-size: 9.5px; display: block;">تيشيرت الفعالية:</span>
                          <strong style="color: #d8b4fe; font-weight: 900; font-size: 11.5px;">
                            مقاس (${student.tshirtSize || 'L'})
                          </strong>
                        </div>
                      </div>
                      <div>
                        <span style="background: rgba(168, 85, 247, 0.2); color: #d8b4fe; border: 1px solid rgba(168, 85, 247, 0.5); font-size: 9px; padding: 2px 6px; border-radius: 4px; font-weight: 800;">
                          ${student.tshirtReceived ? '✅ تم الاستلام' : 'مشمول بالحجز 🎫'}
                        </span>
                      </div>
                    </div>
                  `
                      : ''
                  }

                  ${
                    hasMeal
                      ? `
                    <!-- Meal Status Box -->
                    <div style="background: rgba(2, 6, 23, 0.85); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 12px; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
                      <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 14px;">🍔</span>
                        <div>
                          <span style="color: #94a3b8; font-size: 9.5px; display: block;">وجبة الغداء:</span>
                          <strong style="color: #fde047; font-weight: 900; font-size: 11.5px;">
                            ${mealInfo.mealName}
                          </strong>
                        </div>
                      </div>
                      <div>
                        <span style="background: rgba(245, 158, 11, 0.2); color: #fde047; border: 1px solid rgba(245, 158, 11, 0.5); font-size: 9px; padding: 2px 6px; border-radius: 4px; font-weight: 800; white-space: nowrap;">
                          ${student.mealReceived ? '✅ تم الاستلام' : 'مشمولة بالحجز 🎫'}
                        </span>
                      </div>
                    </div>
                  `
                      : ''
                  }
                </div>
              `;
            })()}

            <!-- Optional Extra Unique Addons if selected -->
            ${(() => {
              const uniqueOtherAddons = selectedAddonsList.filter(
                (a) =>
                  !a.name.includes('وجب') &&
                  !a.name.includes('وجبة') &&
                  !a.name.includes('غداء') &&
                  !a.name.includes('تيشرت') &&
                  !a.name.includes('تي شيرت')
              );

              if (uniqueOtherAddons.length === 0) return '';

              return `
              <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #1e293b; display: flex; gap: 6px; flex-wrap: wrap; align-items: center;">
                <span style="color: #a5b4fc; font-size: 10px; font-weight: 700;">⚡ الإضافات والخدمات المخصصة:</span>
                ${uniqueOtherAddons
                  .map(
                    (a) =>
                      `<span style="background: rgba(99, 102, 241, 0.2); color: #c7d2fe; border: 1px solid rgba(99, 102, 241, 0.4); font-size: 10px; padding: 1px 6px; border-radius: 4px; font-weight: 700;">✓ ${a.name}</span>`
                  )
                  .join('')}
              </div>
            `;
            })()}

            <!-- Companion Details if present -->
            ${
              student.hasCompanion && student.companionName
                ? `
              <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #1e293b; font-size: 11px; color: #cbd5e1; display: flex; justify-content: space-between;">
                <span>👥 مرافق الحجز: <strong style="color: #ffffff;">${student.companionName}</strong></span>
                <span style="color: #fde047;">${student.companionSeatNumber ? `مقعد #${student.companionSeatNumber}` : ''} (${student.companionTShirtSize || 'L'})</span>
              </div>
            `
                : ''
            }
          </div>

          <!-- Full-Width Bottom Bar with Pickup, National ID & Emergency -->
          ${
            Boolean(student.pickupPoint || student.nationalId || student.emergencyPhone)
              ? `
          <div style="background: #020617; border: 1px solid rgba(245, 158, 11, 0.45); border-radius: 12px; padding: 8px 14px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; flex-wrap: wrap; gap: 8px;">
            ${
              student.pickupPoint
                ? `
            <div style="color: #cbd5e1; display: flex; align-items: center; gap: 4px;">
              <span>📍 التجمع:</span>
              <strong style="color: #fde047;">${student.pickupPoint}</strong>
            </div>
            `
                : `
            <div style="color: #94a3b8; font-family: monospace; font-size: 11px;">
              KYN-${student.ticketCode}
            </div>
            `
            }

            <div style="display: flex; align-items: center; gap: 12px;">
              ${
                student.nationalId
                  ? `
                <div style="color: #cbd5e1; font-family: monospace; display: flex; align-items: center; gap: 4px;">
                  <span style="background: #3b82f6; color: white; padding: 1px 4px; border-radius: 4px; font-size: 9px; font-weight: 900;">ID</span>
                  <span>القومي:</span>
                  <strong style="color: #ffffff;">${student.nationalId}</strong>
                </div>
              `
                  : ''
              }

              ${
                student.emergencyPhone
                  ? `
                <div style="color: #cbd5e1; font-family: monospace; display: flex; align-items: center; gap: 4px;">
                  <span style="color: #f43f5e;">📞 طوارئ:</span>
                  <strong style="color: #ffffff;">${student.emergencyPhone}</strong>
                </div>
              `
                  : ''
              }
            </div>
          </div>
          `
              : ''
          }
        </div>

        <!-- Left Section: White QR Code Box & Barcode Graphic (Verification Stub) -->
        <div style="width: 180px; background: rgba(15, 23, 42, 0.7); border-radius: 18px; padding: 12px; border: 2px dashed rgba(245, 158, 11, 0.45); display: flex; flex-direction: column; align-items: center; justify-content: space-between; text-align: center;">
          <!-- White QR Box -->
          <div style="background: #ffffff; padding: 8px; border-radius: 14px; border: 2px solid #f59e0b; box-shadow: 0 8px 20px rgba(0,0,0,0.5); text-align: center; width: 100%; box-sizing: border-box;">
            <img src="${qrUrl}" width="125" height="125" alt="QR Code" style="display: block; margin: 0 auto;" />
            <div style="font-size: 11px; font-weight: 900; font-family: monospace; color: #020617; margin-top: 4px;">
              KYN - ${student.ticketCode}
            </div>
          </div>

          <!-- Official Verification Tag -->
          <div style="font-size: 11px; color: #34d399; font-weight: 800; margin: 4px 0;">
            ✓ تذكرة صعود إلكترونية معتمدة
          </div>

          <!-- Barcode Graphic Strip -->
          <div style="width: 100%; background: #020617; border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 8px; padding: 6px 4px; text-align: center;">
            <div style="display: flex; justify-content: center; align-items: center; gap: 2px; height: 18px;">
              <div style="width: 2px; height: 100%; background: #f8fafc;"></div>
              <div style="width: 4px; height: 100%; background: #f8fafc;"></div>
              <div style="width: 1px; height: 100%; background: #f8fafc;"></div>
              <div style="width: 3px; height: 100%; background: #f8fafc;"></div>
              <div style="width: 1px; height: 100%; background: #f8fafc;"></div>
              <div style="width: 5px; height: 100%; background: #f8fafc;"></div>
              <div style="width: 2px; height: 100%; background: #f8fafc;"></div>
              <div style="width: 1px; height: 100%; background: #f8fafc;"></div>
              <div style="width: 4px; height: 100%; background: #f8fafc;"></div>
              <div style="width: 2px; height: 100%; background: #f8fafc;"></div>
              <div style="width: 6px; height: 100%; background: #f8fafc;"></div>
              <div style="width: 1px; height: 100%; background: #f8fafc;"></div>
              <div style="width: 3px; height: 100%; background: #f8fafc;"></div>
              <div style="width: 2px; height: 100%; background: #f8fafc;"></div>
              <div style="width: 5px; height: 100%; background: #f8fafc;"></div>
              <div style="width: 2px; height: 100%; background: #f8fafc;"></div>
              <div style="width: 4px; height: 100%; background: #f8fafc;"></div>
              <div style="width: 1px; height: 100%; background: #f8fafc;"></div>
              <div style="width: 3px; height: 100%; background: #f8fafc;"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 3,
      backgroundColor: '#090d16',
      useCORS: true,
      allowTaint: true,
      logging: false,
      onclone: sanitizeClonedDoc,
    });
    return canvas;
  } catch (err) {
    console.error('Error generating fallback ticket canvas:', err);
    return null;
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
};

/**
 * Generate Student Digital Pass PDF as Blob & File with luxury styling & barcode layout
 */
export const generateStudentTicketPDFBlob = async (
  student: Student,
  settings: TripSettings,
  elementId?: string
): Promise<{ blob: Blob; file: File; filename: string } | null> => {
  const filename = `KAYAN_Ticket_${student.ticketCode}_${student.name}.pdf`;

  const canvas = await generateStudentTicketCanvas(student, settings, elementId);
  if (!canvas) return null;

  try {
    const imgData = canvas.toDataURL('image/png');
    
    // High-res PDF with exact ticket pass dimensions matching visual preview
    const ticketWidth = 175;
    const ticketHeight = (canvas.height * ticketWidth) / canvas.width;
    const orientation = ticketHeight >= ticketWidth ? 'portrait' : 'landscape';

    const doc = new jsPDF({
      orientation: orientation,
      unit: 'mm',
      format: [ticketWidth, ticketHeight],
    });

    doc.addImage(imgData, 'PNG', 0, 0, ticketWidth, ticketHeight);

    doc.setProperties({
      title: `تذكرة ${student.name} - ${settings.companyNameAr || 'شركة كيان'}`,
      subject: `تذكرة رقمية #${student.ticketCode}`,
      author: settings.companyNameAr || 'KAYAN Events',
      keywords: 'KAYAN, Ticket, Boarding Pass',
      creator: 'KAYAN Events System',
    });

    const pdfBlob = doc.output('blob');
    const file = new File([pdfBlob], filename, { type: 'application/pdf' });

    return { blob: pdfBlob, file, filename };
  } catch (err) {
    console.error('Error constructing jsPDF object:', err);
    return null;
  }
};

/**
 * Download Student Digital Pass PDF directly
 */
export const generateStudentTicketPDF = async (
  student: Student,
  settings: TripSettings,
  elementId?: string
) => {
  const result = await generateStudentTicketPDFBlob(student, settings, elementId);
  if (result) {
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
};

/**
 * Download Student Digital Pass as High-Resolution Image (HD PNG) directly to user's device Downloads
 */
export const exportTicketAsHighResImage = async (
  student: Student,
  settings: TripSettings,
  elementId?: string
): Promise<{ success: boolean; filename: string; blob?: Blob; dataUrl?: string }> => {
  const filename = `KAYAN_Ticket_${student.ticketCode}_${student.name}.png`;

  try {
    const canvas = await generateStudentTicketCanvas(student, settings, elementId);
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
            blob,
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
    console.error('Error exporting ticket as high-res image:', err);
    return { success: false, filename };
  }
};

/**
 * Helper to convert numbers to Arabic words (Tafqeet) for Egyptian currency
 */
const numberToArabicCurrencyWords = (num: number): string => {
  if (!num || isNaN(num) || num === 0) return 'صفر جنيه مصري';
  
  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مئتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

  const convertGroup = (n: number): string => {
    let res = '';
    const h = Math.floor(n / 100);
    const remainder = n % 100;
    if (h > 0) {
      res += hundreds[h];
    }
    if (remainder > 0) {
      if (res) res += ' و';
      if (remainder < 20) {
        res += ones[remainder];
      } else {
        const t = Math.floor(remainder / 10);
        const o = remainder % 10;
        if (o > 0) {
          res += ones[o] + ' و' + tens[t];
        } else {
          res += tens[t];
        }
      }
    }
    return res;
  };

  let n = Math.floor(Math.abs(num));
  if (n === 0) return 'صفر جنيه مصري';

  const parts: string[] = [];

  const millions = Math.floor(n / 1000000);
  n %= 1000000;
  const thousands = Math.floor(n / 1000);
  n %= 1000;
  const units = n;

  if (millions > 0) {
    if (millions === 1) parts.push('مليون');
    else if (millions === 2) parts.push('مليونان');
    else if (millions >= 3 && millions <= 10) parts.push(`${convertGroup(millions)} ملايين`);
    else parts.push(`${convertGroup(millions)} مليون`);
  }

  if (thousands > 0) {
    if (thousands === 1) parts.push('ألف');
    else if (thousands === 2) parts.push('ألفان');
    else if (thousands >= 3 && thousands <= 10) parts.push(`${convertGroup(thousands)} آلاف`);
    else parts.push(`${convertGroup(thousands)} ألف`);
  }

  if (units > 0) {
    parts.push(convertGroup(units));
  }

  return parts.join(' و') + ' جنيه مصري لا غير';
};

/**
 * Generate Ultra-High Quality, Official PDF Voucher for Main Treasury Transfer (سند تحويل وقيد الخزنة الرئيسية المعتمد)
 */
export const generateTreasuryTransferPDF = async (
  transfer: TreasuryTransfer,
  companyName = 'شركة كيان لتنظيم الفعاليات والرحلات'
) => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '820px';
  container.style.background = '#ffffff';
  container.style.color = '#0f172a';
  container.style.direction = 'rtl';
  container.style.fontFamily = "'Tajawal', -apple-system, sans-serif";
  container.style.padding = '22px';
  container.style.boxSizing = 'border-box';

  const isWithdrawal = transfer.type === 'direct_withdrawal';
  const typeText =
    transfer.type === 'trip_final_profit'
      ? 'سند تحويل وتوريد صافي أرباح رحلة مكتملة'
      : transfer.type === 'partial_cash_out'
      ? 'سند تصفية وتوريد سيولة نقدية جزئية من الرحلة'
      : transfer.type === 'direct_deposit'
      ? 'سند إيداع نقدي مباشر في الخزنة الرئيسية'
      : 'سند صرف وسحب مصروفات من الخزنة الرئيسية';

  const badgeColor = isWithdrawal ? '#be123c' : '#047857';
  const badgeBg = isWithdrawal ? '#fff1f2' : '#ecfdf5';
  const badgeBorder = isWithdrawal ? '#fecdd3' : '#a7f3d0';

  const amountNumber = transfer.amount ?? 0;
  const tafqeetText = numberToArabicCurrencyWords(amountNumber);

  container.innerHTML = `
    <div style="border: 3px double #d97706; padding: 20px; border-radius: 14px; background: #ffffff; position: relative; box-shadow: inset 0 0 0 1px #e2e8f0;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #ffffff; padding: 16px 20px; border-radius: 10px; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; border: 1px solid #334155;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <img src="${kayanBadge}" width="60" height="60" alt="KAYAN Badge" style="border-radius: 10px; border: 2px solid #f59e0b; object-fit: cover;" />
          <div style="text-align: right;">
            <div style="font-size: 11px; font-weight: 800; color: #fbbf24; letter-spacing: 0.5px;">KAYAN TREASURY • الإدارة العامة للخزينة</div>
            <h1 style="margin: 2px 0 0 0; font-size: 20px; font-weight: 900; color: #ffffff;">${companyName}</h1>
            <p style="margin: 2px 0 0 0; font-size: 11.5px; font-weight: 700; color: #94a3b8;">منظومة الإدارة المالية والرقابة المحاسبية المركزية</p>
          </div>
        </div>
        <div style="text-align: left; background: rgba(255, 255, 255, 0.08); padding: 8px 16px; border-radius: 8px; border: 1px solid rgba(245, 158, 11, 0.4);">
          <div style="font-size: 10px; color: #cbd5e1;">رقم السند المرجعي:</div>
          <div style="font-size: 14px; font-weight: 900; color: #fbbf24; font-family: monospace; letter-spacing: 0.5px;">#${transfer.referenceNumber}</div>
          <div style="font-size: 9.5px; color: #94a3b8; margin-top: 2px;">تاريخ القيد: ${transfer.date} ${transfer.time}</div>
        </div>
      </div>

      <!-- Voucher Title & Category Badge -->
      <div style="display: flex; justify-content: space-between; align-items: center; background: #fffbeb; border: 1.5px solid #fde68a; padding: 9px 16px; border-radius: 8px; margin-bottom: 14px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 13px; font-weight: 900; color: #92400e;">نوع السند:</span>
          <span style="background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder}; padding: 3px 10px; border-radius: 6px; font-size: 12px; font-weight: 900;">
            ${typeText}
          </span>
        </div>
        <div style="font-size: 11px; font-weight: 800; color: #78350f;">
          الحالة: <span style="color: #047857;">مقيد ومطابق دفترياً ✓</span>
        </div>
      </div>

      <!-- Amount Box (Featured) -->
      <div style="background: ${isWithdrawal ? '#fff1f2' : '#fef3c7'}; border: 2px solid ${isWithdrawal ? '#f43f5e' : '#f59e0b'}; padding: 14px 18px; border-radius: 10px; margin-bottom: 14px; text-align: center;">
        <div style="font-size: 12px; font-weight: 800; color: ${isWithdrawal ? '#9f1239' : '#92400e'}; margin-bottom: 2px;">
          المبلغ الصافي المقيد بالسند (${isWithdrawal ? 'سحب / منصرف' : 'إيداع / وارد'}):
        </div>
        <div style="font-size: 26px; font-weight: 900; color: ${isWithdrawal ? '#be123c' : '#b45309'}; font-family: monospace; letter-spacing: 0.5px;">
          ${isWithdrawal ? '-' : '+'}${amountNumber.toLocaleString()} ج.م
        </div>
        <div style="font-size: 12.5px; font-weight: 800; color: ${isWithdrawal ? '#881337' : '#78350f'}; margin-top: 4px; border-top: 1px dashed ${isWithdrawal ? '#fecdd3' : '#fde68a'}; padding-top: 4px;">
          [ فقط ${tafqeetText} ]
        </div>
      </div>

      <!-- Details Matrix Table -->
      <table style="width: 100%; border-collapse: collapse; text-align: right; font-size: 11.5px; margin-bottom: 16px; border: 1px solid #cbd5e1;">
        <tbody>
          <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px 12px; width: 25%; font-weight: 800; color: #475569; border-left: 1px solid #e2e8f0;">الرحلة / المصدر:</td>
            <td style="padding: 8px 12px; font-weight: 900; color: #0f172a;">${transfer.tripName || 'الخزنة المركزية الرئيسية'}</td>
            <td style="padding: 8px 12px; width: 20%; font-weight: 800; color: #475569; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">المسؤول المنفذ:</td>
            <td style="padding: 8px 12px; font-weight: 900; color: #0f172a;">${transfer.transferredBy}</td>
          </tr>
          <tr style="background: #ffffff; border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px 12px; font-weight: 800; color: #475569; border-left: 1px solid #e2e8f0;">طبيعة العملية:</td>
            <td style="padding: 8px 12px; font-weight: 800; color: ${isWithdrawal ? '#be123c' : '#047857'};">${typeText}</td>
            <td style="padding: 8px 12px; font-weight: 800; color: #475569; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">الحساب المودع إليه:</td>
            <td style="padding: 8px 12px; font-weight: 900; color: #1e293b;">الخزنة الرئيسية (KAYAN Master Treasury)</td>
          </tr>
          <tr style="background: #f8fafc;">
            <td style="padding: 8px 12px; font-weight: 800; color: #475569; border-left: 1px solid #e2e8f0; vertical-align: top;">البيان والملاحظات:</td>
            <td colspan="3" style="padding: 8px 12px; color: #334155; font-size: 11px; line-height: 1.6;">
              ${transfer.notes || 'تم ترحيل وقيد المبلغ بالخزنة المركزية وفقاً للأصول المحاسبية المعتمدة للشركة.'}
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Signatures & Seal Section -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-top: 2px solid #0f172a; padding-top: 14px; margin-top: 12px;">
        <div style="width: 32%; text-align: center;">
          <p style="margin: 0; font-size: 11px; font-weight: 800; color: #475569;">إعداد وأمين الخزنة</p>
          <strong style="display: block; margin-top: 4px; font-size: 12px; color: #0f172a;">${transfer.transferredBy}</strong>
          <div style="margin-top: 14px; border-bottom: 2px dashed #cbd5e1; width: 75%; margin-left: auto; margin-right: auto;"></div>
          <span style="font-size: 9.5px; color: #94a3b8; font-family: monospace; display: block; margin-top: 3px;">توقيع المسؤول</span>
        </div>

        <div style="width: 34%; text-align: center;">
          <div style="display: inline-block; border: 2px solid #d97706; background: #fffbeb; padding: 8px 14px; border-radius: 10px;">
            <div style="font-size: 11px; font-weight: 900; color: #b45309;">خاتم الخزنة المركزية</div>
            <div style="font-size: 9.5px; color: #047857; font-weight: 800; margin-top: 2px;">✓ معتمد ومقيد 2026</div>
          </div>
        </div>

        <div style="width: 32%; text-align: center;">
          <p style="margin: 0; font-size: 11px; font-weight: 800; color: #475569;">اعتماد الإدارة العامة والمالية</p>
          <strong style="display: block; margin-top: 4px; font-size: 12px; color: #0f172a;">شركة كيان للفعاليات</strong>
          <div style="margin-top: 14px; border-bottom: 2px dashed #cbd5e1; width: 75%; margin-left: auto; margin-right: auto;"></div>
          <span style="font-size: 9.5px; color: #94a3b8; font-family: monospace; display: block; margin-top: 3px;">الختم والتوقيع الرسمي</span>
        </div>
      </div>

      <!-- Security / Footer Bar -->
      <div style="margin-top: 12px; text-align: center; font-size: 9.5px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 6px;">
        سند مالي إلكتروني رسمي ومؤمن صادر من منظومة الخزنة المركزية لشركة كيان • المرجع: ${transfer.referenceNumber}
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2.5,
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: true,
      logging: false,
      onclone: sanitizeClonedDoc,
    });

    const imgData = canvas.toDataURL('image/png');
    
    // Fit on A4 Portrait page with standard safe margins so nothing is ever truncated
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
    const pageHeight = doc.internal.pageSize.getHeight(); // 297mm

    const margin = 12;
    const maxW = pageWidth - (margin * 2);
    const maxH = pageHeight - (margin * 2);

    let renderW = maxW;
    let renderH = (canvas.height * renderW) / canvas.width;

    if (renderH > maxH) {
      renderH = maxH;
      renderW = (canvas.width * renderH) / canvas.height;
    }

    const posX = margin + (maxW - renderW) / 2;
    const posY = margin + (maxH - renderH) / 2;

    doc.addImage(imgData, 'PNG', posX, posY, renderW, renderH);
    doc.save(`KAYAN_Treasury_Transfer_${transfer.referenceNumber}.pdf`);
    return true;
  } catch (err) {
    console.error('Error generating treasury transfer PDF:', err);
    fallbackPrintElement(container, transfer.referenceNumber);
    return false;
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
};

/**
 * Capture an existing DOM element (e.g. visual ticket card) and download it as PNG image directly to user's device
 */
export const exportTicketElementAsPNG = async (elementId: string, fileName: string): Promise<boolean> => {
  const element = document.getElementById(elementId);
  if (!element) return false;
  try {
    const canvas = await html2canvas(element, {
      scale: 3,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#090d16',
      logging: false,
      onclone: sanitizeClonedDoc,
    });

    const downloadFileName = fileName.endsWith('.png') ? fileName : `${fileName}.png`;

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = downloadFileName;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          setTimeout(() => {
            if (document.body.contains(link)) {
              document.body.removeChild(link);
            }
            URL.revokeObjectURL(url);
          }, 2000);
          resolve(true);
        } else {
          // Fallback to data URL
          const image = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.href = image;
          link.download = downloadFileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          resolve(true);
        }
      }, 'image/png', 1.0);
    });
  } catch (err) {
    console.error('Error exporting ticket element as PNG:', err);
    return false;
  }
};

/**
 * Copy visual ticket element image to clipboard so operator can hit Ctrl+V directly in WhatsApp Web
 */
export const copyTicketElementToClipboard = async (elementId: string): Promise<boolean> => {
  const element = document.getElementById(elementId);
  if (!element) return false;
  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: null,
      logging: false,
      onclone: sanitizeClonedDoc,
    });

    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          resolve(false);
          return;
        }
        try {
          if (navigator.clipboard && window.ClipboardItem) {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob }),
            ]);
            resolve(true);
          } else {
            resolve(false);
          }
        } catch (e) {
          console.error('Clipboard write error:', e);
          resolve(false);
        }
      });
    });
  } catch (err) {
    console.error('Error copying ticket image:', err);
    return false;
  }
};

/**
 * Generate Ultra-High Quality, Official Printable & PDF Manifest for Bus (كشف ركاب وتسكين الأتوبيس المعتمد)
 */
export const generateBusManifestPDF = async (
  busNumber: number | 'all',
  students: Student[],
  driver: DriverInfo | undefined,
  settings: TripSettings
): Promise<boolean> => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '1200px';
  container.style.background = '#ffffff';
  container.style.color = '#0f172a';
  container.style.direction = 'rtl';
  container.style.fontFamily = "'Tajawal', -apple-system, sans-serif";
  container.style.padding = '24px';
  container.style.boxSizing = 'border-box';

  const busStudents = [...students].sort((a, b) => {
    if (a.busNumber !== b.busNumber) return a.busNumber - b.busNumber;
    return (a.seatNumber || 999) - (b.seatNumber || 999);
  });
  
  // Calculate summary counts
  const totalPassengers = busStudents.length;
  const departureChecked = busStudents.filter((s) => s.checkInDeparture).length;
  const returnChecked = busStudents.filter((s) => s.checkInReturn).length;
  const mealsReserved = busStudents.filter((s) => getStudentMealInfo(s, settings).hasMeal).length;
  const tshirtsNeeded = busStudents.filter((s) => s.tshirtSize && s.tshirtSize !== 'none').length;
  const totalRemaining = busStudents.reduce((acc, s) => acc + (s.remainingAmount || 0), 0);

  const formattedDate = settings.tripDate
    ? new Date(settings.tripDate).toLocaleDateString('ar-EG', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : settings.tripDate || '2026-08-15';

  container.innerHTML = `
    <div style="border: 2px solid #0f172a; border-radius: 16px; padding: 20px; background: #ffffff; position: relative;">
      <!-- Header Bar -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #d97706; padding-bottom: 14px; margin-bottom: 14px;">
        <!-- Right: Logo & Company -->
        <div style="display: flex; align-items: center; gap: 14px;">
          <img src="${kayanBadge}" width="60" height="60" alt="KAYAN Badge" style="border-radius: 50%; border: 2px solid #f59e0b; object-fit: cover;" />
          <div>
            <div style="font-size: 18px; font-weight: 900; color: #0f172a; font-family: 'Tajawal', sans-serif;">
              ${settings.companyNameAr || 'شركة كيان لتنظيم الرحلات والفعاليات الرسمية'}
            </div>
            <div style="font-size: 11px; color: #64748b; font-weight: 700; margin-top: 2px;">
              KAYAN EVENTS & TOURS • كشف ركاب وصعود الحافلات المعتمد • ترخيص: 98231
            </div>
          </div>
        </div>

        <!-- Center: Manifest Title -->
        <div style="text-align: center;">
          <div style="background: #0f172a; color: #fde047; padding: 6px 18px; border-radius: 10px; font-size: 16px; font-weight: 900; letter-spacing: 0.5px; display: inline-block;">
            ${busNumber === 'all' ? 'كشف صعود وتسكين جميع الحافلات 🚌' : `كشف ركاب وتسكين حافلة رقم (${busNumber}) 🚌`}
          </div>
          <div style="font-size: 11px; color: #475569; font-weight: 800; margin-top: 4px;">
            كشف تحضير الحضور وتفقد المقاعد مع خانات التوقيع الورقية
          </div>
        </div>

        <!-- Left: Trip Destination & Date -->
        <div style="text-align: left; background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 14px; border-radius: 10px; font-size: 11px;">
          <div><span style="color: #64748b; font-weight: 700;">الرحلة:</span> <strong style="color: #0f172a; font-size: 12px;">${settings.tripName}</strong></div>
          <div style="margin-top: 3px;"><span style="color: #64748b; font-weight: 700;">الوجهة:</span> <strong style="color: #0f172a;">${settings.destination || 'فايد - العين السخنة'}</strong></div>
          <div style="margin-top: 3px;"><span style="color: #64748b; font-weight: 700;">التاريخ:</span> <strong style="color: #0f172a;">${formattedDate}</strong></div>
        </div>
      </div>

      <!-- Driver & Supervisor Info Banner (if single bus) -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 14px; margin-bottom: 14px; font-size: 11px;">
        <div>
          <span style="color: #64748b; display: block; font-weight: 700;">الكابتن السائق:</span>
          <strong style="color: #0f172a; font-size: 13px; display: block; margin-top: 2px;">${driver?.driverName || 'كابتن الأتوبيس'}</strong>
          <span style="color: #475569; font-family: monospace; font-weight: 700;">${driver?.driverPhone || '—'}</span>
        </div>
        <div>
          <span style="color: #64748b; display: block; font-weight: 700;">لوحات الحافلة والسعة:</span>
          <strong style="color: #0f172a; font-size: 13px; display: block; margin-top: 2px;">${driver?.busPlateNumber || 'سياحة خاصة'}</strong>
          <span style="color: #475569; font-weight: 700;">السعة: ${driver?.capacity || 50} راكب</span>
        </div>
        <div>
          <span style="color: #64748b; display: block; font-weight: 700;">مشرف الحافلة (كيان):</span>
          <strong style="color: #0f172a; font-size: 13px; display: block; margin-top: 2px;">${driver?.supervisorName || 'تيم إشراف كيان'}</strong>
          <span style="color: #475569; font-family: monospace; font-weight: 700;">${driver?.supervisorPhone || settings.supportPhone}</span>
        </div>
        <div>
          <span style="color: #64748b; display: block; font-weight: 700;">التجمع وموعد التحرك:</span>
          <strong style="color: #0f172a; font-size: 12px; display: block; margin-top: 2px;">${settings.assemblyLocation || 'جامع الاستاد - كفرالشيخ'}</strong>
          <span style="color: #059669; font-weight: 800;">تجمع 04:00 ص • تحرك 04:30 ص</span>
        </div>
      </div>

      <!-- Quick KPI Metric Chips Bar -->
      <div style="display: flex; justify-content: space-between; align-items: center; background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 8px 14px; margin-bottom: 14px; font-size: 11px; font-weight: 800; color: #92400e;">
        <div>👥 الركاب المسجلين: <strong style="color: #0f172a; font-size: 13px;">${totalPassengers}</strong> راكب</div>
        <div>🚌 حضور الذهاب: <strong style="color: #047857; font-size: 13px;">${departureChecked} / ${totalPassengers}</strong></div>
        <div>🔄 حضور العودة: <strong style="color: #047857; font-size: 13px;">${returnChecked} / ${totalPassengers}</strong></div>
        <div>🍔 الوجبات: <strong style="color: #0f172a; font-size: 13px;">${mealsReserved}</strong> وجبة</div>
        <div>👕 التيشرتات: <strong style="color: #0f172a; font-size: 13px;">${tshirtsNeeded}</strong> قطعة</div>
        <div>💵 متبقيات للتحصيل: <strong style="color: #b91c1c; font-size: 13px;">${totalRemaining.toLocaleString()} ج.م</strong></div>
      </div>

      <!-- Passenger Manifest Table -->
      <table style="width: 100%; border-collapse: collapse; text-align: right; font-size: 10px; border: 1px solid #cbd5e1;">
        <thead>
          <tr style="background: #0f172a; color: #ffffff; font-weight: 900; line-height: 1.6;">
            <th style="padding: 6px 3px; text-align: center; border: 1px solid #334155; width: 26px;">م</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 44px; color: #fde047;">المقعد</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 62px;">الكود</th>
            <th style="padding: 6px 6px; border: 1px solid #334155;">اسم المسافر / الطالب</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 45px; color: #fde047;">الباص</th>
            <th style="padding: 6px 4px; border: 1px solid #334155; width: 80px;">رقم الهاتف</th>
            <th style="padding: 6px 4px; border: 1px solid #334155; width: 80px;">هاتف الطوارئ / الكلية</th>
            <th style="padding: 6px 4px; border: 1px solid #334155; width: 85px;">نقطة التجمع / تفاصيل التكت</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 50px; background: #064e3b;">صعود الذهاب</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 50px; background: #064e3b;">صعود العودة</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 60px;">المالية</th>
            <th style="padding: 6px 6px; text-align: center; border: 1px solid #334155; width: 75px;">توقيع المشرف ✍️</th>
          </tr>
        </thead>
        <tbody>
          ${busStudents
            .map((s, idx) => {
              const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
              const isPaid = s.paymentStatus === 'paid' || s.isFreeTicket;
              return `
                <tr style="background: ${bg}; border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 4px 2px; text-align: center; font-weight: 700; color: #64748b; border: 1px solid #e2e8f0;">${idx + 1}</td>
                  <td style="padding: 4px 2px; text-align: center; font-weight: 900; font-family: monospace; font-size: 11px; color: #b45309; background: #fffbeb; border: 1px solid #e2e8f0;">
                    ${s.seatNumber ? `#${s.seatNumber}` : '—'}
                  </td>
                  <td style="padding: 4px 2px; text-align: center; font-family: monospace; font-weight: 800; color: #1e1b4b; border: 1px solid #e2e8f0;">
                    ${s.ticketCode}
                  </td>
                  <td style="padding: 4px 5px; font-weight: 800; color: #0f172a; border: 1px solid #e2e8f0;">
                    ${s.name}
                    ${s.isFreeTicket ? '<span style="color: #059669; font-size: 8.5px; font-weight: 900; margin-right: 4px;">(VIP 🎁)</span>' : ''}
                    ${s.customRole && s.customRole !== 'طالب' ? `<span style="color: #2563eb; font-size: 8.5px; margin-right: 3px;">[${s.customRole}]</span>` : ''}
                  </td>
                  <td style="padding: 4px 2px; text-align: center; font-weight: 800; font-family: monospace; border: 1px solid #e2e8f0;">
                    #${s.busNumber}
                  </td>
                  <td style="padding: 4px 3px; font-family: monospace; font-weight: 700; color: #334155; border: 1px solid #e2e8f0; font-size: 9.5px;">
                    ${s.phone}
                  </td>
                  <td style="padding: 4px 3px; color: #475569; font-size: 9px; border: 1px solid #e2e8f0;">
                    <div>${s.faculty || 'مشترك'}</div>
                    ${s.emergencyPhone ? `<div style="font-family: monospace; color: #b91c1c; font-weight: 700;">طوارئ: ${s.emergencyPhone}</div>` : ''}
                  </td>
                  <td style="padding: 4px 3px; color: #334155; font-size: 8.5px; border: 1px solid #e2e8f0;">
                    <div>${s.pickupPoint || 'التجمع الرئيسي'}</div>
                    ${s.notes ? `<div style="color: #64748b; font-style: italic;">${s.notes}</div>` : ''}
                  </td>
                  <td style="padding: 4px 2px; text-align: center; border: 1px solid #cbd5e1; background: ${s.checkInDeparture ? '#dcfce7' : '#ffffff'};">
                    <span style="display: inline-block; width: 14px; height: 14px; border: 1.5px solid #0f172a; border-radius: 3px; vertical-align: middle; text-align: center; line-height: 12px; font-weight: 900; font-size: 11px; color: #047857;">
                      ${s.checkInDeparture ? '✔' : ''}
                    </span>
                  </td>
                  <td style="padding: 4px 2px; text-align: center; border: 1px solid #cbd5e1; background: ${s.checkInReturn ? '#dcfce7' : '#ffffff'};">
                    <span style="display: inline-block; width: 14px; height: 14px; border: 1.5px solid #0f172a; border-radius: 3px; vertical-align: middle; text-align: center; line-height: 12px; font-weight: 900; font-size: 11px; color: #047857;">
                      ${s.checkInReturn ? '✔' : ''}
                    </span>
                  </td>
                  <td style="padding: 4px 2px; text-align: center; border: 1px solid #e2e8f0;">
                    ${
                      s.isFreeTicket
                        ? '<span style="color: #059669; font-weight: 800; font-size: 9px;">مجاني 🎁</span>'
                        : isPaid
                        ? '<span style="color: #059669; font-weight: 800; font-size: 9px;">خالص ✅</span>'
                        : `<span style="color: #b91c1c; font-weight: 800; font-size: 9px;">متبقي ${s.remainingAmount}</span>`
                    }
                  </td>
                  <td style="padding: 4px 3px; text-align: center; border: 1px solid #e2e8f0; color: #94a3b8; font-size: 8.5px;">
                    ....................
                  </td>
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>

      <!-- Signatures and Official Stamp Footer -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 18px; padding-top: 14px; border-top: 2px dashed #cbd5e1; font-size: 11px;">
        <div style="text-align: center; width: 30%;">
          <span style="color: #64748b; font-weight: 700; display: block;">مشرف الحافلة المسؤول</span>
          <strong style="color: #0f172a; font-size: 13px; display: block; margin-top: 6px;">${driver?.supervisorName || 'مشرف كيان'}</strong>
          <span style="color: #94a3b8; font-size: 10px;">التوقيع: ___________________</span>
        </div>

        <div style="text-align: center; width: 35%;">
          <div style="border: 2px solid #d97706; padding: 6px 12px; border-radius: 8px; background: #fffbeb; display: inline-block;">
            <div style="font-size: 11px; font-weight: 900; color: #b45309;">خاتم واعتماد إدارة الفعاليات</div>
            <div style="font-size: 9.5px; color: #047857; font-weight: 800; margin-top: 2px;">✓ معتمد ومطابق لمنظومة KAYAN 2026</div>
          </div>
        </div>

        <div style="text-align: center; width: 30%;">
          <span style="color: #64748b; font-weight: 700; display: block;">مدير التشغيل والأسطول</span>
          <strong style="color: #0f172a; font-size: 13px; display: block; margin-top: 6px;">إدارة شركة كيان</strong>
          <span style="color: #94a3b8; font-size: 10px;">التوقيع: ___________________</span>
        </div>
      </div>

      <div style="margin-top: 12px; text-align: center; font-size: 9.5px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 6px;">
        كشف ركاب رسمي معتمد صادر من منظومة كيان لتنظيم الرحلات • تاريخ الطباعة: ${new Date().toLocaleString('ar-EG')}
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
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = doc.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    const pageHeight = doc.internal.pageSize.getHeight();
    let heightLeft = pdfHeight;
    let position = 0;

    doc.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - pdfHeight;
      doc.addPage();
      doc.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }

    doc.save(`KAYAN_Bus_${busNumber}_Manifest.pdf`);
    return true;
  } catch (err) {
    console.error('Error generating Bus Manifest PDF:', err);
    fallbackPrintElement(container, `Bus_${busNumber}_Manifest`);
    return false;
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
};

/**
 * Generate Ultra-High Quality, Official T-Shirt Factory & Production Manifest PDF (كشف المصنع والتصنيع للتيشرتات)
 */
export const generateTShirtFactoryPDF = async (
  students: Student[],
  settings: TripSettings,
  busFilter: number | 'all' = 'all'
): Promise<boolean> => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '1200px';
  container.style.background = '#ffffff';
  container.style.color = '#0f172a';
  container.style.direction = 'rtl';
  container.style.fontFamily = "'Tajawal', -apple-system, sans-serif";
  container.style.padding = '24px';
  container.style.boxSizing = 'border-box';

  let filtered = students.filter((s) => s.tshirtSize && s.tshirtSize !== 'none');
  if (busFilter !== 'all') {
    filtered = filtered.filter((s) => Number(s.busNumber) === Number(busFilter));
  }

  // Sort by Bus, then Seat
  filtered.sort((a, b) => {
    if (a.busNumber !== b.busNumber) return a.busNumber - b.busNumber;
    return (a.seatNumber || 999) - (b.seatNumber || 999);
  });

  const totalTShirts = filtered.length;

  const sizeCounts: Record<string, number> = {
    S: 0,
    M: 0,
    L: 0,
    XL: 0,
    '2XL': 0,
    '3XL': 0,
  };

  filtered.forEach((s) => {
    if (s.tshirtSize && sizeCounts[s.tshirtSize] !== undefined) {
      sizeCounts[s.tshirtSize]++;
    }
  });

  const formattedDate = settings.tripDate
    ? new Date(settings.tripDate).toLocaleDateString('ar-EG', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : settings.tripDate || '2026-08-15';

  container.innerHTML = `
    <div style="border: 2px solid #0f172a; border-radius: 16px; padding: 20px; background: #ffffff; position: relative;">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #7c3aed; padding-bottom: 14px; margin-bottom: 14px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <img src="${kayanBadge}" width="60" height="60" alt="KAYAN Badge" style="border-radius: 50%; border: 2px solid #7c3aed; object-fit: cover;" />
          <div>
            <div style="font-size: 18px; font-weight: 900; color: #0f172a;">
              ${settings.companyNameAr || 'شركة كيان لتنظيم الفعاليات والرحلات'}
            </div>
            <div style="font-size: 11px; color: #64748b; font-weight: 700; margin-top: 2px;">
              أمر تصنيع وتجهيز التيشرتات واليونيفورم المعتمد • قسم الدعاية والبراندنج
            </div>
          </div>
        </div>

        <div style="text-align: center;">
          <div style="background: #4c1d95; color: #ffffff; padding: 6px 20px; border-radius: 10px; font-size: 16px; font-weight: 900;">
            كشف أمر التوريد والطباعة للمصنع (T-Shirts Factory Order) 👕
          </div>
          <div style="font-size: 11px; color: #475569; font-weight: 800; margin-top: 4px;">
            نطاق الكشف: <span style="color: #6b21a8; font-weight: 900;">${busFilter === 'all' ? 'كافة الحافلات بالترتيب' : `حافلة رقم #${busFilter}`}</span>
          </div>
        </div>

        <div style="text-align: left; background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 14px; border-radius: 10px; font-size: 11px;">
          <div><span style="color: #64748b; font-weight: 700;">الرحلة:</span> <strong style="color: #0f172a; font-size: 12px;">${settings.tripName}</strong></div>
          <div style="margin-top: 3px;"><span style="color: #64748b; font-weight: 700;">إجمالي المطلوب:</span> <strong style="color: #6b21a8; font-size: 14px; font-family: monospace;">${totalTShirts} قطعة</strong></div>
          <div style="margin-top: 3px;"><span style="color: #64748b; font-weight: 700;">تاريخ التوريد:</span> <strong style="color: #0f172a;">${formattedDate}</strong></div>
        </div>
      </div>

      <!-- Factory Sizes Matrix Summary Table -->
      <div style="margin-bottom: 14px; border: 2px solid #7c3aed; border-radius: 12px; overflow: hidden; background: #f5f3ff;">
        <div style="background: #4c1d95; color: #ffffff; padding: 6px 12px; font-weight: 900; font-size: 12px; text-align: center;">
          📊 جدول الحصر الإحصائي لمقاسات التيشرتات المطلوب إنتاجها للمصنع:
        </div>
        <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 12px;">
          <thead>
            <tr style="background: #ede9fe; color: #4c1d95; font-weight: 900; border-bottom: 1.5px solid #7c3aed;">
              <th style="padding: 6px; border: 1px solid #c4b5fd;">مقاس S</th>
              <th style="padding: 6px; border: 1px solid #c4b5fd;">مقاس M</th>
              <th style="padding: 6px; border: 1px solid #c4b5fd;">مقاس L</th>
              <th style="padding: 6px; border: 1px solid #c4b5fd;">مقاس XL</th>
              <th style="padding: 6px; border: 1px solid #c4b5fd;">مقاس 2XL</th>
              <th style="padding: 6px; border: 1px solid #c4b5fd;">مقاس 3XL</th>
              <th style="padding: 6px; border: 1px solid #c4b5fd; background: #4c1d95; color: #fde047;">الإجمالي الكلي المطلوب</th>
            </tr>
          </thead>
          <tbody>
            <tr style="font-weight: 900; font-size: 14px; font-family: monospace; background: #ffffff;">
              <td style="padding: 8px; border: 1px solid #c4b5fd; color: #4c1d95;">${sizeCounts.S}</td>
              <td style="padding: 8px; border: 1px solid #c4b5fd; color: #4c1d95;">${sizeCounts.M}</td>
              <td style="padding: 8px; border: 1px solid #c4b5fd; color: #4c1d95;">${sizeCounts.L}</td>
              <td style="padding: 8px; border: 1px solid #c4b5fd; color: #4c1d95;">${sizeCounts.XL}</td>
              <td style="padding: 8px; border: 1px solid #c4b5fd; color: #4c1d95;">${sizeCounts['2XL']}</td>
              <td style="padding: 8px; border: 1px solid #c4b5fd; color: #4c1d95;">${sizeCounts['3XL']}</td>
              <td style="padding: 8px; border: 1px solid #c4b5fd; background: #fdf4ff; color: #701a75; font-size: 16px;">${totalTShirts} تيشرت</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Factory Detailed Items List -->
      <table style="width: 100%; border-collapse: collapse; text-align: right; font-size: 10px; border: 1px solid #cbd5e1;">
        <thead>
          <tr style="background: #0f172a; color: #ffffff; font-weight: 900; line-height: 1.6;">
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 28px;">م</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 50px; color: #fde047;">الحافلة</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 44px; color: #fde047;">المقعد</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 65px;">الكود</th>
            <th style="padding: 6px 8px; border: 1px solid #334155;">الاسم المطلوب للطباعة / الطالب</th>
            <th style="padding: 6px 6px; border: 1px solid #334155; width: 90px;">الكلية / الدفعة</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 75px; background: #6b21a8; font-size: 11px;">المقاس المطلوب</th>
            <th style="padding: 6px 6px; border: 1px solid #334155; width: 140px;">تفاصيل التكت والملاحظات الخاصة</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 65px;">فحص الجودة 🔲</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 65px;">التغليف والتجهيز 🔲</th>
          </tr>
        </thead>
        <tbody>
          ${filtered
            .map((s, idx) => {
              const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
              return `
                <tr style="background: ${bg}; border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 4px 3px; text-align: center; font-weight: 700; color: #64748b; border: 1px solid #e2e8f0;">${idx + 1}</td>
                  <td style="padding: 4px 3px; text-align: center; font-weight: 800; font-family: monospace; border: 1px solid #e2e8f0; background: #faf5ff;">
                    باص #${s.busNumber}
                  </td>
                  <td style="padding: 4px 3px; text-align: center; font-weight: 900; font-family: monospace; color: #b45309; border: 1px solid #e2e8f0;">
                    ${s.seatNumber ? `#${s.seatNumber}` : '—'}
                  </td>
                  <td style="padding: 4px 3px; text-align: center; font-family: monospace; font-weight: 800; color: #1e1b4b; border: 1px solid #e2e8f0;">
                    ${s.ticketCode}
                  </td>
                  <td style="padding: 4px 6px; font-weight: 800; color: #0f172a; border: 1px solid #e2e8f0;">
                    ${s.name}
                  </td>
                  <td style="padding: 4px 4px; color: #475569; font-size: 9px; border: 1px solid #e2e8f0;">
                    ${s.faculty || '—'}
                  </td>
                  <td style="padding: 4px 4px; text-align: center; border: 1px solid #e2e8f0; background: #f3e8ff;">
                    <span style="font-weight: 900; font-family: monospace; font-size: 13px; color: #581c87;">${s.tshirtSize}</span>
                  </td>
                  <td style="padding: 4px 5px; font-size: 8.5px; color: #334155; border: 1px solid #e2e8f0;">
                    ${s.notes || s.pickupPoint || 'طباعة الاسم والشعار الرسمي'}
                  </td>
                  <td style="padding: 4px 2px; text-align: center; border: 1px solid #cbd5e1;">
                    <span style="display: inline-block; width: 14px; height: 14px; border: 1.5px solid #0f172a; border-radius: 3px;"></span>
                  </td>
                  <td style="padding: 4px 2px; text-align: center; border: 1px solid #cbd5e1;">
                    <span style="display: inline-block; width: 14px; height: 14px; border: 1.5px solid #0f172a; border-radius: 3px;"></span>
                  </td>
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>

      <!-- Factory Footer Signatures -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 18px; padding-top: 14px; border-top: 2px dashed #cbd5e1; font-size: 11px;">
        <div style="text-align: center; width: 30%;">
          <span style="color: #64748b; font-weight: 700; display: block;">مسؤول البراندنج والطباعة</span>
          <strong style="color: #0f172a; font-size: 13px; display: block; margin-top: 6px;">لجنة المشتريات والتصنيع</strong>
          <span style="color: #94a3b8; font-size: 10px;">التوقيع: ___________________</span>
        </div>

        <div style="text-align: center; width: 35%;">
          <div style="border: 2px solid #7c3aed; padding: 6px 12px; border-radius: 8px; background: #faf5ff; display: inline-block;">
            <div style="font-size: 11px; font-weight: 900; color: #581c87;">استلام وتأكيد المصنع المورد</div>
            <div style="font-size: 9.5px; color: #047857; font-weight: 800; margin-top: 2px;">توقيع وخاتم مسؤول المصنع</div>
          </div>
        </div>

        <div style="text-align: center; width: 30%;">
          <span style="color: #64748b; font-weight: 700; display: block;">اعتماد المشرف العام</span>
          <strong style="color: #0f172a; font-size: 13px; display: block; margin-top: 6px;">إدارة شركة كيان</strong>
          <span style="color: #94a3b8; font-size: 10px;">التوقيع: ___________________</span>
        </div>
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
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = doc.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    const pageHeight = doc.internal.pageSize.getHeight();
    let heightLeft = pdfHeight;
    let position = 0;

    doc.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - pdfHeight;
      doc.addPage();
      doc.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }

    doc.save(`KAYAN_TShirt_Factory_Order.pdf`);
    return true;
  } catch (err) {
    console.error('Error generating T-Shirt Factory PDF:', err);
    fallbackPrintElement(container, 'TShirt_Factory_Order');
    return false;
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
};

/**
 * Generate Ultra-High Quality, Official T-Shirt Handover & Student Distribution Manifest PDF (كشف تسليم وتوزيع التيشرتات للطلاب)
 */
export const generateTShirtDistributionPDF = async (
  students: Student[],
  settings: TripSettings,
  busFilter: number | 'all' = 'all'
): Promise<boolean> => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '1200px';
  container.style.background = '#ffffff';
  container.style.color = '#0f172a';
  container.style.direction = 'rtl';
  container.style.fontFamily = "'Tajawal', -apple-system, sans-serif";
  container.style.padding = '24px';
  container.style.boxSizing = 'border-box';

  let filtered = students.filter((s) => s.tshirtSize && s.tshirtSize !== 'none');
  if (busFilter !== 'all') {
    filtered = filtered.filter((s) => Number(s.busNumber) === Number(busFilter));
  }

  filtered.sort((a, b) => {
    if (a.busNumber !== b.busNumber) return a.busNumber - b.busNumber;
    return (a.seatNumber || 999) - (b.seatNumber || 999);
  });

  const totalCount = filtered.length;
  const deliveredCount = filtered.filter((s) => s.tshirtReceived).length;

  container.innerHTML = `
    <div style="border: 2px solid #0f172a; border-radius: 16px; padding: 20px; background: #ffffff; position: relative;">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #7c3aed; padding-bottom: 14px; margin-bottom: 14px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <img src="${kayanBadge}" width="60" height="60" alt="KAYAN Badge" style="border-radius: 50%; border: 2px solid #7c3aed; object-fit: cover;" />
          <div>
            <div style="font-size: 18px; font-weight: 900; color: #0f172a;">
              ${settings.companyNameAr || 'شركة كيان لتنظيم الفعاليات والرحلات'}
            </div>
            <div style="font-size: 11px; color: #64748b; font-weight: 700; margin-top: 2px;">
              كشف تسليم وتوزيع التيشرتات واليونيفورم الميداني على المشتركين
            </div>
          </div>
        </div>

        <div style="text-align: center;">
          <div style="background: #0f172a; color: #fde047; padding: 6px 20px; border-radius: 10px; font-size: 16px; font-weight: 900;">
            كشف استلام وتوزيع التيشرتات والتوقيعات 👕✍️
          </div>
          <div style="font-size: 11px; color: #475569; font-weight: 800; margin-top: 4px;">
            نطاق الكشف: <span style="color: #6b21a8; font-weight: 900;">${busFilter === 'all' ? 'جميع الحافلات' : `حافلة #${busFilter}`}</span>
          </div>
        </div>

        <div style="text-align: left; background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 14px; border-radius: 10px; font-size: 11px;">
          <div><span style="color: #64748b; font-weight: 700;">الرحلة:</span> <strong style="color: #0f172a; font-size: 12px;">${settings.tripName}</strong></div>
          <div style="margin-top: 3px;"><span style="color: #64748b; font-weight: 700;">حالة التسليم:</span> <strong style="color: #047857; font-size: 13px; font-family: monospace;">${deliveredCount} / ${totalCount}</strong></div>
        </div>
      </div>

      <!-- Distribution Table -->
      <table style="width: 100%; border-collapse: collapse; text-align: right; font-size: 10px; border: 1px solid #cbd5e1;">
        <thead>
          <tr style="background: #0f172a; color: #ffffff; font-weight: 900; line-height: 1.6;">
            <th style="padding: 6px 3px; text-align: center; border: 1px solid #334155; width: 26px;">م</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 45px; color: #fde047;">الباص</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 44px; color: #fde047;">المقعد</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 62px;">الكود</th>
            <th style="padding: 6px 6px; border: 1px solid #334155;">اسم المشارك</th>
            <th style="padding: 6px 4px; border: 1px solid #334155; width: 80px;">رقم الهاتف</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 65px; background: #6b21a8; font-size: 11px;">المقاس</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 70px;">تأكيد الاستلام 🔲</th>
            <th style="padding: 6px 8px; text-align: center; border: 1px solid #334155; width: 110px;">توقيع المشترك بالقلم ✍️</th>
            <th style="padding: 6px 6px; border: 1px solid #334155; width: 90px;">ملاحظات</th>
          </tr>
        </thead>
        <tbody>
          ${filtered
            .map((s, idx) => {
              const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
              return `
                <tr style="background: ${bg}; border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 4px 2px; text-align: center; font-weight: 700; color: #64748b; border: 1px solid #e2e8f0;">${idx + 1}</td>
                  <td style="padding: 4px 2px; text-align: center; font-weight: 800; font-family: monospace; border: 1px solid #e2e8f0;">#${s.busNumber}</td>
                  <td style="padding: 4px 2px; text-align: center; font-weight: 900; font-family: monospace; color: #b45309; border: 1px solid #e2e8f0;">${s.seatNumber ? `#${s.seatNumber}` : '—'}</td>
                  <td style="padding: 4px 2px; text-align: center; font-family: monospace; font-weight: 800; color: #1e1b4b; border: 1px solid #e2e8f0;">${s.ticketCode}</td>
                  <td style="padding: 4px 5px; font-weight: 800; color: #0f172a; border: 1px solid #e2e8f0;">${s.name}</td>
                  <td style="padding: 4px 3px; font-family: monospace; font-weight: 700; color: #334155; border: 1px solid #e2e8f0;">${s.phone}</td>
                  <td style="padding: 4px 3px; text-align: center; border: 1px solid #e2e8f0; font-weight: 900; font-family: monospace; font-size: 12px; color: #581c87; background: #faf5ff;">${s.tshirtSize}</td>
                  <td style="padding: 4px 2px; text-align: center; border: 1px solid #cbd5e1; background: ${s.tshirtReceived ? '#dcfce7' : '#ffffff'};">
                    <span style="display: inline-block; width: 14px; height: 14px; border: 1.5px solid #0f172a; border-radius: 3px; vertical-align: middle; line-height: 12px; font-weight: 900; font-size: 11px; color: #047857;">
                      ${s.tshirtReceived ? '✔' : ''}
                    </span>
                  </td>
                  <td style="padding: 4px 4px; text-align: center; border: 1px solid #e2e8f0; color: #94a3b8; font-size: 9px;">
                    ..................................
                  </td>
                  <td style="padding: 4px 4px; font-size: 8.5px; color: #475569; border: 1px solid #e2e8f0;">
                    ${s.notes || '—'}
                  </td>
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>

      <!-- Footer Signatures -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 18px; padding-top: 14px; border-top: 2px dashed #cbd5e1; font-size: 11px;">
        <div style="text-align: center; width: 30%;">
          <span style="color: #64748b; font-weight: 700; display: block;">مسؤول تسليم التيشرتات</span>
          <span style="color: #94a3b8; font-size: 10px; display: block; margin-top: 6px;">التوقيع: ___________________</span>
        </div>
        <div style="text-align: center; width: 35%;">
          <div style="border: 2px solid #7c3aed; padding: 4px 10px; border-radius: 8px; background: #faf5ff; display: inline-block;">
            <div style="font-size: 10px; font-weight: 900; color: #581c87;">لجنة الاستقبال والتجهيزات</div>
          </div>
        </div>
        <div style="text-align: center; width: 30%;">
          <span style="color: #64748b; font-weight: 700; display: block;">مشرف الفعالية والرحلة</span>
          <span style="color: #94a3b8; font-size: 10px; display: block; margin-top: 6px;">التوقيع: ___________________</span>
        </div>
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
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = doc.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    const pageHeight = doc.internal.pageSize.getHeight();
    let heightLeft = pdfHeight;
    let position = 0;

    doc.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - pdfHeight;
      doc.addPage();
      doc.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }

    doc.save(`KAYAN_TShirt_Distribution_Manifest.pdf`);
    return true;
  } catch (err) {
    console.error('Error generating T-Shirt Distribution PDF:', err);
    fallbackPrintElement(container, 'TShirt_Distribution_Manifest');
    return false;
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
};

/**
 * Generate Ultra-High Quality, Official Restaurant & Kitchen Catering Order PDF (كشف المطعم والمطبخ وتجهيز الوجبات)
 */
export const generateMealKitchenPDF = async (
  students: Student[],
  settings: TripSettings,
  busFilter: number | 'all' = 'all'
): Promise<boolean> => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '1200px';
  container.style.background = '#ffffff';
  container.style.color = '#0f172a';
  container.style.direction = 'rtl';
  container.style.fontFamily = "'Tajawal', -apple-system, sans-serif";
  container.style.padding = '24px';
  container.style.boxSizing = 'border-box';

  let filtered = students.filter((s) => getStudentMealInfo(s, settings).hasMeal);
  if (busFilter !== 'all') {
    filtered = filtered.filter((s) => Number(s.busNumber) === Number(busFilter));
  }

  filtered.sort((a, b) => {
    if (a.busNumber !== b.busNumber) return a.busNumber - b.busNumber;
    return (a.seatNumber || 999) - (b.seatNumber || 999);
  });

  const totalMeals = filtered.length;

  // Breakdown by meal types
  const mealTypesCount: Record<string, number> = {};
  filtered.forEach((s) => {
    const info = getStudentMealInfo(s, settings);
    const name = info.mealName || 'وجبة أساسية';
    mealTypesCount[name] = (mealTypesCount[name] || 0) + 1;
  });

  container.innerHTML = `
    <div style="border: 2px solid #0f172a; border-radius: 16px; padding: 20px; background: #ffffff; position: relative;">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #d97706; padding-bottom: 14px; margin-bottom: 14px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <img src="${kayanBadge}" width="60" height="60" alt="KAYAN Badge" style="border-radius: 50%; border: 2px solid #d97706; object-fit: cover;" />
          <div>
            <div style="font-size: 18px; font-weight: 900; color: #0f172a;">
              ${settings.companyNameAr || 'شركة كيان لتنظيم الفعاليات والرحلات'}
            </div>
            <div style="font-size: 11px; color: #64748b; font-weight: 700; margin-top: 2px;">
              أمر تجهيز وتوريد وجبات الإعاشة والبوفيه للمطعم والمطبخ
            </div>
          </div>
        </div>

        <div style="text-align: center;">
          <div style="background: #78350f; color: #ffffff; padding: 6px 20px; border-radius: 10px; font-size: 16px; font-weight: 900;">
            كشف أمر التجهيز للمطعم والمطبخ (Kitchen & Catering Order) 🍔
          </div>
          <div style="font-size: 11px; color: #475569; font-weight: 800; margin-top: 4px;">
            نطاق الطلب: <span style="color: #b45309; font-weight: 900;">${busFilter === 'all' ? 'كافة الحافلات' : `حافلة #${busFilter}`}</span>
          </div>
        </div>

        <div style="text-align: left; background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 14px; border-radius: 10px; font-size: 11px;">
          <div><span style="color: #64748b; font-weight: 700;">الرحلة:</span> <strong style="color: #0f172a; font-size: 12px;">${settings.tripName}</strong></div>
          <div style="margin-top: 3px;"><span style="color: #64748b; font-weight: 700;">إجمالي الوجبات:</span> <strong style="color: #b45309; font-size: 14px; font-family: monospace;">${totalMeals} وجبة</strong></div>
        </div>
      </div>

      <!-- Meal Types Breakdown Summary -->
      <div style="margin-bottom: 14px; border: 2px solid #d97706; border-radius: 12px; overflow: hidden; background: #fffbeb;">
        <div style="background: #92400e; color: #ffffff; padding: 6px 12px; font-weight: 900; font-size: 12px; text-align: center;">
          🍔 تفصيل وحصر كميات الوجبات المطلوب إعدادها وتغليفها من المطعم:
        </div>
        <div style="display: grid; grid-template-columns: repeat(${Math.max(Object.keys(mealTypesCount).length, 1)}, 1fr); gap: 8px; padding: 10px; text-align: center;">
          ${Object.entries(mealTypesCount)
            .map(
              ([name, count]) => `
              <div style="background: #ffffff; border: 1px solid #fde68a; border-radius: 8px; padding: 8px;">
                <span style="color: #78350f; font-weight: 800; font-size: 11px; display: block;">${name}</span>
                <strong style="color: #0f172a; font-size: 16px; font-family: monospace; font-weight: 900;">${count} وجبة</strong>
              </div>
            `
            )
            .join('')}
        </div>
      </div>

      <!-- Kitchen Manifest Table -->
      <table style="width: 100%; border-collapse: collapse; text-align: right; font-size: 10px; border: 1px solid #cbd5e1;">
        <thead>
          <tr style="background: #0f172a; color: #ffffff; font-weight: 900; line-height: 1.6;">
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 28px;">م</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 50px; color: #fde047;">الحافلة</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 45px; color: #fde047;">المقعد</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 65px;">الكود</th>
            <th style="padding: 6px 8px; border: 1px solid #334155;">اسم المشارك</th>
            <th style="padding: 6px 6px; border: 1px solid #334155; width: 180px; background: #92400e; color: #ffffff;">نوع الوجبة والتفاصيل</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 75px;">التجهيز بالمطبخ 🔲</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 75px;">التسليم للشاحن 🔲</th>
          </tr>
        </thead>
        <tbody>
          ${filtered
            .map((s, idx) => {
              const mealInfo = getStudentMealInfo(s, settings);
              const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
              return `
                <tr style="background: ${bg}; border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 4px 3px; text-align: center; font-weight: 700; color: #64748b; border: 1px solid #e2e8f0;">${idx + 1}</td>
                  <td style="padding: 4px 3px; text-align: center; font-weight: 800; font-family: monospace; border: 1px solid #e2e8f0; background: #fffbeb;">
                    باص #${s.busNumber}
                  </td>
                  <td style="padding: 4px 3px; text-align: center; font-weight: 900; font-family: monospace; color: #b45309; border: 1px solid #e2e8f0;">
                    ${s.seatNumber ? `#${s.seatNumber}` : '—'}
                  </td>
                  <td style="padding: 4px 3px; text-align: center; font-family: monospace; font-weight: 800; color: #1e1b4b; border: 1px solid #e2e8f0;">
                    ${s.ticketCode}
                  </td>
                  <td style="padding: 4px 6px; font-weight: 800; color: #0f172a; border: 1px solid #e2e8f0;">
                    ${s.name}
                  </td>
                  <td style="padding: 4px 6px; font-weight: 900; color: #78350f; border: 1px solid #e2e8f0; background: #fef3c7;">
                    ${mealInfo.mealName}
                  </td>
                  <td style="padding: 4px 2px; text-align: center; border: 1px solid #cbd5e1;">
                    <span style="display: inline-block; width: 14px; height: 14px; border: 1.5px solid #0f172a; border-radius: 3px;"></span>
                  </td>
                  <td style="padding: 4px 2px; text-align: center; border: 1px solid #cbd5e1;">
                    <span style="display: inline-block; width: 14px; height: 14px; border: 1.5px solid #0f172a; border-radius: 3px;"></span>
                  </td>
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>

      <!-- Kitchen Footer -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 18px; padding-top: 14px; border-top: 2px dashed #cbd5e1; font-size: 11px;">
        <div style="text-align: center; width: 30%;">
          <span style="color: #64748b; font-weight: 700; display: block;">مسؤول الإعاشة واللوجستيات</span>
          <span style="color: #94a3b8; font-size: 10px; display: block; margin-top: 6px;">التوقيع: ___________________</span>
        </div>
        <div style="text-align: center; width: 35%;">
          <div style="border: 2px solid #d97706; padding: 4px 10px; border-radius: 8px; background: #fffbeb; display: inline-block;">
            <div style="font-size: 10px; font-weight: 900; color: #92400e;">استلام وخاتم المطعم المورد</div>
          </div>
        </div>
        <div style="text-align: center; width: 30%;">
          <span style="color: #64748b; font-weight: 700; display: block;">اعتماد مدير العمليات</span>
          <span style="color: #94a3b8; font-size: 10px; display: block; margin-top: 6px;">التوقيع: ___________________</span>
        </div>
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
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = doc.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    const pageHeight = doc.internal.pageSize.getHeight();
    let heightLeft = pdfHeight;
    let position = 0;

    doc.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - pdfHeight;
      doc.addPage();
      doc.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }

    doc.save(`KAYAN_Kitchen_Meals_Order.pdf`);
    return true;
  } catch (err) {
    console.error('Error generating Kitchen Meals PDF:', err);
    fallbackPrintElement(container, 'Kitchen_Meals_Order');
    return false;
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
};

/**
 * Generate Ultra-High Quality, Official Meal Distribution & Handover Manifest PDF (كشف توزيع واستلام الوجبات الميداني للطلاب)
 */
export const generateMealDistributionPDF = async (
  students: Student[],
  settings: TripSettings,
  busFilter: number | 'all' = 'all'
): Promise<boolean> => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '1200px';
  container.style.background = '#ffffff';
  container.style.color = '#0f172a';
  container.style.direction = 'rtl';
  container.style.fontFamily = "'Tajawal', -apple-system, sans-serif";
  container.style.padding = '24px';
  container.style.boxSizing = 'border-box';

  let filtered = students.filter((s) => getStudentMealInfo(s, settings).hasMeal);
  if (busFilter !== 'all') {
    filtered = filtered.filter((s) => Number(s.busNumber) === Number(busFilter));
  }

  filtered.sort((a, b) => {
    if (a.busNumber !== b.busNumber) return a.busNumber - b.busNumber;
    return (a.seatNumber || 999) - (b.seatNumber || 999);
  });

  const totalCount = filtered.length;
  const deliveredCount = filtered.filter((s) => s.mealReceived).length;

  container.innerHTML = `
    <div style="border: 2px solid #0f172a; border-radius: 16px; padding: 20px; background: #ffffff; position: relative;">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #d97706; padding-bottom: 14px; margin-bottom: 14px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <img src="${kayanBadge}" width="60" height="60" alt="KAYAN Badge" style="border-radius: 50%; border: 2px solid #d97706; object-fit: cover;" />
          <div>
            <div style="font-size: 18px; font-weight: 900; color: #0f172a;">
              ${settings.companyNameAr || 'شركة كيان لتنظيم الفعاليات والرحلات'}
            </div>
            <div style="font-size: 11px; color: #64748b; font-weight: 700; margin-top: 2px;">
              كشف تسليم وتوزيع وجبات الغداء والإعاشة الميداني
            </div>
          </div>
        </div>

        <div style="text-align: center;">
          <div style="background: #0f172a; color: #fde047; padding: 6px 20px; border-radius: 10px; font-size: 16px; font-weight: 900;">
            كشف استلام وتوزيع الوجبات الغذائية 🍔✍️
          </div>
          <div style="font-size: 11px; color: #475569; font-weight: 800; margin-top: 4px;">
            نطاق الكشف: <span style="color: #b45309; font-weight: 900;">${busFilter === 'all' ? 'جميع الحافلات' : `حافلة #${busFilter}`}</span>
          </div>
        </div>

        <div style="text-align: left; background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 14px; border-radius: 10px; font-size: 11px;">
          <div><span style="color: #64748b; font-weight: 700;">الرحلة:</span> <strong style="color: #0f172a; font-size: 12px;">${settings.tripName}</strong></div>
          <div style="margin-top: 3px;"><span style="color: #64748b; font-weight: 700;">حالة التوزيع:</span> <strong style="color: #047857; font-size: 13px; font-family: monospace;">${deliveredCount} / ${totalCount}</strong></div>
        </div>
      </div>

      <!-- Meal Handover Table -->
      <table style="width: 100%; border-collapse: collapse; text-align: right; font-size: 10px; border: 1px solid #cbd5e1;">
        <thead>
          <tr style="background: #0f172a; color: #ffffff; font-weight: 900; line-height: 1.6;">
            <th style="padding: 6px 3px; text-align: center; border: 1px solid #334155; width: 26px;">م</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 45px; color: #fde047;">الباص</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 44px; color: #fde047;">المقعد</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 62px;">الكود</th>
            <th style="padding: 6px 6px; border: 1px solid #334155;">اسم المشارك</th>
            <th style="padding: 6px 4px; border: 1px solid #334155; width: 80px;">رقم الهاتف</th>
            <th style="padding: 6px 6px; border: 1px solid #334155; width: 120px; color: #fde047;">نوع الوجبة</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 70px;">تأكيد الاستلام 🔲</th>
            <th style="padding: 6px 8px; text-align: center; border: 1px solid #334155; width: 110px;">توقيع المستلم ✍️</th>
            <th style="padding: 6px 6px; border: 1px solid #334155; width: 85px;">ملاحظات</th>
          </tr>
        </thead>
        <tbody>
          ${filtered
            .map((s, idx) => {
              const mealInfo = getStudentMealInfo(s, settings);
              const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
              return `
                <tr style="background: ${bg}; border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 4px 2px; text-align: center; font-weight: 700; color: #64748b; border: 1px solid #e2e8f0;">${idx + 1}</td>
                  <td style="padding: 4px 2px; text-align: center; font-weight: 800; font-family: monospace; border: 1px solid #e2e8f0;">#${s.busNumber}</td>
                  <td style="padding: 4px 2px; text-align: center; font-weight: 900; font-family: monospace; color: #b45309; border: 1px solid #e2e8f0;">${s.seatNumber ? `#${s.seatNumber}` : '—'}</td>
                  <td style="padding: 4px 2px; text-align: center; font-family: monospace; font-weight: 800; color: #1e1b4b; border: 1px solid #e2e8f0;">${s.ticketCode}</td>
                  <td style="padding: 4px 5px; font-weight: 800; color: #0f172a; border: 1px solid #e2e8f0;">${s.name}</td>
                  <td style="padding: 4px 3px; font-family: monospace; font-weight: 700; color: #334155; border: 1px solid #e2e8f0;">${s.phone}</td>
                  <td style="padding: 4px 5px; font-weight: 800; color: #78350f; border: 1px solid #e2e8f0; background: #fffbeb;">${mealInfo.mealName}</td>
                  <td style="padding: 4px 2px; text-align: center; border: 1px solid #cbd5e1; background: ${s.mealReceived ? '#dcfce7' : '#ffffff'};">
                    <span style="display: inline-block; width: 14px; height: 14px; border: 1.5px solid #0f172a; border-radius: 3px; vertical-align: middle; line-height: 12px; font-weight: 900; font-size: 11px; color: #047857;">
                      ${s.mealReceived ? '✔' : ''}
                    </span>
                  </td>
                  <td style="padding: 4px 4px; text-align: center; border: 1px solid #e2e8f0; color: #94a3b8; font-size: 9px;">
                    ..................................
                  </td>
                  <td style="padding: 4px 4px; font-size: 8.5px; color: #475569; border: 1px solid #e2e8f0;">
                    ${s.notes || '—'}
                  </td>
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>

      <!-- Footer Signatures -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 18px; padding-top: 14px; border-top: 2px dashed #cbd5e1; font-size: 11px;">
        <div style="text-align: center; width: 30%;">
          <span style="color: #64748b; font-weight: 700; display: block;">مسؤول توزيع الوجبات</span>
          <span style="color: #94a3b8; font-size: 10px; display: block; margin-top: 6px;">التوقيع: ___________________</span>
        </div>
        <div style="text-align: center; width: 35%;">
          <div style="border: 2px solid #d97706; padding: 4px 10px; border-radius: 8px; background: #fffbeb; display: inline-block;">
            <div style="font-size: 10px; font-weight: 900; color: #b45309;">لجنة الإعاشة والتموين</div>
          </div>
        </div>
        <div style="text-align: center; width: 30%;">
          <span style="color: #64748b; font-weight: 700; display: block;">مشرف الرحلة المسؤول</span>
          <span style="color: #94a3b8; font-size: 10px; display: block; margin-top: 6px;">التوقيع: ___________________</span>
        </div>
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
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = doc.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    const pageHeight = doc.internal.pageSize.getHeight();
    let heightLeft = pdfHeight;
    let position = 0;

    doc.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - pdfHeight;
      doc.addPage();
      doc.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }

    doc.save(`KAYAN_Meal_Distribution_Manifest.pdf`);
    return true;
  } catch (err) {
    console.error('Error generating Meal Distribution PDF:', err);
    fallbackPrintElement(container, 'Meal_Distribution_Manifest');
    return false;
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
};

/**
 * Generate Ultra-High Quality, Official Financial & Cash Collections Manifest PDF (كشف التحصيل والمتبقيات المالية الميدانية)
 */
export const generateFinancialManifestPDF = async (
  students: Student[],
  settings: TripSettings,
  busFilter: number | 'all' = 'all'
): Promise<boolean> => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '1200px';
  container.style.background = '#ffffff';
  container.style.color = '#0f172a';
  container.style.direction = 'rtl';
  container.style.fontFamily = "'Tajawal', -apple-system, sans-serif";
  container.style.padding = '24px';
  container.style.boxSizing = 'border-box';

  let filtered = [...students];
  if (busFilter !== 'all') {
    filtered = filtered.filter((s) => Number(s.busNumber) === Number(busFilter));
  }

  filtered.sort((a, b) => {
    if (b.remainingAmount !== a.remainingAmount) return (b.remainingAmount || 0) - (a.remainingAmount || 0);
    if (a.busNumber !== b.busNumber) return a.busNumber - b.busNumber;
    return (a.seatNumber || 999) - (b.seatNumber || 999);
  });

  const totalCount = filtered.length;
  const totalOutstanding = filtered.reduce((sum, s) => sum + (s.remainingAmount || 0), 0);
  const totalPaid = filtered.reduce((sum, s) => sum + (s.paidAmount || 0), 0);
  const unpaidCount = filtered.filter((s) => (s.remainingAmount || 0) > 0).length;

  container.innerHTML = `
    <div style="border: 2px solid #0f172a; border-radius: 16px; padding: 20px; background: #ffffff; position: relative;">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #059669; padding-bottom: 14px; margin-bottom: 14px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <img src="${kayanBadge}" width="60" height="60" alt="KAYAN Badge" style="border-radius: 50%; border: 2px solid #059669; object-fit: cover;" />
          <div>
            <div style="font-size: 18px; font-weight: 900; color: #0f172a;">
              ${settings.companyNameAr || 'شركة كيان لتنظيم الفعاليات والرحلات'}
            </div>
            <div style="font-size: 11px; color: #64748b; font-weight: 700; margin-top: 2px;">
              كشف المتابعة المالية والتحصيلات النقدية الميدانية • الإدارة المالية
            </div>
          </div>
        </div>

        <div style="text-align: center;">
          <div style="background: #064e3b; color: #fde047; padding: 6px 20px; border-radius: 10px; font-size: 16px; font-weight: 900;">
            كشف التحصيل والمتبقيات المالية الميدانية 💵📑
          </div>
          <div style="font-size: 11px; color: #475569; font-weight: 800; margin-top: 4px;">
            نطاق الكشف: <span style="color: #047857; font-weight: 900;">${busFilter === 'all' ? 'جميع الحافلات' : `حافلة #${busFilter}`}</span>
          </div>
        </div>

        <div style="text-align: left; background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 14px; border-radius: 10px; font-size: 11px;">
          <div><span style="color: #64748b; font-weight: 700;">إجمالي المطلوب تحصيله:</span> <strong style="color: #dc2626; font-size: 14px; font-family: monospace;">${totalOutstanding.toLocaleString()} ج.م</strong></div>
          <div style="margin-top: 3px;"><span style="color: #64748b; font-weight: 700;">المسدد مسبقاً:</span> <strong style="color: #059669; font-size: 12px; font-family: monospace;">${totalPaid.toLocaleString()} ج.م</strong></div>
        </div>
      </div>

      <!-- Financial Table -->
      <table style="width: 100%; border-collapse: collapse; text-align: right; font-size: 10px; border: 1px solid #cbd5e1;">
        <thead>
          <tr style="background: #0f172a; color: #ffffff; font-weight: 900; line-height: 1.6;">
            <th style="padding: 6px 3px; text-align: center; border: 1px solid #334155; width: 26px;">م</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 45px; color: #fde047;">الباص</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 44px; color: #fde047;">المقعد</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 62px;">الكود</th>
            <th style="padding: 6px 6px; border: 1px solid #334155;">اسم المشارك</th>
            <th style="padding: 6px 4px; border: 1px solid #334155; width: 80px;">رقم الهاتف</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 65px;">إجمالي الحساب</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 65px; color: #34d399;">المسدد</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 75px; background: #991b1b; color: #ffffff; font-size: 11px;">المتبقي نقداً</th>
            <th style="padding: 6px 6px; text-align: center; border: 1px solid #334155; width: 80px;">المحصل فعلياً</th>
            <th style="padding: 6px 8px; text-align: center; border: 1px solid #334155; width: 100px;">توقيع المشترك ✍️</th>
            <th style="padding: 6px 8px; text-align: center; border: 1px solid #334155; width: 90px;">توقيع المحصل ✍️</th>
          </tr>
        </thead>
        <tbody>
          ${filtered
            .map((s, idx) => {
              const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
              const isPaid = s.paymentStatus === 'paid' || s.isFreeTicket || s.remainingAmount === 0;
              return `
                <tr style="background: ${bg}; border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 4px 2px; text-align: center; font-weight: 700; color: #64748b; border: 1px solid #e2e8f0;">${idx + 1}</td>
                  <td style="padding: 4px 2px; text-align: center; font-weight: 800; font-family: monospace; border: 1px solid #e2e8f0;">#${s.busNumber}</td>
                  <td style="padding: 4px 2px; text-align: center; font-weight: 900; font-family: monospace; color: #b45309; border: 1px solid #e2e8f0;">${s.seatNumber ? `#${s.seatNumber}` : '—'}</td>
                  <td style="padding: 4px 2px; text-align: center; font-family: monospace; font-weight: 800; color: #1e1b4b; border: 1px solid #e2e8f0;">${s.ticketCode}</td>
                  <td style="padding: 4px 5px; font-weight: 800; color: #0f172a; border: 1px solid #e2e8f0;">
                    ${s.name}
                    ${s.isFreeTicket ? '<span style="color: #059669; font-size: 8.5px; font-weight: 900;"> (مجاني 🎁)</span>' : ''}
                  </td>
                  <td style="padding: 4px 3px; font-family: monospace; font-weight: 700; color: #334155; border: 1px solid #e2e8f0;">${s.phone}</td>
                  <td style="padding: 4px 3px; text-align: center; font-family: monospace; border: 1px solid #e2e8f0;">${s.isFreeTicket ? '0' : `${s.totalAmount} ج.م`}</td>
                  <td style="padding: 4px 3px; text-align: center; font-family: monospace; color: #059669; font-weight: 700; border: 1px solid #e2e8f0;">${s.isFreeTicket ? '0' : `${s.paidAmount} ج.م`}</td>
                  <td style="padding: 4px 3px; text-align: center; font-family: monospace; font-weight: 900; border: 1px solid #e2e8f0; ${isPaid ? 'color: #059669; background: #f0fdf4;' : 'color: #dc2626; background: #fef2f2; font-size: 11px;'}">
                    ${isPaid ? 'خالص ✅' : `${s.remainingAmount} ج.م`}
                  </td>
                  <td style="padding: 4px 3px; text-align: center; border: 1px solid #cbd5e1; font-family: monospace; color: #94a3b8; font-size: 9px;">
                    [ ....... ج.م ]
                  </td>
                  <td style="padding: 4px 4px; text-align: center; border: 1px solid #e2e8f0; color: #94a3b8; font-size: 9px;">
                    ....................
                  </td>
                  <td style="padding: 4px 4px; text-align: center; border: 1px solid #e2e8f0; color: #94a3b8; font-size: 9px;">
                    ....................
                  </td>
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>

      <!-- Financial Footer -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 18px; padding-top: 14px; border-top: 2px dashed #cbd5e1; font-size: 11px;">
        <div style="text-align: center; width: 30%;">
          <span style="color: #64748b; font-weight: 700; display: block;">مسؤول التحصيل والخزينة الميداني</span>
          <span style="color: #94a3b8; font-size: 10px; display: block; margin-top: 6px;">التوقيع: ___________________</span>
        </div>
        <div style="text-align: center; width: 35%;">
          <div style="border: 2px solid #059669; padding: 4px 10px; border-radius: 8px; background: #ecfdf5; display: inline-block;">
            <div style="font-size: 10px; font-weight: 900; color: #065f46;">خاتم واعتماد الإدارة المالية</div>
          </div>
        </div>
        <div style="text-align: center; width: 30%;">
          <span style="color: #64748b; font-weight: 700; display: block;">المدير التنفيذي للشركة</span>
          <span style="color: #94a3b8; font-size: 10px; display: block; margin-top: 6px;">التوقيع: ___________________</span>
        </div>
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
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = doc.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    const pageHeight = doc.internal.pageSize.getHeight();
    let heightLeft = pdfHeight;
    let position = 0;

    doc.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - pdfHeight;
      doc.addPage();
      doc.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }

    doc.save(`KAYAN_Financial_Manifest.pdf`);
    return true;
  } catch (err) {
    console.error('Error generating Financial Manifest PDF:', err);
    fallbackPrintElement(container, 'Financial_Manifest');
    return false;
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
};

/**
 * Generate Master Attendance & Delivery Checkoff PDF for All Students (كشف التسليمات والحضور الشامل لجميع الطلاب)
 */
export const generateMasterAttendanceDeliveryPDF = async (
  students: Student[],
  settings: TripSettings,
  filterOption = 'all'
): Promise<boolean> => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '1200px';
  container.style.background = '#ffffff';
  container.style.color = '#0f172a';
  container.style.direction = 'rtl';
  container.style.fontFamily = "'Tajawal', -apple-system, sans-serif";
  container.style.padding = '24px';
  container.style.boxSizing = 'border-box';

  const displayedStudents = students
    .filter((s) => {
      if (filterOption === 'free') return s.isFreeTicket;
      if (filterOption === 'addons') return (s.selectedAddonIds || []).length > 0 || getStudentMealInfo(s, settings).hasMeal;
      if (filterOption === 'tshirts_pending') return !s.tshirtReceived;
      if (filterOption === 'unpaid') return (s.remainingAmount || 0) > 0;
      return true;
    })
    .sort((a, b) => a.busNumber - b.busNumber || (a.seatNumber || 999) - (b.seatNumber || 999));

  const totalCount = displayedStudents.length;
  const mealsReserved = displayedStudents.filter((s) => getStudentMealInfo(s, settings).hasMeal).length;
  const mealsDelivered = displayedStudents.filter((s) => s.mealReceived).length;
  const tshirtsDelivered = displayedStudents.filter((s) => s.tshirtReceived).length;
  const totalRemaining = displayedStudents.reduce((acc, s) => acc + (s.remainingAmount || 0), 0);

  const formattedDate = settings.tripDate
    ? new Date(settings.tripDate).toLocaleDateString('ar-EG', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : settings.tripDate || '2026-08-15';

  container.innerHTML = `
    <div style="border: 2px solid #0f172a; border-radius: 16px; padding: 20px; background: #ffffff; position: relative;">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #d97706; padding-bottom: 14px; margin-bottom: 14px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <img src="${kayanBadge}" width="60" height="60" alt="KAYAN Badge" style="border-radius: 50%; border: 2px solid #f59e0b; object-fit: cover;" />
          <div>
            <div style="font-size: 18px; font-weight: 900; color: #0f172a;">
              ${settings.companyNameAr || 'شركة كيان لتنظيم الفعاليات والرحلات الرسمية'}
            </div>
            <div style="font-size: 11px; color: #64748b; font-weight: 700; margin-top: 2px;">
              KAYAN EVENTS & TOURS • الإدارة العامة للحجوزات والتسليمات الميدانية
            </div>
          </div>
        </div>

        <div style="text-align: center;">
          <div style="background: #0f172a; color: #fde047; padding: 6px 18px; border-radius: 10px; font-size: 16px; font-weight: 900;">
            كشف التسليمات والحضور الشامل لجميع المشاركين 📑
          </div>
          <div style="font-size: 11px; color: #475569; font-weight: 800; margin-top: 4px;">
            تأكيد تسليم الوجبات، التيشرتات، الحضور، وتصفية المبالغ المتبقية
          </div>
        </div>

        <div style="text-align: left; background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 14px; border-radius: 10px; font-size: 11px;">
          <div><span style="color: #64748b; font-weight: 700;">الرحلة:</span> <strong style="color: #0f172a; font-size: 12px;">${settings.tripName}</strong></div>
          <div style="margin-top: 3px;"><span style="color: #64748b; font-weight: 700;">الوجهة:</span> <strong style="color: #0f172a;">${settings.destination || 'فايد - العين السخنة'}</strong></div>
          <div style="margin-top: 3px;"><span style="color: #64748b; font-weight: 700;">التاريخ:</span> <strong style="color: #0f172a;">${formattedDate}</strong></div>
        </div>
      </div>

      <!-- KPI Summary Bar -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 14px; margin-bottom: 14px; font-size: 11px;">
        <div>
          <span style="color: #64748b; display: block; font-weight: 700;">إجمالي الطلاب والمشاركين:</span>
          <strong style="color: #0f172a; font-size: 14px; font-family: monospace;">${totalCount} مشارك</strong>
        </div>
        <div>
          <span style="color: #64748b; display: block; font-weight: 700;">تسليم الوجبات الغذائية 🍔:</span>
          <strong style="color: #b45309; font-size: 14px; font-family: monospace;">${mealsDelivered} / ${mealsReserved} وجبة</strong>
          <span style="color: #475569; font-size: 10px; display: block;">(متبقي تسليم: ${mealsReserved - mealsDelivered})</span>
        </div>
        <div>
          <span style="color: #64748b; display: block; font-weight: 700;">تسليم التيشرتات الرسمية 👕:</span>
          <strong style="color: #6b21a8; font-size: 14px; font-family: monospace;">${tshirtsDelivered} / ${totalCount} تيشرت</strong>
          <span style="color: #475569; font-size: 10px; display: block;">(متبقي تسليم: ${totalCount - tshirtsDelivered})</span>
        </div>
        <div>
          <span style="color: #64748b; display: block; font-weight: 700;">إجمالي المبالغ المتبقية للتحصيل:</span>
          <strong style="color: #b91c1c; font-size: 14px; font-family: monospace;">${totalRemaining.toLocaleString()} ج.م</strong>
        </div>
      </div>

      <!-- Master Table -->
      <table style="width: 100%; border-collapse: collapse; text-align: right; font-size: 10px; border: 1px solid #cbd5e1;">
        <thead>
          <tr style="background: #0f172a; color: #ffffff; font-weight: 900; line-height: 1.6;">
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 26px;">م</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 65px;">الكود</th>
            <th style="padding: 6px 8px; border: 1px solid #334155;">اسم الطالب / المشارك</th>
            <th style="padding: 6px 6px; border: 1px solid #334155; width: 80px;">رقم الهاتف</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 60px; color: #fde047;">الأتوبيس</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 45px; color: #fde047;">المقعد</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 70px;">التيشرت 👕</th>
            <th style="padding: 6px 6px; text-align: center; border: 1px solid #334155; width: 130px; color: #fde047;">الوجبة 🍔</th>
            <th style="padding: 6px 6px; text-align: center; border: 1px solid #334155; width: 80px;">المالية</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 45px;">الذهاب</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 45px;">العودة</th>
            <th style="padding: 6px 6px; text-align: center; border: 1px solid #334155; width: 75px;">توقيع الاستلام</th>
          </tr>
        </thead>
        <tbody>
          ${displayedStudents
            .map((s, idx) => {
              const mealInfo = getStudentMealInfo(s, settings);
              const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
              const isPaid = s.paymentStatus === 'paid' || s.isFreeTicket;
              return `
                <tr style="background: ${bg}; border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 4px 3px; text-align: center; font-weight: 700; color: #64748b; border: 1px solid #e2e8f0;">${idx + 1}</td>
                  <td style="padding: 4px 3px; text-align: center; font-family: monospace; font-weight: 800; color: #1e1b4b; border: 1px solid #e2e8f0;">
                    ${s.ticketCode}
                  </td>
                  <td style="padding: 4px 6px; font-weight: 800; color: #0f172a; border: 1px solid #e2e8f0;">
                    ${s.name}
                    ${s.isFreeTicket ? '<span style="color: #059669; font-size: 8.5px; font-weight: 900; margin-right: 4px;">(VIP 🎁)</span>' : ''}
                    <span style="display: block; font-size: 9px; color: #64748b; font-weight: 600;">${s.faculty || ''}</span>
                  </td>
                  <td style="padding: 4px 4px; font-family: monospace; font-weight: 700; color: #334155; border: 1px solid #e2e8f0;">
                    ${s.phone}
                  </td>
                  <td style="padding: 4px 3px; text-align: center; font-weight: 800; border: 1px solid #e2e8f0; background: #f0fdf4;">
                    حافلة (${s.busNumber})
                  </td>
                  <td style="padding: 4px 3px; text-align: center; font-weight: 900; font-family: monospace; color: #b45309; border: 1px solid #e2e8f0; background: #fffbeb;">
                    ${s.seatNumber ? `#${s.seatNumber}` : '—'}
                  </td>
                  <td style="padding: 4px 3px; text-align: center; border: 1px solid #e2e8f0;">
                    <span style="font-weight: 800; font-family: monospace;">${s.tshirtSize === 'none' ? 'بدون' : s.tshirtSize}</span>
                    <span style="display: block; font-size: 8.5px; color: ${s.tshirtReceived ? '#059669' : '#94a3b8'}; font-weight: 700;">
                      ${s.tshirtReceived ? '✅ استلم' : '🔲 لم يستلم'}
                    </span>
                  </td>
                  <td style="padding: 4px 4px; text-align: center; border: 1px solid #e2e8f0;">
                    ${
                      mealInfo.hasMeal
                        ? `
                      <span style="color: #0f172a; font-weight: 800; font-size: 9.5px; display: block;">${mealInfo.mealName}</span>
                      <span style="display: inline-block; font-size: 8.5px; font-weight: 800; padding: 1px 4px; border-radius: 4px; ${
                        s.mealReceived ? 'background: #dcfce7; color: #15803d;' : 'background: #fef3c7; color: #b45309;'
                      }">
                        ${s.mealReceived ? '✅ تم التسليم' : '🔲 في الانتظار'}
                      </span>
                    `
                        : '<span style="color: #94a3b8; font-size: 9px;">بدون وجبة</span>'
                    }
                  </td>
                  <td style="padding: 4px 3px; text-align: center; border: 1px solid #e2e8f0;">
                    ${
                      s.isFreeTicket
                        ? '<span style="color: #059669; font-weight: 800; font-size: 9.5px;">مجاني 🎁</span>'
                        : isPaid
                        ? '<span style="color: #059669; font-weight: 800; font-size: 9.5px;">مسدد ✅</span>'
                        : `<span style="color: #b91c1c; font-weight: 800; font-size: 9.5px;">متبقي ${s.remainingAmount}</span>`
                    }
                  </td>
                  <td style="padding: 4px 2px; text-align: center; border: 1px solid #e2e8f0; font-weight: 700; color: ${s.checkInDeparture ? '#059669' : '#94a3b8'};">
                    ${s.checkInDeparture ? '✅' : '🔲'}
                  </td>
                  <td style="padding: 4px 2px; text-align: center; border: 1px solid #e2e8f0; font-weight: 700; color: ${s.checkInReturn ? '#059669' : '#94a3b8'};">
                    ${s.checkInReturn ? '✅' : '🔲'}
                  </td>
                  <td style="padding: 4px 3px; text-align: center; border: 1px solid #e2e8f0; color: #cbd5e1; font-size: 8.5px;">
                    ___________
                  </td>
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>

      <!-- Signatures Footer -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 18px; padding-top: 14px; border-top: 2px dashed #cbd5e1; font-size: 11px;">
        <div style="text-align: center; width: 30%;">
          <span style="color: #64748b; font-weight: 700; display: block;">مسؤول التسليمات الميدانية</span>
          <strong style="color: #0f172a; font-size: 13px; display: block; margin-top: 6px;">لجنة التجهيزات والإعاشة</strong>
          <span style="color: #94a3b8; font-size: 10px;">التوقيع: ___________________</span>
        </div>

        <div style="text-align: center; width: 35%;">
          <div style="border: 2px solid #d97706; padding: 6px 12px; border-radius: 8px; background: #fffbeb; display: inline-block;">
            <div style="font-size: 11px; font-weight: 900; color: #b45309;">خاتم واعتماد الإدارة العامة</div>
            <div style="font-size: 9.5px; color: #047857; font-weight: 800; margin-top: 2px;">✓ معتمد ومطابق لمنظومة KAYAN 2026</div>
          </div>
        </div>

        <div style="text-align: center; width: 30%;">
          <span style="color: #64748b; font-weight: 700; display: block;">المدير المالي والتنفيذي</span>
          <strong style="color: #0f172a; font-size: 13px; display: block; margin-top: 6px;">إدارة شركة كيان</strong>
          <span style="color: #94a3b8; font-size: 10px;">التوقيع: ___________________</span>
        </div>
      </div>

      <div style="margin-top: 12px; text-align: center; font-size: 9.5px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 6px;">
        كشف تسليمات وحضور رسمي معتمد صادر من منظومة كيان • تاريخ الاستخراج: ${new Date().toLocaleString('ar-EG')}
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
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = doc.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    const pageHeight = doc.internal.pageSize.getHeight();
    let heightLeft = pdfHeight;
    let position = 0;

    doc.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - pdfHeight;
      doc.addPage();
      doc.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }

    doc.save(`KAYAN_Master_Attendance_Manifest.pdf`);
    return true;
  } catch (err) {
    console.error('Error generating Master Attendance Manifest PDF:', err);
    fallbackPrintElement(container, 'Master_Attendance_Manifest');
    return false;
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
};

/**
 * Generate Ultra-High Quality, Official PDF Report for Students CRM (تقرير كشف الطلاب والمشاركين الرسمي لشركة كيان)
 */
export const generateStudentsComprehensiveReportPDF = async (
  students: Student[],
  settings: TripSettings,
  reportTitle = 'تقرير وبيانات المشاركين الشامل (CRM Export)',
  filterDescription = 'جميع السجلات المعروضة'
): Promise<boolean> => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '1200px';
  container.style.background = '#ffffff';
  container.style.color = '#0f172a';
  container.style.direction = 'rtl';
  container.style.fontFamily = "'Tajawal', -apple-system, sans-serif";
  container.style.padding = '24px';
  container.style.boxSizing = 'border-box';

  const totalCount = students.length;
  const mealsReserved = students.filter((s) => getStudentMealInfo(s, settings).hasMeal).length;
  const mealsDelivered = students.filter((s) => s.mealReceived).length;
  const tshirtsDelivered = students.filter((s) => s.tshirtReceived).length;
  const departureChecked = students.filter((s) => s.checkInDeparture).length;
  const returnChecked = students.filter((s) => s.checkInReturn).length;
  const totalPaid = students.reduce((acc, s) => acc + (s.paidAmount || 0), 0);
  const totalRemaining = students.reduce((acc, s) => acc + (s.remainingAmount || 0), 0);

  const formattedDate = settings.tripDate
    ? new Date(settings.tripDate).toLocaleDateString('ar-EG', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : settings.tripDate || '2026-08-15';

  container.innerHTML = `
    <div style="border: 2px solid #0f172a; border-radius: 16px; padding: 20px; background: #ffffff; position: relative;">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #d97706; padding-bottom: 14px; margin-bottom: 14px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <img src="${kayanBadge}" width="60" height="60" alt="KAYAN Badge" style="border-radius: 50%; border: 2px solid #f59e0b; object-fit: cover;" />
          <div>
            <div style="font-size: 18px; font-weight: 900; color: #0f172a;">
              ${settings.companyNameAr || 'شركة كيان لتنظيم الفعاليات والرحلات الرسمية'}
            </div>
            <div style="font-size: 11px; color: #64748b; font-weight: 700; margin-top: 2px;">
              KAYAN EVENTS & TOURS • تقرير إدارة الحجوزات والبيانات المركزية CRM • ترخيص رقم: 98231
            </div>
          </div>
        </div>

        <div style="text-align: center;">
          <div style="background: #0f172a; color: #fde047; padding: 6px 18px; border-radius: 10px; font-size: 16px; font-weight: 900;">
            ${reportTitle} 📑
          </div>
          <div style="font-size: 11px; color: #475569; font-weight: 800; margin-top: 4px;">
            نطاق التقرير: <span style="color: #d97706; font-weight: 900;">${filterDescription}</span>
          </div>
        </div>

        <div style="text-align: left; background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 14px; border-radius: 10px; font-size: 11px;">
          <div><span style="color: #64748b; font-weight: 700;">الرحلة:</span> <strong style="color: #0f172a; font-size: 12px;">${settings.tripName}</strong></div>
          <div style="margin-top: 3px;"><span style="color: #64748b; font-weight: 700;">الوجهة:</span> <strong style="color: #0f172a;">${settings.destination || 'فايد - العين السخنة'}</strong></div>
          <div style="margin-top: 3px;"><span style="color: #64748b; font-weight: 700;">تاريخ الرحلة:</span> <strong style="color: #0f172a;">${formattedDate}</strong></div>
        </div>
      </div>

      <!-- Key Performance Indicators (KPIs) Summary Bar -->
      <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 12px; margin-bottom: 14px; font-size: 11px;">
        <div style="border-left: 1px solid #e2e8f0; padding-left: 6px;">
          <span style="color: #64748b; display: block; font-weight: 700;">إجمالي المسجلين:</span>
          <strong style="color: #0f172a; font-size: 14px; font-family: monospace;">${totalCount} مشارك</strong>
        </div>
        <div style="border-left: 1px solid #e2e8f0; padding-left: 6px;">
          <span style="color: #64748b; display: block; font-weight: 700;">حضور الذهاب / العودة 🚌:</span>
          <strong style="color: #047857; font-size: 13px; font-family: monospace;">ذهاب: ${departureChecked} | عودة: ${returnChecked}</strong>
        </div>
        <div style="border-left: 1px solid #e2e8f0; padding-left: 6px;">
          <span style="color: #64748b; display: block; font-weight: 700;">تسليم الوجبات 🍔:</span>
          <strong style="color: #b45309; font-size: 13px; font-family: monospace;">${mealsDelivered} / ${mealsReserved}</strong>
        </div>
        <div style="border-left: 1px solid #e2e8f0; padding-left: 6px;">
          <span style="color: #64748b; display: block; font-weight: 700;">تسليم التيشرتات 👕:</span>
          <strong style="color: #7c3aed; font-size: 13px; font-family: monospace;">${tshirtsDelivered} / ${totalCount}</strong>
        </div>
        <div>
          <span style="color: #64748b; display: block; font-weight: 700;">الماليات المحصلة / المتبقية:</span>
          <strong style="color: #059669; font-size: 12px; font-family: monospace;">${totalPaid.toLocaleString()} ج.م</strong>
          <span style="color: #dc2626; font-size: 11px; font-weight: 800; display: block;">متبقي: ${totalRemaining.toLocaleString()} ج.م</span>
        </div>
      </div>

      <!-- Students Table -->
      <table style="width: 100%; border-collapse: collapse; text-align: right; font-size: 10px; border: 1px solid #cbd5e1;">
        <thead>
          <tr style="background: #0f172a; color: #ffffff; font-weight: 900; line-height: 1.6;">
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 24px;">م</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 60px;">الكود</th>
            <th style="padding: 6px 8px; border: 1px solid #334155;">اسم المشارك</th>
            <th style="padding: 6px 6px; border: 1px solid #334155; width: 75px;">الهاتف</th>
            <th style="padding: 6px 6px; border: 1px solid #334155; width: 90px;">الكلية / الصفة</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 50px; color: #fde047;">الأتوبيس</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 45px; color: #fde047;">المقعد</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 65px;">التيشرت 👕</th>
            <th style="padding: 6px 6px; text-align: center; border: 1px solid #334155; width: 110px; color: #fde047;">الوجبة 🍔</th>
            <th style="padding: 6px 6px; text-align: center; border: 1px solid #334155; width: 70px;">المالية</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 45px;">الذهاب</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 45px;">العودة</th>
            <th style="padding: 6px 6px; text-align: center; border: 1px solid #334155; width: 75px;">ملاحظات / توقيع</th>
          </tr>
        </thead>
        <tbody>
          ${students
            .map((s, idx) => {
              const mealInfo = getStudentMealInfo(s, settings);
              const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
              const isPaid = s.paymentStatus === 'paid' || s.isFreeTicket;
              return `
                <tr style="background: ${bg}; border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 4px 3px; text-align: center; font-weight: 700; color: #64748b; border: 1px solid #e2e8f0;">${idx + 1}</td>
                  <td style="padding: 4px 3px; text-align: center; font-family: monospace; font-weight: 800; color: #1e1b4b; border: 1px solid #e2e8f0;">
                    ${s.ticketCode}
                  </td>
                  <td style="padding: 4px 6px; font-weight: 800; color: #0f172a; border: 1px solid #e2e8f0;">
                    ${s.name}
                    ${s.isFreeTicket ? '<span style="color: #059669; font-size: 8.5px; font-weight: 900; margin-right: 4px;">(VIP 🎁)</span>' : ''}
                    ${s.hasCompanion ? `<div style="font-size: 8.5px; color: #d97706; font-weight: 700;">+ مرافق: ${s.companionName || '—'}</div>` : ''}
                  </td>
                  <td style="padding: 4px 4px; font-family: monospace; font-weight: 700; color: #334155; border: 1px solid #e2e8f0;">
                    ${s.phone}
                  </td>
                  <td style="padding: 4px 4px; font-size: 9px; color: #475569; border: 1px solid #e2e8f0;">
                    <div>${s.faculty || '—'}</div>
                    <span style="font-weight: 700; color: #0284c7;">${s.customRole || s.participantRole || 'طالب'}</span>
                  </td>
                  <td style="padding: 4px 3px; text-align: center; font-weight: 800; border: 1px solid #e2e8f0; background: #f0fdf4;">
                    #${s.busNumber}
                  </td>
                  <td style="padding: 4px 3px; text-align: center; font-weight: 900; font-family: monospace; color: #b45309; border: 1px solid #e2e8f0; background: #fffbeb;">
                    ${s.seatNumber ? `#${s.seatNumber}` : '—'}
                  </td>
                  <td style="padding: 4px 3px; text-align: center; border: 1px solid #e2e8f0;">
                    <span style="font-weight: 800; font-family: monospace;">${s.tshirtSize === 'none' ? 'بدون' : s.tshirtSize}</span>
                    <span style="display: block; font-size: 8.5px; color: ${s.tshirtReceived ? '#059669' : '#94a3b8'}; font-weight: 700;">
                      ${s.tshirtReceived ? '✅ استلم' : '🔲 لم يستلم'}
                    </span>
                  </td>
                  <td style="padding: 4px 4px; text-align: center; border: 1px solid #e2e8f0;">
                    ${
                      mealInfo.hasMeal
                        ? `
                      <span style="color: #0f172a; font-weight: 800; font-size: 9px; display: block;">${mealInfo.mealName}</span>
                      <span style="display: inline-block; font-size: 8.5px; font-weight: 800; padding: 1px 4px; border-radius: 4px; ${
                        s.mealReceived ? 'background: #dcfce7; color: #15803d;' : 'background: #fef3c7; color: #b45309;'
                      }">
                        ${s.mealReceived ? '✅ تم التسليم' : '🔲 في الانتظار'}
                      </span>
                    `
                        : '<span style="color: #94a3b8; font-size: 9px;">بدون وجبة</span>'
                    }
                  </td>
                  <td style="padding: 4px 3px; text-align: center; border: 1px solid #e2e8f0;">
                    ${
                      s.isFreeTicket
                        ? '<span style="color: #059669; font-weight: 800; font-size: 9.5px;">مجاني 🎁</span>'
                        : isPaid
                        ? '<span style="color: #059669; font-weight: 800; font-size: 9.5px;">مسدد ✅</span>'
                        : `<span style="color: #b91c1c; font-weight: 800; font-size: 9.5px;">متبقي ${s.remainingAmount}</span>`
                    }
                  </td>
                  <td style="padding: 4px 2px; text-align: center; border: 1px solid #e2e8f0; font-weight: 700; color: ${s.checkInDeparture ? '#059669' : '#94a3b8'};">
                    ${s.checkInDeparture ? '✅ حضر' : '🔲'}
                  </td>
                  <td style="padding: 4px 2px; text-align: center; border: 1px solid #e2e8f0; font-weight: 700; color: ${s.checkInReturn ? '#059669' : '#94a3b8'};">
                    ${s.checkInReturn ? '✅ حضر' : '🔲'}
                  </td>
                  <td style="padding: 4px 3px; text-align: center; border: 1px solid #e2e8f0; color: #cbd5e1; font-size: 8.5px;">
                    ${s.notes ? `<span style="color: #475569; font-size: 8px; display: block;">${s.notes}</span>` : '___________'}
                  </td>
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>

      <!-- Signatures Footer -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 18px; padding-top: 14px; border-top: 2px dashed #cbd5e1; font-size: 11px;">
        <div style="text-align: center; width: 30%;">
          <span style="color: #64748b; font-weight: 700; display: block;">مسؤول التسجيل وشؤون الطلاب</span>
          <strong style="color: #0f172a; font-size: 13px; display: block; margin-top: 6px;">لجنة الحجوزات والـ CRM</strong>
          <span style="color: #94a3b8; font-size: 10px;">التوقيع: ___________________</span>
        </div>

        <div style="text-align: center; width: 35%;">
          <div style="border: 2px solid #d97706; padding: 6px 12px; border-radius: 8px; background: #fffbeb; display: inline-block;">
            <div style="font-size: 11px; font-weight: 900; color: #b45309;">خاتم واعتماد الإدارة العامة</div>
            <div style="font-size: 9.5px; color: #047857; font-weight: 800; margin-top: 2px;">✓ معتمد ومطابق لمنظومة KAYAN 2026</div>
          </div>
        </div>

        <div style="text-align: center; width: 30%;">
          <span style="color: #64748b; font-weight: 700; display: block;">المدير التنفيذي والمالي</span>
          <strong style="color: #0f172a; font-size: 13px; display: block; margin-top: 6px;">إدارة شركة كيان</strong>
          <span style="color: #94a3b8; font-size: 10px;">التوقيع: ___________________</span>
        </div>
      </div>

      <div style="margin-top: 12px; text-align: center; font-size: 9.5px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 6px;">
        تقرير رسمي معتمد صادر من منظومة كيان لتنظيم الرحلات • تاريخ الاستخراج: ${new Date().toLocaleString('ar-EG')}
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
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = doc.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    const pageHeight = doc.internal.pageSize.getHeight();
    let heightLeft = pdfHeight;
    let position = 0;

    doc.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - pdfHeight;
      doc.addPage();
      doc.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }

    doc.save(`KAYAN_Students_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
    return true;
  } catch (err) {
    console.error('Error generating Students Comprehensive Report PDF:', err);
    fallbackPrintElement(container, 'Students_Report');
    return false;
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
};

/**
 * Generate Official Main Treasury Ledger & Financial Statement PDF (كشف حساب وسجل حركات الخزنة الرئيسية المعتمد)
 */
export const generateTreasuryFullLedgerPDF = async (
  treasury: CompanyTreasury,
  companyName = 'شركة كيان لتنظيم الفعاليات والرحلات',
  transfersOverride?: TreasuryTransfer[],
  filterTitle?: string
): Promise<boolean> => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '1200px';
  container.style.background = '#ffffff';
  container.style.color = '#0f172a';
  container.style.direction = 'rtl';
  container.style.fontFamily = "'Tajawal', -apple-system, sans-serif";
  container.style.padding = '24px';
  container.style.boxSizing = 'border-box';

  const transfersToDisplay = transfersOverride && transfersOverride.length > 0
    ? transfersOverride
    : (treasury.transfers || []);

  const totalDeposits = transfersToDisplay
    .filter((t) => t.type !== 'direct_withdrawal')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalWithdrawals = transfersToDisplay
    .filter((t) => t.type === 'direct_withdrawal')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const currentBal = treasury.currentBalance ?? (treasury as any).balance ?? (totalDeposits - totalWithdrawals);
  const netMovement = totalDeposits - totalWithdrawals;

  const serialNum = `KAYAN-LEDGER-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 9000 + 1000))}`;

  container.innerHTML = `
    <div style="border: 3px double #d97706; border-radius: 16px; padding: 24px; background: #ffffff; position: relative;">
      <!-- Top Header -->
      <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #ffffff; padding: 20px 24px; border-radius: 12px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; border: 1px solid #334155;">
        <div style="display: flex; align-items: center; gap: 16px;">
          <img src="${kayanBadge}" width="70" height="70" alt="KAYAN Badge" style="border-radius: 12px; border: 2px solid #f59e0b; object-fit: cover;" />
          <div>
            <div style="font-size: 11px; font-weight: 800; color: #fbbf24; letter-spacing: 0.5px;">KAYAN EVENTS & TOURS • الإدارة المالية المركزية</div>
            <h1 style="margin: 3px 0 0 0; font-size: 24px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">${companyName}</h1>
            <p style="margin: 4px 0 0 0; font-size: 13px; font-weight: 700; color: #cbd5e1;">
              كشف حساب وسجل حركات الخزنة الرئيسية المركزية (Master Treasury Statement)
              ${filterTitle ? `<span style="display: inline-block; background: rgba(245, 158, 11, 0.2); color: #fde047; padding: 2px 8px; border-radius: 6px; margin-right: 8px; font-size: 11px; border: 1px solid rgba(245, 158, 11, 0.4);">${filterTitle}</span>` : ''}
            </p>
          </div>
        </div>
        <div style="text-align: left; background: rgba(255, 255, 255, 0.08); padding: 10px 18px; border-radius: 10px; border: 1px solid rgba(245, 158, 11, 0.4);">
          <div style="font-size: 10.5px; color: #cbd5e1;">رقم الكشف المرجعي:</div>
          <div style="font-size: 13px; font-weight: 900; color: #fbbf24; font-family: monospace;">${serialNum}</div>
          <div style="font-size: 10.5px; color: #94a3b8; margin-top: 4px;">تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-EG', { weekday: 'short', year: 'numeric', month: 'numeric', day: 'numeric' })}</div>
          <div style="font-size: 10px; color: #94a3b8; font-family: monospace;">الوقت: ${new Date().toLocaleTimeString('ar-EG')}</div>
        </div>
      </div>

      <!-- Financial Balance Summary KPI Cards -->
      <div style="display: grid; grid-template-columns: 1.2fr 1.2fr 1.4fr 1fr; gap: 12px; margin-bottom: 20px;">
        <div style="background: #ecfdf5; border: 2px solid #10b981; border-radius: 12px; padding: 12px 14px; text-align: center;">
          <span style="font-size: 11.5px; color: #047857; font-weight: 800; display: block;">إجمالي الإيداعات وأرباح الرحلات (+)</span>
          <strong style="font-size: 22px; font-weight: 900; color: #065f46; font-family: monospace; display: block; margin-top: 3px;">+${totalDeposits.toLocaleString()} ج.م</strong>
          <span style="font-size: 10px; color: #059669;">واردات الخزنة المقيدة</span>
        </div>

        <div style="background: #fff1f2; border: 2px solid #f43f5e; border-radius: 12px; padding: 12px 14px; text-align: center;">
          <span style="font-size: 11.5px; color: #be123c; font-weight: 800; display: block;">إجمالي المصروفات والسحوبات (-)</span>
          <strong style="font-size: 22px; font-weight: 900; color: #9f1239; font-family: monospace; display: block; margin-top: 3px;">-${totalWithdrawals.toLocaleString()} ج.م</strong>
          <span style="font-size: 10px; color: #e11d48;">مصروفات تشغيلية وإدارية</span>
        </div>

        <div style="background: #fffbeb; border: 2px solid #d97706; border-radius: 12px; padding: 12px 14px; text-align: center;">
          <span style="font-size: 11.5px; color: #92400e; font-weight: 800; display: block;">صافي الرصيد المتاح الفعلي (Net Master Balance)</span>
          <strong style="font-size: 24px; font-weight: 900; color: #b45309; font-family: monospace; display: block; margin-top: 3px;">${currentBal.toLocaleString()} ج.م</strong>
          <span style="font-size: 10px; color: #78350f; font-weight: 700;">السيولة النقدية المحفوظة بالخزنة</span>
        </div>

        <div style="background: #f8fafc; border: 2px solid #64748b; border-radius: 12px; padding: 12px 14px; text-align: center;">
          <span style="font-size: 11.5px; color: #334155; font-weight: 800; display: block;">إجمالي السندات</span>
          <strong style="font-size: 22px; font-weight: 900; color: #0f172a; font-family: monospace; display: block; margin-top: 3px;">${transfersToDisplay.length} سند</strong>
          <span style="font-size: 10px; color: #64748b;">حركات مقيدة ومطابقة</span>
        </div>
      </div>

      <!-- Ledger Transactions Table -->
      <table style="width: 100%; border-collapse: collapse; text-align: right; font-size: 11px; margin-bottom: 20px; border: 1px solid #cbd5e1;">
        <thead>
          <tr style="background: #0f172a; color: #f8fafc; font-weight: 900;">
            <th style="padding: 10px 6px; border: 1px solid #334155; width: 35px; text-align: center;">م</th>
            <th style="padding: 10px 8px; border: 1px solid #334155; width: 110px; text-align: center;">رقم المرجع</th>
            <th style="padding: 10px 8px; border: 1px solid #334155; width: 125px; text-align: center;">التاريخ والوقت</th>
            <th style="padding: 10px 8px; border: 1px solid #334155; width: 150px;">نوع الحركة</th>
            <th style="padding: 10px 10px; border: 1px solid #334155;">الرحلة المصدر / البيان والوصف التفصيلي</th>
            <th style="padding: 10px 8px; border: 1px solid #334155; width: 130px;">المسؤول المنفذ</th>
            <th style="padding: 10px 8px; border: 1px solid #334155; width: 120px; text-align: center;">المبلغ (ج.م)</th>
          </tr>
        </thead>
        <tbody>
          ${transfersToDisplay.length === 0
            ? `<tr><td colspan="7" style="padding: 24px; text-align: center; color: #64748b; font-size: 13px;">لا توجد حركات مسجلة مطابقة حتى الآن.</td></tr>`
            : transfersToDisplay.map((trf, idx) => {
                const isOut = trf.type === 'direct_withdrawal';
                const typeName =
                  trf.type === 'trip_final_profit'
                    ? 'أرباح رحلة مكتملة 🏆'
                    : trf.type === 'partial_cash_out'
                    ? 'تصفية سيولة جزئية 💵'
                    : trf.type === 'direct_deposit'
                    ? 'إيداع مباشر 📥'
                    : 'سحب / مصروف شركة 🔴';

                const badgeBg = isOut ? '#fff1f2' : '#ecfdf5';
                const badgeColor = isOut ? '#be123c' : '#047857';
                const badgeBorder = isOut ? '#fecdd3' : '#a7f3d0';

                return `
                  <tr style="border-bottom: 1px solid #e2e8f0; background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                    <td style="padding: 7px 6px; border: 1px solid #cbd5e1; text-align: center; font-family: monospace; font-weight: 700; color: #64748b;">${idx + 1}</td>
                    <td style="padding: 7px 8px; border: 1px solid #cbd5e1; text-align: center; font-family: monospace; font-weight: 900; color: #b45309; background: #fffbeb;">
                      ${trf.referenceNumber}
                    </td>
                    <td style="padding: 7px 8px; border: 1px solid #cbd5e1; text-align: center; font-family: monospace; color: #475569; font-size: 10.5px;">
                      <div>${trf.date}</div>
                      <div style="color: #94a3b8; font-size: 9.5px;">${trf.time}</div>
                    </td>
                    <td style="padding: 7px 8px; border: 1px solid #cbd5e1;">
                      <span style="display: inline-block; padding: 2px 8px; border-radius: 6px; font-weight: 800; font-size: 10.5px; background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder};">
                        ${typeName}
                      </span>
                    </td>
                    <td style="padding: 7px 10px; border: 1px solid #cbd5e1;">
                      <strong style="color: #0f172a; display: block; font-size: 11.5px;">${trf.tripName || 'الخزنة المركزية'}</strong>
                      <span style="color: #64748b; font-size: 10px; display: block; margin-top: 2px;">${trf.notes || '-'}</span>
                    </td>
                    <td style="padding: 7px 8px; border: 1px solid #cbd5e1; color: #334155; font-weight: 700; font-size: 11px;">
                      ${trf.transferredBy}
                    </td>
                    <td style="padding: 7px 8px; border: 1px solid #cbd5e1; text-align: center; font-family: monospace; font-weight: 900; font-size: 13px; color: ${isOut ? '#e11d48' : '#059669'}; background: ${isOut ? '#fff5f5' : '#f0fdf4'};">
                      ${isOut ? '-' : '+'}${(trf.amount || 0).toLocaleString()}
                    </td>
                  </tr>
                `;
              }).join('')}
        </tbody>
        <tfoot>
          <tr style="background: #0f172a; color: #ffffff; font-weight: 900; font-size: 12px;">
            <td colspan="4" style="padding: 10px 12px; border: 1px solid #334155;">
              إجمالي الحركات المعروضة في هذا الكشف (${transfersToDisplay.length} سند)
            </td>
            <td colspan="2" style="padding: 10px 12px; border: 1px solid #334155; text-align: left; color: #fde047;">
              صافي حركة الفترة:
            </td>
            <td style="padding: 10px 8px; border: 1px solid #334155; text-align: center; font-family: monospace; font-size: 14px; color: ${netMovement >= 0 ? '#4ade80' : '#f87171'};">
              ${netMovement >= 0 ? '+' : ''}${netMovement.toLocaleString()} ج.م
            </td>
          </tr>
        </tfoot>
      </table>

      <!-- Signatures and Official Approvals -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-top: 2px solid #0f172a; padding-top: 18px; margin-top: 16px;">
        <div style="width: 30%; text-align: center;">
          <p style="margin: 0; font-size: 12px; font-weight: 800; color: #475569;">إعداد ومراجعة الحسابات</p>
          <strong style="color: #0f172a; font-size: 13px; display: block; margin-top: 6px;">لجنة المالية والخزينة</strong>
          <div style="margin-top: 18px; border-bottom: 2px dashed #cbd5e1; width: 75%; margin-left: auto; margin-right: auto;"></div>
          <span style="font-size: 10px; color: #94a3b8; font-family: monospace; display: block; margin-top: 4px;">توقيع المحاسب المسؤول</span>
        </div>

        <div style="width: 35%; text-align: center;">
          <div style="display: inline-block; border: 2px solid #d97706; background: #fffbeb; padding: 10px 18px; border-radius: 12px;">
            <div style="font-size: 12px; font-weight: 900; color: #b45309;">خاتم واعتماد الإدارة العامة للخزينة</div>
            <div style="font-size: 10px; color: #047857; font-weight: 800; margin-top: 4px;">✓ معتمد ومطابق للحسابات البنكية والنقدية 2026</div>
          </div>
        </div>

        <div style="width: 30%; text-align: center;">
          <p style="margin: 0; font-size: 12px; font-weight: 800; color: #475569;">اعتماد المدير العام التنفيذي</p>
          <strong style="color: #0f172a; font-size: 13px; display: block; margin-top: 6px;">إدارة شركة كيان لتنظيم الفعاليات</strong>
          <div style="margin-top: 18px; border-bottom: 2px dashed #cbd5e1; width: 75%; margin-left: auto; margin-right: auto;"></div>
          <span style="font-size: 10px; color: #94a3b8; font-family: monospace; display: block; margin-top: 4px;">الختم والتوقيع الرسمي</span>
        </div>
      </div>

      <div style="margin-top: 16px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 8px;">
        وثيقة مالية معتمدة ورسمية صادرة من نظام الإدارة المالية لشركة كيان للفعاليات والرحلات • استخرجت بواسطة: المسؤول المالي • ${new Date().toLocaleString('ar-EG')}
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
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = doc.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    const pageHeight = doc.internal.pageSize.getHeight();
    let heightLeft = pdfHeight;
    let position = 0;

    doc.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - pdfHeight;
      doc.addPage();
      doc.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }

    doc.save(`KAYAN_Treasury_Ledger_${new Date().toISOString().slice(0, 10)}.pdf`);
    return true;
  } catch (err) {
    console.error('Error generating Treasury Full Ledger PDF:', err);
    fallbackPrintElement(container, 'Treasury_Ledger');
    return false;
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
};

/**
 * Generate Official Run-of-Show Timeline Schedule PDF (جدول سير اليوم والبرنامج التنفيذي A4)
 */
export const generateRunOfShowPDF = async (
  events: TimelineEvent[],
  settings: TripSettings,
  companyName = 'شركة كيان لتنظيم الفعاليات والرحلات'
): Promise<boolean> => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '1200px';
  container.style.background = '#ffffff';
  container.style.color = '#0f172a';
  container.style.direction = 'rtl';
  container.style.fontFamily = "'Tajawal', -apple-system, sans-serif";
  container.style.padding = '24px';
  container.style.boxSizing = 'border-box';

  const formattedDate = settings.tripDate
    ? new Date(settings.tripDate).toLocaleDateString('ar-EG', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : settings.tripDate || '2026-08-25';

  container.innerHTML = `
    <div style="border: 2px solid #0f172a; border-radius: 16px; padding: 22px; background: #ffffff; position: relative;">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #d97706; padding-bottom: 16px; margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <img src="${kayanBadge}" width="65" height="65" alt="KAYAN Badge" style="border-radius: 50%; border: 2px solid #f59e0b; object-fit: cover;" />
          <div>
            <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #0f172a;">${companyName}</h1>
            <p style="margin: 3px 0 0 0; font-size: 13.5px; font-weight: 700; color: #d97706;">البرنامج التنفيذي الزمني الميداني المعتمد (Run-of-Show Official Schedule)</p>
          </div>
        </div>
        <div style="text-align: left; background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 16px; border-radius: 10px;">
          <div style="font-size: 13px; font-weight: 900; color: #1e1b4b;">الفعالية: ${settings.tripName}</div>
          <div style="font-size: 11px; color: #475569; margin-top: 2px;">التاريخ: ${formattedDate}</div>
          <div style="font-size: 11px; color: #475569;">الوجهة: ${settings.destination || 'الموقع المحدد'}</div>
        </div>
      </div>

      <!-- Events Table -->
      <table style="width: 100%; border-collapse: collapse; text-align: right; font-size: 12px; margin-bottom: 20px;">
        <thead>
          <tr style="background: #0f172a; color: #ffffff; font-weight: 900;">
            <th style="padding: 10px; border: 1px solid #334155; width: 45px; text-align: center;">م</th>
            <th style="padding: 10px; border: 1px solid #334155; width: 110px;">التوقيت</th>
            <th style="padding: 10px; border: 1px solid #334155;">الفقرة والتعليمات التنفيذية</th>
            <th style="padding: 10px; border: 1px solid #334155; width: 160px;">المكان المحدد</th>
            <th style="padding: 10px; border: 1px solid #334155; width: 160px;">اللجنة والمسؤول</th>
            <th style="padding: 10px; border: 1px solid #334155; width: 90px; text-align: center;">الحالة</th>
          </tr>
        </thead>
        <tbody>
          ${events.map((ev, idx) => {
            const statusText = ev.status === 'completed' ? '✅ مكتمل' : ev.status === 'in_progress' ? '⏳ جاري' : '📌 قادم';
            return `
              <tr style="border-bottom: 1px solid #cbd5e1; background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                <td style="padding: 9px 10px; border: 1px solid #cbd5e1; text-align: center; font-family: monospace; font-weight: 700;">${idx + 1}</td>
                <td style="padding: 9px 10px; border: 1px solid #cbd5e1; font-family: monospace; font-weight: 900; color: #b45309; font-size: 13px;">${ev.time}</td>
                <td style="padding: 9px 10px; border: 1px solid #cbd5e1;">
                  <strong style="color: #0f172a; font-size: 13px; display: block;">${ev.title}</strong>
                  <span style="color: #475569; font-size: 11px; display: block; margin-top: 2px;">${ev.description}</span>
                  ${ev.performer ? `<span style="color: #4338ca; font-size: 10.5px; font-weight: 700;">🎤 المؤدي/المنسق: ${ev.performer}</span>` : ''}
                </td>
                <td style="padding: 9px 10px; border: 1px solid #cbd5e1; color: #1e293b; font-weight: 700;">📍 ${ev.location}</td>
                <td style="padding: 9px 10px; border: 1px solid #cbd5e1; color: #1e293b;">👥 ${ev.assignedTeam}</td>
                <td style="padding: 9px 10px; border: 1px solid #cbd5e1; text-align: center; font-weight: 800; font-size: 11px;">${statusText}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>

      <!-- Signatures & Official Stamp -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-top: 2px solid #0f172a; padding-top: 18px;">
        <div style="width: 32%; text-align: center;">
          <p style="margin: 0; font-size: 12px; font-weight: 800; color: #475569;">توقيع مسؤول العمليات والليدر</p>
          <div style="margin-top: 32px; border-bottom: 2px dashed #cbd5e1; width: 80%; margin-left: auto; margin-right: auto;"></div>
        </div>

        <div style="width: 32%; text-align: center;">
          <div style="display: inline-block; border: 2px solid #1d4ed8; padding: 6px 14px; border-radius: 10px; color: #1d4ed8; font-weight: 900; font-size: 12px;">
            ★ معتمد رسمياً من عمليات كيان ★
          </div>
        </div>

        <div style="width: 32%; text-align: center;">
          <p style="margin: 0; font-size: 12px; font-weight: 800; color: #475569;">اعتماد إدارة الفعالية</p>
          <div style="margin-top: 32px; border-bottom: 2px dashed #cbd5e1; width: 80%; margin-left: auto; margin-right: auto;"></div>
        </div>
      </div>

      <div style="margin-top: 16px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 8px;">
        جدول سير العمليات والفقرات المعتمد • صادر من نظام كيان لإدارة الفعاليات
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
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = doc.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    const pageHeight = doc.internal.pageSize.getHeight();
    let heightLeft = pdfHeight;
    let position = 0;

    doc.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - pdfHeight;
      doc.addPage();
      doc.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }

    doc.save(`KAYAN_Run_of_Show_${settings.tripName || 'Schedule'}.pdf`);
    return true;
  } catch (err) {
    console.error('Error generating Run of Show PDF:', err);
    fallbackPrintElement(container, 'Run_of_Show');
    return false;
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
};






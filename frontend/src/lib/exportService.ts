import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Branding } from '../types';
import { downscaleDataUrl } from './imageUtils';

// Business Colors from index.html
const BUSINESS_ACCENT = [93, 135, 184]; // #5D87B8
const BUSINESS_DARK = [30, 41, 59];    // Slate 800

// Helper to convert Arabic digits to English digits
const toEnglishDigits = (val: any): any => {
  if (val === null || val === undefined) return val;
  if (typeof val === 'number') return val; // Return number as is for proper Excel/PDF handling
  const str = String(val);
  const arabicDigits: { [key: string]: string } = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
  };
  return str.replace(/[٠-٩]/g, (d) => arabicDigits[d] || d);
};

// Helper to parse base64 data and extension from Data URL
const parseImageData = (dataUrl: string) => {
  const matches = dataUrl.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) return null;
  
  let extension = matches[1].toLowerCase();
  if (extension === 'jpg') extension = 'jpeg';
  
  return {
    extension: extension as 'png' | 'jpeg' | 'gif',
    base64: matches[2]
  };
};

export const exportToExcel = async (
  data: any[], 
  fileName: string, 
  sheetName: string, 
  columns: { header: string; key: string; width: number }[], 
  summaryData?: { label: string; value: any; color?: string; isCurrency?: boolean }[], 
  branding?: Branding,
  metadata?: { user?: string; status?: string }
) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName, { 
    views: [{ rightToLeft: true }] 
  });

  const colCount = Math.max(columns.length, 9); 
  const themeColor = 'FF5D87B8'; 

  worksheet.getRow(1).height = 15;

  worksheet.mergeCells(2, 1, 2, colCount);
  const titleCell = worksheet.getCell(2, 1);
  titleCell.value = `${sheetName} - براند ${branding?.name || 'X2 Baby'}`;
  titleCell.font = { bold: true, size: 22, color: { argb: 'FF1E293B' }, name: 'Arial' };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };

  worksheet.mergeCells(3, 1, 3, colCount);
  const metaCell = worksheet.getCell(3, 1);
  const now = new Date();
  const dateStr = now.toLocaleDateString('ar-EG') + ' ' + now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  metaCell.value = `تم الاستخراج: ${toEnglishDigits(dateStr)} | المستخدم: ${metadata?.user || 'المسؤول'} | الحالة: ${metadata?.status || 'نهائي'}`;
  metaCell.font = { italic: true, size: 11, color: { argb: 'FF64748B' }, name: 'Arial' };
  metaCell.alignment = { vertical: 'middle', horizontal: 'center' };

  worksheet.mergeCells(4, 1, 4, colCount);
  const companyCell = worksheet.getCell(4, 1);
  companyCell.value = 'شركة X2 للملابس الجاهزة - نظام إدارة الموارد الذكي المطور';
  companyCell.font = { bold: true, size: 10, color: { argb: themeColor } };
  companyCell.alignment = { vertical: 'middle', horizontal: 'center' };

  let dashboardRow = 6;
  if (summaryData && summaryData.length > 0) {
    const cardsPerRow = 3;
    const itemsPerCard = Math.floor(colCount / cardsPerRow);
    
    for (let i = 0; i < summaryData.length; i += cardsPerRow) {
      const rowItems = summaryData.slice(i, i + cardsPerRow);
      worksheet.getRow(dashboardRow).height = 25;
      worksheet.getRow(dashboardRow + 1).height = 50;

      rowItems.forEach((item, idx) => {
        const startCol = 1 + (idx * itemsPerCard);
        const endCol = (idx === rowItems.length - 1) ? colCount : (startCol + itemsPerCard - 1);
        
        const cardBg = item.color === 'green' ? 'FFF0FDF4' : 
                       item.color === 'red' ? 'FFFEF2F2' : 
                       'FFFFFFFF';
        const cardBorder = item.color === 'green' ? 'FFBBF7D0' :
                           item.color === 'red' ? 'FFFECACA' :
                           'FFE2E8F0';
        const valueColor = item.color === 'green' ? 'FF166534' : 
                           item.color === 'red' ? 'FF991B1B' : 
                           'FF1E293B';

        worksheet.mergeCells(dashboardRow, startCol, dashboardRow, endCol);
        const lCell = worksheet.getCell(dashboardRow, startCol);
        lCell.value = item.label;
        lCell.font = { size: 11, bold: true, color: { argb: 'FF64748B' } };
        lCell.alignment = { vertical: 'bottom', horizontal: 'center' };
        lCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cardBg } };
        lCell.border = {
          top: { style: 'thin', color: { argb: cardBorder } },
          left: { style: 'thin', color: { argb: cardBorder } },
          right: { style: 'thin', color: { argb: cardBorder } }
        };

        worksheet.mergeCells(dashboardRow + 1, startCol, dashboardRow + 1, endCol);
        const vCell = worksheet.getCell(dashboardRow + 1, startCol);
        vCell.value = toEnglishDigits(item.value);
        vCell.font = { size: 18, bold: true, color: { argb: valueColor } };
        vCell.alignment = { vertical: 'middle', horizontal: 'center' };
        vCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cardBg } };
        vCell.border = {
          bottom: { style: 'medium', color: { argb: cardBorder } },
          left: { style: 'thin', color: { argb: cardBorder } },
          right: { style: 'thin', color: { argb: cardBorder } }
        };
      });
      dashboardRow += 3;
    }
  }

  worksheet.getRow(dashboardRow).height = 15;
  const tableHeaderRow = dashboardRow + 1;

  worksheet.columns = columns.map(c => ({ 
    key: c.key, 
    width: c.width || 20,
    header: undefined 
  }));

  const headerRow = worksheet.getRow(tableHeaderRow);
  headerRow.values = columns.map(c => c.header);
  headerRow.height = 40;
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 14 };

  columns.forEach((_, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: themeColor } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
      bottom: { style: 'medium', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FFFFFFFF' } }
    };
  });

  data.forEach((d) => {
    const rowValues = columns.map(c => toEnglishDigits(d[c.key]));
    const row = worksheet.addRow(rowValues);
    row.height = 32;
    row.eachCell((cell) => {
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.font = { size: 12, color: { argb: 'FF1E293B' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
      if (row.number % 2 === 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${fileName}.xlsx`);
};

export const exportToHTML = (data: any[], fileName: string, title: string, columns: string[], keys: string[], branding?: Branding, summaryData?: { label: string; value: string }[]) => {
  const arabicDate = new Date().toLocaleString('ar-EG', { dateStyle: 'full', timeStyle: 'short' });
  const themeAccent = '#5D87B8'; 
  
  const htmlContent = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - ${branding?.name || 'X2 Baby'}</title>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
    <script>
      tailwind.config = {
        darkMode: 'class',
        theme: {
          extend: {
            colors: {
              accent: '${themeAccent}',
              dark: '#0f172a',
              card: '#1e293b'
            },
            fontFamily: {
              cairo: ['Cairo', 'sans-serif'],
            }
          }
        }
      }
    </script>
    <style>
        * { box-sizing: border-box; }
        html, body { height: 100vh; margin: 0; padding: 0; }
        body { font-family: 'Cairo', sans-serif; background-color: #0f172a; color: #f8fafc; }
        .glass-card { background: rgba(30, 41, 59, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.05); }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #5D87B8; }
        th.sort-asc::after { content: ' ↑'; color: #5D87B8; }
        th.sort-desc::after { content: ' ↓'; color: #5D87B8; }
        @media print {
            html, body { height: auto !important; overflow: visible !important; background: white !important; color: black !important; }
            .no-print, button, .interaction-engine { display: none !important; }
            .table-area { overflow: visible !important; height: auto !important; max-height: none !important; }
            table { width: 100% !important; border-collapse: collapse !important; font-size: 10px !important; }
            th, td { border: 1px solid #ddd !important; padding: 6px !important; color: black !important; }
            @page { size: landscape; margin: 1cm; }
            .glass-card { border: 1px solid #eee !important; background: white !important; color: black !important; }
        }
    </style>
</head>
<body class="select-none flex flex-col h-screen overflow-hidden">
    <div class="no-print p-4 md:p-8 space-y-6 flex-none">
        <div class="max-w-[1600px] mx-auto space-y-6">
            <header class="glass-card rounded-[40px] p-6 flex flex-col md:flex-row items-center justify-between gap-6 border-b-4 border-accent/20">
                <div class="flex items-center gap-6">
                    ${branding?.logo ? `<div class="p-3 bg-white rounded-2xl shadow-xl"><img src="${branding.logo}" class="h-16 w-16 object-contain" /></div>` : ''}
                    <div class="text-right">
                        <h1 class="text-3xl font-black text-white">${branding?.name || 'نظام X2 Baby'}</h1>
                        <p class="text-sm font-bold text-accent">${branding?.slogan || 'الذكاء في إدارة الموارد'}</p>
                    </div>
                </div>
                <div class="flex flex-col items-center md:items-end">
                    <div class="bg-accent text-white px-8 py-3 rounded-2xl shadow-lg font-black uppercase tracking-widest">${title}</div>
                    <p class="text-[10px] mt-2 font-bold text-slate-500">تم الاستخراج في: ${arabicDate}</p>
                </div>
            </header>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                ${summaryData && summaryData.length >= 4 ? `
                <div class="glass-card p-5 rounded-3xl"><p class="text-slate-400 font-bold mb-1 text-xs">${summaryData[0].label}</p><h3 id="kpi-pieces" class="text-3xl font-black text-white" dir="rtl">${summaryData[0].value}</h3></div>
                <div class="glass-card p-5 rounded-3xl border-l-4 border-emerald-500/30"><p class="text-emerald-400 font-bold mb-1 text-xs">${summaryData[1].label}</p><h3 id="kpi-value" class="text-2xl font-black text-white" dir="rtl">${summaryData[1].value}</h3></div>
                <div class="glass-card p-5 rounded-3xl border-l-4 border-rose-500/30"><p class="text-rose-400 font-bold mb-1 text-xs">${summaryData[2].label}</p><h3 id="kpi-cost" class="text-2xl font-black text-white" dir="rtl">${summaryData[2].value}</h3></div>
                <div class="glass-card p-5 rounded-3xl border-l-4 border-accent"><p class="text-accent font-bold mb-1 text-xs">${summaryData[3].label}</p><h3 id="kpi-profit" class="text-2xl font-black text-emerald-400" dir="rtl">${summaryData[3].value}</h3></div>
                ` : `
                <div class="glass-card p-5 rounded-3xl"><p class="text-slate-400 font-bold mb-1 text-xs">إجمالي القطع</p><h3 id="kpi-pieces" class="text-3xl font-black text-white" dir="ltr">0</h3></div>
                <div class="glass-card p-5 rounded-3xl border-l-4 border-emerald-500/30"><p class="text-emerald-400 font-bold mb-1 text-xs">القيمة السوقية</p><h3 id="kpi-value" class="text-2xl font-black text-white" dir="ltr">0</h3></div>
                <div class="glass-card p-5 rounded-3xl border-l-4 border-rose-500/30"><p class="text-rose-400 font-bold mb-1 text-xs">إجمالي التكلفة</p><h3 id="kpi-cost" class="text-2xl font-black text-white" dir="ltr">0</h3></div>
                <div class="glass-card p-5 rounded-3xl border-l-4 border-accent"><p class="text-accent font-bold mb-1 text-xs">الأرباح المتوقعة</p><h3 id="kpi-profit" class="text-2xl font-black text-emerald-400" dir="ltr">0</h3></div>
                `}
            </div>

            <div class="interaction-engine glass-card p-6 rounded-[32px] flex flex-col lg:flex-row gap-6 items-center">
                <input type="text" id="searchInput" placeholder="بحث سريع..." class="flex-1 w-full bg-slate-900/50 border-2 border-slate-800 rounded-2xl px-6 py-4 text-right font-bold text-white outline-none focus:border-accent" onkeyup="handleFilterChange()">
                <select id="categoryFilter" onchange="handleFilterChange()" class="w-full lg:w-48 bg-slate-900/50 border-2 border-slate-800 rounded-2xl px-4 py-4 text-right font-bold text-white outline-none cursor-pointer"><option value="all">كل الأقسام</option></select>
                <div class="flex gap-3">
                    <button onclick="window.print()" class="bg-accent text-white px-6 py-4 rounded-2xl font-black text-sm hover:scale-105 transition-all">PDF</button>
                    <button onclick="exportToExcel()" class="bg-emerald-600 text-white px-6 py-4 rounded-2xl font-black text-sm hover:scale-105 transition-all">EXCEL</button>
                </div>
            </div>
        </div>
    </div>

    <main class="flex-1 overflow-hidden flex flex-col px-4 md:px-8 pb-4">
        <div class="max-w-[1600px] mx-auto w-full flex-1 flex flex-col glass-card rounded-[40px] overflow-hidden border border-slate-800">
            <div class="table-area flex-1 overflow-auto border border-slate-700/50 rounded-2xl m-2 custom-scrollbar">
                <table class="w-full min-w-max border-collapse text-right" id="dataTable">
                    <thead class="sticky top-0 z-20 bg-slate-900 shadow-md">
                        <tr class="text-slate-500 border-b border-slate-800">
                            ${columns.map((col, idx) => `<th onclick="sortTable(${idx})" class="p-6 text-center font-black text-[11px] uppercase tracking-wider cursor-pointer hover:bg-slate-800 hover:text-white transition-all whitespace-nowrap">${col}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody id="tableBody" class="divide-y divide-slate-800/40"></tbody>
                </table>
                <div id="noResults" class="hidden py-40 text-center"><p class="text-slate-500 font-bold text-xl">لا توجد نتائج</p></div>
            </div>
            <div class="bg-slate-900/80 backdrop-blur-md p-4 border-t border-slate-800 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-500 no-print">
                <div>المعروض: <span id="rowCount" class="text-accent">0</span> / <span id="totalCount" class="text-white">0</span></div>
                <div class="text-accent">X2 BABY ERP</div>
            </div>
        </div>
    </main>

    <script>
        const rawData = ${JSON.stringify(data)};
        const keys = ${JSON.stringify(keys)};
        const columnNames = ${JSON.stringify(columns)};
        let filteredData = [...rawData];
        let currentSort = { index: -1, direction: 'asc' };

        function toEng(val) {
            if (!val && val !== 0) return '';
            const str = String(val);
            const arabicDigits = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9' };
            return str.replace(/[٠-٩]/g, d => arabicDigits[d] || d);
        }

        function cleanNum(val) {
            if (typeof val === 'number') return isNaN(val) ? 0 : val;
            if (!val || val === '-') return 0;
            // First convert Arabic digits, then clean currencies and non-numeric chars
            const cleaned = toEng(val).replace(/[^\d.]/g, '');
            return parseFloat(cleaned) || 0;
        }

        function formatVal(val) {
            return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(val);
        }

        document.addEventListener('DOMContentLoaded', () => {
            initFilters();
            renderTable();
            updateDashboard();
            document.getElementById('totalCount').textContent = rawData.length;
        });

        function initFilters() {
            const categories = [...new Set(rawData.map(d => d.category))].filter(Boolean).sort();
            const select = document.getElementById('categoryFilter');
            categories.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat;
                opt.textContent = cat;
                select.appendChild(opt);
            });
        }

        function handleFilterChange() {
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            const categorySelect = document.getElementById('categoryFilter').value;
            filteredData = rawData.filter(item => {
                const searchMatch = keys.some(k => String(item[k] || '').toLowerCase().includes(searchTerm));
                const categoryMatch = categorySelect === 'all' || item.category === categorySelect;
                return searchMatch && categoryMatch;
            });
            renderTable();
            updateDashboard();
        }

        function renderTable() {
            const body = document.getElementById('tableBody');
            body.innerHTML = '';
            document.getElementById('rowCount').textContent = filteredData.length;
            if (filteredData.length === 0) { document.getElementById('noResults').classList.remove('hidden'); return; }
            document.getElementById('noResults').classList.add('hidden');

            filteredData.forEach(row => {
                const tr = document.createElement('tr');
                tr.className = "hover:bg-accent/[0.05] transition-colors border-b border-slate-900/50 group";
                tr.innerHTML = keys.map(key => {
                    let val = row[key] !== undefined ? row[key] : '-';
                    let cls = "p-4 md:p-6 text-center text-slate-400 group-hover:text-white transition-colors font-bold";
                    if (key === 'quantity') {
                        const qty = cleanNum(val);
                        val = qty === 0 ? '<span class="text-rose-500">نافذ</span>' : \`<span class="text-white font-mono" dir="ltr">\${qty}</span>\`;
                    } else if (['price', 'total', 'cost'].some(k => key.toLowerCase().includes(k))) {
                        val = \`<span class="text-white" dir="ltr">\${formatVal(cleanNum(val))}</span> <span class="text-[9px] text-slate-600">EGP</span>\`;
                    } else if (key === 'name') {
                        cls = "p-4 md:p-6 text-right font-black text-white text-lg pr-8 min-w-[250px]";
                    }
                    return \`<td class="\${cls}">\${val}</td>\`;
                }).join('');
                body.appendChild(tr);
            });
        }

        function updateDashboard() {
            const pieces = filteredData.reduce((sum, item) => sum + cleanNum(item.quantity), 0);
            
            // Expected Market Value (Total Sales)
            const value = filteredData.reduce((sum, item) => {
                const totalSale = cleanNum(item.total_sale);
                if (totalSale > 0) return sum + totalSale;
                return sum + (cleanNum(item.quantity) * cleanNum(item.price));
            }, 0);

            // Total Cost (Wholesale/Purchase Price)
            const totalCost = filteredData.reduce((sum, item) => {
                // Check multiple possible keys for cost
                const directCost = cleanNum(item.total_cost_val || item.totalCost || item.total_cost);
                if (directCost > 0) return sum + directCost;
                
                const unitCost = cleanNum(item.wholesalePrice || item.purchase_price || item.cost || item.wholesale_price || item.unit_cost);
                return sum + (cleanNum(item.quantity) * unitCost);
            }, 0);

            document.getElementById('kpi-pieces').textContent = formatVal(pieces);
            document.getElementById('kpi-value').textContent = formatVal(value) + ' EGP';
            document.getElementById('kpi-cost').textContent = formatVal(totalCost) + ' EGP';
            document.getElementById('kpi-profit').textContent = formatVal(value - totalCost) + ' EGP';
        }

        function sortTable(index) {
            const key = keys[index];
            currentSort.direction = currentSort.index === index && currentSort.direction === 'asc' ? 'desc' : 'asc';
            currentSort.index = index;
            filteredData.sort((a, b) => {
                let vA = a[key], vB = b[key];
                if (['qty', 'price', 'total', 'cost'].some(k => key.toLowerCase().includes(k))) {
                    return currentSort.direction === 'asc' ? cleanNum(vA) - cleanNum(vB) : cleanNum(vB) - cleanNum(vA);
                }
                vA = String(vA).toLowerCase(); vB = String(vB).toLowerCase();
                return currentSort.direction === 'asc' ? vA.localeCompare(vB) : vB.localeCompare(vA);
            });
            renderTable();
        }

        function exportToExcel() {
            const data = filteredData.map(item => {
                const r = {}; 
                keys.forEach((k, i) => r[columnNames[i]] = (['price', 'total', 'cost', 'qty'].some(s => k.toLowerCase().includes(s)) ? cleanNum(item[k]) : item[k]));
                return r;
            });
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Inventory");
            XLSX.writeFile(wb, \`\${fileName}.xlsx\`);
        }
    </script>
</body>
</html>
  `;
  
  // Use a Blob and URL.createObjectURL to handle the download in the browser
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportToCSV = (data: any[], fileName: string, columns: string[], keys: string[]) => {
  // Add header row
  const header = columns.join(',');
  const rows = data.map(row => 
    keys.map(key => {
      const val = row[key] === undefined || row[key] === null ? '' : String(row[key]);
      // Escape commas and quotes
      return `"${val.replace(/"/g, '""')}"`;
    }).join(',')
  );
  
  const csvContent = [header, ...rows].join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, `${fileName}.csv`);
};

export const exportToJSON = (data: any[], fileName: string) => {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  saveAs(blob, `${fileName}.json`);
};

export const exportToPDF = async (data: any[], fileName: string, title: string, columns: string[], keys: string[], _unused?: any, summaryData?: { label: string, value: string }[], branding?: Branding) => {
  if (branding?.logo) {
    try {
      const downscaledLogo = await downscaleDataUrl(branding.logo, 400, 0.7);
      branding = { ...branding, logo: downscaledLogo };
    } catch (_) {}
  }
  const themeColor = [93, 135, 184]; 
  const themeHex = `#${themeColor.map(x => x.toString(16).padStart(2, '0')).join('')}`;
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
    compress: true
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  
  const renderPage = async (rows: any[], pageIndex: number, totalPages: number, isFirstPage: boolean, isLastPage: boolean) => {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.width = '1400px'; 
    container.style.padding = '60px';
    container.style.backgroundColor = 'white';
    container.style.direction = 'rtl';
    container.style.fontFamily = "'Cairo', sans-serif";
    (container.style as any).webkitFontSmoothing = "antialiased";

    const formattedSummaryData = summaryData?.map(s => ({
      label: s.label,
      value: s.value
    }));

    container.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
        
        * { 
          box-sizing: border-box; 
          -webkit-print-color-adjust: exact; 
          font-family: 'Cairo', sans-serif !important; 
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
        }
        
        .arabic-correct { 
          direction: rtl !important; 
          text-align: right; 
          unicode-bidi: bidi-override !important;
        }
        
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(${formattedSummaryData?.length || 4}, 1fr);
          gap: 30px;
          margin-bottom: 50px;
        }
        
        .table-container {
          border: 3px solid #e2e8f0;
          border-radius: 32px;
          background: white;
          overflow: hidden;
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05);
          margin-bottom: 40px;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 18px;
          direction: rtl;
        }
        
        th, td {
          border-left: 2px solid #f1f5f9;
          vertical-align: middle;
          padding: 28px 18px;
        }
      </style>

      <div class="arabic-correct" style="padding: 20px; background: white;">
        ${isFirstPage ? `
          <div style="background: ${themeHex}; padding: 60px; color: white; border-radius: 50px; margin-bottom: 40px; text-align: center;">
            ${branding?.logo ? `
              <div style="background: white; width: 140px; height: 140px; border-radius: 40px; display: flex; align-items: center; justify-content: center; margin: 0 auto 30px; padding: 20px;">
                <img src="${branding.logo}" style="width: 100%; height: 100%; object-fit: contain;" />
              </div>
            ` : ''}
            <h1 style="margin: 0; font-size: 50px; font-weight: 900;">${branding?.name || 'نظام X2 Baby'}</h1>
            <p style="font-size: 22px; font-weight: 700; opacity: 0.9; margin-top: 15px;">${branding?.slogan || ''}</p>
            <div style="height: 4px; background: rgba(255,255,255,0.2); width: 150px; margin: 30px auto;"></div>
            <h2 style="margin: 0; font-size: 32px; font-weight: 900; background: rgba(255,255,255,0.1); display: inline-block; padding: 15px 50px; border-radius: 25px;">${title}</h2>
          </div>
          
          ${formattedSummaryData ? `
            <div class="kpi-grid">
              ${formattedSummaryData.map(s => `
                <div style="background: white; padding: 30px; border-radius: 40px; border: 3px solid #f1f5f9; text-align: center;">
                  <div style="font-size: 14px; color: #64748b; font-weight: 900; margin-bottom: 10px;">${s.label}</div>
                  <div style="font-size: 28px; font-weight: 900; color: #1e293b;" dir="rtl">${s.value}</div>
                </div>
              `).join('')}
            </div>
          ` : ''}
        ` : `
          <div style="padding: 20px 40px; margin-bottom: 40px; border-bottom: 5px solid ${themeHex}; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border-radius: 25px;">
            <div style="font-weight: 900; color: #1e293b; font-size: 24px;">${branding?.name || 'X2 ERP'} - ${title}</div>
            <div style="color: #64748b; font-size: 18px; font-weight: 900;">صفحة ${pageIndex + 1} من ${totalPages}</div>
          </div>
        `}

        <div class="table-container">
          <table>
            <thead>
              <tr style="background-color: ${themeHex}; color: white;">
                ${columns.map(c => `<th style="padding: 20px; font-weight: 900; text-align: center;">${c}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${rows.map((row, i) => `
                <tr style="background-color: ${i % 2 === 0 ? '#ffffff' : '#f8fafc'}; border-bottom: 2px solid #f1f5f9;">
                  ${keys.map(key => `
                    <td style="text-align: center; color: #1e293b; font-weight: 700;">
                       ${row[key] !== undefined ? row[key] : '-'}
                    </td>
                  `).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div style="border-top: 3px solid #f1f5f9; padding-top: 20px; margin-top: 20px; display: flex; justify-content: space-between; align-items: center; color: #94a3b8; font-size: 16px; font-weight: 700;">
           <div>${branding?.name || 'X2 ERP'} - ص. ${pageIndex + 1}</div>
           <div>${isLastPage ? 'انتهى التقرير' : 'يتبع...'}</div>
        </div>
      </div>
    `;

    container.style.height = 'auto';
    document.body.appendChild(container);
    await document.fonts.ready;
    await new Promise(r => setTimeout(r, 200)); 

    const canvas = await html2canvas(container, {
      scale: 1.5, 
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false
    });

    document.body.removeChild(container);
    return canvas;
  };

  try {
    // Optimize row counts to fill the page properly
    const rowsPerFirstPage = summaryData ? 8 : 12;
    const rowsPerSubsequentPage = 14; 
    
    const pages: any[][] = [];
    let currentRow = 0;
    
    // Page 1
    if (data.length > 0) {
      pages.push(data.slice(0, rowsPerFirstPage));
      currentRow = rowsPerFirstPage;
    }
    
    // Remaining pages
    while (currentRow < data.length) {
      pages.push(data.slice(currentRow, currentRow + rowsPerSubsequentPage));
      currentRow += rowsPerSubsequentPage;
    }

    const totalPagesCount = pages.length;

    for (let i = 0; i < totalPagesCount; i++) {
      if (i > 0) doc.addPage();
      
      const canvas = await renderPage(
        pages[i], 
        i, 
        totalPagesCount, 
        i === 0, 
        i === totalPagesCount - 1
      );
      
      const imgData = canvas.toDataURL('image/jpeg', 0.8);
      const imgWidth = pageWidth - (margin * 2);
      let imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const maxSafeHeight = pageHeight - (margin * 2);
      if (imgHeight > maxSafeHeight) {
        imgHeight = maxSafeHeight;
      }
      
      doc.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight);
    }

    doc.save(`${fileName}.pdf`);
  } catch (err) {
    console.error('Error generating PDF:', err);
  }
};



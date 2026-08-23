import * as XLSX from 'xlsx';

export function exportTableToExcel(markdown: string) {
  try {
    const rows = markdown.split('\n').filter(row => {
      const trimmed = row.trim();
      return trimmed.startsWith('|') && trimmed.includes('|');
    });

    if (rows.length < 2) return;

    const data = rows.map(row => {
      const cells = row.split('|').map(cell => cell.trim());
      if (cells[0] === '') cells.shift();
      if (cells[cells.length - 1] === '') cells.pop();
      return cells;
    }).filter(row => !row.every(cell => cell.includes('---')));

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "AI Report");

    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    const cols = [];

    for (let C = range.s.c; C <= range.e.c; ++C) {
      cols.push({ wch: 18 });
    }

    ws['!cols'] = cols;

    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = ws[cellAddress];
        if (!cell) continue;

        const isHeader = R === range.s.r;
        cell.s = {
          font: {
            bold: isHeader,
            name: 'Calibri',
            sz: isHeader ? 12 : 11,
          },
          alignment: {
            horizontal: isHeader ? 'center' : 'right',
            vertical: 'center',
            wrapText: true,
          },
          border: {
            top: { style: 'thin', color: { rgb: 'FFCCCCCC' } },
            bottom: { style: 'thin', color: { rgb: 'FFCCCCCC' } },
            left: { style: 'thin', color: { rgb: 'FFCCCCCC' } },
            right: { style: 'thin', color: { rgb: 'FFCCCCCC' } },
          },
          fill: isHeader
            ? { fgColor: { rgb: 'FFD9E1F2' } }
            : undefined,
        };
      }
    }

    if (!ws['!dir']) ws['!dir'] = 'rtl';
    ws['!rows'] = Array.from({ length: range.e.r + 1 }, () => ({ hpt: 18 }));

    XLSX.writeFile(wb, `X2_BABY_Report_${Date.now()}.xlsx`);
  } catch (error) {
    console.error("Excel Export Error:", error);
    alert("حدث خطأ أثناء تصدير ملف الإكسيل، يرجى المحاولة مرة أخرى.");
  }
}

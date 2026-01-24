import * as XLSX from 'xlsx';
import { format } from 'date-fns';

export interface ExportOptions {
  filename: string;
  format: 'xlsx' | 'csv';
}

export interface ExportColumn<T> {
  key: keyof T;
  header: string;
  formatter?: (value: T[keyof T], row: T) => string;
}

export function useExportData() {
  const exportToFile = <T extends object>(
    data: T[],
    columns: ExportColumn<T>[],
    options: ExportOptions
  ) => {
    if (data.length === 0) {
      return false;
    }

    // Transform data to export format
    const exportData = data.map(row => {
      const exportRow: Record<string, string> = {};
      columns.forEach(col => {
        const value = row[col.key];
        exportRow[col.header] = col.formatter 
          ? col.formatter(value, row) 
          : (value?.toString() ?? '');
      });
      return exportRow;
    });

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados');

    // Generate filename with timestamp
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm');
    const fullFilename = `${options.filename}_${timestamp}.${options.format}`;

    // Export based on format
    if (options.format === 'csv') {
      XLSX.writeFile(workbook, fullFilename, { bookType: 'csv' });
    } else {
      XLSX.writeFile(workbook, fullFilename, { bookType: 'xlsx' });
    }

    return true;
  };

  return { exportToFile };
}


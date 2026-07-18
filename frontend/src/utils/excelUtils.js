import * as XLSX from 'xlsx';

/**
 * Parses an Excel file and returns an array of JSON objects representing the rows.
 * @param {File} file - The Excel file to parse
 * @returns {Promise<Array>} A promise that resolves to the parsed JSON data
 */
export const parseExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('No file provided'));

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        resolve(data);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
};

/**
 * Exports JSON data to an Excel file and triggers a download.
 * @param {Array} data - Array of JSON objects to export
 * @param {string} fileName - Name of the file to save (e.g. 'export.xlsx')
 * @param {string} sheetName - Name of the worksheet
 */
export const exportToExcel = (data, fileName, sheetName = 'Sheet1') => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, fileName);
};

/**
 * Downloads a predefined Excel template.
 * @param {Array} templateData - Array of objects defining the template headers and example row
 * @param {string} fileName - Name of the template file to save
 * @param {string} sheetName - Name of the worksheet
 */
export const downloadExcelTemplate = (templateData, fileName, sheetName = 'Template') => {
  const ws = XLSX.utils.json_to_sheet(templateData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, fileName);
};
  

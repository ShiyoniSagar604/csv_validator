/**
 * Parses a CSV string and returns rows as arrays of strings
 * Handles quoted fields and escaped quotes
 */
export function parseCSV(csvText: string): string[][] {
  const rows: string[][] = [];
  const lines = csvText.split('\n');
  
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      const nextChar = line[j + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          currentField += '"';
          j++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        currentRow.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }
    
    // Check if we're still in quotes (line continuation)
    if (!inQuotes) {
      // Add the last field of the line
      if (currentField || currentRow.length > 0) {
        currentRow.push(currentField.trim());
      }
      
      // Only add non-empty rows
      if (currentRow.length > 0 && currentRow.some(field => field.length > 0)) {
        rows.push(currentRow);
      }
      
      currentRow = [];
      currentField = '';
    } else {
      // Continue to next line (quoted field spans multiple lines)
      currentField += '\n';
    }
  }
  
  // Handle remaining field if any
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.length > 0 && currentRow.some(field => field.length > 0)) {
      rows.push(currentRow);
    }
  }
  
  return rows;
}

/**
 * Cleans a field by removing unnecessary quotes and malformed characters
 * Removes outer quotes if they're not needed
 */
function cleanField(field: string): string {
  let trimmedField = field.trim();
  
  // Remove leading comma if present (malformed pattern like ",value")
  if (trimmedField.startsWith(',')) {
    trimmedField = trimmedField.slice(1).trim();
  }
  
  // Check if field is wrapped in quotes
  if (trimmedField.startsWith('"') && trimmedField.endsWith('"') && trimmedField.length > 1) {
    const unquotedContent = trimmedField.slice(1, -1);
    
    // If quoted content ends with comma, it's malformed - remove quotes and trailing comma
    if (unquotedContent.endsWith(',')) {
      return unquotedContent.slice(0, -1);
    }
    
    // Remove quotes if field doesn't need them (doesn't contain comma, quote, or newline)
    const needsQuotes = unquotedContent.includes(',') || 
                       unquotedContent.includes('"') || 
                       unquotedContent.includes('\n') ||
                       unquotedContent.includes('\r');
    
    if (!needsQuotes) {
      // Remove unnecessary quotes
      return unquotedContent;
    }
    
    // Field needs quotes, but we still want to return the unquoted content for validation
    // The quotes will be added back when generating CSV if needed
    return unquotedContent;
  }
  
  // Remove trailing comma if present
  if (trimmedField.endsWith(',')) {
    trimmedField = trimmedField.slice(0, -1).trim();
  }
  
  return trimmedField;
}

/**
 * Validates email format
 * Checks for common email format issues
 */
function isValidEmail(email: string): boolean {
  if (!email || email.trim().length === 0) {
    return false;
  }
  
  const trimmedEmail = email.trim();
  
  // Check for basic email structure
  // Must have exactly one @ symbol
  const atCount = (trimmedEmail.match(/@/g) || []).length;
  if (atCount !== 1) {
    return false; // No @ or multiple @ symbols
  }
  
  const [localPart, domain] = trimmedEmail.split('@');
  
  // Local part and domain must exist and not be empty
  if (!localPart || !domain || localPart.length === 0 || domain.length === 0) {
    return false;
  }
  
  // Domain must contain at least one dot
  if (!domain.includes('.')) {
    return false;
  }
  
  // Domain must not start or end with dot
  if (domain.startsWith('.') || domain.endsWith('.')) {
    return false;
  }
  
  // Basic format check: should match email pattern
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return false;
  }
  
  return true;
}

/**
 * Validates and cleans a CSV row
 * Returns cleaned row if valid, null if invalid
 */
export function validateAndCleanRow(
  row: string[], 
  expectedColumns: number,
  emailColumnIndex: number
): string[] | null {
  // Must have correct number of columns
  if (row.length !== expectedColumns) {
    return null;
  }
  
  // Clean all fields (remove unnecessary quotes)
  const cleanedRow = row.map(field => cleanField(field));
  
  // Validate email field
  if (emailColumnIndex >= 0 && emailColumnIndex < cleanedRow.length) {
    const email = cleanedRow[emailColumnIndex];
    if (!isValidEmail(email)) {
      return null; // Invalid email, reject row
    }
  }
  
  // Check for unmatched quotes or malformed patterns in cleaned fields
  for (const field of cleanedRow) {
    const trimmedField = field.trim();
    
    // Check for unmatched quotes
    let quoteCount = 0;
    for (let i = 0; i < trimmedField.length; i++) {
      if (trimmedField[i] === '"') {
        if (i < trimmedField.length - 1 && trimmedField[i + 1] === '"') {
          i++; // Skip escaped quote
        } else {
          quoteCount++;
        }
      }
    }
    
    // Unmatched quotes indicate malformed data
    if (quoteCount > 0 && quoteCount % 2 !== 0) {
      return null;
    }
    
    // Check for malformed patterns like ",value" or value,"
    if (trimmedField.match(/^,.*["]/) || trimmedField.match(/["].*,/)) {
      return null;
    }
  }
  
  return cleanedRow;
}

/**
 * Converts array of rows back to CSV string
 */
export function arrayToCSV(rows: string[][]): string {
  return rows.map(row => {
    return row.map(field => {
      // If field contains comma, quote, or newline, wrap in quotes and escape quotes
      if (field.includes(',') || field.includes('"') || field.includes('\n')) {
        return '"' + field.replace(/"/g, '""') + '"';
      }
      return field;
    }).join(',');
  }).join('\n');
}

/**
 * Validates CSV structure and filters out invalid rows
 */
export function validateAndCleanCSV(
  csvText: string,
  expectedColumns: string[]
): { validRows: string[][]; invalidRowCount: number } {
  const lines = csvText.split('\n').filter(line => line.trim().length > 0);
  
  if (lines.length === 0) {
    return { validRows: [], invalidRowCount: 0 };
  }
  
  // Parse CSV
  const rows = parseCSV(csvText);
  
  // First row should be headers
  const headers = rows[0];
  
  // Check if headers match expected columns
  if (headers.length !== expectedColumns.length) {
    throw new Error(
      `Column count mismatch. Expected ${expectedColumns.length} columns, but CSV has ${headers.length} columns.`
    );
  }
  
  // Check if header names match (case-insensitive)
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
  const normalizedExpected = expectedColumns.map(c => c.toLowerCase().trim());
  
  for (let i = 0; i < normalizedExpected.length; i++) {
    if (normalizedHeaders[i] !== normalizedExpected[i]) {
      throw new Error(
        `Column name mismatch at position ${i + 1}. Expected "${expectedColumns[i]}", but found "${headers[i]}".`
      );
    }
  }
  
  // Find email column index (look for columns containing "email")
  let emailColumnIndex = -1;
  for (let i = 0; i < expectedColumns.length; i++) {
    const colName = expectedColumns[i].toLowerCase();
    if (colName.includes('email')) {
      emailColumnIndex = i;
      break;
    }
  }
  
  // Clean headers (remove unnecessary quotes)
  const cleanedHeaders = headers.map(field => cleanField(field));
  
  // Validate and filter data rows
  const validRows: string[][] = [cleanedHeaders]; // Include cleaned headers
  let invalidRowCount = 0;
  
  // Process data rows (skip header)
  for (let i = 1; i < rows.length; i++) {
    const parsedRow = rows[i];
    
    // Validate and clean the row
    const cleanedRow = validateAndCleanRow(parsedRow, expectedColumns.length, emailColumnIndex);
    
    if (cleanedRow) {
      validRows.push(cleanedRow);
    } else {
      invalidRowCount++;
    }
  }
  
  return { validRows, invalidRowCount };
}


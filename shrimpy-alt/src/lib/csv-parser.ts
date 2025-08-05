export interface Connection {
  name: string;
  url?: string;
  company?: string;
  position?: string;
  email?: string;
  location?: string;
  industry?: string;
  [key: string]: any;
}

export interface ParseResult {
  connections: Connection[];
  totalCount: number;
  validCount: number;
  errors: string[];
}

export function parseLinkedInCSV(csvContent: string): ParseResult {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header row and one data row');
  }

  console.log('Raw CSV content (first 500 chars):', csvContent.substring(0, 500));
  console.log('Number of lines:', lines.length);
  console.log('First line (headers):', lines[0]);
  console.log('Second line (sample data):', lines[1]);

  // Find the actual header row - LinkedIn exports often have metadata in the first few rows
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];
    if (line.includes('First Name') && line.includes('Last Name') && line.includes('URL')) {
      headerRowIndex = i;
      break;
    }
  }

  console.log('Found headers at row:', headerRowIndex + 1);
  const headers = parseHeaders(lines[headerRowIndex]);
  console.log('Parsed headers:', headers);
  
  const connections: Connection[] = [];
  const errors: string[] = [];
  let validCount = 0;

  // Start processing from the row after the header row
  for (let i = headerRowIndex + 1; i < lines.length; i++) {
    try {
      const connection = parseConnectionLine(lines[i], headers, i + 1);
      console.log(`Row ${i + 1} parsed:`, connection);
      
      // Accept connections that have either a name or a URL
      if (connection.name || connection.url) {
        connections.push(connection);
        validCount++;
      } else {
        errors.push(`Row ${i + 1}: No name or URL found`);
        console.log(`Row ${i + 1} rejected - no name or URL`);
      }
    } catch (error) {
      errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Invalid data'}`);
      console.log(`Row ${i + 1} error:`, error);
    }
  }

  console.log(`Final result: ${connections.length} connections, ${errors.length} errors`);
  console.log('Sample connections:', connections.slice(0, 3));

  return {
    connections,
    totalCount: lines.length - headerRowIndex - 1,
    validCount,
    errors
  };
}

function parseHeaders(headerLine: string): string[] {
  // Handle quoted headers and clean them up
  const headers = headerLine
    .split(',')
    .map(header => header.trim().replace(/^["']|["']$/g, '').toLowerCase());
  
  return headers;
}

function parseConnectionLine(line: string, headers: string[], rowNumber: number): Connection {
  const values = parseCSVLine(line);
  console.log(`Row ${rowNumber} values:`, values);
  console.log(`Row ${rowNumber} headers:`, headers);
  
  // Be more flexible with column count - LinkedIn exports can have varying columns
  const connection: Connection = { name: '' };
  
  headers.forEach((header, index) => {
    const value = values[index]?.trim() || '';
    console.log(`Row ${rowNumber}, Header "${header}": "${value}"`);
    
    // Map common LinkedIn field names to our standard format
    switch (header) {
      case 'first name':
      case 'firstname':
        if (!connection.name) {
          connection.name = value;
        } else {
          connection.name = `${value} ${connection.name}`;
        }
        break;
      case 'last name':
      case 'lastname':
        if (!connection.name) {
          connection.name = value;
        } else {
          connection.name = `${connection.name} ${value}`;
        }
        break;
      case 'name':
      case 'full name':
      case 'fullname':
      case 'display name':
      case 'connection name':
        connection.name = value;
        break;
      case 'company':
      case 'organization':
      case 'current company':
      case 'employer':
      case 'workplace':
        connection.company = value;
        break;
      case 'position':
      case 'title':
      case 'job title':
      case 'current position':
        connection.position = value;
        break;
      case 'url':
      case 'linkedin url':
      case 'profile url':
      case 'profile':
        connection.url = value;
        break;
      case 'email':
      case 'email address':
        connection.email = value;
        break;
      case 'location':
      case 'city':
      case 'geographic location':
        connection.location = value;
        break;
      case 'industry':
        connection.industry = value;
        break;
      default:
        // Store any other fields as-is
        connection[header] = value;
    }
  });

  // If we have first/last name but no full name, construct it
  if (!connection.name && (connection['first name'] || connection['last name'])) {
    connection.name = `${connection['first name'] || ''} ${connection['last name'] || ''}`.trim();
  }

  return connection;
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i += 2;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      values.push(current);
      current = '';
      i++;
    } else {
      current += char;
      i++;
    }
  }
  
  // Add the last field
  values.push(current);
  
  return values;
}

export function validateConnections(connections: Connection[]): { valid: Connection[], invalid: Connection[] } {
  const valid: Connection[] = [];
  const invalid: Connection[] = [];

  connections.forEach(connection => {
    // Accept connections that have either a name or a URL (LinkedIn profile URL)
    if ((connection.name && connection.name.trim().length > 0) || 
        (connection.url && connection.url.trim().length > 0)) {
      valid.push(connection);
    } else {
      invalid.push(connection);
    }
  });

  return { valid, invalid };
}

export function getCSVPreview(connections: Connection[], maxRows: number = 5): Connection[] {
  return connections.slice(0, maxRows);
}

export function generateSampleCSV(): string {
  return `First Name,Last Name,URL,Email Address,Company,Position,Connected On
John,Smith,https://www.linkedin.com/in/john-smith,john.smith@email.com,Tech Corp,Software Engineer,15 Jan 2024
Sarah,Johnson,https://www.linkedin.com/in/sarah-johnson,sarah.j@email.com,Design Studio,UX Designer,20 Feb 2024
Mike,Wilson,https://www.linkedin.com/in/mike-wilson,mike.wilson@email.com,Startup Inc,Product Manager,10 Mar 2024
Lisa,Brown,https://www.linkedin.com/in/lisa-brown,lisa.brown@email.com,Marketing Agency,Marketing Director,05 Apr 2024
David,Lee,https://www.linkedin.com/in/david-lee,david.lee@email.com,Consulting Group,Senior Consultant,12 May 2024`;
} 
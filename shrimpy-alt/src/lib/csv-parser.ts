export interface Connection {
  name: string;
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

  const headers = parseHeaders(lines[0]);
  const connections: Connection[] = [];
  const errors: string[] = [];
  let validCount = 0;

  for (let i = 1; i < lines.length; i++) {
    try {
      const connection = parseConnectionLine(lines[i], headers, i + 1);
      if (connection.name) {
        connections.push(connection);
        validCount++;
      }
    } catch (error) {
      errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Invalid data'}`);
    }
  }

  return {
    connections,
    totalCount: lines.length - 1,
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
  
  if (values.length !== headers.length) {
    throw new Error(`Column count mismatch. Expected ${headers.length}, got ${values.length}`);
  }

  const connection: Connection = {};
  
  headers.forEach((header, index) => {
    const value = values[index]?.trim() || '';
    
    // Map common LinkedIn field names to our standard format
    switch (header) {
      case 'first name':
      case 'firstname':
        connection.name = connection.name ? `${value} ${connection.name}` : value;
        break;
      case 'last name':
      case 'lastname':
        connection.name = connection.name ? `${connection.name} ${value}` : value;
        break;
      case 'name':
      case 'full name':
      case 'fullname':
        connection.name = value;
        break;
      case 'company':
      case 'organization':
      case 'current company':
        connection.company = value;
        break;
      case 'position':
      case 'title':
      case 'job title':
      case 'current position':
        connection.position = value;
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
    if (connection.name && connection.name.trim().length > 0) {
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
  return `First Name,Last Name,Company,Position,Email,Location
John,Doe,Acme Corp,Software Engineer,john.doe@acme.com,San Francisco
Jane,Smith,Tech Startup,Product Manager,jane.smith@startup.com,New York
Mike,Johnson,Big Corp,Senior Developer,mike.johnson@bigcorp.com,Austin`;
} 
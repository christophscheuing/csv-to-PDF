import fs from 'fs';
import csv from 'csv-parser';
import { CSVRawData } from './types.js';

/**
 * Parses a German number format string to a JavaScript number
 * Examples: "26.264,34" -> 26264.34, "1.234,56" -> 1234.56
 * 
 * @param germanNumber - Number string in German format
 * @returns Parsed number
 */
export const parseGermanNumber = (germanNumber: string): number => {
    if (!germanNumber || typeof germanNumber !== 'string') {
        return 0;
    }
    
    // Remove thousand separators (.) and replace decimal comma with dot
    const normalized = germanNumber
        .replace(/\./g, '')  // Remove thousand separators
        .replace(',', '.');   // Replace decimal comma with dot
    
    return parseFloat(normalized) || 0;
};

/**
 * Formats a date string to German format
 * 
 * @param dateString - Optional date string, defaults to current date
 * @returns Formatted date string (e.g., "27. November 2025")
 */
export const formatGermanDate = (dateString?: string): string => {
    const date = dateString ? new Date(dateString) : new Date();
    
    const months = [
        'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
        'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
    ];
    
    return `${date.getDate()}. ${months[date.getMonth()]} ${date.getFullYear()}`;
};

/**
 * Reads and parses the CSV file
 * 
 * @param filePath - Path to the CSV file
 * @param separator - CSV separator character
 * @returns Promise resolving to array of parsed CSV data
 */
export const readCSV = (filePath: string, separator: string = ';'): Promise<CSVRawData[]> => {
    const results: CSVRawData[] = [];
    
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(filePath)) {
            return reject(new Error(`CSV file not found: ${filePath}`));
        }
        
        fs.createReadStream(filePath)
            .pipe(csv({ separator }))
            .on('data', (data) => {
                // Trim whitespace from all values
                const cleanedData = Object.entries(data).reduce((acc, [key, value]) => {
                    acc[key.trim()] = typeof value === 'string' ? value.trim() : value;
                    return acc;
                }, {} as any);
                
                results.push(cleanedData as CSVRawData);
            })
            .on('end', () => {
                console.log(`✓ Successfully read ${results.length} records from ${filePath}`);
                resolve(results);
            })
            .on('error', (err) => reject(err));
    });
};

/**
 * Builds the recipient's full name with proper German address format
 *
 * @param data - Raw CSV data
 * @returns Formatted recipient name (with line breaks for two recipients)
 */
export const buildRecipientName = (data: CSVRawData): string => {
    const parts = [];

    // First person
    if (data.Vorname1 && data.Nachname1) {
        const title1 = data.Vorname1.startsWith('Dr.') ? 'Dr.' : '';
        const firstName1 = data.Vorname1.replace('Dr.', '').trim();
        const nachname1 = (data.Nachname1.startsWith("c/o") ? '\n' : '') + data.Nachname1;
        parts.push(`${title1} ${firstName1} ${nachname1}`.trim());
    }

    // Second person (if exists)
    if (data.Vorname2 && data.Nachname2) {
        const title2 = data.Vorname2.startsWith('Dr.') ? 'Dr.' : '';
        const firstName2 = data.Vorname2.replace('Dr.', '').trim();
        parts.push(`${title2} ${firstName2} ${data.Nachname2}`.trim());
    }

    // Third person (if exists)
    if (data.Vorname3 && data.Nachname3) {
        const title3 = data.Vorname3.startsWith('Dr.') ? 'Dr.' : '';
        const firstName3 = data.Vorname3.replace('Dr.', '').trim();
        parts.push(`${title3} ${firstName3} ${data.Nachname3}`.trim());
    }

    // If two recipients: first name with "und" on first line, second name on new line
    if (parts.length === 2) {
        // return `${parts[0]} und\n${parts[1]}`;
        // console.log('ZWEI EMPFÄNGER');
        return `${parts[0]} und ${parts[1]}`;
    }

    // If three recipients: first name with "und" on first line, second name on new line
    if (parts.length === 3) {
        console.log('DREI EMPFÄNGER: ' + `${parts[0]}, ${parts[1]} und ${parts[2]}`)
        return `${parts[0]}, ${parts[1]} und ${parts[2]}`;
    }

    return parts.join(' und ');
};

/**
 * Builds the German formal address greeting
 * 
 * @param data - Raw CSV data
 * @returns Formatted greeting (e.g., "Herrn Dr." or "Frau und Herrn")
 */
export const buildAnrede = (data: CSVRawData): string => {
    const anrede1 = data.Anrede || '';
    const anrede2 = data.Anrede2 || '';
    const anrede3 = data.Anrede3 || '';
    
    // If there are three recipients
    if (anrede1 && anrede2) {
        return `${anrede1}, ${anrede2} und ${anrede3}`;
    }

    // If there are two recipients
    if (anrede1 && anrede2) {
        return `${anrede1} und ${anrede2}`;
    }
    
    // Single recipient
    return anrede1;
};
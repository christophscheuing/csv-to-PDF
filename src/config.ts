import { CaseDetails, GeneratorConfig, SenderInfo } from './types.js';

/**
 * Main configuration for the invoice generator
 */
export const config: GeneratorConfig = {
    // inputCsv: 'beispieldaten.csv',
    inputCsv: 'secret-data/Gesamtliste.csv',
    htmlTemplate: 'invoice_template.html',
    briefheadPdf: 'briefkopf.pdf',
    outputDir: 'output',
    csvSeparator: ';',
    taxRate: 0.19 // 19% MwSt
};

/**
 * Sender information - centralized configuration
 * Adjust these values according to your law firm
 */
export const senderInfo: SenderInfo = {
    senderName: 'Siegmann | Höger',
    senderStreet: 'Hübschstraße 21',
    senderZipCity: '76131 Karlsruhe',
    ustId: 'DE455775429',
    iban: 'DE54 6604 0018 0366 0560 00',
    unterschrift: 'Prof. Dr. Siegmann'
};

/**
 * Case information - centralized configuration
 * Adjust these values according to your law firm
 */
export const caseDetails: Partial<CaseDetails> = {
    leistungszeit: '06.03.-25.11.2025',
    gzNumber: 'SH 072/25',
    partei1: 'Dipl.-Kfm. Ebert u.a.',
    partei2: 'Dr. Braun u.a.',
};

/**
 * Default values for invoice calculations
 * These can be overridden or made dynamic based on case specifics
 */
export const defaultCalculationValues = {
    // Example: Fixed fees structure (adjust as needed)
    verfahrensgebuehr: 1332.60,
    terminsgebuehr: 1229.64,
    einigungsgebuehr: 307.41,
    
    // Auslagen
    auslagenpauschale: 20.00,
    
    // Barauslagen (can be made dynamic per case)
    kopien: 180.00,
    telekommunikation: 120.00,
    gerichtskosten: 450.00
};
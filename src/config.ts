import { GeneratorConfig, SenderInfo } from './types.js';

/**
 * Main configuration for the invoice generator
 */
export const config: GeneratorConfig = {
    inputCsv: 'beispieldaten.csv',
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
    senderName: 'Rechtsanwalt Max Mustermann',
    senderStreet: 'Musterstraße 1',
    senderZipCity: '76131 Karlsruhe',
    ustId: 'DE123456789',
    iban: 'DE89 3704 0044 0532 0130 00',
    unterschrift: 'Max Mustermann'
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
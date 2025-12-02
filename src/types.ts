/**
 * Types and Interfaces for the Invoice Generator
 */

/**
 * Raw data structure from CSV file
 */
export interface CSVRawData {
    'Lf. Nr.': string;
    'Az. TILP': string;
    'Anrede': string;
    'Vorname1': string;
    'Nachname1': string;
    'Anrede2': string;
    'Vorname2': string;
    'Nachname2': string;
    'Strasse': string;
    'PLZ': string;
    'Ort': string;
    'Land': string;
    'Streitwert Klage': string;
    'Gesamtstreitwert':	string;
    'Gesamtrechnungsbetrag': string;
    'Anteil': string;
    'Einzelrechnungsbetrag': string;
    'Erhöhungsgebühr': string;
    'Zwischensumme': string;
    'Umsatzsteuer': string;
    'Summa': string;
    'Rechnungsnummer': string;
}

/**
 * Sender information for the invoice
 */
export interface SenderInfo {
    senderName: string;
    senderStreet: string;
    senderZipCity: string;
    ustId: string;
    iban: string;
    unterschrift: string;
}

/**
 * Recipient information
 */
export interface RecipientInfo {
    empfaengerAnrede: string;
    name: string;
    strasse: string;
    plz: string;
    ort: string;
    land: string;
}

/**
 * Case details
 */
export interface CaseDetails {
    rechnungsNummer: string;
    datum: string;
    gzNumber: string;
    leistungszeit: string;
    mandant: string;
    partei1: string;
    partei2: string;
}

/**
 * Fee structure (Gebühren)
 */
export interface Fees {
    zweiKommaDreiGebuehr: number;
    verfahrensgebuehr: number;
    terminsgebuehr: number;
    einigungsgebuehr: number;
}

/**
 * Expenses (Auslagen)
 */
export interface Expenses {
    pauschale: number;
    erhoehungsgebuehrOld: number;
}

/**
 * Cash expenses (Barauslagen)
 */
export interface CashExpenses {
    kopien: number;
    telekommunikation: number;
    gerichtskosten: number;
}

/**
 * Dispute value calculations (Streitwertberechnungen)
 */
export interface DisputeValue {
    einzelStreitwert: number;
}

/**
 * Invoice calculations
 */
export interface InvoiceCalculations {
    gesamtRechnungsbetragOld: number;
    proportionalerBetrag: number;
    erhoehungsgebuehrOld: number;
    summe1: number;
    summe2: number;
    summe3: number;
    gesamtbetragNetto: number;
    mehrwertsteuer: number;
    gesamtbetragBrutto: number;
}

/**
 * Data calculated by Excel
 */
export interface ExcelCalculatedData {
    gesamtStreitwert: number;
    gesamtRechnungsbetrag: number;
    anteil: number;
    einzelRechnungsbetrag: number;
    erhoehungsgebuehr: number;
    zwischensumme: number;
    umsatzsteuer: number;
    summa: number;
}

/**
 * Complete invoice data structure for template rendering
 */
export interface InvoiceData extends
    SenderInfo,
    RecipientInfo,
    CaseDetails,
    DisputeValue,
    ExcelCalculatedData,
    InvoiceCalculations {
    gebuehren: Fees;
    auslagen: Expenses;
    barauslagen: CashExpenses;
    lfNr: string;
    nachname1: string;
    nachname2?: string;
    hasSecondRecipient: boolean;
}

/**
 * Configuration for the invoice generator
 */
export interface GeneratorConfig {
    inputCsv: string;
    htmlTemplate: string;
    briefheadPdf: string;
    outputDir: string;
    csvSeparator: string;
    taxRate: number;
}

/**
 * Processing options from command line
 */
export interface ProcessingOptions {
    processAll: boolean;
    targetLfNr: string | null;
    targetLfNrs: string[];
    shouldStamp: boolean;
}
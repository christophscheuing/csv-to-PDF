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
    rechnungsId: string;
    datum: string;
    gzNumber: string;
    leistungszeit: string;
    mandant: string;
    gegner: string;
}

/**
 * Fee structure (Gebühren)
 */
export interface Fees {
    verfahrensgebuehr: number;
    terminsgebuehr: number;
    einigungsgebuehr: number;
}

/**
 * Expenses (Auslagen)
 */
export interface Expenses {
    pauschale: number;
    erhoehungsgebuehr: number;
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
    gesamtStreitwert: number;
    einzelStreitwert: number;
    prozentualerAnteil: number;
}

/**
 * Invoice calculations
 */
export interface InvoiceCalculations {
    gesamtRechnungsbetrag: number;
    proportionalerBetrag: number;
    erhoehungsgebuehr: number;
    summe1: number;
    summe2: number;
    summe3: number;
    gesamtbetragNetto: number;
    mehrwertsteuer: number;
    gesamtbetragBrutto: number;
}

/**
 * Complete invoice data structure for template rendering
 */
export interface InvoiceData extends 
    SenderInfo, 
    RecipientInfo, 
    CaseDetails, 
    DisputeValue, 
    InvoiceCalculations {
    gebuehren: Fees;
    auslagen: Expenses;
    barauslagen: CashExpenses;
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
    targetId: string | null;
    shouldStamp: boolean;
}
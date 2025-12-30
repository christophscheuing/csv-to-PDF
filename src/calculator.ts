import {
    CSVRawData,
    InvoiceData,
    Fees,
    Expenses,
    CashExpenses,
    InvoiceCalculations,
    DisputeValue
} from './types.js';
import { senderInfo, defaultCalculationValues, config, caseDetails } from './config.js';
import { parseGermanNumber, formatGermanDate, buildRecipientName, buildAnrede } from './csvParser.js';

/**
 * Maps country codes to full country names
 * Returns null for Germany (D/DE) as it should not be displayed
 *
 * @param countryCode - The country code from CSV (D, DE, CH, AT, PT, BG, LU)
 * @returns Full country name or null for Germany
 */
const getCountryName = (countryCode: string): string | null => {
    const code = countryCode?.trim().toUpperCase();

    const countryMap: { [key: string]: string | null } = {
        'D': null,        // Deutschland - nicht anzeigen
        'DE': null,       // Deutschland - nicht anzeigen
        'CH': 'Schweiz',
        'AT': 'Österreich',
        'PT': 'Portugal',
        'BG': 'Bulgarien',
        'LU': 'Luxemburg'
    };

    return countryMap[code] ?? null;
};

/**
 * Calculates dispute values based on the case
 * You can customize this logic based on your specific needs
 *
 * @param streitwertKlage - The dispute value from the lawsuit
 * @returns Calculated dispute values
 */
const calculateDisputeValues = (streitwertKlage: number): DisputeValue => {
    // Example calculation - adjust based on your legal requirements
    const einzelStreitwert = streitwertKlage; // Can be different in some cases

    return {
        einzelStreitwert,
    };
};

/**
 * Calculates fees based on dispute value and RVG (Rechtsanwaltsvergütungsgesetz)
 * This is a simplified example - implement your actual RVG calculation logic here
 * 
 * @param einzelStreitwert - Individual dispute value
 * @returns Calculated fees
 */
const calculateFees = (gesamtStreitwert: number, einzelStreitwert: number): Fees => {
    // TODO: Implement actual RVG fee calculation based on Streitwert
    // This is just using the default values for now
    // You would typically use RVG tables or formulas here
    
    const faktor = Math.ceil((gesamtStreitwert - 500000) / 50000);
    const zweiKommaDreiGebuehr = (3539 + (faktor * 165)) * 2.3;

    return {
        zweiKommaDreiGebuehr: parseFloat(zweiKommaDreiGebuehr.toFixed(2)),
        verfahrensgebuehr: defaultCalculationValues.verfahrensgebuehr,
        terminsgebuehr: defaultCalculationValues.terminsgebuehr,
        einigungsgebuehr: defaultCalculationValues.einigungsgebuehr
    };
};

/**
 * Calculates expenses (Auslagen)
 * 
 * @param einzelStreitwert - Individual dispute value
 * @returns Calculated expenses
 */
const calculateExpenses = (einzelStreitwert: number): Expenses => {
    // Erhöhungsgebühr: 0,3 der Verfahrensgebühr
    const verfahrensgebuehr = defaultCalculationValues.verfahrensgebuehr;
    const erhoehungsgebuehrOld = verfahrensgebuehr * 0.3;
    
    return {
        pauschale: defaultCalculationValues.auslagenpauschale,
        erhoehungsgebuehrOld: parseFloat(erhoehungsgebuehrOld.toFixed(2))
    };
};

/**
 * Returns cash expenses
 * Can be made dynamic based on case data
 * 
 * @returns Cash expenses
 */
const getCashExpenses = (): CashExpenses => {
    return {
        kopien: defaultCalculationValues.kopien,
        telekommunikation: defaultCalculationValues.telekommunikation,
        gerichtskosten: defaultCalculationValues.gerichtskosten
    };
};

/**
 * Performs all invoice calculations
 * 
 * @param gebuehren - Fees
 * @param auslagen - Expenses
 * @param barauslagen - Cash expenses
 * @param disputeValue - Dispute value information
 * @returns Complete invoice calculations
 */
const performInvoiceCalculations = (
    gebuehren: Fees,
    auslagen: Expenses,
    barauslagen: CashExpenses,
    disputeValue: DisputeValue
): InvoiceCalculations => {
    // Calculate intermediate sums
    const summe1 = gebuehren.zweiKommaDreiGebuehr; // gebuehren.verfahrensgebuehr + gebuehren.terminsgebuehr + gebuehren.einigungsgebuehr;
    const summe2 = auslagen.pauschale + auslagen.erhoehungsgebuehrOld;
    const summe3 = barauslagen.kopien + barauslagen.telekommunikation + barauslagen.gerichtskosten;
    
    // Calculate total billing amount from total dispute value
    // This is the base amount before proportional calculation
    const gesamtRechnungsbetragOld = summe1 + auslagen.pauschale;
    
    // Calculate proportional amount based on percentage
    const proportionalerBetrag = (gesamtRechnungsbetragOld); // * disputeValue.anteilAmGesamtStreitwert);
    
    // Calculate net total
    const gesamtbetragNetto = proportionalerBetrag + auslagen.erhoehungsgebuehrOld;
    
    // Calculate VAT
    const mehrwertsteuer = gesamtbetragNetto * config.taxRate;
    
    // Calculate gross total
    const gesamtbetragBrutto = gesamtbetragNetto + mehrwertsteuer;
    
    return {
        gesamtRechnungsbetragOld: parseFloat(gesamtRechnungsbetragOld.toFixed(2)),
        proportionalerBetrag: parseFloat(proportionalerBetrag.toFixed(2)),
        erhoehungsgebuehrOld: auslagen.erhoehungsgebuehrOld,
        summe1: parseFloat(summe1.toFixed(2)),
        summe2: parseFloat(summe2.toFixed(2)),
        summe3: parseFloat(summe3.toFixed(2)),
        gesamtbetragNetto: parseFloat(gesamtbetragNetto.toFixed(2)),
        mehrwertsteuer: parseFloat(mehrwertsteuer.toFixed(2)),
        gesamtbetragBrutto: parseFloat(gesamtbetragBrutto.toFixed(2))
    };
};

/**
 * Main function to calculate complete invoice data from CSV row
 * 
 * @param csvData - Raw CSV data row
 * @returns Complete invoice data ready for template rendering
 */
export const calculateInvoiceData = (csvData: CSVRawData): InvoiceData => {
    // Parse the dispute value from CSV
    const streitwertKlage = parseGermanNumber(csvData['Streitwert Klage']);
    const gesamtStreitwert = parseGermanNumber(csvData['Gesamtstreitwert']);
    const gesamtRechnungsbetrag = parseGermanNumber(csvData['Gesamtrechnungsbetrag']);
    const anteil = parseGermanNumber(csvData['Anteil']);
    const einzelRechnungsbetrag = parseGermanNumber(csvData['Einzelrechnungsbetrag']);
    const erhoehungsgebuehr = parseGermanNumber(csvData['Erhöhungsgebühr']);
    const zwischensumme = parseGermanNumber(csvData['Zwischensumme']);
    const umsatzsteuer = parseGermanNumber(csvData['Umsatzsteuer']);
    const summa = parseGermanNumber(csvData['Summa']);

    
    // Calculate dispute values
    const disputeValue = calculateDisputeValues(streitwertKlage);
    
    // Calculate fees, expenses, and cash expenses
    const gebuehren = calculateFees(disputeValue.einzelStreitwert, disputeValue.einzelStreitwert);
    const auslagen = calculateExpenses(disputeValue.einzelStreitwert);
    const barauslagen = getCashExpenses();
    
    // Perform all invoice calculations
    const calculations = performInvoiceCalculations(gebuehren, auslagen, barauslagen, disputeValue);
    
    // Build the complete invoice data object
    const invoiceData: InvoiceData = {
        // Sender information
        ...senderInfo,

        // Recipient information
        empfaengerAnrede: buildAnrede(csvData),
        name: buildRecipientName(csvData),
        strasse: csvData.Strasse,
        plz: csvData.PLZ,
        ort: csvData.Ort,
        land: csvData.Land,
        landName: getCountryName(csvData.Land),

        // Data calculated by Excel
        gesamtStreitwert: gesamtStreitwert,
        gesamtRechnungsbetrag: gesamtRechnungsbetrag,
        anteil: anteil,
        einzelRechnungsbetrag: einzelRechnungsbetrag,
        erhoehungsgebuehr: erhoehungsgebuehr,
        zwischensumme: zwischensumme,
        umsatzsteuer: umsatzsteuer,
        summa: summa,


        // Case details
        rechnungsNummer: csvData['Rechnungsnummer'].padStart(4, '0') + '/26',
        datum: '2. Januar 2026', // formatGermanDate(),
        gzNumber: caseDetails.gzNumber || '', // Adjust if you have a specific GZ number
        azTilp: csvData['Az. TILP'] || undefined,
        leistungszeit: caseDetails.leistungszeit || '', // Adjust if you have a specific service period
        mandant: buildRecipientName(csvData), // Using recipient as client
        partei1: caseDetails.partei1 || '', // Add if available in your data
        partei2: caseDetails.partei2 || '', // Add if available in your data

        // File naming data
        lfNr: csvData['Lf. Nr.'],
        nachname1: csvData.Nachname1,
        nachname2: csvData.Nachname2 || undefined,
        nachname3: csvData.Nachname3 || undefined,
        ErbengemeinschaftZahlWeitereMitglieder: csvData['Erbengemeinschaft Zahl weitere Mietglieder'] || undefined,
        ErbengemeinschaftNamenWeitereMitglieder: csvData['Erbengemeinschaft Namen weitere Mitglieder'] || undefined,
        hasSecondRecipient: !!(csvData.Vorname2 && csvData.Nachname2),
        hasThirdRecipient: !!(csvData.Vorname3 && csvData.Nachname3),

        // Dispute values
        ...disputeValue,

        // Fee structure
        gebuehren,
        auslagen,
        barauslagen,

        // Calculations
        ...calculations
    };
    
    return invoiceData;
};

/**
 * Validates that all required fields are present in the invoice data
 * 
 * @param invoiceData - Invoice data to validate
 * @returns True if valid, throws error if invalid
 */
export const validateInvoiceData = (invoiceData: InvoiceData): boolean => {
    const requiredFields = [
        'name', 'strasse', 'plz', 'ort',
        'gesamtbetragBrutto', 'datum'
    ];
    
    for (const field of requiredFields) {
        if (!invoiceData[field as keyof InvoiceData]) {
            throw new Error(`Missing required field: ${field}`);
        }
    }
    
    return true;
};
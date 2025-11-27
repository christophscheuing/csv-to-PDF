import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import Handlebars from 'handlebars';
import puppeteer from 'puppeteer';
import { PDFDocument, PageSizes } from 'pdf-lib'; 

// --- CONFIGURATION ---
const INPUT_CSV = 'invoices.csv';
const HTML_TEMPLATE = 'invoice_template.html';
const BRIEFHEAD_PDF = 'briefkopf.pdf'; // Placeholder for your letterhead PDF file
const OUTPUT_DIR = 'output';

// --- HANDLEBARS HELPERS ---
/**
 * Handlebars helper to format a number as German currency string (e.g., 1234.56 -> 1.234,56).
 * @param {number} amount - The numeric amount.
 * @returns {string} The formatted currency string.
 */
Handlebars.registerHelper('formatCurrency', (amount) => {
    if (typeof amount !== 'number') return amount;
    return new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
});

// --- DATA PROCESSING FUNCTIONS ---

/**
 * Calculates all sums and adds fixed invoice postions based on the provided sample structure.
 * @param {Object} data - Raw data from CSV.
 * @returns {Object} Complete structured data with all calculated fields.
 */
const calculateInvoiceData = (data) => {
    // Fixed values from the sample (replace with your calculation logic if dynamic)
    const rawData = {
        gebuehren: {
            verfahrensgebuehr: 1332.60,
            terminsgebuehr: 1229.64,
            einigungsgebuehr: 307.41
        },
        auslagen: {
            pauschale: 20.00,
            erhoehungsgebuehr: 307.41
        },
        barauslagen: {
            kopien: 180.00,
            telekommunikation: 120.00,
            gerichtskosten: 450.00
        }
    };

    // Calculate intermediate sums
    const summe1 = rawData.gebuehren.verfahrensgebuehr + rawData.gebuehren.terminsgebuehr + rawData.gebuehren.einigungsgebuehr;
    const summe2 = rawData.auslagen.pauschale + rawData.auslagen.erhoehungsgebuehr;
    const summe3 = rawData.barauslagen.kopien + rawData.barauslagen.telekommunikation + rawData.barauslagen.gerichtskosten;

    const gesamtbetragNetto = summe1 + summe2 + summe3;
    const steuersatz = 0.19; // 19%
    const mehrwertsteuer = gesamtbetragNetto * steuersatz;
    const gesamtbetragBrutto = gesamtbetragNetto + mehrwertsteuer;

    // Structure and return the final data object for Handlebars
    return {
        ...data,
        empfaengerAnrede: 'Frau und Herrn', // Fixed anrede for the sample
        ...rawData,
        summe1: parseFloat(summe1.toFixed(2)),
        summe2: parseFloat(summe2.toFixed(2)),
        summe3: parseFloat(summe3.toFixed(2)),
        gesamtbetragNetto: parseFloat(gesamtbetragNetto.toFixed(2)),
        mehrwertsteuer: parseFloat(mehrwertsteuer.toFixed(2)),
        gesamtbetragBrutto: parseFloat(gesamtbetragBrutto.toFixed(2))
    };
};

/**
 * Reads the CSV file and processes it into an array of structured invoice data.
 * @returns {Promise<Array<Object>>} Array of processed invoice data objects.
 */
const readCSV = () => {
    const results = [];
    return new Promise((resolve, reject) => {
        fs.createReadStream(INPUT_CSV)
            .pipe(csv({ separator: ';' }))
            .on('data', (data) => {
                const processedData = calculateInvoiceData(data);
                results.push(processedData);
            })
            .on('end', () => resolve(results))
            .on('error', (err) => reject(err));
    });
};

// --- PDF GENERATION AND STAMPING FUNCTIONS ---

/**
 * Generates a PDF from Handlebars-populated HTML.
 * @param {Object} invoiceData - Data object for the invoice.
 * @param {string} htmlContent - The raw Handlebars template content.
 * @returns {Promise<Buffer>} The generated PDF as a Buffer.
 */
const generatePDF = async (invoiceData, htmlContent) => {
    let browser;
    try {
        const template = Handlebars.compile(htmlContent);
        const html = template(invoiceData);
        
        // Start Puppeteer
        browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();

        // Set content and wait for it to be fully rendered
        await page.setContent(html, { 
            waitUntil: 'networkidle0', 
            timeout: 30000 
        });

        // Generate PDF
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            // Margins are set to zero because the HTML/CSS handles the layout and padding
            margin: { top: '0', right: '0', bottom: '0', left: '0' }
        });

        await browser.close();
        return pdfBuffer;

    } catch (error) {
        console.error(`Error during PDF generation for ID ${invoiceData.rechnungsId}:`, error);
        if (browser) await browser.close();
        throw error;
    }
};

/**
 * Saves the generated invoice PDF. Optionally stamps it onto a briefhead PDF.
 * @param {Buffer} generatedPdfBuffer - The generated invoice PDF.
 * @param {string} invoiceId - The ID for naming the output file.
 * @param {boolean} shouldStamp - If true, the briefhead PDF is used for stamping.
 * @returns {Promise<void>}
 */
const savePDF = async (generatedPdfBuffer, invoiceId, shouldStamp) => {
    const outputPath = path.join(OUTPUT_DIR, `Rechnung_${invoiceId}_final.pdf`);
    
    // --- NEUE LOGIK FÜR OPTIONALES STAMPING ---
    if (!shouldStamp) {
        console.log(`[INFO] Rechnung ${invoiceId} wird OHNE Briefkopf gespeichert: ${outputPath}`);
        fs.writeFileSync(outputPath, generatedPdfBuffer);
        return;
    }
    
    // Check if briefkopf.pdf exists if stamping is requested
    if (!fs.existsSync(BRIEFHEAD_PDF)) {
        console.warn(`[WARN] Briefkopf PDF (${BRIEFHEAD_PDF}) nicht gefunden. Speichere generierte PDF direkt in ${outputPath}.`);
        fs.writeFileSync(outputPath, generatedPdfBuffer);
        return;
    }
    
    // Load documents
    const briefkopfDoc = await PDFDocument.load(fs.readFileSync(BRIEFHEAD_PDF));
    const generatedDoc = await PDFDocument.load(generatedPdfBuffer);

    // Create a new document for the result
    const finalDoc = await PDFDocument.create();

    const briefkopfPages = briefkopfDoc.getPages();
    const generatedPages = generatedDoc.getPages();

    // Loop through all pages of the generated content
    for (let i = 0; i < generatedPages.length; i++) {
        const generatedPage = generatedPages[i];
        
        // Determine which briefhead page to use (Page 1 for first page, Page 2 for subsequent)
        // We assume briefkopf.pdf has Page 0 (first page) and Page 1 (follow-up pages)
        const briefkopfPageIndex = i === 0 ? 0 : 1;
        const briefkopfTemplatePage = briefkopfPages[Math.min(briefkopfPageIndex, briefkopfPages.length - 1)];
        
        // Safety check to ensure the briefkopf page exists before attempting to embed it
        if (!briefkopfTemplatePage) {
            console.error(`[ERROR] Briefkopf PDF hat keine Seite an Index ${briefkopfPageIndex}. Kann Stempelvorgang nicht fortsetzen.`);
            // Fallback: Just save the generated PDF (though this code path shouldn't be reached if shouldStamp is true and briefkopf exists)
            fs.writeFileSync(outputPath, generatedPdfBuffer);
            return;
        }

        // 1. Embed the template page (briefhead) into the final document
        const embeddedBriefkopf = await finalDoc.embedPage(briefkopfTemplatePage);

        // 2. Embed the generated content page into the final document
        const embeddedContent = await finalDoc.embedPage(generatedPage);

        // 3. Create a new final page using the embedded briefhead's dimensions
        const finalPage = finalDoc.addPage([embeddedBriefkopf.width, embeddedBriefkopf.height]);
        
        // 4. Draw the embedded briefhead first (Background layer)
        finalPage.drawPage(embeddedBriefkopf, {
            x: 0,
            y: 0,
            width: embeddedBriefkopf.width,
            height: embeddedBriefkopf.height,
        });

        // 5. Draw the embedded content next (Foreground layer)
        finalPage.drawPage(embeddedContent, {
            x: 0,
            y: 0,
            width: embeddedContent.width,
            height: embeddedContent.height,
        });
    }

    // Save the final PDF
    const finalPdfBytes = await finalDoc.save();
    fs.writeFileSync(outputPath, finalPdfBytes);
    console.log(`[SUCCESS] Rechnung ${invoiceId} erfolgreich generiert und gestempelt: ${outputPath}`);
};


// --- MAIN EXECUTION ---
const main = async () => {
    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR);
    }
    
    // Load HTML Template
    const htmlContent = fs.readFileSync(HTML_TEMPLATE, 'utf-8');

    // Get command line arguments
    const args = process.argv.slice(2);
    const processAll = args.includes('--all');
    const idArg = args.find(arg => arg.startsWith('--id='));
    const targetId = idArg ? idArg.split('=')[1] : null;
    
    // --- NEUE PRÜFUNG DES ARGUMENTS ---
    const shouldStamp = !args.includes('--no-stamp');

    if (!processAll && !targetId) {
        console.log("Bitte geben Sie einen Verarbeitungsmodus an:");
        console.log("  - Alle Rechnungen verarbeiten: bun run process:all");
        console.log("  - Einzelne Rechnung verarbeiten: bun run process:single --id=001 (ersetze 001 mit ID)");
        console.log("Optionen:");
        console.log("  --no-stamp: Generiert PDFs OHNE den Briefkopf zu stempeln.");
        return;
    }

    console.log(`Starte Rechnungsgenerator...`);
    if (!shouldStamp) {
        console.log("WARNUNG: Stempel-Modus ist DEAKTIVIERT (--no-stamp). Die PDFs werden ohne Briefkopf gespeichert.");
    }

    try {
        const invoices = await readCSV();
        
        let invoicesToProcess;

        if (processAll) {
            invoicesToProcess = invoices;
            console.log(`Verarbeite alle ${invoices.length} Rechnungen.`);
        } else if (targetId) {
            invoicesToProcess = invoices.filter(i => i.rechnungsId === targetId);
            if (invoicesToProcess.length === 0) {
                console.error(`FEHLER: Keine Rechnung mit ID ${targetId} in ${INPUT_CSV} gefunden.`);
                return;
            }
            console.log(`Verarbeite einzelne Rechnung mit ID ${targetId}.`);
        } else {
            // Should be caught by the check above, but for safety:
            console.error("Ungültige Argumente.");
            return;
        }

        for (const invoice of invoicesToProcess) {
            console.log(`-> Starte Verarbeitung für Rechnung ${invoice.rechnungsId}...`);
            // 1. Generate content PDF
            const generatedPdfBuffer = await generatePDF(invoice, htmlContent);
            
            // 2. Save final PDF (with optional stamping)
            await savePDF(generatedPdfBuffer, invoice.rechnungsId, shouldStamp);
        }

        console.log("=================================================");
        console.log("Alle Rechnungen wurden erfolgreich generiert.");
        console.log("=================================================");

    } catch (err) {
        console.error("Ein schwerwiegender Fehler ist aufgetreten:", err);
    }
};

main();
import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';
import puppeteer from 'puppeteer';
import { PDFDocument } from 'pdf-lib';
import { InvoiceData } from './types.js';
import { config } from './config.js';

/**
 * Registers custom Handlebars helpers for template rendering
 */
export const registerHandlebarsHelpers = (): void => {
    /**
     * Formats a number as German currency string (e.g., 1234.56 -> 1.234,56)
     */
    Handlebars.registerHelper('formatCurrency', (amount: any): string => {
        if (typeof amount !== 'number') return String(amount);
        return new Intl.NumberFormat('de-DE', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        }).format(amount);
    });

    /**
     * Formats a number as a percent indication with 6 digits (e.g., 1234.56 -> 1.234,56)
     */
    Handlebars.registerHelper('formatPercent', (amount: any): string => {
        if (typeof amount !== 'number') return String(amount);
        return new Intl.NumberFormat('de-DE', { 
            minimumFractionDigits: 8, 
            maximumFractionDigits: 8 
        }).format(amount);
    });
    
    /**
     * Conditional helper for template logic
     */
    Handlebars.registerHelper('if', function(this: any, conditional: any, options: any) {
        if (conditional) {
            return options.fn(this);
        }
        return options.inverse(this);
    });
    
    /**
     * Equality comparison helper
     */
    Handlebars.registerHelper('eq', (a: any, b: any): boolean => {
        return a === b;
    });

    /**
     * Converts newlines to <br> tags for multi-line text
     */
    Handlebars.registerHelper('nl2br', function(text: string): Handlebars.SafeString {
        if (!text || typeof text !== 'string') {
            return new Handlebars.SafeString('');
        }
        const html = text.replace(/\n/g, '<br>');
        return new Handlebars.SafeString(html);
    });
};

/**
 * Generates a PDF from Handlebars-populated HTML
 * 
 * @param invoiceData - Data object for the invoice
 * @param htmlContent - The raw Handlebars template content
 * @returns The generated PDF as a Buffer
 */
export const generatePDF = async (
    invoiceData: InvoiceData, 
    htmlContent: string
): Promise<Buffer> => {
    let browser;
    
    try {
        console.log(`  → Compiling HTML template for invoice ${invoiceData.rechnungsNummer}...`);
        
        // Compile Handlebars template
        const template = Handlebars.compile(htmlContent);
        const html = template(invoiceData);
        
        // Launch Puppeteer
        console.log(`  → Launching Puppeteer...`);
        browser = await puppeteer.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // Set content and wait for it to be fully rendered
        await page.setContent(html, { 
            waitUntil: 'networkidle0', 
            timeout: 30000 
        });
        
        console.log(`  → Generating PDF...`);
        
        // Generate PDF with A4 format
       const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '0', right: '0', bottom: '0', left: '0' },
            preferCSSPageSize: false  // Wichtig: Puppeteer soll A4 erzwingen
       })
        
        await browser.close();
        
        console.log(`  ✓ PDF generated successfully`);
        return pdfBuffer;
        
    } catch (error) {
        console.error(`  ✗ Error during PDF generation for ID ${invoiceData.rechnungsNummer}:`, error);
        if (browser) await browser.close();
        throw error;
    }
};

/**
 * Stamps the generated invoice PDF onto a briefhead PDF
 * 
 * @param generatedPdfBuffer - The generated invoice PDF
 * @param briefheadPdfPath - Path to the briefhead PDF file
 * @returns The stamped PDF as a Buffer
 */
export const stampPDFOnBriefhead = async (
    generatedPdfBuffer: Buffer,
    briefheadPdfPath: string
): Promise<Buffer> => {
    console.log(`  → Stamping PDF on briefhead...`);
    
    // Load documents
    const briefkopfDoc = await PDFDocument.load(fs.readFileSync(briefheadPdfPath));
    const generatedDoc = await PDFDocument.load(generatedPdfBuffer);
    
    // Create a new document for the result
    const finalDoc = await PDFDocument.create();
    
    const briefkopfPages = briefkopfDoc.getPages();
    const generatedPages = generatedDoc.getPages();
    
    // Loop through all pages of the generated content
    for (let i = 0; i < generatedPages.length; i++) {
        const generatedPage = generatedPages[i];
        
        // Determine which briefhead page to use (Page 0 for first page, Page 1 for subsequent)
        const briefkopfPageIndex = i === 0 ? 0 : Math.min(1, briefkopfPages.length - 1);
        const briefkopfTemplatePage = briefkopfPages[briefkopfPageIndex];
        
        // Safety check
        if (!briefkopfTemplatePage) {
            throw new Error(`Briefkopf PDF does not have a page at index ${briefkopfPageIndex}`);
        }
        
        // Embed the pages
        const embeddedBriefkopf = await finalDoc.embedPage(briefkopfTemplatePage);
        const embeddedContent = await finalDoc.embedPage(generatedPage);
        
        // Create a new final page
        const finalPage = finalDoc.addPage([embeddedBriefkopf.width, embeddedBriefkopf.height]);
        
        // Draw the briefhead (background layer)
        finalPage.drawPage(embeddedBriefkopf, {
            x: 0,
            y: 0,
            width: embeddedBriefkopf.width,
            height: embeddedBriefkopf.height,
        });
        
        // Draw the content (foreground layer)
        finalPage.drawPage(embeddedContent, {
            x: 0,
            y: 0,
            width: embeddedContent.width,
            height: embeddedContent.height,
        });
    }
    
    console.log(`  ✓ PDF stamped successfully`);
    
    // Return the final PDF as Buffer
    return Buffer.from(await finalDoc.save());
};

/**
 * Saves the generated invoice PDF, optionally stamping it onto a briefhead PDF
 *
 * @param generatedPdfBuffer - The generated invoice PDF
 * @param invoiceData - Invoice data containing file naming information
 * @param shouldStamp - If true, the briefhead PDF is used for stamping
 * @returns Path to the saved file
 */
export const savePDF = async (
    generatedPdfBuffer: Buffer,
    invoiceData: { lfNr: string; nachname1: string; nachname2?: string; nachname3?: string; rechnungsNummer: string },
    shouldStamp: boolean
): Promise<string> => {
    // Ensure output directory exists
    if (!fs.existsSync(config.outputDir)) {
        fs.mkdirSync(config.outputDir, { recursive: true });
    }

    // Build filename: {LfNr}_{Nachname1}_{Nachname2.pdf
    const filenameParts = [invoiceData.lfNr, invoiceData.nachname1.replaceAll('/', '_')];
    if (invoiceData.nachname2) {
        filenameParts.push(invoiceData.nachname2);
    }
    if (invoiceData.nachname3) {
        filenameParts.push(invoiceData.nachname3);
    }
    const filename = filenameParts.join(' ');
    const outputPath = path.join(config.outputDir, filename) + '.pdf';

    // Check if stamping is requested
    if (!shouldStamp) {
        console.log(`  ℹ Invoice ${invoiceData.rechnungsNummer} will be saved WITHOUT briefhead: ${outputPath}`);
        fs.writeFileSync(outputPath, generatedPdfBuffer);
        return outputPath;
    }

    // Check if briefhead PDF exists
    if (!fs.existsSync(config.briefheadPdf)) {
        console.warn(`  ⚠ Briefhead PDF (${config.briefheadPdf}) not found. Saving generated PDF directly.`);
        fs.writeFileSync(outputPath, generatedPdfBuffer);
        return outputPath;
    }

    try {
        // Stamp the PDF on briefhead
        const stampedPdfBuffer = await stampPDFOnBriefhead(generatedPdfBuffer, config.briefheadPdf);
        fs.writeFileSync(outputPath, stampedPdfBuffer);
        console.log(`  ✓ Invoice ${invoiceData.rechnungsNummer} successfully generated and stamped: ${outputPath}`);
    } catch (error) {
        console.error(`  ✗ Error stamping PDF for ${invoiceData.rechnungsNummer}:`, error);
        console.log(`  → Falling back to saving without stamp...`);
        fs.writeFileSync(outputPath, generatedPdfBuffer);
    }

    return outputPath;
};

/**
 * Loads the HTML template from file
 * 
 * @param templatePath - Path to the HTML template file
 * @returns HTML template content as string
 */
export const loadHTMLTemplate = (templatePath: string): string => {
    if (!fs.existsSync(templatePath)) {
        throw new Error(`HTML template not found: ${templatePath}`);
    }
    
    return fs.readFileSync(templatePath, 'utf-8');
};
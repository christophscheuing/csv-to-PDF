#!/usr/bin/env node

/**
 * RVG Invoice Generator
 * 
 * Generates legal invoices (Kostennoten) from CSV data according to RVG
 * (Rechtsanwaltsvergütungsgesetz)
 * 
 * Usage:
 *   npm run process:all              - Process all invoices
 *   npm run process:single --id=123  - Process single invoice by ID
 *   npm run process:all --no-stamp   - Generate without briefhead
 */

import { config } from './config.js';
import { readCSV } from './csvParser.js';
import { calculateInvoiceData, validateInvoiceData } from './calculator.js';
import { 
    registerHandlebarsHelpers, 
    loadHTMLTemplate, 
    generatePDF, 
    savePDF 
} from './pdfGenerator.js';
import { ProcessingOptions, InvoiceData } from './types.js';

/**
 * Parses a Lf. Nr. specification into an array of individual numbers
 * Supports:
 * - Single value: "3" -> ["3"]
 * - Comma-separated: "1,3,5" -> ["1", "3", "5"]
 * - Range: "1-3" -> ["1", "2", "3"]
 * - Mixed: "1,3-5,7" -> ["1", "3", "4", "5", "7"]
 *
 * @param lfSpec - The Lf. Nr. specification string
 * @returns Array of individual Lf. Nr. strings
 */
const parseLfNrSpecification = (lfSpec: string): string[] => {
    const result: string[] = [];
    const parts = lfSpec.split(',').map(p => p.trim());

    for (const part of parts) {
        if (part.includes('-')) {
            // Range notation (e.g., "1-3")
            const [start, end] = part.split('-').map(s => parseInt(s.trim(), 10));

            if (isNaN(start) || isNaN(end)) {
                console.warn(`Warning: Invalid range "${part}" - skipping`);
                continue;
            }

            if (start > end) {
                console.warn(`Warning: Invalid range "${part}" (start > end) - skipping`);
                continue;
            }

            for (let i = start; i <= end; i++) {
                result.push(String(i));
            }
        } else {
            // Single value
            const num = parseInt(part, 10);
            if (isNaN(num)) {
                console.warn(`Warning: Invalid number "${part}" - skipping`);
                continue;
            }
            result.push(String(num));
        }
    }

    return result;
};

/**
 * Parses command line arguments
 *
 * @returns Processing options
 */
const parseCommandLineArgs = (): ProcessingOptions => {
    const args = process.argv.slice(2);

    const processAll = args.includes('--all');
    const lfArg = args.find(arg => arg.startsWith('--lf='));
    const targetLfNr = lfArg ? lfArg.split('=')[1] : null;
    const targetLfNrs = targetLfNr ? parseLfNrSpecification(targetLfNr) : [];
    const shouldStamp = !args.includes('--no-stamp');

    return { processAll, targetLfNr, targetLfNrs, shouldStamp };
};

/**
 * Displays usage information
 */
const showUsage = (): void => {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║         RVG Invoice Generator - Usage Instructions            ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
    console.log('Please specify a processing mode:\n');
    console.log('  Process ALL invoices:');
    console.log('    npm run process:all\n');
    console.log('  Process invoice(s) by running number (Lf. Nr.):');
    console.log('    npm run process:single --lf=1          # Single invoice');
    console.log('    npm run process:single --lf=1,3,5      # Multiple invoices');
    console.log('    npm run process:single --lf=1-3        # Range of invoices');
    console.log('    npm run process:single --lf=1,3-5,7    # Combined\n');
    console.log('Options:');
    console.log('  --no-stamp    Generate PDFs WITHOUT stamping on briefhead\n');
    console.log('Examples:');
    console.log('  npm run process:all --no-stamp');
    console.log('  npm run process:single --lf=1-10');
    console.log('  npm run process:single --lf=2,5,8 --no-stamp\n');
};

/**
 * Processes a single invoice
 *
 * @param invoice - Invoice data to process
 * @param htmlContent - HTML template content
 * @param shouldStamp - Whether to stamp on briefhead
 */
const processInvoice = async (
    invoice: InvoiceData,
    htmlContent: string,
    shouldStamp: boolean
): Promise<void> => {
    console.log(`\n┌─ Processing Invoice: ${invoice.lfNr} (${invoice.rechnungsNummer}) ────────────────`);

    try {
        // Validate invoice data
        validateInvoiceData(invoice);
        console.log(`  ✓ Invoice data validated`);

        // Generate PDF from template
        const generatedPdfBuffer = await generatePDF(invoice, htmlContent);

        // Save final PDF (with optional stamping)
        const outputPath = await savePDF(generatedPdfBuffer, invoice, shouldStamp);

        console.log(`└─ ✓ Complete: ${outputPath}\n`);

    } catch (error) {
        console.error(`└─ ✗ Failed to process invoice ${invoice.rechnungsNummer}:`, error);
        throw error;
    }
};

/**
 * Main execution function
 */
const main = async (): Promise<void> => {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║              RVG Invoice Generator v1.0.0                      ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
    
    // Parse command line arguments
    const options = parseCommandLineArgs();
    
    // Validate arguments
    if (!options.processAll && !options.targetLfNr) {
        showUsage();
        process.exit(0);
    }

    // Display configuration
    console.log('Configuration:');
    console.log(`  Input CSV:      ${config.inputCsv}`);
    console.log(`  Template:       ${config.htmlTemplate}`);
    console.log(`  Output Dir:     ${config.outputDir}`);
    console.log(`  Stamp Mode:     ${options.shouldStamp ? 'ENABLED' : 'DISABLED'}`);

    if (!options.shouldStamp) {
        console.log('\n⚠️  WARNING: Stamp mode is DISABLED (--no-stamp)');
        console.log('   PDFs will be saved without briefhead.\n');
    }

    try {
        // Register Handlebars helpers
        registerHandlebarsHelpers();
        console.log('\n✓ Handlebars helpers registered');

        // Load HTML template
        const htmlContent = loadHTMLTemplate(config.htmlTemplate);
        console.log('✓ HTML template loaded');

        // Read and parse CSV
        console.log(`\n→ Reading CSV file: ${config.inputCsv}`);
        const csvData = await readCSV(config.inputCsv, config.csvSeparator);

        // Filter out rows with empty Nachname1
        const validCsvData = csvData.filter(row => {
            const nachname = row['Nachname1']?.trim();
            return nachname && nachname.length > 0;
        });

        const skippedCount = csvData.length - validCsvData.length;
        if (skippedCount > 0) {
            console.log(`  ⓘ Skipped ${skippedCount} row(s) with empty Nachname1`);
        }

        // Convert CSV data to invoice data
        const invoices = validCsvData.map(row => calculateInvoiceData(row));
        console.log(`✓ Processed ${invoices.length} invoice records\n`);

        // Filter invoices based on options
        let invoicesToProcess: InvoiceData[];

        if (options.processAll) {
            invoicesToProcess = invoices;
            console.log(`═══ Processing ALL ${invoices.length} invoices ═══\n`);
        } else if (options.targetLfNrs.length > 0) {
            // Filter invoices matching the target Lf. Nr. list
            invoicesToProcess = invoices.filter(i =>
                options.targetLfNrs.includes(i.lfNr.trim())
            );

            if (invoicesToProcess.length === 0) {
                console.error(`\n✗ ERROR: No invoices found matching specification "${options.targetLfNr}"\n`);
                console.log('Available Lf. Nr.:');
                invoices.forEach(inv => console.log(`  - "${inv.lfNr}" (${inv.nachname1}${inv.nachname2 ? ' & ' + inv.nachname2 : ''})`));
                console.log('');
                process.exit(1);
            }

            // Display which invoices will be processed
            const displaySpec = options.targetLfNrs.length === 1
                ? `Lf. Nr. ${options.targetLfNrs[0]}`
                : `${options.targetLfNrs.length} invoices (Lf. Nr. ${options.targetLfNrs.join(', ')})`;
            console.log(`═══ Processing ${displaySpec} ═══\n`);
        } else {
            showUsage();
            process.exit(1);
        }
        
        // Process each invoice
        let successCount = 0;
        let errorCount = 0;
        
        for (const invoice of invoicesToProcess) {
            try {
                await processInvoice(invoice, htmlContent, options.shouldStamp);
                successCount++;
            } catch (error) {
                errorCount++;
                console.error(`Failed to process invoice ${invoice.rechnungsNummer}`);
            }
        }
        
        // Summary
        console.log('\n╔════════════════════════════════════════════════════════════════╗');
        console.log('║                    Processing Complete                         ║');
        console.log('╚════════════════════════════════════════════════════════════════╝\n');
        console.log(`  ✓ Successful: ${successCount}`);
        if (errorCount > 0) {
            console.log(`  ✗ Failed:     ${errorCount}`);
        }
        console.log(`  → Output dir: ${config.outputDir}\n`);
        
        if (errorCount > 0) {
            process.exit(1);
        }
        
    } catch (error) {
        console.error('\n╔════════════════════════════════════════════════════════════════╗');
        console.error('║                    CRITICAL ERROR                              ║');
        console.error('╚════════════════════════════════════════════════════════════════╝\n');
        console.error(error);
        console.error('');
        process.exit(1);
    }
};

// Execute main function
main();
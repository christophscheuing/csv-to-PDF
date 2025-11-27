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
 * Parses command line arguments
 * 
 * @returns Processing options
 */
const parseCommandLineArgs = (): ProcessingOptions => {
    const args = process.argv.slice(2);
    
    const processAll = args.includes('--all');
    const idArg = args.find(arg => arg.startsWith('--id='));
    const targetId = idArg ? idArg.split('=')[1] : null;
    const shouldStamp = !args.includes('--no-stamp');
    
    return { processAll, targetId, shouldStamp };
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
    console.log('  Process SINGLE invoice:');
    console.log('    npm run process:single --id=123/25\n');
    console.log('Options:');
    console.log('  --no-stamp    Generate PDFs WITHOUT stamping on briefhead\n');
    console.log('Examples:');
    console.log('  npm run process:all --no-stamp');
    console.log('  npm run process:single --id=123/25\n');
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
    console.log(`\n┌─ Processing Invoice: ${invoice.rechnungsId} ────────────────`);
    
    try {
        // Validate invoice data
        validateInvoiceData(invoice);
        console.log(`  ✓ Invoice data validated`);
        
        // Generate PDF from template
        const generatedPdfBuffer = await generatePDF(invoice, htmlContent);
        
        // Save final PDF (with optional stamping)
        const outputPath = await savePDF(generatedPdfBuffer, invoice.rechnungsId, shouldStamp);
        
        console.log(`└─ ✓ Complete: ${outputPath}\n`);
        
    } catch (error) {
        console.error(`└─ ✗ Failed to process invoice ${invoice.rechnungsId}:`, error);
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
    if (!options.processAll && !options.targetId) {
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
        
        // Convert CSV data to invoice data
        const invoices = csvData.map(row => calculateInvoiceData(row));
        console.log(`✓ Processed ${invoices.length} invoice records\n`);
        
        // Filter invoices based on options
        let invoicesToProcess: InvoiceData[];
        
        if (options.processAll) {
            invoicesToProcess = invoices;
            console.log(`═══ Processing ALL ${invoices.length} invoices ═══\n`);
        } else if (options.targetId) {
            invoicesToProcess = invoices.filter(i => i.rechnungsId === options.targetId);
            
            if (invoicesToProcess.length === 0) {
                console.error(`\n✗ ERROR: No invoice found with ID "${options.targetId}"\n`);
                console.log('Available invoice IDs:');
                invoices.forEach(inv => console.log(`  - ${inv.rechnungsId}`));
                console.log('');
                process.exit(1);
            }
            
            console.log(`═══ Processing SINGLE invoice: ${options.targetId} ═══\n`);
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
                console.error(`Failed to process invoice ${invoice.rechnungsId}`);
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
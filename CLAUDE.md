# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an automated RVG (Rechtsanwaltsvergütungsgesetz) invoice generator that creates legal billing PDFs from CSV data. The system reads client/case data from CSV files, calculates fees according to German legal billing standards, renders the data into HTML templates using Handlebars, generates PDFs with Puppeteer, and optionally stamps them onto letterhead PDFs.

## Commands

### Build and Run
```bash
bun run build                 # Compile TypeScript to dist/
bun run dev                   # Watch mode for development
bun start                     # Build and run with default behavior
```

### Generate Invoices
```bash
bun run process:all           # Process all invoices in CSV file
bun run process:single        # Process single invoice (requires --id flag)
bun run process:no-stamp      # Generate all without letterhead stamping
```

### Command Line Arguments
- `--all`: Process all invoices in CSV
- `--id=<invoice_number>`: Process specific invoice (e.g., `--id=123/25`)
- `--no-stamp`: Skip letterhead PDF stamping

## Architecture

### Core Data Flow
```
CSV File → csvParser → calculator → InvoiceData → Handlebars Template → Puppeteer PDF → (Optional) pdf-lib Stamping → Final PDF
```

### Module Responsibilities

**types.ts**: TypeScript interfaces defining the entire data model
- `CSVRawData`: Raw CSV structure with German column names
- `InvoiceData`: Complete invoice data for template rendering (extends multiple interfaces)
- `Fees`, `Expenses`, `CashExpenses`: Fee calculation structures
- `ExcelCalculatedData`: Pre-calculated values from Excel/CSV
- `ProcessingOptions`: CLI argument configuration

**config.ts**: Centralized configuration
- `config`: File paths, separators, tax rate
- `senderInfo`: Law firm details (name, address, bank info)
- `caseDetails`: Case-specific information (parties, service period)
- `defaultCalculationValues`: Default fee structures

**csvParser.ts**: Data parsing utilities
- `readCSV()`: Reads CSV with configurable separator (default `;`)
- `parseGermanNumber()`: Converts German number format (e.g., `26.264,34` → `26264.34`)
- `formatGermanDate()`: Formats dates in German style
- `buildRecipientName()`: Constructs full names handling two recipients (e.g., couples)
- `buildAnrede()`: Creates formal German greetings

**calculator.ts**: Business logic and fee calculation
- `calculateInvoiceData()`: Main function transforming CSV rows to complete invoice data
- `calculateFees()`: RVG fee calculation based on dispute value (Streitwert)
- `calculateExpenses()`: Calculates Auslagen (expenses) and Erhöhungsgebühr
- `performInvoiceCalculations()`: Net/gross calculations with VAT
- `validateInvoiceData()`: Ensures required fields are present
- Note: The RVG calculation logic uses both hardcoded default values and dynamic calculations based on Gesamtstreitwert

**pdfGenerator.ts**: PDF generation pipeline
- `registerHandlebarsHelpers()`: Custom helpers (`formatCurrency`, `formatPercent`, conditional logic)
- `loadHTMLTemplate()`: Reads HTML template from file system
- `generatePDF()`: Uses Puppeteer to render Handlebars-compiled HTML to PDF (A4 format, networkidle0)
- `stampPDFOnBriefhead()`: Uses pdf-lib to overlay generated PDF onto letterhead
  - Page 0 of letterhead for first page
  - Page 1 of letterhead for subsequent pages
- `savePDF()`: Writes final PDF to output directory with error handling

**index.ts**: CLI entry point and orchestration
- Command line parsing
- Batch processing with progress indicators
- Error handling and user feedback with formatted console output
- Success/failure counting and reporting

### Important Implementation Details

**German Number Handling**: The system handles German number formats throughout. CSV data uses German formatting (`1.234,56`), which is parsed to JavaScript numbers, then formatted back to German style in templates using the `formatCurrency` Handlebars helper.

**Dual Data Sources**: Invoice calculations use both:
1. Values calculated from Excel/CSV (stored in `ExcelCalculatedData` fields like `gesamtRechnungsbetrag`, `erhoehungsgebuehr`, etc.)
2. Dynamic calculations in `calculator.ts` (fees based on Streitwert)

The system merges these sources into the final `InvoiceData` object.

**Multi-Page PDF Stamping**: When stamping on letterhead, the system uses different letterhead pages:
- First page of invoice → Page 0 of letterhead (with full header)
- Subsequent pages → Page 1 of letterhead (continuation page format)

**Error Handling**: The system gracefully degrades:
- Missing letterhead PDF → saves without stamping
- Validation errors → detailed field-level messages
- Processing errors → continues with remaining invoices

## Configuration Files

**tsconfig.json**: Configured for ES2022 modules with strict type checking. Output goes to `dist/`, source in `src/`.

**package.json**: Type is set to `"module"` for ES module support.

**invoice_template.html**: Handlebars template using German legal invoice format. Access invoice data via `{{fieldName}}` and use helpers like `{{formatCurrency amount}}`.

**CSV Files**:
- Input file configured in `config.inputCsv` (default: `beispieldaten.csv`)
- Semicolon-separated (`;`) with German column names
- Must include: `Lf. Nr.`, `Az. TILP`, `Anrede`, `Vorname1`, `Nachname1`, `Strasse`, `PLZ`, `Ort`, `Land`, `Streitwert Klage`, `Gesamtstreitwert`, `Rechnungsnummer`, and Excel-calculated fields

**briefkopf.pdf**: Optional letterhead PDF for stamping. Should have 2 pages (page 1 for first page, page 2 for continuation).

## Common Development Tasks

### Modifying Fee Calculation Logic
Edit `src/calculator.ts`, specifically the `calculateFees()` function. The current implementation calculates `zweiKommaDreiGebuehr` based on `gesamtStreitwert` using a factor-based formula. Update RVG table logic here.

### Adding New CSV Fields
1. Add field to `CSVRawData` interface in `types.ts`
2. Parse/process in `calculateInvoiceData()` in `calculator.ts`
3. Add to `InvoiceData` interface if needed for template
4. Use in `invoice_template.html` with `{{newFieldName}}`

### Customizing PDF Layout
Edit `invoice_template.html`. Available Handlebars helpers:
- `{{formatCurrency value}}`: German currency format
- `{{formatPercent value}}`: German percentage format with 6 decimals
- `{{#if condition}}...{{/if}}`: Conditional rendering
- `{{eq a b}}`: Equality comparison

### Debugging PDF Generation
Puppeteer runs headless. To debug:
- Change `headless: true` to `headless: false` in `pdfGenerator.ts:76`
- Add `await page.screenshot({ path: 'debug.png' })` before PDF generation
- Check the compiled HTML by logging the `html` variable after template compilation

### Adjusting PDF Margins/Format
Modify the `page.pdf()` options in `pdfGenerator.ts:91-96`. Current settings force A4 with zero margins and CSS background rendering.

## File Paths and Configuration

All file paths are centralized in `config.ts`. Default locations:
- Input CSV: `./beispieldaten.csv`
- HTML Template: `./invoice_template.html`
- Letterhead PDF: `./briefkopf.pdf`
- Output Directory: `./output/`

Output files are named: `Rechnung_{invoiceId}_final.pdf` where `invoiceId` has `/` replaced with `_`.

## TypeScript Compilation

Source files in `src/` compile to `dist/` with:
- Source maps enabled
- Declaration files generated
- ES2022 target with ES modules
- Strict type checking enabled

Always run `bun run build` after modifying TypeScript files before execution.

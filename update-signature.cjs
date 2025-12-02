#!/usr/bin/env node
/**
 * Script to update the signature image in invoice_template.html
 *
 * Usage:
 *   node update-signature.js [image-path] [height]
 *
 * Examples:
 *   node update-signature.js Siegmann.png 120
 *   node update-signature.js secret-data/neue-unterschrift.png 150
 *
 * Default: Uses Siegmann.png with height 120px
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const imagePath = process.argv[2] || 'Siegmann.png';
const imageHeight = process.argv[3] || '120';

const templatePath = 'invoice_template.html';

try {
    // Check if image exists
    if (!fs.existsSync(imagePath)) {
        console.error(`❌ Error: Image file not found: ${imagePath}`);
        process.exit(1);
    }

    // Read and convert image to Base64
    console.log(`📷 Reading image: ${imagePath}`);
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const ext = path.extname(imagePath).toLowerCase().substring(1);
    const mimeType = ext === 'png' ? 'image/png' :
                     ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
                     'image/png';
    const dataUri = `data:${mimeType};base64,${base64Image}`;

    console.log(`✓ Image converted to Base64 (${Math.round(base64Image.length / 1024)} KB)`);

    // Read template
    if (!fs.existsSync(templatePath)) {
        console.error(`❌ Error: Template file not found: ${templatePath}`);
        process.exit(1);
    }

    let html = fs.readFileSync(templatePath, 'utf-8');

    // Find and replace the signature img tag
    // Pattern matches: <img src="data:image/...base64,..." alt="Unterschrift" style="height: XXpx; ...">
    const imgPattern = /<img src="data:image\/[^"]*" alt="Unterschrift" style="height: \d+px;([^"]*)"/;

    if (!imgPattern.test(html)) {
        console.error('❌ Error: Could not find signature image tag in template');
        console.log('Looking for pattern: <img src="data:image/..." alt="Unterschrift" style="height: ...">');
        process.exit(1);
    }

    const newImgTag = `<img src="${dataUri}" alt="Unterschrift" style="height: ${imageHeight}px;$1"`;
    html = html.replace(imgPattern, newImgTag);

    // Write updated template
    fs.writeFileSync(templatePath, html, 'utf-8');

    console.log(`✅ Template updated successfully!`);
    console.log(`   Image: ${imagePath}`);
    console.log(`   Height: ${imageHeight}px`);
    console.log(`   Template: ${templatePath}`);

} catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
}

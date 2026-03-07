const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'admin.html');
const jsPath = path.join(__dirname, 'assets', 'js', 'admin.js');

let htmlContent = fs.readFileSync(htmlPath, 'utf8');

// The bug in extract.js left the script blocks that contained `src=` untouched.
// BUT because the regex matched `<\/script>`, it thought the script ended there.
// We have an inline script block around line 4318 inside admin.html. Let's just remove it cleanly, and append it to admin.js.

// Find the block starting with `<script>\n// ── Print PNG: capture the full order drawer`
// and ending with `adminMarkDelivered error` ... `</script>`
const problemScriptRegex = /<script>\s*\/\/\s*──\s*Print PNG[\s\S]*?adminMarkDelivered error[\s\S]*?<\/script>/g;

let jsToAppend = '';
htmlContent = htmlContent.replace(problemScriptRegex, (match) => {
    // Strip the outer <script> and </script>
    let inner = match.replace(/^<script>/, '').replace(/<\/script>$/, '');
    jsToAppend += '\n' + inner + '\n';
    return ''; // Remove from html
});

// Also make sure we have the adminJS script tag!
if (!htmlContent.includes('<script src="/assets/js/admin.js" defer></script>')) {
    htmlContent = htmlContent.replace('</body>', '  <script src="/assets/js/admin.js" defer></script>\n</body>');
}

fs.writeFileSync(htmlPath, htmlContent, 'utf8');

// Append the missing functions to admin.js
if (jsToAppend) {
    fs.appendFileSync(jsPath, jsToAppend, 'utf8');
}

console.log("Fixed HTML script tags and appended to admin.js");

## Credit Card PDF Parser

An interactive web app that turns credit card PDF statements into structured, analyzable data.  
Built with React, TypeScript, Vite, Tailwind-style utility classes, `pdfjs-dist` for text extraction, and `tesseract.js` for OCR.

### Features

- **Two extraction modes**
  - **PDF Text Extraction (Text Layer)**: Uses `pdfjs-dist` to read selectable text embedded in the PDF.
  - **OCR Extraction (Image-Based)**: Renders each page to a canvas and runs `tesseract.js` OCR for scanned/image-only PDFs.
- **Credit-card–specific parsing**
  - Detects issuer patterns (Chase, Amex, Citi, BofA, Capital One, generic).
  - Extracts key details such as account holder, account number, statement dates, balances, limits, and APRs.
  - Displays data in rich “Account Information”, “Payment Details”, “Activity Summary”, and “Credit Information” panels.
- **Smart insights & quality indicators**
  - “Smart Insights” cards (e.g. payment-to-balance ratio, utilization).
  - “Parsing Quality” widget that summarizes how many core/optional fields were detected.
- **Search & preview**
  - In-panel search with highlighting for both text extraction and OCR results.
  - Compact preview of the first chunk of extracted text.
- **Downloads & export**
  - Download raw extracted text or OCR text as **TXT**.
  - Download structured data or OCR output as **JSON**.
- **Session UX**
  - Recent-file chips in the header for quick recall (re-upload required for security).
  - Modern dark UI tuned for desktop use.

### Project structure

- `credit-card-parser/`
  - `src/App.tsx` – main UI and interaction logic.
  - `src/utils/pdfProcessor.ts` – low-level PDF text and canvas rendering helpers.
  - `src/utils/ocrEngine.ts` – OCR helpers using `tesseract.js`.
  - `src/utils/pdfExtractor.ts` – full-document text extraction + download helpers.
  - `src/utils/patternMatcher.ts` – issuer detection and statement field extraction.
  - `src/styles/globals.css` – global styles and theme setup.
  - `public/pdf.worker.min.mjs` – PDF.js worker.

### Getting started

1. **Install Node.js**
   - Install the latest LTS from `https://nodejs.org`.

2. **Install dependencies**

   ```bash
   cd credit-card-parser
   npm install
   ```

3. **Run the dev server**

   ```bash
   npm run dev
   ```

   Open the printed URL (usually `http://localhost:5173` or `http://localhost:3000`) in your browser.

4. **Use the app**
   - Upload a credit card PDF statement.
   - Use **Extract PDF Text** for text-based PDFs.
   - Use **Run OCR on All Pages** for scanned PDFs.
   - Explore the structured panels and exports on the right-hand side.

### Screenshots

**Overview**

![Overview](docs/screenshots/overview.png)

**Extraction modes (text + OCR)**

![Extraction modes](docs/screenshots/extraction.png)

**Details / right-hand panels**

![Details](docs/screenshots/details.png)

### Git & GitHub

This repository is intended to be pushed to:

- `https://github.com/darksar11/credit_card_parser.git`

From the project root:

```bash
git init
git add .
git commit -m "Initial commit: credit card PDF parser with OCR"
git remote add origin https://github.com/darksar11/credit_card_parser.git
git branch -M main
git push -u origin main
```



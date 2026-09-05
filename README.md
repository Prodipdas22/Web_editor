# Index Editor V2 — Sprint 2

Sprint 2 adds the **A4 Lab Report Engine** to the Sprint 1 IDE.

## Included

- Multiple experiments
- Experiment number, title, objective and result
- HTML / CSS / JavaScript editor
- Live browser preview
- Custom console
- Local autosave
- Dark / light theme
- Desktop / mobile preview
- A4 report preview
- macOS-style code blocks in the report
- Automatic output screenshot capture using html2canvas
- Multiple experiments in one report
- Print / Save as PDF using the browser print system
- Responsive mobile interface

## Files

- `index.html`
- `style.css`
- `script.js`

## Install / Run

No server is required.

1. Download the ZIP.
2. Replace your current `index.html`, `style.css` and `script.js`.
3. Open `index.html` in a browser.

For GitHub Pages, push the files to your repository and enable Pages from the `main` branch.

## Generate PDF

1. Create/edit your experiments.
2. Click **Report / PDF**.
3. Wait for the report preview to finish capturing outputs.
4. Click **Print / Save PDF**.
5. On Android/Chrome choose **Save as PDF**.
6. On desktop choose **Save to PDF**.

## Important

The output screenshot is generated locally in the browser. Some external images/resources can prevent canvas capture because of browser security restrictions. The report therefore has a fallback message instead of breaking the entire report.

## Next Sprint

Possible Sprint 3 improvements:

- Real syntax-highlighted editor with CodeMirror
- Drag/drop experiment ordering
- Project JSON export/import
- Better page overflow handling
- Dedicated PDF engine
- Header/footer customization
- Institution/college information
- Automatic experiment numbering
- Report cover configuration (only if requested)

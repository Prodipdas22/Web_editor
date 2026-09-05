# Index Editor V2 — Sprint 3

Sprint 3 upgrades the project-management and editor workflow.

## New features

### Project management
- Export the complete lab project as JSON
- Import a previously exported JSON project
- Safe validation of imported experiment data
- Works offline after the page and CDN assets are available

### Editor productivity
- Find bar with next/previous search
- Ctrl/Cmd + F to open Find
- Escape closes Find
- Ctrl/Cmd + S saves the project
- Word Wrap toggle
- Cursor position: line and column
- Existing Tab indentation
- Existing Ctrl/Cmd + Enter Run
- Existing Copy and Format

### Report engine
Sprint 2 report features remain:
- A4 report preview
- Multiple experiments
- Objective / Source Code / Output / Result
- Output capture
- Print / Save as PDF

## Files

- index.html
- style.css
- script.js
- README.md

## Update your GitHub repository

Replace the three application files:

```text
index.html
style.css
script.js
```

Then:

```bash
git add .
git commit -m "V2 Sprint 3 - Project Import Export and Editor Tools"
git push
```

## Important

This sprint intentionally keeps the lightweight textarea editor so the project stays simple and mobile-friendly. A future sprint can replace it with CodeMirror for true syntax highlighting, autocomplete, bracket matching and folding.

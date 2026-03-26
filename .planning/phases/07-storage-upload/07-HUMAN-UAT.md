---
status: partial
phase: 07-storage-upload
source: [07-VERIFICATION.md]
started: "2026-03-26T22:13:00.000Z"
updated: "2026-03-26T22:13:00.000Z"
---

## Current Test

[awaiting human testing — requires .env with DATABASE_URL and AUTH_SECRET]

## Tests

### 1. Drag-and-drop upload flow
expected: Drag a PDF onto chat input area → blue border overlay appears ("Drop file here") → file chip renders with filename, type icon, size → upload progress bar → transitions to uploaded state
result: [pending]

### 2. Paperclip button file picker
expected: Click Paperclip icon → file picker opens → select a file → chip appears with filename, type icon, size → upload begins automatically
result: [pending]

### 3. Error chip auto-fade
expected: Upload an unsupported type (e.g. .exe) → error chip appears with "Unsupported file type" → chip auto-fades after ~5 seconds
result: [pending]

### 4. File removal
expected: Upload a file → click X button on chip → chip is removed immediately from the list
result: [pending]

### 5. 100MB rejection
expected: Attempt upload of 100MB+ file → error message "File exceeds 100MB" appears
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 5

## Gaps

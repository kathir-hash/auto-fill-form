# 🚀 Form Filler – Chrome Extension

An automated form-filling Chrome Extension built with **Manifest V3** that populates HTML web forms with randomized, validator-compliant data. Designed for QA engineers, developers, and testers to speed up workflow testing without manually entering mock inputs.

---

## ✨ Features

* **Instant Dynamic Auto-Fill:** Generates valid inputs on page open or button click.
* **Regex Pattern Matching:** Built-in `generateFromPattern()` parser accurately generates outputs for regex patterns like pincodes (`[0-9]{6}`), phone formats, and restricted characters.
* **Full Validator Support:** Respects standard HTML5 constraint validation rules:
  * `minlength` & `maxlength` (string clipping)
  * `min`, `max`, and `step` (numeric bounds & range scaling)
  * `date` & `time` range constraints (`YYYY-MM-DD` and `HH:MM`)
  * Strong `password` requirements (mix of uppercase, lowercase, numbers, and special characters)
* **File Upload Simulation:** Injects dummy `Blob` files via `DataTransfer` respecting the input's `accept` attribute (`.pdf`, `.png`, `.jpg`, `.txt`).
* **Semantic Fallback:** Detects field names, IDs, and placeholders (e.g., `pincode`, `zipcode`, `postal`) when explicit pattern constraints aren't provided.
* **Shadow DOM & Dynamic Form Support:** Traverses elements recursively inside custom components.
* **Sleek UI with Auto-Close:** Built-in gradient pop-up window with animated confirmation that automatically closes after execution.

---

## 📂 Project Structure

```text
├── manifest.json        # Extension configuration (Manifest V3)
├── popup.html           # Extension UI window
├── popup.js             # Execution trigger & tab script injection
├── icons/               # Extension icons (16x16, 48x48, 128x128)
└── README.md            # Documentation

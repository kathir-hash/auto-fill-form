document.addEventListener('DOMContentLoaded', async () => {
    const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
    });

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: fillForm
    });

    setTimeout(() => {
        window.close();
    }, 2000);

});


const fillForm = () => {
    // Helper function to generate realistic random text
    const getRandomString = (length = 8) => {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
    };

    // Helper function to generate a random integer
    const getRandomInt = (min = 1, max = 100) => {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };
    // Helper function to generate strings matching standard HTML5 input pattern regexes
    const generateFromPattern = (pattern) => {
        if (!pattern) return '';

        // 1. PINCODE / EXACT NUMERIC REPEAT (e.g., [0-9]{6} or \d{6})
        const digitExactMatch = pattern.match(/^(?:\[0-9\]|\\d)\{(\d+)\}$/);
        if (digitExactMatch) {
            const count = parseInt(digitExactMatch[1], 10);
            let result = '';
            for (let i = 0; i < count; i++) {
                // First digit 1-9 for realistic pincodes/zips, remaining 0-9
                result += i === 0 ? getRandomInt(1, 9) : getRandomInt(0, 9);
            }
            return result;
        }

        // 2. NUMERIC RANGE QUANTIFIER (e.g., [0-9]{5,10} or \d{3,8})
        const digitRangeMatch = pattern.match(/^(?:\[0-9\]|\\d)\{(\d+),(\d+)\}$/);
        if (digitRangeMatch) {
            const min = parseInt(digitRangeMatch[1], 10);
            const max = parseInt(digitRangeMatch[2], 10);
            const count = getRandomInt(min, max);
            let result = '';
            for (let i = 0; i < count; i++) {
                result += i === 0 ? getRandomInt(1, 9) : getRandomInt(0, 9);
            }
            return result;
        }

        // 3. EXACT ALPHABETIC REPEAT (e.g., [a-zA-Z]{5} or [A-Z]{3})
        const alphaExactMatch = pattern.match(/^\[([a-zA-Z\-]+)\]\{(\d+)\}$/);
        if (alphaExactMatch) {
            const chars = alphaExactMatch[1].includes('A-Z') && alphaExactMatch[1].includes('a-z')
                ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
                : alphaExactMatch[1].includes('A-Z')
                    ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
                    : 'abcdefghijklmnopqrstuvwxyz';
            const count = parseInt(alphaExactMatch[2], 10);
            let res = '';
            for (let i = 0; i < count; i++) {
                res += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return res;
        }

        // 4. FALLBACK: Remove regex quantifiers/anchors and substitute placeholders
        let sample = pattern.replace(/^\^|\$$/g, ''); // Remove start/end anchors
        sample = sample.replace(/\[0-9\]|\\d/g, () => getRandomInt(0, 9));
        sample = sample.replace(/\[a-z\]/g, () => getRandomString(1).toLowerCase());
        sample = sample.replace(/\[A-Z\]/g, () => getRandomString(1).toUpperCase());
        sample = sample.replace(/\[a-zA-Z\]/g, () => getRandomString(1));
        sample = sample.replace(/\{(\d+)\}/g, ''); // Strip remaining quantifier tags

        return sample || getRandomString(6);
    };

    // Main randomizer logic based on element type & validators
    const generateRandomValue = (field) => {
        const tag = field.tagName.toLowerCase();
        const type = (field.type || 'text').toLowerCase();

        // Helper to ensure length constraints are universally obeyed
        const clampLength = (defaultMin = 3, defaultMax = 15) => {
            let minLen = field.minLength > 0 ? field.minLength : defaultMin;
            let maxLen = field.maxLength > 0 ? field.maxLength : defaultMax;
            if (maxLen < minLen) maxLen = minLen;
            return getRandomInt(minLen, maxLen);
        };

        // -------------------------------------------------------------
        // 1. SELECT TAG (Dropdowns)
        // -------------------------------------------------------------
        if (tag === 'select') {
            const options = Array.from(field.options).filter(
                opt => !opt.disabled && opt.value !== ''
            );
            if (options.length > 0) {
                const randomOpt = options[Math.floor(Math.random() * options.length)];
                return randomOpt.value;
            }
            return field.value;
        }

        // -------------------------------------------------------------
        // 2. TEXTAREA TAG (Obeys minlength & maxlength)
        // -------------------------------------------------------------
        if (tag === 'textarea') {
            // Prioritize regex pattern if defined on textarea
            if (field.pattern && field.pattern.trim() !== '') {
                try { return generateFromPattern(field.pattern); } catch (e) { }
            }
            const len = clampLength(10, 50);
            return getRandomString(len);
        }

        // -------------------------------------------------------------
        // 3. INPUT TAGS BY TYPE & VALIDATORS
        // -------------------------------------------------------------
        if (tag === 'input') {
            // PRIORITY 1: Honor pattern attribute across ALL input types first
            if (field.pattern && field.pattern.trim() !== '') {
                try {
                    const generated = generateFromPattern(field.pattern);
                    if (generated) return generated;
                } catch (err) {
                    console.warn(`Failed to generate pattern for ${field.name || field.id}:`, err);
                }
            }

            // PRIORITY 2: Semantic name/ID matching fallback (e.g., Pincodes/Zipcodes)
            const fieldIdentifier = `${field.id} ${field.name} ${field.placeholder}`.toLowerCase();
            if (fieldIdentifier.includes('pincode') || fieldIdentifier.includes('zipcode') || fieldIdentifier.includes('postal')) {
                return String(getRandomInt(100000, 999999));
            }

            // PRIORITY 3: Handle by Input Type & specific HTML attributes
            switch (type) {
                // NUMERIC & RANGE VALIDATORS (min, max, step, floor > 1)
                case 'number':
                case 'range': {
                    const parsedMin = field.min !== '' ? Number(field.min) : 2;
                    const min = Math.max(2, parsedMin); // Guaranteed > 1 constraint
                    const max = field.max !== '' ? Math.max(min + 1, Number(field.max)) : 100;
                    const step = field.step !== '' && field.step !== 'any' ? Number(field.step) : 1;

                    let val = getRandomInt(min, max);
                    if (step > 1) {
                        val = Math.round((val - min) / step) * step + min;
                    }
                    if (val <= 1) val = 2;
                    return val.toString();
                }

                // DATE VALIDATORS (min, max bounds)
                case 'date': {
                    const start = field.min ? new Date(field.min) : new Date(1910, 0, 1);
                    const end = field.max ? new Date(field.max) : new Date();
                    const startTime = start.getTime();
                    const endTime = end.getTime() > startTime ? end.getTime() : startTime + 86400000;

                    const randomDate = new Date(startTime + Math.random() * (endTime - startTime));
                    return randomDate.toISOString().split('T')[0];
                }

                // TIME VALIDATORS (min, max bounds in HH:MM)
                case 'time': {
                    let minMinutes = 0;
                    let maxMinutes = 23 * 60 + 59;

                    if (field.min && field.min.includes(':')) {
                        const [h, m] = field.min.split(':').map(Number);
                        minMinutes = h * 60 + m;
                    }
                    if (field.max && field.max.includes(':')) {
                        const [h, m] = field.max.split(':').map(Number);
                        maxMinutes = h * 60 + m;
                    }
                    if (maxMinutes < minMinutes) maxMinutes = minMinutes;

                    const totalRandMinutes = getRandomInt(minMinutes, maxMinutes);
                    const hours = String(Math.floor(totalRandMinutes / 60)).padStart(2, '0');
                    const minutes = String(totalRandMinutes % 60).padStart(2, '0');
                    return `${hours}:${minutes}`;
                }

                // PASSWORD VALIDATORS (minlength, maxlength, complex charset)
                case 'password': {
                    const len = clampLength(8, 16);
                    const uppers = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                    const lowers = 'abcdefghijklmnopqrstuvwxyz';
                    const numbers = '0123456789';
                    const symbols = '!@#$%^&*()_+-=';

                    const passwordArray = [
                        uppers.charAt(Math.floor(Math.random() * uppers.length)),
                        lowers.charAt(Math.floor(Math.random() * lowers.length)),
                        numbers.charAt(Math.floor(Math.random() * numbers.length)),
                        symbols.charAt(Math.floor(Math.random() * symbols.length))
                    ];

                    const allChars = uppers + lowers + numbers + symbols;
                    while (passwordArray.length < len) {
                        passwordArray.push(allChars.charAt(Math.floor(Math.random() * allChars.length)));
                    }

                    for (let i = passwordArray.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [passwordArray[i], passwordArray[j]] = [passwordArray[j], passwordArray[i]];
                    }
                    return passwordArray.join('');
                }

                // FILE VALIDATORS (accept attribute & DataTransfer assignment)
                case 'file': {
                    const accept = field.accept || '';
                    let ext = '.txt';
                    let mimeType = 'text/plain';

                    if (accept.includes('pdf')) { ext = '.pdf'; mimeType = 'application/pdf'; }
                    else if (accept.includes('png')) { ext = '.png'; mimeType = 'image/png'; }
                    else if (accept.includes('jpg') || accept.includes('jpeg')) { ext = '.jpg'; mimeType = 'image/jpeg'; }

                    const fileName = `sample_upload_${getRandomString(4)}${ext}`;
                    const dummyBlob = new Blob(['Sample content generated for form testing.'], { type: mimeType });
                    const dummyFile = new File([dummyBlob], fileName, { type: mimeType });

                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(dummyFile);
                    field.files = dataTransfer.files;
                    return null;
                }

                // CHECKBOX & RADIO
                case 'checkbox':
                    field.checked = true;
                    return null;

                case 'radio':
                    field.dataset.isRadio = "true";
                    return null;

                // EMAIL (Obeys minlength & maxlength)
                case 'email': {
                    const domain = '@example.com';
                    const availableLen = Math.max(3, clampLength(6, 15) - domain.length);
                    return `${getRandomString(availableLen).toLowerCase()}${domain}`;
                }

                // URL (Obeys minlength & maxlength)
                case 'url': {
                    const prefix = 'https://www.';
                    const suffix = '.com';
                    const availableLen = Math.max(3, clampLength(12, 25) - (prefix.length + suffix.length));
                    return `${prefix}${getRandomString(availableLen).toLowerCase()}${suffix}`;
                }

                // TELEPHONE (Obeys maxlength formatting)
                case 'tel': {
                    if (field.maxLength > 0 && field.maxLength < 12) {
                        return String(getRandomInt(1000000000, 9999999999)).slice(0, field.maxLength);
                    }
                    return `${getRandomInt(100, 999)}-${getRandomInt(100, 999)}-${getRandomInt(1000, 9999)}`;
                }

                // COLOR
                case 'color':
                    return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;

                // STANDARD TEXT, SEARCH & DEFAULT FALLBACK
                case 'text':
                case 'search':
                default: {
                    const len = clampLength(3, 12);
                    return getRandomString(len);
                }
            }
        }

        return '';
    };

    // Query all fields
    const fields = document.querySelectorAll('input, textarea, select');

    // Track radio groups to handle them separately
    const radioGroups = {};

    fields.forEach(field => {

        // Skip hidden, disabled, or read-only inputs
        if (field.disabled || field.readOnly || field.type === 'hidden' || field.type === 'submit' || field.type === 'button') {
            return;
        }

        // Clean up invalid literal "undefined" IDs
        if (field.id === 'undefined') {
            field.removeAttribute('id');
        }

        // Group radio buttons by name
        if (field.type === 'radio') {
            const groupName = field.name || 'unnamed_radios';
            if (!radioGroups[groupName]) {
                radioGroups[groupName] = [];
            }
            radioGroups[groupName].push(field);
            return; // Skip normal processing for radios
        }

        // SKIP ALREADY FILLED FIELDS
        const isFilled = field.tagName.toLowerCase() === 'select'
            ? field.value !== '' && field.selectedIndex !== -1 && field.options[field.selectedIndex]?.value !== ''
            : field.type === 'checkbox' ? field.checked : field.value.trim() !== '';

        if (isFilled) {
            return;
        }

        // Generate and apply random value
        const val = generateRandomValue(field);

        if (val !== null) {
            field.value = val;
        }

        // Dispatch DOM events to notify frameworks (React, Vue, Angular)
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));

    });

    // PROCESS RADIO GROUPS (Ensure at least one radio is selected per group)
    Object.keys(radioGroups).forEach(groupName => {
        const radios = radioGroups[groupName];
        const hasSelection = radios.some(radio => radio.checked);

        // Only select a radio if none in the group are currently checked
        if (!hasSelection && radios.length > 0) {
            const randomRadio = radios[Math.floor(Math.random() * radios.length)];
            randomRadio.checked = true;
            randomRadio.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
        }
    });
}
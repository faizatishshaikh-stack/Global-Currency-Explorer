document.addEventListener('DOMContentLoaded', () => {
    // --- Currency Metadata & Profiles ---
    const currencyMeta = {
        USD: { symbol: '$', sub: 'us', country: 'United States', name: 'United States Dollar' },
        INR: { symbol: '₹', sub: 'IN', country: 'India', name: 'Indian Rupee' },
        EUR: { symbol: '€', sub: 'eu', country: 'Eurozone', name: 'Eurozone Euro' },
        GBP: { symbol: '£', sub: 'gb', country: 'United Kingdom', name: 'British Pound' },
        JPY: { symbol: '¥', sub: 'jp', country: 'Japan', name: 'Japanese Yen' },
        CAD: { symbol: 'C$', sub: 'ca', country: 'Canada', name: 'Canadian Dollar' },
        AUD: { symbol: 'A$', sub: 'au', country: 'Australia', name: 'Australian Dollar' },
        CHF: { symbol: 'Fr', sub: 'ch', country: 'Switzerland', name: 'Swiss Franc' },
        AED: { symbol: 'د.إ', sub: 'ae', country: 'United Arab Emirates', name: 'UAE Dirham' },
        SGD: { symbol: 'S$', sub: 'sg', country: 'Singapore', name: 'Singapore Dollar' },
        CNY: { symbol: '¥', sub: 'cn', country: 'China', name: 'Chinese Yuan' },
        NZD: { symbol: 'NZ$', sub: 'nz', country: 'New Zealand', name: 'New Zealand Dollar' },
        HKD: { symbol: 'HK$', sub: 'hk', country: 'Hong Kong', name: 'Hong Kong Dollar' },
        KRW: { symbol: '₩', sub: 'kr', country: 'South Korea', name: 'South Korean Won' },
        BRL: { symbol: 'R$', sub: 'br', country: 'Brazil', name: 'Brazilian Real' },
        MXN: { symbol: '$', sub: 'mx', country: 'Mexico', name: 'Mexican Peso' },
        ZAR: { symbol: 'R', sub: 'za', country: 'South Africa', name: 'South African Rand' },
        SEK: { symbol: 'kr', sub: 'se', country: 'Sweden', name: 'Swedish Krona' },
        NOK: { symbol: 'kr', sub: 'no', country: 'Norway', name: 'Norwegian Krone' },
        DKK: { symbol: 'kr', sub: 'dk', country: 'Denmark', name: 'Danish Krone' },
        RUB: { symbol: '₽', sub: 'ru', country: 'Russia', name: 'Russian Ruble' },
        TRY: { symbol: '₺', sub: 'tr', country: 'Turkey', name: 'Turkish Lira' },
        SAR: { symbol: '﷼', sub: 'sa', country: 'Saudi Arabia', name: 'Saudi Riyal' },
        THB: { symbol: '฿', sub: 'th', country: 'Thailand', name: 'Thai Baht' },
        IDR: { symbol: 'Rp', sub: 'id', country: 'Indonesia', name: 'Indonesian Rupiah' },
        MYR: { symbol: 'RM', sub: 'my', country: 'Malaysia', name: 'Malaysian Ringgit' },
        PHP: { symbol: '₱', sub: 'ph', country: 'Philippines', name: 'Philippine Peso' },
        PLN: { symbol: 'zł', sub: 'pl', country: 'Poland', name: 'Polish Zloty' },
        ILS: { symbol: '₪', sub: 'il', country: 'Israel', name: 'Israeli New Shekel' }
    };

    function getCurrencySymbol(code) {
        if (!code) return '$';
        const upper = code.toUpperCase();
        if (currencyMeta[upper] && currencyMeta[upper].symbol) return currencyMeta[upper].symbol;
        return '$';
    }

    function getCurrencySub(code) {
        if (!code) return '';
        const upper = code.toUpperCase();
        if (currencyMeta[upper] && currencyMeta[upper].sub) return currencyMeta[upper].sub;
        return upper.slice(0, 2).toLowerCase();
    }

    function getCountryName(code) {
        if (!code) return '';
        const upper = code.toUpperCase();
        if (currencyMeta[upper] && currencyMeta[upper].country) return currencyMeta[upper].country;
        return getCurrencyName(code);
    }

    function getFlag(code) {
        if (!code) return '🌐';
        const upper = code.toUpperCase();
        const flagMap = {
            USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', INR: '🇮🇳', JPY: '🇯🇵',
            CAD: '🇨🇦', AUD: '🇦🇺', CHF: '🇨🇭', AED: '🇦🇪', SGD: '🇸🇬',
            CNY: '🇨🇳', NZD: '🇳🇿', HKD: '🇭🇰', KRW: '🇰🇷', BRL: '🇧🇷'
        };
        if (flagMap[upper]) return flagMap[upper];
        try {
            const countryCode = upper.slice(0, 2);
            return String.fromCodePoint(...[...countryCode].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
        } catch {
            return '🌐';
        }
    }

    // --- State Management ---
    const state = {
        currencies: [],
        fromCurrency: 'USD',
        toCurrency: 'INR',
        baseCurrency: 'USD',
        rates: {},
        isConverting: false,
        pendingConversion: false,
        lastConvertedAmount: null
    };

    // --- DOM Elements ---
    const networkStatus = document.getElementById('network-status');
    const amountInput = document.getElementById('amount');
    const swapBtn = document.getElementById('swap-btn');
    const convertBtn = document.getElementById('convert-btn');
    const quickBtns = document.querySelectorAll('.quick-btn');

    // National Bank Card Elements
    const noteWrapper = document.getElementById('note-wrapper');
    const noteFront = document.getElementById('note-front');
    const noteFrontAmount = document.getElementById('note-front-amount');
    const noteFrontCode = document.getElementById('note-front-code');
    const noteFrontCountry = document.getElementById('note-front-country');
    const noteFrontBank = document.getElementById('note-front-bank');
    const noteFrontSymbol = document.getElementById('note-front-symbol');

    const noteBack = document.getElementById('note-back');
    const noteBackAmount = document.getElementById('note-back-amount');
    const noteBackCode = document.getElementById('note-back-code');
    const noteBackCountry = document.getElementById('note-back-country');
    const noteBackBank = document.getElementById('note-back-bank');
    const noteBackSymbol = document.getElementById('note-back-symbol');

    const conversionDetails = document.getElementById('conversion-details');
    const flipHint = document.querySelector('.note-flip-hint');

    // Global Rates Elements
    const searchRates = document.getElementById('search-rates');
    const ratesBody = document.getElementById('rates-body');

    // Recent Conversions Elements
    const historyList = document.getElementById('history-list');
    const clearHistoryBtn = document.getElementById('clear-history-btn');

    // Formatters
    const formatNumber = (num, minDec = 2, maxDec = 2) => {
        if (!Number.isFinite(num)) return '0.00';
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: minDec,
            maximumFractionDigits: maxDec
        }).format(num);
    };

    const timeAgo = (dateInput) => {
        const date = new Date(dateInput);
        const seconds = Math.floor((new Date() - date) / 1000);
        if (seconds < 45) return 'Just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    // --- App Initialization ---
    async function init() {
        checkHealth();
        await loadCurrencies();

        setupDropdown('from', state.fromCurrency, (code) => {
            state.fromCurrency = code;
            updateBanknotes(parseFloat(amountInput.value) || 100, state.fromCurrency, state.lastConvertedAmount, state.toCurrency);
            convert(false);
        });
        setupDropdown('to', state.toCurrency, (code) => {
            state.toCurrency = code;
            convert(false);
        });
        setupDropdown('base', state.baseCurrency, (code) => {
            state.baseCurrency = code;
            loadGlobalRates();
        });

        setupEventListeners();
        await loadGlobalRates();
        await loadHistory();

        // Initialize National Bank Card
        updateBanknotes(parseFloat(amountInput.value) || 100, state.fromCurrency, null, state.toCurrency);
    }

    // --- Health Check ---
    async function checkHealth() {
        try {
            const res = await fetch('/api/health');
            if (res.ok) {
                networkStatus.textContent = 'Connected';
                networkStatus.classList.remove('offline');
            } else {
                networkStatus.textContent = 'Connected';
                networkStatus.classList.remove('offline');
            }
        } catch {
            networkStatus.textContent = 'Offline';
            networkStatus.classList.add('offline');
        }
    }

    // --- Currency Catalog ---
    async function loadCurrencies() {
        try {
            const res = await fetch('/api/currencies');
            if (!res.ok) throw new Error('Failed to load currencies');
            const data = await res.json();
            state.currencies = data.currencies || [];
        } catch (err) {
            console.warn('Currency catalog error:', err);
            state.currencies = [
                { code: 'USD', name: 'United States Dollar' },
                { code: 'INR', name: 'Indian Rupee' },
                { code: 'EUR', name: 'Eurozone Euro' },
                { code: 'GBP', name: 'British Pound' },
                { code: 'JPY', name: 'Japanese Yen' },
                { code: 'CAD', name: 'Canadian Dollar' },
                { code: 'AUD', name: 'Australian Dollar' },
                { code: 'CHF', name: 'Swiss Franc' },
                { code: 'AED', name: 'UAE Dirham' },
                { code: 'SGD', name: 'Singapore Dollar' },
                { code: 'CNY', name: 'Chinese Yuan' }
            ];
        }
    }

    function getCurrencyName(code) {
        const item = state.currencies.find(c => c.code === code);
        if (item) return item.name;
        if (currencyMeta[code]) return currencyMeta[code].name;
        return code;
    }

    // --- Custom Dropdown Component ---
    function setupDropdown(type, initialCode, onSelect) {
        const container = document.getElementById(`dropdown-${type}`);
        if (!container) return;

        const toggleBtn = container.querySelector('.dropdown-toggle');
        const selectedSpan = container.querySelector('.dropdown-selected');
        const searchInput = container.querySelector('.dropdown-search');
        const listUl = container.querySelector('.dropdown-list');

        function updateSelectedUI(code) {
            const sym = getCurrencySymbol(code);
            const sub = getCurrencySub(code);
            const name = getCurrencyName(code);

            if (type === 'base') {
                selectedSpan.innerHTML = `<span class="base-flag">${getFlag(code)}</span> <strong>${code}</strong>`;
            } else {
                selectedSpan.innerHTML = `
                    <span class="currency-symbol-badge">${sym}</span>
                    <span class="currency-code-text">${code}</span>
                    <span class="currency-sub-text">${sub}</span>
                    <span class="currency-name-text">${name}</span>
                `;
            }
        }

        function renderList(query = '') {
            const q = query.toLowerCase().trim();
            const filtered = state.currencies.filter(c => 
                c.code.toLowerCase().includes(q) || (c.name && c.name.toLowerCase().includes(q))
            );

            listUl.innerHTML = '';
            filtered.forEach(c => {
                const li = document.createElement('li');
                li.className = 'dropdown-item';
                const currentCode = type === 'from' ? state.fromCurrency : (type === 'to' ? state.toCurrency : state.baseCurrency);
                if (c.code === currentCode) li.classList.add('active');

                li.innerHTML = `
                    <span class="dropdown-item-symbol">${getCurrencySymbol(c.code)}</span>
                    <span class="dropdown-item-code">${c.code}</span>
                    <span class="dropdown-item-name">${c.name}</span>
                `;
                li.addEventListener('click', (e) => {
                    e.stopPropagation();
                    container.classList.remove('open');
                    toggleBtn.setAttribute('aria-expanded', 'false');
                    updateSelectedUI(c.code);
                    onSelect(c.code);
                });
                listUl.appendChild(li);
            });
        }

        updateSelectedUI(initialCode);
        renderList();

        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = container.classList.contains('open');
            document.querySelectorAll('.custom-dropdown').forEach(d => {
                if (d !== container) d.classList.remove('open');
            });
            if (isOpen) {
                container.classList.remove('open');
                toggleBtn.setAttribute('aria-expanded', 'false');
            } else {
                container.classList.add('open');
                toggleBtn.setAttribute('aria-expanded', 'true');
                if (searchInput) {
                    searchInput.value = '';
                    renderList();
                    setTimeout(() => searchInput.focus(), 50);
                }
            }
        });

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                renderList(e.target.value);
            });
            searchInput.addEventListener('click', (e) => e.stopPropagation());
        }

        container.updateSelection = (code) => {
            updateSelectedUI(code);
            renderList();
        };
    }

    // Close dropdowns on outside click
    document.addEventListener('click', () => {
        document.querySelectorAll('.custom-dropdown').forEach(d => {
            d.classList.remove('open');
            const btn = d.querySelector('.dropdown-toggle');
            if (btn) btn.setAttribute('aria-expanded', 'false');
        });
    });

    function resetConvertBtn() {
        if (!convertBtn) return;
        convertBtn.disabled = false;
        convertBtn.classList.remove('loading');
        convertBtn.textContent = 'Convert';
    }

    // --- Conversion Logic ---
    async function convert(isManualClick = false) {
        const rawAmount = parseFloat(amountInput.value);
        if (isNaN(rawAmount) || rawAmount <= 0) {
            if (isManualClick) {
                amountInput.classList.add('input-error');
                amountInput.focus();
                setTimeout(() => amountInput.classList.remove('input-error'), 1200);
            }
            return;
        }

        if (state.isConverting) {
            state.pendingConversion = true;
            return;
        }
        state.isConverting = true;

        if (isManualClick && convertBtn) {
            convertBtn.disabled = true;
            convertBtn.classList.add('loading');
            convertBtn.textContent = 'Converting...';
        }

        const amount = rawAmount;
        const from = state.fromCurrency;
        const to = state.toCurrency;

        try {
            const res = await fetch(`/api/rate?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
            if (!res.ok) throw new Error('Exchange rate unavailable');
            const data = await res.json();

            const rate = data.rate;
            const result = amount * rate;
            state.lastConvertedAmount = result;
            const isCached = data.isCached || false;
            const dateStr = data.date || '';

            // Update Left Result Area
            conversionDetails.innerHTML = `
                <div class="conversion-result-card">
                    <div class="conversion-header">${formatNumber(amount, 2, 2)} ${from} =</div>
                    <div class="conversion-value-row">
                        <div class="conversion-main-amount">
                            ${formatNumber(result, 2, 4)} <span class="to-code">${to}</span>
                        </div>
                        <div class="conversion-subtext">1 ${from} = ${formatNumber(rate, 4, 6)} ${to}</div>
                    </div>
                    <div class="conversion-meta">
                        <span>${dateStr ? `Rates effective ${dateStr}` : 'Live rate verified'}</span>
                        <span class="conversion-meta-badge">${isCached ? 'Offline Cache' : 'Live'}</span>
                    </div>
                </div>
            `;

            // Update Green National Bank Card Visuals
            updateBanknotes(amount, from, result, to);

            // Record Conversion in MongoDB Atlas
            saveConversion(amount, from, result, to, rate);

            if (isManualClick && convertBtn) {
                convertBtn.textContent = 'Convert';
                setTimeout(() => {
                    resetConvertBtn();
                }, 400);
            }

        } catch (err) {
            console.error('Conversion failed:', err);
            conversionDetails.innerHTML = `
                <div class="conversion-empty">
                    <p style="color: #f87171;">Conversion temporarily unavailable for ${from} to ${to}. Please try again.</p>
                </div>
            `;
            resetConvertBtn();
        } finally {
            state.isConverting = false;
            if (!isManualClick) {
                resetConvertBtn();
            }
            if (state.pendingConversion) {
                state.pendingConversion = false;
                convert(false);
            }
        }
    }

    function updateBanknotes(fromAmount, fromCode, toAmount, toCode) {
        // Front Note (From Currency)
        if (noteFrontAmount) noteFrontAmount.textContent = formatNumber(fromAmount, 2, 2);
        if (noteFrontCode) noteFrontCode.textContent = fromCode;
        if (noteFrontCountry) noteFrontCountry.textContent = getCountryName(fromCode);
        if (noteFrontBank) noteFrontBank.textContent = 'NATIONAL BANK';
        if (noteFrontSymbol) noteFrontSymbol.textContent = getCurrencySymbol(fromCode);

        // Back Note (To Currency)
        const displayToAmount = toAmount !== null ? toAmount : (fromAmount * 96.14); // sensible initial or calculated
        if (noteBackAmount) noteBackAmount.textContent = formatNumber(displayToAmount, 2, 2);
        if (noteBackCode) noteBackCode.textContent = toCode;
        if (noteBackCountry) noteBackCountry.textContent = getCountryName(toCode);
        if (noteBackBank) noteBackBank.textContent = 'NATIONAL BANK';
        if (noteBackSymbol) noteBackSymbol.textContent = getCurrencySymbol(toCode);
    }

    // --- Save to MongoDB Atlas History ---
    async function saveConversion(fromAmount, fromCode, toAmount, toCode, rate) {
        try {
            await fetch('/api/conversions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fromAmount,
                    fromCode,
                    toAmount,
                    toCode,
                    rate
                })
            });
            await loadHistory();
        } catch (e) {
            console.warn('Could not record conversion to history:', e);
        }
    }

    // --- Load Recent Conversions ---
    async function loadHistory() {
        try {
            const res = await fetch('/api/conversions?limit=8');
            if (!res.ok) return;
            const data = await res.json();
            const list = data.conversions || [];

            if (list.length === 0) {
                historyList.innerHTML = `
                    <li class="history-empty">No conversions yet. Make a conversion above!</li>
                `;
                return;
            }

            historyList.innerHTML = '';
            list.forEach(item => {
                const li = document.createElement('li');
                li.className = 'history-item';
                li.innerHTML = `
                    <div class="history-info">
                        <span class="history-pair">${formatNumber(item.fromAmount, 0, 2)} ${item.fromCode} → ${formatNumber(item.toAmount, 2, 2)} ${item.toCode}</span>
                        <span class="history-sub">1 ${item.fromCode} = ${formatNumber(item.rate, 4, 4)} ${item.toCode}</span>
                    </div>
                    <span class="history-time">${timeAgo(item.timestamp)}</span>
                `;
                li.addEventListener('click', () => {
                    amountInput.value = item.fromAmount;
                    updateQuickBtns(item.fromAmount);
                    setCurrencyPair(item.fromCode, item.toCode);
                });
                historyList.appendChild(li);
            });
        } catch (err) {
            console.warn('Failed to load history:', err);
        }
    }

    function setCurrencyPair(from, to) {
        state.fromCurrency = from;
        state.toCurrency = to;

        const fromDd = document.getElementById('dropdown-from');
        if (fromDd && fromDd.updateSelection) fromDd.updateSelection(from);

        const toDd = document.getElementById('dropdown-to');
        if (toDd && toDd.updateSelection) toDd.updateSelection(to);

        convert(true);
    }

    // --- Global Rates Table ---
    async function loadGlobalRates() {
        try {
            ratesBody.innerHTML = `
                <tr>
                    <td colspan="2" style="text-align:center; padding:2rem; color:var(--text-muted);">
                        Loading exchange rates for ${state.baseCurrency}...
                    </td>
                </tr>
            `;

            const res = await fetch(`/api/rates?base=${encodeURIComponent(state.baseCurrency)}`);
            if (!res.ok) throw new Error('Rates unavailable');
            const data = await res.json();
            state.rates = data.rates || {};

            renderRatesTable();
        } catch (err) {
            console.warn('Failed to load rates table:', err);
            ratesBody.innerHTML = `
                <tr>
                    <td colspan="2" style="text-align:center; padding:2rem; color:#f87171;">
                        Could not load rates for ${state.baseCurrency}.
                    </td>
                </tr>
            `;
        }
    }

    function renderRatesTable() {
        const query = (searchRates.value || '').toLowerCase().trim();
        const entries = Object.entries(state.rates);

        const filtered = entries.filter(([code]) => {
            const name = getCurrencyName(code).toLowerCase();
            return code.toLowerCase().includes(query) || name.includes(query);
        });

        if (filtered.length === 0) {
            ratesBody.innerHTML = `
                <tr>
                    <td colspan="2" style="text-align:center; padding:2rem; color:var(--text-muted);">
                        No currencies match "${query}"
                    </td>
                </tr>
            `;
            return;
        }

        ratesBody.innerHTML = '';
        filtered.forEach(([code, rate]) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div class="rate-cell-currency">
                        <span class="rate-symbol-badge">${getCurrencySymbol(code)}</span>
                        <div>
                            <span class="rate-cell-code">${code}</span>
                            <span class="rate-cell-name"> · ${getCurrencyName(code)}</span>
                        </div>
                    </div>
                </td>
                <td class="text-right">
                    <span class="rate-cell-val">${formatNumber(rate, 2, 4)}</span>
                </td>
            `;

            tr.addEventListener('click', () => {
                state.toCurrency = code;
                const toDd = document.getElementById('dropdown-to');
                if (toDd && toDd.updateSelection) toDd.updateSelection(code);
                convert(true);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });

            ratesBody.appendChild(tr);
        });
    }

    function updateQuickBtns(val) {
        quickBtns.forEach(btn => {
            if (btn.getAttribute('data-val') === String(val)) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    // --- Event Listeners ---
    function setupEventListeners() {
        // Amount input
        let debounceTimer = null;
        amountInput.addEventListener('input', () => {
            amountInput.classList.remove('input-error');
            const val = parseFloat(amountInput.value);
            updateQuickBtns(val);
            if (noteFrontAmount) {
                noteFrontAmount.textContent = formatNumber(val || 0, 2, 2);
            }
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                convert(false);
            }, 450);
        });

        amountInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                clearTimeout(debounceTimer);
                convert(true);
            }
        });

        // Quick amount buttons
        quickBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                clearTimeout(debounceTimer);
                const val = btn.getAttribute('data-val');
                amountInput.value = val;
                amountInput.classList.remove('input-error');
                updateQuickBtns(val);
                if (noteFrontAmount) {
                    noteFrontAmount.textContent = formatNumber(parseFloat(val) || 0, 2, 2);
                }
                convert(true);
            });
        });

        // Convert button
        convertBtn.addEventListener('click', () => {
            clearTimeout(debounceTimer);
            convert(true);
        });

        // Swap button
        swapBtn.addEventListener('click', () => {
            clearTimeout(debounceTimer);
            const temp = state.fromCurrency;
            state.fromCurrency = state.toCurrency;
            state.toCurrency = temp;

            const fromDd = document.getElementById('dropdown-from');
            if (fromDd && fromDd.updateSelection) fromDd.updateSelection(state.fromCurrency);

            const toDd = document.getElementById('dropdown-to');
            if (toDd && toDd.updateSelection) toDd.updateSelection(state.toCurrency);

            noteWrapper.classList.toggle('flipped');
            convert(true);
        });

        // Interactive 3D Note Flip
        noteWrapper.addEventListener('click', () => {
            noteWrapper.classList.toggle('flipped');
        });

        if (flipHint) {
            flipHint.addEventListener('click', () => {
                noteWrapper.classList.toggle('flipped');
            });
        }

        // Global Rates Search
        searchRates.addEventListener('input', () => {
            renderRatesTable();
        });

        // Clear History Button
        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', async () => {
                try {
                    await fetch('/api/conversions', { method: 'DELETE' });
                    historyList.innerHTML = '<li class="history-empty">Conversion history cleared.</li>';
                } catch (e) {
                    console.warn('Failed to clear history:', e);
                }
            });
        }
    }

    // Start
    init();
});

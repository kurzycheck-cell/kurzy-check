// ===================================================================
// Globálne premenné a API konfigurácia
// ===================================================================

const FIAT_API = 'https://api.frankfurter.app/latest?from=EUR';
// Rozšírený zoznam kryptomien pre CoinGecko
const CRYPTO_API = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,cardano,solana,polkadot,dogecoin,binancecoin,ripple,litecoin&vs_currencies=eur';

let ratesData = {
    fiat: {},
    crypto: {},
    stocks: {} // Pre akcie použijeme simulované dáta kvôli obmedzeniam bezplatného API
};
let assetNames = {}; // Preklad symbolov na plné mená

let activeAsset = 'fiat'; // Aktuálne aktívna záložka
let detailUpdateInterval; // Premenná pre interval 5-sekundovej aktualizácie
let priceChart; // Premenná pre inštanciu Chart.js


// ===================================================================
// Funkcie na získavanie dát (Rozšírené verzie)
// ===================================================================

async function fetchAllData() {
    // 1. Meny (Fiat)
    try {
        const fiatResponse = await fetch(FIAT_API);
        const fiatData = await fiatResponse.json();
        ratesData.fiat = fiatData.rates;
        ratesData.fiat.EUR = 1; // Pridanie EUR ako základ
        updateFiatNames(fiatData.rates);
    } catch (e) { console.error("Chyba pri načítaní mien:", e); }

    // 2. Krypto
    try {
        const cryptoResponse = await fetch(CRYPTO_API);
        const cryptoData = await cryptoResponse.json();
        ratesData.crypto = parseCryptoData(cryptoData);
        updateCryptoNames(cryptoData);
    } catch (e) { console.error("Chyba pri načítaní krypta:", e); }

    // 3. Akcie (Simulácia)
    simulateStockData();

    // 4. Aktualizácia zobrazenia
    renderActiveTable();
    updateCalculatorOptions();
}

function updateFiatNames(rates) {
    // Rozšírený zoznam mien a ich prekladov
    const knownNames = { 
        'USD': 'Americký Dolár', 
        'CZK': 'Česká Koruna', 
        'PLN': 'Poľský Zlotý', 
        'GBP': 'Britská Libra', 
        'CHF': 'Švajčiarsky Frank', 
        'EUR': 'Euro',
        'CAD': 'Kanadský Dolár',
        'AUD': 'Austrálsky Dolár',
        'JPY': 'Japonský Jen',
        'NOK': 'Nórska Koruna',
        'SEK': 'Švédska Koruna',
        'HUF': 'Maďarský Forint'
    };
    for (const symbol in rates) {
        assetNames[symbol] = knownNames[symbol] || symbol;
    }
}

function updateCryptoNames(data) {
    // Rozšírený zoznam krypto mien a ich prekladov
    const knownNames = { 
        'bitcoin': 'Bitcoin', 
        'ethereum': 'Ethereum', 
        'cardano': 'Cardano', 
        'solana': 'Solana', 
        'polkadot': 'Polkadot', 
        'dogecoin': 'Dogecoin',
        'binancecoin': 'Binance Coin (BNB)',
        'ripple': 'Ripple (XRP)',
        'litecoin': 'Litecoin (LTC)'
    };
    for (const id in data) {
        const symbol = id.toUpperCase().substring(0, 5); // Zjednodušený symbol
        assetNames[symbol] = knownNames[id] || id;
    }
}

function parseCryptoData(data) {
    const parsed = {};
    for (const id in data) {
        const symbol = id.toUpperCase().substring(0, 5);
        parsed[symbol] = data[id].eur;
    }
    return parsed;
}

function simulateStockData() {
    // Rozšírený zoznam akcií a ich simulácia
    const stockSymbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'AMZN', 'NFLX', 'VZ', 'BABA', 'SNE', 'KO'];
    ratesData.stocks = {};
    
    // Zjednodušený slovník názvov
    const stockNames = {
        'AAPL': 'Apple Inc.', 'MSFT': 'Microsoft Corp.', 'GOOGL': 'Alphabet (Google)', 
        'TSLA': 'Tesla', 'AMZN': 'Amazon.com', 'NFLX': 'Netflix',
        'VZ': 'Verizon', 'BABA': 'Alibaba Group', 'SNE': 'Sony Group Corp.', 
        'KO': 'Coca-Cola Co.'
    };
    
    stockSymbols.forEach(symbol => {
        // Simulujeme cenu medzi 100 a 300 USD
        const price = (Math.random() * 200 + 100);
        ratesData.stocks[symbol] = price;
        assetNames[symbol] = stockNames[symbol] || symbol;
    });
}


// ===================================================================
// Funkcie pre vizualizáciu
// ===================================================================

function renderActiveTable() {
    const tableBody = document.getElementById(activeAsset + 'TableBody');
    tableBody.innerHTML = '';
    const currentRates = ratesData[activeAsset];

    // Akcie a meny majú rôzne symboly a základ
    let currencySymbol = activeAsset === 'stocks' ? 'USD' : 'EUR';

    for (const symbol in currentRates) {
        const name = assetNames[symbol] || symbol;
        const rate = currentRates[symbol];
        
        // Zabezpečí, že riadky sú klikateľné a nesú dáta
        const row = `
            <tr onclick="showDetail('${symbol}', '${activeAsset}')">
                <td>${symbol}</td>
                <td>${name}</td>
                <td>${rate.toFixed(activeAsset === 'crypto' ? 2 : 4)} ${currencySymbol}</td>
            </tr>
        `;
        tableBody.innerHTML += row;
    }
}

function updateCalculatorOptions() {
    const select = document.getElementById('targetCurrency');
    select.innerHTML = ''; // Vyčistenie starých
    
    // Predvolené meny na konverziu (rozšírené)
    const targetSymbols = ['USD', 'CZK', 'PLN', 'GBP', 'CHF', 'CAD', 'JPY'];
    targetSymbols.forEach(symbol => {
        const name = assetNames[symbol] || symbol;
        const option = document.createElement('option');
        option.value = symbol;
        option.textContent = `${symbol} - ${name}`;
        select.appendChild(option);
    });
    
    // Spustenie prvého prepočtu
    calculate();
}


// ===================================================================
// Funkcie pre funkcionalitu (Kalkulačka, Toggling, Graf)
// ===================================================================

// Funkcia prepínania záložiek
function showAssetClass(assetType) {
    activeAsset = assetType;
    
    // Aktualizácia stavu tlačidiel
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.tab-button[data-asset="${assetType}"]`).classList.add('active');
    
    // Zobrazenie správnej tabuľky
    document.querySelectorAll('.rates-table-view').forEach(view => view.classList.add('hidden'));
    document.getElementById(assetType + 'Rates').classList.remove('hidden');

    // Renderovanie dát pre novú záložku
    renderActiveTable();
    
    // Skrytie detailu pri prepínaní
    document.getElementById('detailSection').classList.add('hidden');
    clearInterval(detailUpdateInterval); // Zastavenie 5-sekundovej aktualizácie
}


// Funkcia pre kalkulačku (volaná z index.html)
function calculate() {
    const inputAmount = parseFloat(document.getElementById('inputAmount').value);
    const targetCurrency = document.getElementById('targetCurrency').value;
    const resultElement = document.getElementById('conversionResult');

    if (isNaN(inputAmount) || inputAmount <= 0) {
        resultElement.textContent = "Zadajte platnú sumu v EUR.";
        return;
    }
    
    // Kurzy berieme z FIAT dát
    const rate = ratesData.fiat[targetCurrency];
    
    if (rate) {
        const convertedAmount = inputAmount * rate;
        resultElement.textContent = `Výsledok: ${convertedAmount.toFixed(2)} ${targetCurrency}`;
    } else {
        resultElement.textContent = "Kurz nie je k dispozícii.";
    }
}


// Funkcia pre zobrazenie detailu (kliknutie na riadok)
function showDetail(symbol, type) {
    const detailSection = document.getElementById('detailSection');
    const title = assetNames[symbol];
    const unit = type === 'stocks' ? 'USD' : 'EUR';
    
    document.getElementById('detailTitle').textContent = `Detail: ${title} (${symbol})`;
    detailSection.classList.remove('hidden');

    // Zastavenie predošlého intervalu a spustenie nového 5-sekundového
    clearInterval(detailUpdateInterval);
    startDetailUpdate(symbol, type, unit);

    // Inicializácia/aktualizácia grafu
    renderChart(symbol, type);
}


// Real-Time 5-sekundová aktualizácia (len detail)
function startDetailUpdate(symbol, type, unit) {
    // Vnorená funkcia na získanie aktuálnej ceny (pretože API volanie sa líši)
    const updatePrice = async () => {
        let price = null;

        if (type === 'fiat') {
            const response = await fetch(`https://api.frankfurter.app/latest?from=EUR&to=${symbol}`);
            const data = await response.json();
            price = data.rates[symbol];
        } else if (type === 'crypto') {
            const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${assetNames[symbol].toLowerCase().split('(')[0].trim()}&vs_currencies=eur`);
            const data = await response.json();
            // Upravená logika pre extrahovanie ceny z CoinGecko
            const id = assetNames[symbol].toLowerCase().split('(')[0].trim().replace(/\s/g, ''); 
            price = data[id] ? data[id].eur : null;
            
        } else if (type === 'stocks') {
            // Pre akcie musíme použiť simuláciu
            simulateStockData(); // Aktualizujeme simulované dáta
            price = ratesData.stocks[symbol];
        }

        if (price) {
            document.getElementById('currentDetailPrice').textContent = `${price.toFixed(type === 'crypto' ? 2 : 4)} ${unit}`;
        }
    };

    // Spustiť okamžite a potom každých 5 sekúnd
    updatePrice();
    detailUpdateInterval = setInterval(updatePrice, 5000); 
}


// Funkcia pre vizualizáciu grafu (používa Chart.js)
function renderChart(symbol, type) {
    // Simulujeme historické dáta pre ukážku grafu
    const labels = ['Dnes -3h', 'Dnes -2h', 'Dnes -1h', 'Aktuálne'];
    const simulatedData = [
        ratesData[type][symbol] * 0.99,
        ratesData[type][symbol] * 1.01,
        ratesData[type][symbol] * 0.985,
        ratesData[type][symbol]
    ];
    const unit = type === 'stocks' ? 'USD' : 'EUR';

    const ctx = document.getElementById('priceChart').getContext('2d');
    
    // Ak graf už existuje, zničíme ho, aby sme vytvorili nový
    if (priceChart) {
        priceChart.destroy();
    }

    priceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `Cena ${symbol} (${unit})`,
                data: simulatedData,
                borderColor: '#dc3545', // Červená akcentová farba
                backgroundColor: 'rgba(220, 53, 69, 0.1)',
                fill: true,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: false,
                    title: { display: true, text: `Cena v ${unit}` }
                }
            }
        }
    });
}


// ===================================================================
// Inicializácia a cyklická aktualizácia
// ===================================================================

// Načíta dáta hneď po spustení
fetchAllData();

// Nastaví aktualizáciu všetkých hlavných tabuliek (Meny, Krypto, Akcie) každú minútu (60 sekúnd).
// Tým zabezpečíme real-time pocit bez prekročenia limitov bezplatných API!
const MAIN_UPDATE_INTERVAL = 60000; // 60 000 ms = 1 minúta
setInterval(fetchAllData, MAIN_UPDATE_INTERVAL); 

// Zabezpečenie, že po načítaní stránky je zobrazená správna záložka
document.addEventListener('DOMContentLoaded', () => {
    // Nastaví funkciu prepínania na počiatočný stav
    showAssetClass('fiat'); 
});

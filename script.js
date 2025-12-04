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
// Funkcie na získavanie dát
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
    updateCalculatorOptions(); // Zavolanie funkcie na aktualizáciu roliet
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

    let currencySymbol = activeAsset === 'stocks' ? 'USD' : 'EUR';

    for (const symbol in currentRates) {
        const name = assetNames[symbol] || symbol;
        const rate = currentRates[symbol];
        
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

// NOVÁ FUNKCIA: Načítanie všetkých aktív pre roletky
function getAllAssetsForSelect() {
    const allAssets = [];
    
    // 1. Meny (Fiat)
    for (const symbol in ratesData.fiat) {
        // Kurz EUR je 1, ale nechceme ho prepočítavať z 1/X
        if (symbol !== 'EUR') {
            allAssets.push({ symbol: symbol, name: assetNames[symbol], type: 'Fiat' });
        }
    }
    // Pridáme EUR samostatne
    allAssets.push({ symbol: 'EUR', name: assetNames['EUR'], type: 'Fiat' });

    // 2. Kryptomeny
    for (const symbol in ratesData.crypto) {
        allAssets.push({ symbol: symbol, name: assetNames[symbol], type: 'Krypto' });
    }
    // 3. Akcie (Simulované)
    for (const symbol in ratesData.stocks) {
        allAssets.push({ symbol: symbol, name: assetNames[symbol], type: 'Akcie' });
    }

    // Abecedné zoradenie pre profesionálny vzhľad
    return allAssets.sort((a, b) => a.name.localeCompare(b.name));
}

// UPRAVENÁ FUNKCIA: Aktualizácia univerzálnych roletiek
function updateCalculatorOptions() {
    const fromSelect = document.getElementById('fromAsset');
    const toSelect = document.getElementById('toAsset');
    
    // Ak HTML prvky neexistujú (napr. chyba pri načítaní), ukončíme
    if (!fromSelect || !toSelect) return;

    // Vyčistenie starých hodnôt
    fromSelect.innerHTML = '';
    toSelect.innerHTML = '';

    const assets = getAllAssetsForSelect();
    
    // Vytvorenie roletiek
    assets.forEach(asset => {
        // Pridanie kategórie do názvu pre lepšiu prehľadnosť
        const optionText = `${asset.symbol} - ${asset.name} (${asset.type})`;

        const fromOption = document.createElement('option');
        fromOption.value = asset.symbol;
        fromOption.textContent = optionText;
        fromSelect.appendChild(fromOption);

        const toOption = document.createElement('option');
        toOption.value = asset.symbol;
        toOption.textContent = optionText;
        toSelect.appendChild(toOption);
    });

    // Nastavenie predvolených hodnôt (napr. EUR na USD)
    fromSelect.value = 'EUR';
    toSelect.value = 'USD';
    
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


// UPRAVENÁ FUNKCIA: Funkcia pre univerzálnu kalkulačku
function calculate() {
    const inputAmount = parseFloat(document.getElementById('inputAmount').value);
    const fromAsset = document.getElementById('fromAsset').value;
    const toAsset = document.getElementById('toAsset').value;
    const resultElement = document.getElementById('conversionResult');

    if (isNaN(inputAmount) || inputAmount <= 0) {
        resultElement.textContent = "Zadajte platnú sumu.";
        return;
    }
    
    // 1. Získanie jednotného kurzu Z aktíva voči EUR (1 jednotka FROM = X EUR)
    const getRateInEUR = (symbol) => {
        // Skúsime Fiat
        if (ratesData.fiat[symbol]) {
            // Frankuter API dáva 1 EUR = X meny, my chceme 1 mena = X EUR (okrem EUR, kde je kurz 1)
            return (symbol === 'EUR') ? 1 : 1 / ratesData.fiat[symbol];
        } 
        // Skúsime Crypto
        if (ratesData.crypto[symbol]) {
            // Krypto API dáva priamo 1 krypto = X EUR
            return ratesData.crypto[symbol];
        }
        // Skúsime Akcie (sú v USD, musíme prepočítať cez EUR/USD)
        if (ratesData.stocks[symbol] && ratesData.fiat['USD']) {
            const priceUSD = ratesData.stocks[symbol];
            const EUR_to_USD_Rate = ratesData.fiat['USD'];
            // 1 akcia (USD) / EUR/USD kurz = cena akcie v EUR
            return priceUSD / EUR_to_USD_Rate;
        }
        return 0;
    };
    
    const fromRateInEUR = getRateInEUR(fromAsset);
    const toRateInEUR = getRateInEUR(toAsset);

    if (fromRateInEUR === 0 || toRateInEUR === 0) {
        resultElement.textContent = `Kurz pre ${fromAsset} alebo ${toAsset} nie je k dispozícii.`;
        return;
    }
    
    // === VÝPOČET ===
    
    // 1. Prevod vstupnej sumy na základnú menu (EUR):
    const amountInEUR = inputAmount * fromRateInEUR;
    
    // 2. Prevod z EUR na cieľové aktívum:
    const convertedAmount = amountInEUR / toRateInEUR;
    
    // === VÝSLEDNÝ TEXT ===
    
    const toAssetName = assetNames[toAsset] || toAsset;
    
    resultElement.textContent = `Výsledok: ${convertedAmount.toFixed(4)} ${toAsset} (${toAssetName})`;
}

// NOVÁ FUNKCIA: Prehodenie Z a NA
function swapAssets() {
    const fromSelect = document.getElementById('fromAsset');
    const toSelect = document.getElementById('toAsset');
    
    const tempValue = fromSelect.value;
    fromSelect.value = toSelect.value;
    toSelect.value = tempValue;
    
    // Po prehodení opäť prepočítame
    calculate();
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
    const updatePrice = async () => {
        let price = null;

        if (type === 'fiat') {
            const response = await fetch(`https://api.frankfurter.app/latest?from=EUR&to=${symbol}`);
            const data = await response.json();
            price = data.rates[symbol];
        } else if (type === 'crypto') {
            // Upravená logika pre extrahovanie ID krypto
            const assetName = assetNames[symbol].toLowerCase().split('(')[0].trim();
            const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${assetName}&vs_currencies=eur`);
            const data = await response.json();
            
            const id = Object.keys(data)[0]; // Získa ID, ktoré CoinGecko vrátilo
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
const MAIN_UPDATE_INTERVAL = 60000; // 60 000 ms = 1 minúta
setInterval(fetchAllData, MAIN_UPDATE_INTERVAL); 

// Zabezpečenie, že po načítaní stránky je zobrazená správna záložka
document.addEventListener('DOMContentLoaded', () => {
    // Nastaví funkciu prepínania na počiatočný stav
    showAssetClass('fiat'); 
});

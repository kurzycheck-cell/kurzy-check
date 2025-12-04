// KROK 1: Definícia API a cieľových mien
const API_URL = 'https://api.frankfurter.app/latest?from=EUR';
const TARGET_CURRENCIES = ['USD', 'CZK', 'PLN', 'GBP', 'CHF'];
let exchangeRates = {}; // Globálna premenná na uloženie aktuálnych kurzov

// KROK 2: Funkcia na načítanie dát
async function fetchRates() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        
        // Uloženie len dôležitých kurzov
        exchangeRates = data.rates; 

        // KROK 3: Aktualizácia tabuľky
        updateRatesTable();

    } catch (error) {
        console.error("Chyba pri načítaní kurzov:", error);
        document.getElementById('ratesTableBody').innerHTML = 
            '<tr><td colspan="3" style="color: red;">Chyba pri načítaní dát. Skúste neskôr.</td></tr>';
    }
}

// KROK 4: Funkcia na aktualizáciu tabuľky
function updateRatesTable() {
    const tableBody = document.getElementById('ratesTableBody');
    tableBody.innerHTML = ''; // Vyčistenie starých dát

    TARGET_CURRENCIES.forEach(currency => {
        const rate = exchangeRates[currency];
        if (rate) {
            const row = `
                <tr>
                    <td>${currency}</td>
                    <td>${getCurrencyName(currency)}</td>
                    <td>${rate.toFixed(4)}</td>
                </tr>
            `;
            tableBody.innerHTML += row;
        }
    });

    // Spustenie automatického prepočtu pri načítaní
    calculate();
}

// Pomocná funkcia na získanie celého názvu meny
function getCurrencyName(code) {
    const names = {
        'USD': 'Americký dolár',
        'CZK': 'Česká koruna',
        'PLN': 'Poľský zlotý',
        'GBP': 'Britská libra',
        'CHF': 'Švajčiarsky frank'
    };
    return names[code] || 'Neznáma mena';
}

// KROK 5: Funkcia pre kalkulačku
function calculate() {
    const inputAmount = parseFloat(document.getElementById('inputAmount').value);
    const targetCurrency = document.getElementById('targetCurrency').value;
    const resultElement = document.getElementById('conversionResult');

    if (isNaN(inputAmount) || inputAmount <= 0) {
        resultElement.textContent = "Zadajte platnú sumu.";
        return;
    }

    const rate = exchangeRates[targetCurrency];
    
    if (rate) {
        const convertedAmount = inputAmount * rate;
        resultElement.textContent = `Výsledok: ${convertedAmount.toFixed(2)} ${targetCurrency}`;
    } else {
        resultElement.textContent = "Kurz nie je k dispozícii.";
    }
}

// Spustenie všetkého pri načítaní stránky
fetchRates();

// Nastavenie automatickej aktualizácie (napr. každú hodinu)
setInterval(fetchRates, 3600000); // 3 600 000 ms = 1 hodina (pretože kurzy sa nemenia každú sekundu)

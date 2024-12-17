// 初始化 Solana 连接
const connection = new solanaWeb3.Connection('https://sleek-wispy-valley.SOLANA_MAINNET.quiknode.pro/f4518761755c013f2f7dea60584bead5b8a1c796');

let wallets = [];

async function addWallet() {
    const address = document.getElementById('walletAddress').value;
    const note = document.getElementById('walletNote').value;
    
    if (!address) {
        alert('请输入钱包地址');
        return;
    }

    try {
        // 验证钱包地址是否有效
        const pubKey = new solanaWeb3.PublicKey(address);
        
        wallets.push({
            address: address,
            note: note,
            selected: true
        });

        updateWalletList();
        clearInputs();
    } catch (error) {
        alert('无效的钱包地址');
    }
}

function clearInputs() {
    document.getElementById('walletAddress').value = '';
    document.getElementById('walletNote').value = '';
}

function updateWalletList() {
    const walletList = document.getElementById('walletList');
    walletList.innerHTML = '';

    wallets.forEach((wallet, index) => {
        const walletItem = document.createElement('div');
        walletItem.className = 'wallet-item';
        walletItem.innerHTML = `
            <input type="checkbox" ${wallet.selected ? 'checked' : ''} 
                onchange="toggleWallet(${index})">
            <span>${wallet.address}</span>
            ${wallet.note ? `<span>(${wallet.note})</span>` : ''}
            <button class="remove-btn" onclick="removeWallet(${index})">删除</button>
        `;
        walletList.appendChild(walletItem);
    });
}

function toggleWallet(index) {
    wallets[index].selected = !wallets[index].selected;
}

function removeWallet(index) {
    wallets.splice(index, 1);
    updateWalletList();
}

async function findCommonTokens() {
    const selectedWallets = wallets.filter(w => w.selected);
    
    if (selectedWallets.length < 2) {
        alert('请至少选择两个钱包进行比较');
        return;
    }

    try {
        const tokenResults = document.getElementById('tokenResults');
        tokenResults.innerHTML = '<h2>正在加载...</h2>';

        // 获取每个钱包的代币账户
        const walletsTokens = await Promise.all(selectedWallets.map(async wallet => {
            const pubKey = new solanaWeb3.PublicKey(wallet.address);
            const tokens = await connection.getParsedTokenAccountsByOwner(pubKey, {
                programId: new solanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
            });
            return tokens.value.map(t => ({
                mint: t.account.data.parsed.info.mint,
                amount: t.account.data.parsed.info.tokenAmount.amount
            }));
        }));

        // 找出共同的代币
        const commonTokens = findCommonElements(walletsTokens);
        displayResults(commonTokens);
    } catch (error) {
        console.error('Error:', error);
        alert('获取代币信息时出错');
    }
}

function findCommonElements(arrays) {
    if (arrays.length === 0) return [];
    
    // 获取第一个钱包的所有代币mint地址
    const firstWalletTokens = new Set(arrays[0].map(t => t.mint));
    
    // 在其他钱包中查找共同的代币
    const commonTokens = new Set(
        [...firstWalletTokens].filter(mint => 
            arrays.every(walletTokens => 
                walletTokens.some(t => t.mint === mint)
            )
        )
    );
    
    return Array.from(commonTokens);
}

function displayResults(tokens) {
    const resultsDiv = document.getElementById('tokenResults');
    resultsDiv.innerHTML = '<h2>共同持有的代币：</h2>';

    if (tokens.length === 0) {
        resultsDiv.innerHTML += '<div class="token-item">没有找到共同持有的代币</div>';
        return;
    }

    tokens.forEach(tokenMint => {
        const tokenItem = document.createElement('div');
        tokenItem.className = 'token-item';
        tokenItem.innerHTML = `
            <strong>代币地址：</strong><br>
            ${tokenMint}
        `;
        resultsDiv.appendChild(tokenItem);
    });
}

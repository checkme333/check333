// 连接配置
const connection = new solanaWeb3.Connection(
    'https://sleek-wispy-valley.solana-mainnet.quiknode.pro/f4518761755c013f2f7dea60584bead5b8a1c796', // 你的完整 RPC URL
    {
        commitment: 'confirmed',
        httpHeaders: {
            'Authorization': `Bearer QN_598c7ef287fb46059bfb3185f3df0342`, // 你的 API KEY
            'Content-Type': 'application/json',
        }
    }
);

// 测试连接的函数
async function testConnection() {
    try {
        const slot = await connection.getSlot();
        console.log('连接成功！当前 slot:', slot);
        return true;
    } catch (error) {
        console.error('连接测试失败:', error);
        alert('RPC 连接失败，请检查配置');
        return false;
    }
}

let wallets = [];

// 错误处理函数
function showError(message) {
    alert(message);
    console.error(message);
}

// 加载状态函数
function showLoading(show) {
    const loadingDiv = document.getElementById('loading');
    if (show) {
        if (!loadingDiv) {
            const div = document.createElement('div');
            div.id = 'loading';
            div.className = 'loading';
            div.innerHTML = '加载中...';
            document.body.appendChild(div);
        }
    } else {
        if (loadingDiv) {
            loadingDiv.remove();
        }
    }
}

// 重试机制
async function retryOperation(operation, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await operation();
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
}

// 添加钱包
async function addWallet() {
    const address = document.getElementById('walletAddress').value;
    const note = document.getElementById('walletNote').value;
    
    if (!address) {
        showError('请输入钱包地址');
        return;
    }

    try {
        const pubKey = new solanaWeb3.PublicKey(address);
        
        // 验证地址是否存在
        await connection.getAccountInfo(pubKey);
        
        wallets.push({
            address: address,
            note: note,
            selected: true
        });

        updateWalletList();
        clearInputs();
    } catch (error) {
        showError('无效的钱包地址或网络错误，请检查地址是否正确');
        console.error('添加钱包错误:', error);
    }
}

// 更新钱包列表显示
function updateWalletList() {
    const walletList = document.getElementById('walletList');
    walletList.innerHTML = '';
    
    wallets.forEach((wallet, index) => {
        const div = document.createElement('div');
        div.className = 'wallet-item';
        div.innerHTML = `
            <input type="checkbox" ${wallet.selected ? 'checked' : ''} 
                   onchange="toggleWallet(${index})">
            <span>${wallet.address}</span>
            ${wallet.note ? `<span class="note">(${wallet.note})</span>` : ''}
            <button onclick="removeWallet(${index})">删除</button>
        `;
        walletList.appendChild(div);
    });
}

// 切换钱包选择状态
function toggleWallet(index) {
    wallets[index].selected = !wallets[index].selected;
    updateWalletList();
}

// 删除钱包
function removeWallet(index) {
    wallets.splice(index, 1);
    updateWalletList();
}

// 清空输入框
function clearInputs() {
    document.getElementById('walletAddress').value = '';
    document.getElementById('walletNote').value = '';
}

// 查找共同代币
async function findCommonTokens() {
    const selectedWallets = wallets.filter(w => w.selected);
    
    if (selectedWallets.length < 2) {
        showError('请至少选择两个钱包进行比较');
        return;
    }

    try {
        showLoading(true);
        const tokenResults = document.getElementById('tokenResults');
        tokenResults.innerHTML = '<h2>正在加载...</h2>';

        // 获取每个钱包的代币账户
        const walletsTokens = await Promise.all(selectedWallets.map(async wallet => {
            try {
                const pubKey = new solanaWeb3.PublicKey(wallet.address);
                const tokens = await retryOperation(() => 
                    connection.getParsedTokenAccountsByOwner(pubKey, {
                        programId: new solanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
                    })
                );
                return tokens.value.map(t => ({
                    mint: t.account.data.parsed.info.mint,
                    amount: t.account.data.parsed.info.tokenAmount.amount
                }));
            } catch (error) {
                console.error(`Error fetching tokens for wallet ${wallet.address}:`, error);
                return [];
            }
        }));

        // 找出共同代币
        const commonTokens = findCommonElements(walletsTokens);
        displayResults(commonTokens);
    } catch (error) {
        console.error('查找共同代币错误:', error);
        showError('获取代币信息时出错，请稍后重试');
    } finally {
        showLoading(false);
    }
}

// 查找共同元素
function findCommonElements(arrays) {
    if (arrays.length === 0) return [];
    
    // 创建一个 Map 来统计每个代币出现的次数
    const tokenCount = new Map();
    
    arrays.forEach(walletTokens => {
        // 获取这个钱包中独特的代币
        const uniqueTokens = new Set(walletTokens.map(t => t.mint));
        
        uniqueTokens.forEach(token => {
            tokenCount.set(token, (tokenCount.get(token) || 0) + 1);
        });
    });
    
    // 筛选出在所有钱包中都存在的代币
    const commonTokens = [];
    tokenCount.forEach((count, token) => {
        if (count === arrays.length) {
            commonTokens.push(token);
        }
    });
    
    return commonTokens;
}

// 显示结果
function displayResults(commonTokens) {
    const tokenResults = document.getElementById('tokenResults');
    
    if (commonTokens.length === 0) {
        tokenResults.innerHTML = '<p>未找到共同持有的代币</p>';
        return;
    }
    
    let html = '<h2>共同持有的代币</h2><ul>';
    commonTokens.forEach(token => {
        html += `<li>${token}</li>`;
    });
    html += '</ul>';
    
    tokenResults.innerHTML = html;
}

// 页面加载完成后测试连接
window.addEventListener('DOMContentLoaded', async () => {
    const isConnected = await testConnection();
    if (!isConnected) {
        document.getElementById('tokenResults').innerHTML = 
            '<div class="error">RPC 连接失败，请检查网络或配置</div>';
    }
});

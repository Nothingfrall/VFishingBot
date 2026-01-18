const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:3000' : window.location.origin;

const GameConfig = {
    fishes: [
        { id: 'shrimp', name: "Tiny Shrimp", coin: 5, rarity: "Common", icon: "cruelty_free", color: "text-gray-500" },
        { id: 'tetra', name: "Neon Tetra", coin: 10, rarity: "Common", icon: "blur_on", color: "text-cyan-400" },
        { id: 'gill', name: "Blue Gill", coin: 15, rarity: "Uncommon", icon: "water", color: "text-blue-400" },
        { id: 'mackerel', name: "Blue Mackerel", coin: 25, rarity: "Uncommon", icon: "phishing", color: "text-blue-600" },
        { id: 'trout', name: "Sunbeam Trout", coin: 35, rarity: "Uncommon", icon: "waves", color: "text-orange-400" },
        { id: 'tuna', name: "Silver Tuna", coin: 50, rarity: "Rare", icon: "set_meal", color: "text-gray-400" },
        { id: 'snapper', name: "Ruby Snapper", coin: 70, rarity: "Rare", icon: "restaurant", color: "text-red-500" },
        { id: 'carp', name: "Golden Carp", coin: 100, rarity: "Rare", icon: "star", color: "text-yellow-500" },
        { id: 'betta', name: "Moonlight Betta", coin: 200, rarity: "Epic", icon: "dark_mode", color: "text-purple-500" },
        { id: 'guppy', name: "Whimsical Guppy", coin: 300, rarity: "Legendary", icon: "bubble_chart", color: "text-pink-500" },
        { id: 'koi', name: "Legendary Koi", coin: 500, rarity: "Legendary", icon: "diamond", color: "text-amber-500" }
    ],
    rods: [
        { id: 'rod_bamboo', name: 'Old Bamboo', price: 0, power: 0, desc: "A humble beginning.", icon: "phishing", color: "text-amber-700" },
        { id: 'rod_fiberglass', name: 'Fiberglass Rod', price: 500, power: 10, desc: "Sturdier than bamboo. Great for lake fishing.", icon: "phishing", color: "text-blue-500" },
        { id: 'rod_carbon', name: 'Carbon Pro', price: 1200, power: 25, desc: "Lightweight and incredibly strong.", icon: "phishing", color: "text-gray-700 dark:text-gray-300" },
        { id: 'rod_titanium', name: 'Titanium Master', price: 5000, power: 50, desc: "The ultimate rod for deep sea monsters.", icon: "phishing", color: "text-purple-500" }
    ],
    baits: [
        { id: 'bait_worm', name: 'Juicy Worm', price: 50, desc: "Fish love these! Increases catch chance.", icon: "bug_report" }
    ],
    rarityStyles: {
        "Common": "bg-gray-100 dark:bg-gray-800 text-gray-500",
        "Uncommon": "bg-green-100 dark:bg-green-900/30 text-green-600",
        "Rare": "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600",
        "Epic": "bg-purple-100 dark:bg-purple-900/30 text-purple-600",
        "Legendary": "bg-pink-100 dark:bg-pink-900/30 text-pink-600"
    }
};

const GameState = {
    state: {
        coins: 0,
        inventory: {},
        ownedRods: ['rod_bamboo'],
        equippedRod: 'rod_bamboo',
        bait: 0
    },

    async init() {
        // Default dummy ID for testing
        let telegramId = '12345';
        let firstName = 'Tester';

        // Check if running in Telegram WebApp
        if (window.Telegram && window.Telegram.WebApp) {
            const tg = window.Telegram.WebApp;
            tg.ready();
            
            const user = tg.initDataUnsafe?.user;
            if (user) {
                telegramId = String(user.id);
                firstName = user.first_name;
            }
        }

        this.userId = telegramId;

        // Sync with backend
        try {
            const response = await fetch(`${API_URL}/api/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    telegramId: this.userId,
                    name: firstName
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data) {
                    this.state.coins = data.coins;
                    this.state.inventory = data.inventory || {};
                    // Map server baits to local bait count
                    if (data.baits && typeof data.baits['Juicy Worm'] !== 'undefined') {
                        this.state.bait = data.baits['Juicy Worm'];
                    }
                }
            }
        } catch (e) {
            console.error("Failed to sync user data:", e);
        }
    },

    save() {
        // Deprecated: State is now managed by server responses
    },

    // Getters
    getCoins() { return this.state.coins; },
    getBaitCount() { return this.state.bait; },
    getInventory() { return this.state.inventory; },
    getOwnedRods() { return this.state.ownedRods; },
    getEquippedRodId() { return this.state.equippedRod; },
    
    getEquippedRod() {
        return GameConfig.rods.find(r => r.id === this.state.equippedRod) || GameConfig.rods[0];
    },

    // Actions
    async castFishing() {
        try {
            const response = await fetch(`${API_URL}/api/cast-fishing`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    telegram_id: this.userId
                })
            });

            if (!response.ok) {
                const err = await response.json();
                console.warn("Fishing failed:", err.error);
                return { success: false, error: err.error }; // Return error for UI handling
            }

            const data = await response.json();
            
            // Sync local state with server authoritative state
            if (data.state) {
                this.state = data.state;
            }

            return {
                success: data.success,
                fish: data.fish,
                usedBait: data.usedBait
            };

        } catch (e) {
            console.error("Network error during fishing:", e);
            return { success: false, error: "Network Error" };
        }
    },

    buyRod(rodId) {
        const rod = GameConfig.rods.find(r => r.id === rodId);
        if (!rod) return false;
        if (this.state.ownedRods.includes(rodId)) return false;
        if (this.state.coins < rod.price) return false;

        this.state.coins -= rod.price;
        this.state.ownedRods.push(rodId);
        this.save();
        return true;
    },

    equipRod(rodId) {
        if (!this.state.ownedRods.includes(rodId)) return false;
        this.state.equippedRod = rodId;
        this.save();
        return true;
    },

    buyBait(baitId) {
        const bait = GameConfig.baits.find(b => b.id === baitId);
        if (!bait) return false;
        if (this.state.coins < bait.price) return false;

        this.state.coins -= bait.price;
        this.state.bait++;
        this.save();
        return true;
    },

    sellFish(fishId) {
        const fish = GameConfig.fishes.find(f => f.id === fishId);
        if (!fish) return false;
        if (!this.state.inventory[fishId] || this.state.inventory[fishId] <= 0) return false;

        this.state.inventory[fishId]--;
        this.state.coins += fish.coin;
        this.save();
        return true;
    },

    async watchAds() {
        if (typeof window.AdController === 'undefined') {
            console.warn("AdsGram script not loaded");
            return { success: false, error: "Ad script missing" };
        }

        return new Promise((resolve) => {
            window.AdController.show().then(async (result) => {
                if (result.done) {
                    // User watched ad successfully
                    this.state.bait = (this.state.bait || 0) + 1;

                    try {
                        const response = await fetch(`${API_URL}/api/sync`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                telegramId: this.userId,
                                action: 'save',
                                coins: this.state.coins,
                                inventory: this.state.inventory,
                                rodLevel: 1,
                                baits: { 'Juicy Worm': this.state.bait }
                            })
                        });
                        
                        if (response.ok) {
                            resolve({ success: true });
                        } else {
                            resolve({ success: false, error: "Sync failed" });
                        }
                    } catch (e) {
                        resolve({ success: false, error: "Network error" });
                    }
                } else {
                    resolve({ success: false, error: "Ad skipped" });
                }
            }).catch((err) => {
                resolve({ success: false, error: err });
            });
        });
    },

    async withdrawCoins() {
        try {
            const response = await fetch(`${API_URL}/api/withdraw`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ telegram_id: this.userId })
            });
            const data = await response.json();
            if (data.state) this.state = data.state;
            return data;
        } catch (e) {
            return { success: false, error: "Network error" };
        }
    }
};

// Auto-init
GameState.init();

const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();
const app = express();
app.use(express.json());

// 1. Koneksi ke MongoDB (Optimized for Serverless)
let cachedPromise = null;

const connectToDatabase = async () => {
  if (cachedPromise) {
    return cachedPromise;
  }
  
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  cachedPromise = mongoose.connect(process.env.MONGODB_URI);
  return cachedPromise;
};

// Middleware untuk memastikan DB terkoneksi sebelum handle request
app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (error) {
    console.error("Database connection error:", error);
    res.status(500).json({ error: "Database connection failed" });
  }
});

// 2. Definisi Struktur Data Player (Schema)
const userSchema = new mongoose.Schema({
  telegramId: { type: String, required: true, unique: true },
  name: String,
  coins: { type: Number, default: 0 },
  inventory: { type: Object, default: {} },
  rodLevel: { type: Number, default: 1 },
  baits: { type: Object, default: { 'Normal Worm': 5, 'Juicy Worm': 0 } }
});

// Cek apakah model sudah ada (untuk mencegah OverwriteModelError di serverless)
const User = mongoose.models.User || mongoose.model('User', userSchema);

const fishes = [
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
];

// 3. Endpoint untuk Ambil atau Simpan Data (Sync)
app.post('/api/sync', async (req, res) => {
  const { telegramId, name, coins, inventory, rodLevel, baits, action } = req.body;

  try {
    let user = await User.findOne({ telegramId });

    if (!user) {
      // Jika user baru, buatkan akunnya
      user = new User({ telegramId, name, coins, inventory, rodLevel, baits });
      await user.save();
    } else if (action === 'save') {
      // Jika user sudah ada dan ingin simpan data
      user.coins = coins;
      user.inventory = inventory;
      user.rodLevel = rodLevel;
      user.baits = baits;
      await user.save();
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: "Gagal sinkronisasi data" });
  }
});

app.post('/api/cast-fishing', async (req, res) => {
  const { telegram_id } = req.body;

  try {
    const user = await User.findOne({ telegramId: telegram_id });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const baits = user.baits || {};
    const currentBait = baits['Juicy Worm'] || 0;

    if (currentBait <= 0) {
      return res.status(400).json({ error: "Not enough bait" });
    }

    // Kurangi umpan
    baits['Juicy Worm'] = currentBait - 1;
    user.baits = baits;
    user.markModified('baits');

    // Ngacak Ikan
    const randomFish = fishes[Math.floor(Math.random() * fishes.length)];

    // Masukkan ke inventory
    const inventory = user.inventory || {};
    inventory[randomFish.id] = (inventory[randomFish.id] || 0) + 1;
    user.inventory = inventory;
    user.markModified('inventory');

    await user.save();

    res.json({
      success: true,
      fish: randomFish,
      usedBait: true,
      state: {
        coins: user.coins,
        inventory: user.inventory,
        bait: user.baits['Juicy Worm']
      }
    });
  } catch (error) {
    console.error("Fishing error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post('/api/withdraw', (req, res) => res.json({ success: true }));
app.post('/api/claim-ad-reward', (req, res) => res.json({ success: true }));

module.exports = app;
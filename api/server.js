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

module.exports = app;
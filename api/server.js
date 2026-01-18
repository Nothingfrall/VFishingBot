const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Koneksi Database
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('Conn Error:', err));

const UserSchema = new mongoose.Schema({
    telegramId: String,
    coins: { type: Number, default: 0 },
    baits: { type: Number, default: 10 }, // Modal awal 10 bait
    inventory: { type: Array, default: [] }
});

const User = mongoose.model('User', UserSchema);

// Ambil Data Player (Biar koin gak 0 pas refresh)
app.get('/api/sync', async (req, res) => {
    const { telegramId } = req.query;
    try {
        let user = await User.findOne({ telegramId });
        if (!user) user = await User.create({ telegramId, coins: 0, baits: 10 });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Pancing Ikan (Ngurangin Bait)
app.post('/api/cast-fishing', async (req, res) => {
    const { telegramId } = req.body;
    try {
        const user = await User.findOne({ telegramId });
        if (user && user.baits > 0) {
            user.baits -= 1;
            await user.save();
            return res.json({ success: true, baits: user.baits });
        }
        res.status(400).json({ error: 'Habis umpan!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Jual Ikan (Nambah Koin)
app.post('/api/sell-fish', async (req, res) => {
    const { telegramId, fishValue } = req.body;
    try {
        const user = await User.findOne({ telegramId });
        if (user) {
            user.coins += fishValue;
            await user.save();
            return res.json({ success: true, coins: user.coins });
        }
        res.status(404).json({ error: 'User missing' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = app;

const express = require('express');
const mongoose = require('mongoose');
const app = express();

app.use(express.json());

mongoose.connect(process.env.MONGODB_URI);

const User = mongoose.model('User', {
    telegramId: String,
    coins: { type: Number, default: 0 },
    baits: { type: Number, default: 10 }
});

// Ambil data pas game dibuka
app.get('/api/sync', async (req, res) => {
    const { telegramId } = req.query;
    let user = await User.findOne({ telegramId });
    if (!user) user = await User.create({ telegramId, coins: 0, baits: 10 });
    res.json(user);
});

// Update koin pas jual ikan
app.post('/api/sell-fish', async (req, res) => {
    const { telegramId, fishValue } = req.body;
    const user = await User.findOneAndUpdate(
        { telegramId },
        { $inc: { coins: fishValue } },
        { new: true }
    );
    res.json(user);
});

module.exports = app;

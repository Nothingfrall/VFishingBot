const TelegramBot = require('node-telegram-bot-api');

const TOKEN = '8548264239:AAFz3-llfTKDLqlj2UQo48C8jwQIhtHnrUg';
const bot = new TelegramBot(TOKEN, { polling: true });

bot.setMyCommands([
  { command: 'start', description: 'Mulai bot' },
  { command: 'play', description: 'Main game' }
]);


bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  const name = msg.from.first_name || "Player";
  const username = msg.from.username ? `@${msg.from.username}` : "";
  const userLine = username ? `${name} · ${username}` : name;

  const text =
`LAGOON FISHING

${userLine}
Coins 0 · Rod Lv.1

Tap PLAY to start`;

  bot.sendPhoto(chatId, "./banner.jpg", {
    caption: text,
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "PLAY",
            web_app: { url: "https://example.com" }
          }
        ]
      ]
    }
  });
});

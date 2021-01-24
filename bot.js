require(`dotenv`).config();
const token = process.env.TOKEN;
const apiId = process.env.apiId;
const adminId = process.env.adminId;

const { WeatherApi } = require(`./weatherApi`);
const Telegraf = require(`telegraf`);
const render = require(`./pool`);
const { Client } = require(`pg`);
const express = require(`express`);
const port = process.env.PORT || 3000;
const path = require("path");

const site = async () => {
  const app = express();

  app.get(`/`, (req, res) => {
    res.sendFile(path.join(__dirname + "/index.html"));
  });

  app.listen(port, () => {
    console.log(`BotStatistics listening at http://localhost:${port}`);
  });
};

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});
client.connect();

const bot = new Telegraf(token);
const weatherApi = new WeatherApi(apiId);

const buttonsList = [
  `default`,
  `default_active`,
  `week`,
  `week_active`,
  `graph`,
  `graph_active`,
];

const keyboard = {
  default: {
    num: 0,
    active: `🌤`,
    unactive: `Default`,
  },
  week: {
    num: 1,
    active: `🌡`,
    unactive: `Week`,
  },
  graph: {
    num: 2,
    active: `📈`,
    unactive: `Graph`,
  },
};

const newKeyboard = async (active) => {
  const inline_keyboard = [
    [
      { text: `Default`, callback_data: `default` },
      { text: `Week`, callback_data: `week` },
      { text: `Graph`, callback_data: `graph` },
    ],
  ];
  inline_keyboard[0][keyboard[active].num].text = keyboard[active].active;
  inline_keyboard[0][keyboard[active].num].callback_data += `_active`;
  return inline_keyboard;
};

const sendRes = async (context) => {
  let type = `default`;
  let cord = undefined;
  let cityName;
  const message = context.update.callback_query || context.update.message;
  if (context.update.callback_query) {
    if (message.data.endsWith(`_active`)) {
      context.answerCbQuery(`Active`);
      return;
    }
    await bot.telegram.editMessageCaption(
      message.message.chat.id,
      message.message.message_id,
      message.message.message_id,
      `Loading...`
    );
    type = message.data;
    cityName = message.message.reply_to_message.text;
  } else {
    bot.telegram.sendChatAction(context.message.chat.id, `upload_photo`);
    if (message.location) {
      cord = {
        lat: message.location.latitude,
        lon: message.location.longitude,
      };
    }
  }
  if (!cord) {
    const weatherCord = await weatherApi.weather(
      cityName || message.text,
      `metric`,
      message.from.language_code
    );
    if (weatherCord.startsWith(`404`)) {
      await context.reply(`There is no such place.`);
      return;
    }
    cord = JSON.parse(weatherCord).coord;
  }
  const weather = await JSON.parse(
    await weatherApi.onecall(cord, `metric`, message.from.language_code)
  );
  const preview = await render({ weather, type });
  const inline_keyboard = await newKeyboard(type);
  if (context.update.callback_query) {
    await context.editMessageMedia(
      { type: `photo`, media: { source: preview } },
      { reply_markup: { inline_keyboard } }
    );
    return;
  }
  await context.replyWithPhoto(
    { source: preview },
    {
      reply_to_message_id: context.message.message_id,
      reply_markup: { inline_keyboard },
    }
  );
  await client.query(`CREATE TEMP TABLE IF NOT EXISTS sent (
                name TEXT,
                user_id INTEGER,
                time DATE)`);
  const text = `INSERT INTO sent(name, user_id, time) VALUES($1, $2, $3) RETURNING *`;
  const values = [message.text, message.from.id, new Date()];
  try {
    const res = await client.query(text, values);
    console.log(res.rows[0]);
  } catch (err) {
    console.log(err.stack);
  }
};

bot.start((context) => {
  context.reply(`Send me the name of the place.`);
});

bot.on(`message`, (context) => {
  sendRes(context);
});

bot.action(buttonsList, (context) => {
  sendRes(context);
});

const start = async function () {
  bot.telegram.sendMessage(
    adminId,
    `@${(await bot.telegram.getMe()).username} is running…`
  );
};
start();

bot.startPolling();

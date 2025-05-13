const express = require('express');
const db = require('pg-promise')();
require('dotenv').config(); // Завантажуємо налаштування з .env

const app = express();
const PORT = process.env.PORT;

// Налаштування підключення до БД через pg-promise
const dbConnection = db({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

app.get('/', async (req, res) => {
  try {
    const users = await dbConnection.any('SELECT * FROM users');
    res.json(users); // Повертаємо список користувачів
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

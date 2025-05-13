const express = require('express');
const db = require('pg-promise')(); // Імпортуємо pg-promise
const app = express();

const PORT = process.env.PORT || 3000;

// Налаштування підключення до БД через pg-promise
const dbConnection = db({
  host: process.env.DB_HOST || 'db',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'secret',
  database: process.env.DB_NAME || 'mydb',
});

app.get('/', async (req, res) => {
  try {
    // Виконуємо SQL-запит через pg-promise
    const users = await dbConnection.any('SELECT * FROM users');
    res.json(users); // Повертаємо список користувачів
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

-- init-db.sql
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    password VARCHAR(100) NOT NULL
);

-- Вставляємо тестового користувача
INSERT INTO users (username, password) VALUES ('testuser', 'password123');

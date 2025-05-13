FROM node:20-alpine

WORKDIR /usr/src/app

# Копіюємо тільки залежності
COPY package*.json ./
RUN npm install

# Копіюємо основний файл програми
COPY main.js .

EXPOSE 3000

CMD ["node", "main.js"]



# IPKPO LMS + MySQL

Готовий набір файлів для GitHub.

## Що всередині
- `client/` — твій React/Vite фронтенд
- `server/` — Node.js + Express API для MySQL
- `database/schema.sql` — структура бази MySQL

## Важливо
Твій початковий React-проєкт був лише фронтендом на Vite/React fileciteturn1file1turn1file5turn1file6, а дані зберігалися в `localStorage`, не в MySQL fileciteturn1file3.
Я додав окремий backend і SQL-базу, щоб у тебе були готові файли для GitHub.

## Як запустити локально

### 1. База
- Відкрий MySQL Workbench
- Запусти `database/schema.sql`

### 2. Backend
```bash
cd server
npm install
copy .env.example .env
npm run dev
```

### 3. Frontend
```bash
cd client
npm install
npm run dev
```

## Дані підключення
У `server/.env` вкажи свій пароль MySQL:
```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=ipkpo_lms
DB_USER=root
DB_PASSWORD=your_mysql_password
```

## Що ще треба знати
Я не переписував весь твій великий React-код на повну роботу через API, бо це окремий великий етап. Але:
- база готова
- backend готовий
- файли для GitHub готові
- фронтенд збережений
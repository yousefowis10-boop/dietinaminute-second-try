# Your Cal Count 🍽️

Your Cal Count is a full-stack web application to help users track and manage their daily calorie intake. It features a Django REST API backend and a modern React + TailwindCSS frontend.

---

## 🧩 Project Structure

```
.
├── manage.py
├── .venv/                 # Python virtual environment
├── requirements.txt
├── paymentSystem/          # Django app with settings and urls
├── auth-frontend/         # React app
│   ├── src/
│   └── public/
```

---

## 🚀 Features

- JWT-based authentication
- Login & Signup with beautiful UI
- Protected dashboard with auth guard
- Global auth context in React
- Responsive UI using TailwindCSS
- Calorie tracking foundations (coming soon)

---

## 🛠️ Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/your-cal-count.git
cd your-cal-count
```

### 2. Setup Backend (Django)

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Migrate and run
python manage.py migrate
python manage.py runserver
```

### 3. Setup Frontend (React)

```bash
cd auth-frontend
npm install
npm run dev   # or npm start depending on your setup
```

---

## 📦 API Overview

- `POST /auth/login/` → Login user
- `POST /auth/signup/` → Register user
- `GET /auth/me/` → Get current user (requires auth)

---



## 📄 License

MIT © 2025 Your Name
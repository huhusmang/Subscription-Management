# Subscription Management System

[English](README.md) | [简体中文](README.zh-CN.md)

A modern subscription management system that helps users easily manage and track expenses and renewals for various subscription services.

## 📸 Interface Preview

### Dashboard - Smart Expense Overview
![Dashboard](docs/images/dashboard.png)
*Smart dashboard displaying monthly/yearly expense statistics, upcoming subscription reminders, and categorized expense analysis*

### Subscription Management - Complete Service Management
![Subscription Management](docs/images/subscriptions.png)
*Complete subscription lifecycle management with support for adding, editing, status management, and batch import*

### Payment History - Detailed Record Tracking
![Payment History](docs/images/subscriptions-payments.png)
*Complete payment history records with search support and CRUD operations for orders*

### Monthly Expenses - Trend Analysis
![Monthly Expenses](docs/images/monthly-expense.png)
*Monthly expense orders with intuitive display of spending details*

### Expense Reports - In-depth Data Analysis
![Expense Reports](docs/images/reports.png)
*Powerful expense analysis features including trend charts, category statistics, and multi-dimensional data display*

### Dark Theme - Modern Interface
![Dark Theme Reports](docs/images/reports-dark.png)
*Dark theme support*

## 🌟 Project Features

- **Smart Subscription Management** - Comprehensive subscription lifecycle management with automatic/manual renewal support
- **Multi-currency Support** - Support for 7 major currencies with real-time automatic exchange rate updates
- **Expense Analysis Reports** - Powerful data analysis and visualization chart functionality
- **Responsive Design** - Perfect adaptation for desktop and mobile devices
- **Local-first** - Local data storage based on SQLite for privacy protection
- **Docker Deployment** - One-click deployment, ready to use out of the box

## 📊 Feature Overview

### Core Features
- ✅ **Subscription Management** - Add, edit, delete subscription services
- ✅ **Smart Dashboard** - Expense overview and upcoming expiration reminders
- ✅ **Category Statistics** - Expense statistics by category and payment method
- ✅ **Search & Filter** - Multi-dimensional search and status filtering
- ✅ **Custom Configuration** - Custom categories and payment methods

### Advanced Features
- ✅ **Automatic Renewal Processing** - Smart detection of expiring subscriptions with automatic updates
- ✅ **Multi-currency Support** - Real-time conversion for 9 major currencies (USD, EUR, GBP, CAD, AUD, JPY, CNY, TRY, HKD)
- ✅ **Automatic Exchange Rate Updates** - Integrated with Tianapi for daily exchange rate updates
- ✅ **Expense Report Dashboard** - Comprehensive expense analysis and visualization
- ✅ **Payment History Tracking** - Complete payment records and historical analysis
- ✅ **Data Import/Export** - CSV and JSON format data import/export
- ✅ **Theme Switching** - Support for light/dark/system themes
- ✅ **Internationalization (i18n)** - Multi-language support with English and Chinese
- ✅ **Notification System** - Multi-channel notification system with Telegram and Email support

## 🛠 Technology Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: Zustand
- **Routing**: React Router
- **Charts**: Recharts
- **UI Components**: Radix UI
- **Internationalization**: React i18next + i18next-browser-languagedetector

### Backend
- **Runtime**: Node.js
- **Framework**: Express 5
- **Database**: SQLite + better-sqlite3
- **Scheduled Tasks**: node-cron
- **Authentication**: Session-based login (username/password with bcrypt hashing), all endpoints require login
- **Notifications**: Telegram Bot API + Email (SMTP with nodemailer)
- **Session Management**: express-session with HTTP-only cookies
- **Password Hashing**: bcryptjs for secure password storage

### Deployment
- **Containerization**: Docker + Docker Compose
- **Process Management**: dumb-init
- **Health Checks**: Built-in health check endpoints

## 🚀 Quick Start

### Requirements
- Node.js 20+
- Docker & Docker Compose (recommended)

### Docker Deployment (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd subscription-management
   ```

2. **Configure environment variables**
   ```bash
   cp .env.production.example .env
   # Open the .env file to fill in or modify parameters (such as port, database path, Telegram settings, etc.)
   ```

3. **Choose image source and start the service**
   
   **A. Start with the latest published image (fastest and simplest)**
   ```bash
   docker compose up -d
   ```
   - By default, the latest image (`ghcr.io/huhusmang/subscription-management:latest`) will be used.
   - If you want to use a specific tag, edit the `image:` field in `docker-compose.yml`, or pull manually:
     ```bash
     docker pull ghcr.io/huhusmang/subscription-management:<tag>
     ```

   **B. Build the image locally (optional)**
   - Comment out the `image` line and uncomment the `build` section in `docker-compose.yml`, then:
     ```bash
     docker compose build && docker compose up -d
     ```

   **C. Run with `docker run`**
   ```bash
   docker run -d \
     --name subscription-manager \
     -e SESSION_SECRET=your_session_secret \
     -e ADMIN_USERNAME=admin \
     -e ADMIN_PASSWORD=your_admin_password \
     -e PORT=3001 \
     -v subscription-data:/app/data \
     -p 3001:3001 \
     ghcr.io/huhusmang/subscription-management:latest
   ```
   - Add extra `-e` flags for optional settings (e.g. `-e TIANAPI_KEY=...`, `-e BASE_CURRENCY=USD`) as needed.
   - Prefer secrets management or an `.env` file in production; you can swap the `-e` flags for `--env-file /absolute/path/to/.env` if your environment supports it.

4. **Access the application**
   - Frontend: http://localhost:3001
   - The default port can be customized in the `.env` file (if you change it, make sure to update the `ports` setting accordingly)

### Local Development

1. **Install dependencies**
```bash
# Frontend dependencies
npm install

# Backend dependencies
cd server
npm install
cd ..
```

2. **Initialize database**
```bash
cd server
npm run db:init
cd ..
```

3. **Start development services**
```bash
# Start backend (Terminal 1)
cd server
npm start

# Start frontend (Terminal 2)
npm run dev
```
Frontend interface: http://localhost:5173
Backend service: http://localhost:3001/api

## 🔧 Configuration

### Environment Variables

Create a `.env` file and configure the following variables:

**Regarding the generation methods for SESSION_SECRET and ADMIN_PASSWORD_HASH:**

- It is recommended to use a sufficiently long, high-strength random string for `SESSION_SECRET` (you can generate one using `openssl rand -base64 48`).
- For `ADMIN_PASSWORD_HASH`, it is recommended to have the system automatically generate it upon first startup, or to generate it offline using a bcrypt tool (with a cost factor ≥12).
- For detailed steps and security recommendations, please refer to [docs/AUTHENTICATION.md](docs/AUTHENTICATION.md#session_secret-and-admin_password_hash-generation-methods).

```bash
# Service port (optional, default 3001)
PORT=3001

# Base currency (optional, default CNY)
# Supported: USD, EUR, GBP, CNY, JPY, CAD, AUD, TRY, HKD
BASE_CURRENCY=CNY

# Database path (used for Docker deployment)
DATABASE_PATH=/app/data/database.sqlite

# Tianapi API key (optional, for real-time exchange rate updates)
# Get your key from: https://www.tianapi.com/
TIANAPI_KEY=your_tianapi_key_here

# Session auth (required)
SESSION_SECRET=your_random_session_secret
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password
# ADMIN_PASSWORD_HASH=your_password_hash (optional)
# TRUST_PROXY=1                     # Set when running behind reverse proxies/CDNs
# SESSION_COOKIE_SECURE=auto        # Override secure cookie behavior (auto|true|false)
# SESSION_COOKIE_SAMESITE=lax       # Adjust SameSite policy (lax|strict|none)
# On first start the server will print a derived ADMIN_PASSWORD_HASH. Copy that hash into your .env and remove ADMIN_PASSWORD when you deploy.

# Telegram notification settings (optional, for Telegram notifications)
# Get from @BotFather on Telegram
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here

# Email notification settings (optional, for Email notifications)
# SMTP server configuration (Gmail example)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=Subscription Manager <no-reply@example.com>
EMAIL_LOCALE=zh-CN

# notification settings
NOTIFICATION_DEFAULT_CHANNELS=["telegram"]
NOTIFICATION_DEFAULT_LANGUAGE=en
SCHEDULER_TIMEZONE=UTC
SCHEDULER_CHECK_TIME=09:00
NOTIFICATION_DEFAULT_ADVANCE_DAYS=7
NOTIFICATION_DEFAULT_REPEAT_NOTIFICATION=false

# Container image selection (optional)
# IMAGE_TAG controls which published image tag docker compose uses
# e.g. IMAGE_TAG=sha-d025f79 or IMAGE_TAG=main or IMAGE_TAG=latest
# IMAGE_TAG=latest
```

### Database Management

```bash
# Initialize database
npm run db:init

# Run migrations
npm run db:migrate

# Reset database
npm run db:reset
```

## 🤝 Contributing

1. Fork the project
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details
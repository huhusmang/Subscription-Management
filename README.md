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
- ✅ **Notification System** - Smart notification system with Telegram integration

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
- **Authentication**: Session-based login (username/password), all endpoints require login
- **Notifications**: Telegram Bot API + Email (planned)

### Deployment
- **Containerization**: Docker + Docker Compose
- **Process Management**: dumb-init
- **Health Checks**: Built-in health check endpoints

## 🚀 Quick Start

### Requirements
- Node.js 20+
- Docker & Docker Compose (recommended)

### Docker Deployment (Recommended)

1. **Clone the project**
```bash
git clone <repository-url>
cd subscription-management
```

2. **Configure environment variables**
```bash
cp .env.production.example .env
# Edit the .env file and set necessary configurations
```

3. **Start services**
```bash
docker-compose up -d
```

4. **Access the application**
- Frontend interface: http://localhost:3001

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

## ⚠️ Notice

**For users who installed the system before July 27, 2025:**

Recent updates include database schema changes that were applied directly to `schema.sql` without proper migrations. If you encounter errors after pulling the latest code, please follow these steps:

### Before Updating
1. **Export your subscription data** - Use the data export feature in the application to backup all your subscription information
2. **Backup your database file** - Make a copy of your `database.sqlite` file from the data directory

### If You Encounter Database Errors
If you experience database-related errors after updating:

1. **Stop the application**
2. **Backup your current database** (if not already done)
3. **Reset the database**:
   ```bash
   cd server
   npm run db:reset
   ```
4. **Re-import your data** using the import feature in the application

### Data Location
- **Docker deployment**: Database is located at the path specified in `DATABASE_PATH` environment variable (default: `/app/data/database.sqlite`)
- **Local development**: Database is located in the `server` directory as `database.sqlite`

Future updates will include proper database migrations to avoid this issue.

## 🔧 Configuration

### Environment Variables

Create a `.env` file and configure the following variables:

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

# Session auth
SESSION_SECRET=your_random_session_secret
ADMIN_USERNAME=admin
# Use either ADMIN_PASSWORD_HASH (recommended) or ADMIN_PASSWORD for dev
ADMIN_PASSWORD_HASH=$2a$12$examplehash...
# ADMIN_PASSWORD=admin

# Telegram Bot Token (required for Telegram notifications)
# Get from @BotFather on Telegram
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here

# notification settings
NOTIFICATION_DEFAULT_CHANNELS=["telegram"]
NOTIFICATION_DEFAULT_LANGUAGE=en
SCHEDULER_TIMEZONE=UTC
SCHEDULER_CHECK_TIME=09:00
NOTIFICATION_DEFAULT_ADVANCE_DAYS=7
NOTIFICATION_DEFAULT_REPEAT_NOTIFICATION=false
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

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

## ⚠️ Version Compatibility

> **Important Notice**: If you are using a version from before July 22, 2025, please refer to the [Trial Status Fix Documentation](docs/TRIAL_STATUS_FIX.md) to resolve subscription status validation issues.

The early versions only supported `active`, `inactive`, and `cancelled` subscription statuses. If you encounter validation errors when creating subscriptions with `trial` status, please follow the fix guide.

## 📊 Feature Overview

### Core Features
- ✅ **Subscription Management** - Add, edit, delete subscription services
- ✅ **Smart Dashboard** - Expense overview and upcoming expiration reminders
- ✅ **Category Statistics** - Expense statistics by category and payment method
- ✅ **Search & Filter** - Multi-dimensional search and status filtering
- ✅ **Custom Configuration** - Custom categories and payment methods

### Advanced Features
- ✅ **Automatic Renewal Processing** - Smart detection of expiring subscriptions with automatic updates
- ✅ **Multi-currency Support** - Real-time conversion for 7 major currencies (USD, EUR, GBP, CAD, AUD, JPY, CNY)
- ✅ **Automatic Exchange Rate Updates** - Integrated with Tianapi for daily exchange rate updates
- ✅ **Expense Report Dashboard** - Comprehensive expense analysis and visualization
- ✅ **Payment History Tracking** - Complete payment records and historical analysis
- ✅ **Data Import/Export** - CSV and JSON format data import/export
- ✅ **Theme Switching** - Support for light/dark/system themes

## 🛠 Technology Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: Zustand
- **Routing**: React Router
- **Charts**: Recharts
- **UI Components**: Radix UI

### Backend
- **Runtime**: Node.js
- **Framework**: Express 5
- **Database**: SQLite + better-sqlite3
- **Scheduled Tasks**: node-cron
- **API Authentication**: API Key

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

## 🔧 Configuration

### Environment Variables

Create a `.env` file and configure the following variables:

```bash
# API security key (required)
API_KEY=your_secret_api_key_here

# Service port (optional, default 3001)
PORT=3001

# Base currency (optional, default CNY)
BASE_CURRENCY=CNY

# Tianapi API key (optional, for exchange rate updates)
TIANAPI_KEY=your_tianapi_key_here

# Database path (used for Docker deployment)
DATABASE_PATH=/app/data/database.sqlite
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

## 📚 Documentation

- [API Documentation](docs/API_DOCUMENTATION.md) - Complete API reference
- [Backend Architecture](docs/BACKEND_ARCHITECTURE.md) - System architecture and design
- [Project Structure](docs/STRUCTURE.md) - Project file organization
- [Trial Status Fix](docs/TRIAL_STATUS_FIX.md) - Fix for early version compatibility issues

## 🤝 Contributing

1. Fork the project
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details

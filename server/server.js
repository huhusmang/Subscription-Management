const express = require('express');
const cors = require('cors');
const path = require('path');
const ExchangeRateScheduler = require('./services/exchangeRateScheduler');
const SubscriptionRenewalScheduler = require('./services/subscriptionRenewalScheduler');
const NotificationScheduler = require('./services/notificationScheduler');

// Load environment variables from root .env file (unified configuration)
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Import modules
const { initializeDatabase } = require('./config/database');
const { createSessionMiddleware } = require('./middleware/session');
const { requireLogin } = require('./middleware/requireLogin');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { createSubscriptionRoutes, createProtectedSubscriptionRoutes } = require('./routes/subscriptions');
const { createSubscriptionManagementRoutes } = require('./routes/subscriptionManagement');
const { createAnalyticsRoutes } = require('./routes/analytics');
const { createSettingsRoutes, createProtectedSettingsRoutes } = require('./routes/settings');
const { createExchangeRateRoutes, createProtectedExchangeRateRoutes } = require('./routes/exchangeRates');
const { createPaymentHistoryRoutes, createProtectedPaymentHistoryRoutes } = require('./routes/paymentHistory');

const { createMonthlyCategorySummaryRoutes, createProtectedMonthlyCategorySummaryRoutes } = require('./routes/monthlyCategorySummary');
const { createCategoriesRoutes, createProtectedCategoriesRoutes, createPaymentMethodsRoutes, createProtectedPaymentMethodsRoutes } = require('./routes/categoriesAndPaymentMethods');
const { createSubscriptionRenewalSchedulerRoutes, createProtectedSubscriptionRenewalSchedulerRoutes } = require('./routes/subscriptionRenewalScheduler');
const { createNotificationRoutes, createProtectedNotificationRoutes } = require('./routes/notifications');
const { createSchedulerRoutes, createProtectedSchedulerRoutes } = require('./routes/scheduler');
const userPreferencesRoutes = require('./routes/userPreferences');
const templatesRoutes = require('./routes/templates');
const createAuthRoutes = require('./routes/auth');

const app = express();
const port = process.env.PORT || 3001; // Use PORT from environment or default to 3001

// Configure trust proxy (required when behind reverse proxies/CDN)
const trustProxyConfig = process.env.TRUST_PROXY;
if (trustProxyConfig !== undefined) {
  if (trustProxyConfig === 'true') {
    app.set('trust proxy', true);
  } else if (trustProxyConfig === 'false') {
    app.set('trust proxy', false);
  } else {
    const parsed = Number(trustProxyConfig);
    app.set('trust proxy', Number.isNaN(parsed) ? trustProxyConfig : parsed);
  }
} else if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(createSessionMiddleware());

// Database setup
const db = initializeDatabase();

// Initialize exchange rate scheduler
const exchangeRateScheduler = new ExchangeRateScheduler(db, process.env.TIANAPI_KEY);
exchangeRateScheduler.start();

// Initialize subscription maintenance scheduler
const subscriptionRenewalScheduler = new SubscriptionRenewalScheduler(db);
subscriptionRenewalScheduler.start();

// Initialize notification scheduler
const notificationScheduler = new NotificationScheduler();
notificationScheduler.start();

// Serve static files from the public directory (frontend build)
app.use(express.static(path.join(__dirname, '..', 'public')));

// API health check endpoint (requires login)
app.get('/api/health', requireLogin, (req, res) => {
  res.json({ message: 'Subscription Management Backend is running!', status: 'healthy' });
});

// --- API Routers ---
const apiRouter = express.Router();
const protectedApiRouter = express.Router();

// Auth routes (no login required)
app.use('/api/auth', createAuthRoutes(db));

// Apply session auth to all API routes
apiRouter.use(requireLogin);
protectedApiRouter.use(requireLogin);

// Register route modules
apiRouter.use('/subscriptions', createSubscriptionRoutes(db));
protectedApiRouter.use('/subscriptions', createProtectedSubscriptionRoutes(db));
protectedApiRouter.use('/subscriptions', createSubscriptionManagementRoutes(db));

apiRouter.use('/analytics', createAnalyticsRoutes(db));

apiRouter.use('/settings', createSettingsRoutes(db));
protectedApiRouter.use('/settings', createProtectedSettingsRoutes(db));

apiRouter.use('/exchange-rates', createExchangeRateRoutes(db));
protectedApiRouter.use('/exchange-rates', createProtectedExchangeRateRoutes(db, exchangeRateScheduler));

apiRouter.use('/payment-history', createPaymentHistoryRoutes(db));
protectedApiRouter.use('/payment-history', createProtectedPaymentHistoryRoutes(db));



apiRouter.use('/monthly-category-summary', createMonthlyCategorySummaryRoutes(db));
protectedApiRouter.use('/monthly-category-summary', createProtectedMonthlyCategorySummaryRoutes(db));

apiRouter.use('/categories', createCategoriesRoutes(db));
protectedApiRouter.use('/categories', createProtectedCategoriesRoutes(db));

apiRouter.use('/payment-methods', createPaymentMethodsRoutes(db));
protectedApiRouter.use('/payment-methods', createProtectedPaymentMethodsRoutes(db));

apiRouter.use('/subscription-renewal-scheduler', createSubscriptionRenewalSchedulerRoutes(subscriptionRenewalScheduler));
protectedApiRouter.use('/subscription-renewal-scheduler', createProtectedSubscriptionRenewalSchedulerRoutes(subscriptionRenewalScheduler));

// Notification routes
apiRouter.use('/notifications', createNotificationRoutes(db));
protectedApiRouter.use('/notifications', createProtectedNotificationRoutes(db));

// Scheduler routes
apiRouter.use('/scheduler', createSchedulerRoutes(notificationScheduler));
protectedApiRouter.use('/scheduler', createProtectedSchedulerRoutes(notificationScheduler));

// User preferences routes
apiRouter.use('/user-preferences', userPreferencesRoutes);

// Template routes
apiRouter.use('/templates', templatesRoutes);

// Register routers
app.use('/api', apiRouter);
app.use('/api/protected', protectedApiRouter);

// SPA fallback: serve index.html for all non-API routes
// Use a more specific pattern to avoid path-to-regexp issues
app.use((req, res, next) => {
  // Skip API routes
  if (req.path.startsWith('/api')) {
    return next();
  }

  // For all other routes, serve the index.html (SPA fallback)
  const indexPath = path.join(__dirname, '..', 'public', 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('Error serving index.html:', err);
      res.status(404).send('Frontend not found');
    }
  });
});

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`🚀 Subscription Management Server is running on http://localhost:${port}`);
  console.log(`📂 Frontend available at: http://localhost:${port}`);
  console.log(`🔧 API available at: http://localhost:${port}/api`);
});
const express = require('express');
const ExchangeRateController = require('../controllers/exchangeRateController');
const { getBaseCurrency } = require('../config/currencies');

function createExchangeRateRoutes(db) {
    const router = express.Router();
    const controller = new ExchangeRateController(db);

    // GET all exchange rates (Public)
    router.get('/', controller.getAllExchangeRates);

    // GET specific exchange rate (Public)
    router.get('/:from/:to', controller.getExchangeRate);

    // GET rates for specific currency (Public)
    router.get('/currency/:currency', controller.getRatesForCurrency);

    // GET currency conversion (Public)
    router.get('/convert', controller.convertCurrency);

    // GET exchange rate statistics (Public)
    router.get('/stats', controller.getExchangeRateStats);

    // GET exchange rate configuration status (Public)
    router.get('/config-status', (req, res) => {
        res.json({
            tianApiConfigured: !!process.env.TIANAPI_KEY,
            provider: 'tianapi.com',
            updateFrequency: 'Daily (Automatic)',
            baseCurrency: getBaseCurrency()
        });
    });

    return router;
}

function createProtectedExchangeRateRoutes(db, exchangeRateScheduler) {
    const router = express.Router();
    const controller = new ExchangeRateController(db);

    // POST create or update exchange rate (Protected)
    router.post('/', controller.upsertExchangeRate);

    // POST bulk update exchange rates (Protected)
    router.post('/bulk', controller.bulkUpsertExchangeRates);

    // DELETE exchange rate (Protected)
    router.delete('/:from/:to', controller.deleteExchangeRate);

    // POST validate exchange rate data (Protected)
    router.post('/validate', controller.validateExchangeRateData);

    // POST to manually update exchange rates via API (Protected)
    router.post('/update', async (req, res) => {
        try {
            const result = await exchangeRateScheduler.updateExchangeRates();

            if (result.success) {
                res.json({
                    message: result.message,
                    updatedAt: result.updatedAt
                });
            } else {
                res.status(500).json({ error: result.message });
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // GET exchange rate scheduler status (Protected)
    router.get('/status', (req, res) => {
        try {
            const status = exchangeRateScheduler.getStatus();
            res.json(status);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}

module.exports = {
    createExchangeRateRoutes,
    createProtectedExchangeRateRoutes
};

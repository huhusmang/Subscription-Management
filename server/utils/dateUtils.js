// Function to calculate last billing date based on next billing date and billing cycle
function calculateLastBillingDate(nextBillingDate, startDate, billingCycle) {
    const nextDate = new Date(nextBillingDate);
    const startDateObj = new Date(startDate);
    let lastBillingDate;
    
    switch (billingCycle) {
        case 'monthly':
            lastBillingDate = new Date(nextDate);
            lastBillingDate.setMonth(lastBillingDate.getMonth() - 1);
            break;
        case 'semiannual':
            lastBillingDate = new Date(nextDate);
            lastBillingDate.setMonth(lastBillingDate.getMonth() - 6);
            break;
        case 'yearly':
            lastBillingDate = new Date(nextDate);
            lastBillingDate.setFullYear(lastBillingDate.getFullYear() - 1);
            break;
        case 'quarterly':
            lastBillingDate = new Date(nextDate);
            lastBillingDate.setMonth(lastBillingDate.getMonth() - 3);
            break;
        default:
            return null;
    }
    
    // Ensure last billing date is not before start date
    if (lastBillingDate < startDateObj) {
        lastBillingDate = startDateObj;
    }
    
    return lastBillingDate.toISOString().split('T')[0];
}

// Function to calculate next billing date based on current date and billing cycle
function calculateNextBillingDate(currentDate, billingCycle) {
    const baseDate = new Date(currentDate);
    let nextBillingDate;

    switch (billingCycle) {
        case 'monthly':
            nextBillingDate = new Date(baseDate);
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
            break;
        case 'semiannual':
            nextBillingDate = new Date(baseDate);
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 6);
            break;
        case 'yearly':
            nextBillingDate = new Date(baseDate);
            nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
            break;
        case 'quarterly':
            nextBillingDate = new Date(baseDate);
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 3);
            break;
        default:
            throw new Error('Invalid billing cycle');
    }

    return nextBillingDate.toISOString().split('T')[0];
}

// Function to get today's date as string
function getTodayString() {
    return new Date().toISOString().split('T')[0];
}

// Function to check if a date is today or in the past
function isDateDueOrOverdue(dateString) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDate = new Date(dateString);
    targetDate.setHours(0, 0, 0, 0);

    return targetDate <= today;
}

// Function to calculate next billing date based on start date, current date and billing cycle
// Calculates the next billing date that occurs after the current date, based on the billing cycle from start date
function calculateNextBillingDateFromStart(startDate, currentDate, billingCycle) {
    const today = new Date(currentDate);
    const start = new Date(startDate);

    // Start with the start date as the base
    let nextBilling = new Date(start);

    // Keep adding billing cycles until we get a date after today
    while (nextBilling <= today) {
        switch (billingCycle) {
            case 'monthly':
                nextBilling.setMonth(nextBilling.getMonth() + 1);
                break;
            case 'semiannual':
                nextBilling.setMonth(nextBilling.getMonth() + 6);
                break;
            case 'yearly':
                nextBilling.setFullYear(nextBilling.getFullYear() + 1);
                break;
            case 'quarterly':
                nextBilling.setMonth(nextBilling.getMonth() + 3);
                break;
            default:
                throw new Error('Invalid billing cycle');
        }
    }

    return nextBilling.toISOString().split('T')[0];
}

module.exports = {
    calculateLastBillingDate,
    calculateNextBillingDate,
    calculateNextBillingDateFromStart,
    getTodayString,
    isDateDueOrOverdue
};

const kpi = require('../dashboard/dashboard.service');
const { sendResponse } = require('../../utils/response');

exports.userRevenue = async (req, res, next)=>{
    try {
        const user = req.user;
        const {startDate, endDate} = req.query;

        const data = await kpi.revenueByCustomer(user.userId, startDate, endDate);
        console.log('Customer revenue data:', data);
        return sendResponse(res, 200, { data });
    } catch (err) {
        next(err);
    }
}

exports.userExpense = async (req, res, next)=>{
    try {
        const user = req.user;
        const {startDate, endDate} = req.query;

        const data = await kpi.expenseByUser(user.userId, startDate, endDate);
        return sendResponse(res, 200, { data });
    } catch (err) {
        next(err);
    }
}

exports.dashboardSummary = async (req, res, next) => {
    try {
        const user = req.user;
        const {startDate, endDate} = req.query;

        const data = await kpi.dashboardSummary(user.userId, startDate, endDate);
        return sendResponse(res, 200, { data });
    } catch (err) {
        next(err);
    }
}

exports.revenueExpenseTrend = async (req, res, next) => {
    try {
        const user = req.user;
        const {startDate, endDate} = req.query;

        const data = await kpi.revenueExpenseTrend(user.userId, startDate, endDate);
        return sendResponse(res, 200, { data });
    } catch (err) {
        next(err);
    }
}

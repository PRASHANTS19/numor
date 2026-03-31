const {appLogger} = require('../utils/logger');

module.exports = (err, req, res, next)=> {
    appLogger.error(err);
    console.log('Error (inside error middleware):', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
    }); 
}
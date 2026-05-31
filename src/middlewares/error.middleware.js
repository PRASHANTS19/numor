const { handleErrorMessage } = require("../utils/response");

module.exports = (err, req, res, next)=> {
    console.log('Error (inside error middleware):', err);
    return handleErrorMessage(res, err);
}

const crypto = require('crypto');

exports.generateBookingCode = () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `CA-BK-${date}-${random}`;
};
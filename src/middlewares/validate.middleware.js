module.exports = (schema) => (req, res, next) => {
  const errors = [];

  if (schema.body) {
    const { error } = schema.body.validate(req.body, {
      abortEarly: false,
      allowUnknown: false,
    });
    if (error) errors.push(error.message);
  }

  if (schema.params) {
    const { error } = schema.params.validate(req.params);
    if (error) errors.push(error.message);
  }

  if (schema.query) {
    const { error } = schema.query.validate(req.query);
    if (error) errors.push(error.message);
  }

  if (errors.length) {
    const error = new Error('Invalid input');
    error.statusCode = 400;
    error.errors = errors;
    return next(error);
  }

  next();
};

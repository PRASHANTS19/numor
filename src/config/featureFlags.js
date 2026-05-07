const normalizeBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === '') return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const FLAGS = {
  SME_CORE: normalizeBoolean(process.env.FF_SME_CORE, true),
  CA_CONNECT: normalizeBoolean(process.env.FF_CA_CONNECT, false),
  AI_CHATBOT: normalizeBoolean(process.env.FF_AI_CHATBOT, false),
  CA_ADMIN: normalizeBoolean(process.env.FF_CA_ADMIN, false),
};

function isFeatureEnabled(flagName) {
  const flagValue = FLAGS[flagName];
  console.log(`Feature Flag "${flagName}": ${flagValue}`);
  return Boolean(FLAGS[flagName]);
}

module.exports = {
  FLAGS,
  isFeatureEnabled,
};

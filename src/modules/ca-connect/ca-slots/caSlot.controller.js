const service = require('./caSlot.service');

exports.createSlots = async (req, res) => {
  const user = req.user;
  const data = req.body;

  const slots = await service.createOrUpdateSlots(user, data);
  res.json({ success: true, slots });
};

exports.getSlots = async (req, res) => {
  const user  = req.user;

  const slots = await service.getSlots(user);
  res.json(slots);
};

exports.blockSlot = async (req, res) => {
  const { slotId } = req.params;
  const caProfileId = req.user.caProfileId;

  await service.blockSlot(slotId, caProfileId);
  res.json({ success: true });
};

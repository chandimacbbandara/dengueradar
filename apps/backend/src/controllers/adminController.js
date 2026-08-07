import User from '../models/User.js';
import DengueCase from '../models/DengueCase.js';

/* ─── GET /api/admin/dashboard ──────────────────────────────────── */
export const getAdminDashboard = async (req, res) => {
  try {
    const [
      totalUsers,
      pendingOfficers,
      approvedOfficers,
      totalCases,
    ] = await Promise.all([
      User.countDocuments({ role: { $ne: 'admin' }, isVerified: true }),
      User.countDocuments({ role: 'moh_officer', isApproved: false, isVerified: true }),
      User.countDocuments({ role: 'moh_officer', isApproved: true }),
      DengueCase.aggregate([{ $group: { _id: null, total: { $sum: '$caseCount' } } }]),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        pendingOfficers,
        approvedOfficers,
        totalCases: totalCases[0]?.total ?? 0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ─── GET /api/admin/officers?status=pending|approved|all ───────── */
export const getOfficers = async (req, res) => {
  try {
    const { status = 'pending' } = req.query;

    const filter = { role: 'moh_officer', isVerified: true };
    if (status === 'pending')  filter.isApproved = false;
    if (status === 'approved') filter.isApproved = true;

    const officers = await User.find(filter)
      .select('-passwordHash -refreshToken -emailVerificationToken')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: officers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ─── POST /api/admin/officers/:id/approve ──────────────────────── */
export const approveOfficer = async (req, res) => {
  try {
    const officer = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'moh_officer' },
      { $set: { isApproved: true, isActive: true, rejectionReason: undefined } },
      { new: true }
    ).select('-passwordHash -refreshToken');

    if (!officer) return res.status(404).json({ success: false, message: 'Officer not found' });

    res.json({ success: true, message: `${officer.officerName} approved successfully`, data: officer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ─── POST /api/admin/officers/:id/reject ───────────────────────── */
export const rejectOfficer = async (req, res) => {
  try {
    const { reason = 'Application not approved.' } = req.body;

    const officer = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'moh_officer' },
      { $set: { isApproved: false, isActive: false, rejectionReason: reason } },
      { new: true }
    ).select('-passwordHash -refreshToken');

    if (!officer) return res.status(404).json({ success: false, message: 'Officer not found' });

    res.json({ success: true, message: `${officer.officerName} application rejected`, data: officer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ─── DELETE /api/admin/officers/:id ────────────────────────────── */
export const deleteOfficer = async (req, res) => {
  try {
    const officer = await User.findOneAndDelete({ _id: req.params.id, role: 'moh_officer' });
    if (!officer) return res.status(404).json({ success: false, message: 'Officer not found' });
    res.json({ success: true, message: 'Officer removed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ─── GET /api/admin/citizens ───────────────────────────────────── */
export const getCitizens = async (req, res) => {
  try {
    const citizens = await User.find({ role: 'general', isVerified: true })
      .select('-passwordHash -refreshToken -emailVerificationToken')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: citizens });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

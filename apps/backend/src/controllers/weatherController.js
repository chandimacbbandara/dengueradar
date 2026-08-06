import LiveWeather from '../models/LiveWeather.js';

/**
 * GET /api/weather/district/:district
 * Returns the latest weather reading for a single district.
 * District name is case-insensitive.
 */
export async function getDistrictWeather(req, res) {
  try {
    const { district } = req.params;

    const doc = await LiveWeather.findOne({
      district: { $regex: new RegExp(`^${district}$`, 'i') },
    }).lean();

    if (!doc) {
      return res.status(404).json({
        success: false,
        message: `No weather data found for district: "${district}"`,
      });
    }

    return res.json({ success: true, data: doc });
  } catch (err) {
    console.error('[weatherController] getDistrictWeather error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/**
 * GET /api/weather/all
 * Returns the latest weather reading for all 25 districts.
 * Sorted alphabetically by district name.
 */
export async function getAllDistrictWeather(req, res) {
  try {
    const docs = await LiveWeather.find({}).sort({ district: 1 }).lean();

    return res.json({
      success: true,
      count: docs.length,
      data: docs,
    });
  } catch (err) {
    console.error('[weatherController] getAllDistrictWeather error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

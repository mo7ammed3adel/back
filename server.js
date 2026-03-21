const express = require('express');
const axios   = require('axios');
const app     = express();

// ✅ الهوست الحقيقي — مخفي هنا في السيرفر
const REAL_HOST = process.env.REAL_HOST || 'http://freeiptv.ottc.xyz:80';

app.use(express.json());

// ── AUTH ──────────────────────────────────────────────────────
// التطبيق بيبعت: GET /auth?username=X&password=X
// السيرفر بيتحقق ويرجع الهوست الحقيقي للتطبيق
// بعد كده التطبيق بيكلم الموزع مباشرة بدون ما يمر بسيرفرك
// ──────────────────────────────────────────────────────────────
app.get('/auth', async (req, res) => {
  const { username, password } = req.query;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Username and password required'
    });
  }

  console.log('▶ Auth request for:', username);

  try {
    const response = await axios.get(`${REAL_HOST}/player_api.php`, {
      params: { username, password },
      timeout: 15000,
    });

    const data = response.data;

    if (data?.user_info?.auth === 1 || data?.user_info?.status === 'Active') {
      console.log('✅ Auth success for:', username);
      return res.json({
        success: true,
        // ✅ بنرجع الهوست الحقيقي للتطبيق
        // بعد كده التطبيق يكلم الموزع مباشرة
        server_url: REAL_HOST,
        username,
        password,
        user_info: {
          username:           data.user_info?.username,
          status:             data.user_info?.status,
          exp_date:           data.user_info?.exp_date,
          is_trial:           data.user_info?.is_trial,
          active_connections: data.user_info?.active_connections,
          max_connections:    data.user_info?.max_connections,
          created_at:         data.user_info?.created_at,
        },
      });
    } else {
      console.log('❌ Auth failed for:', username);
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password',
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error, please try again',
    });
  }
});

// ── PING ──────────────────────────────────────────────────────
app.get('/ping', (req, res) => {
  res.json({ status: 'alive' });
});

// ── START ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Flix TV Proxy running on port ${PORT}`);
});

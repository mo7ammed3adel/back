// ============================================
// Flix TV — Proxy Server (Node.js)
// بيعمل حاجة واحدة بس: يضيف الهوست على اللوجين
// ============================================

const express = require('express');
const axios   = require('axios');
const app     = express();

// ✅ الهوست الحقيقي — مخفي هنا في السيرفر
// المستخدم مش هيشوفه أبداً
const REAL_HOST = 'http://freeiptv.ottc.xyz:80'; // ← غيّر ده

// ============================================
// LOGIN ENDPOINT
// التطبيق بيبعت: POST /auth { username, password }
// السيرفر بيضيف الهوست ويبعت للموزع
// ============================================
app.use(express.json());

app.get('/auth', async (req, res) => {
  const { username, password } = req.query;

  if (!username || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Username and password required' 
    });
  }

  try {
    // بعت للموزع بالهوست الحقيقي
    const response = await axios.get(`${REAL_HOST}/player_api.php`, {
      params: { username, password },
      timeout: 10000,
    });

    const data = response.data;

    // تحقق إن اللوجين صح
    if (data?.user_info?.auth === 1 || data?.user_info?.status === 'Active') {
      return res.json({
        success: true,
        // ✅ بعت السيرفر بتاعك مش الهوست الحقيقي
        server_url: 'http://your-proxy-server.com', // ← عنوان سيرفرك
        username: username,
        password: password,
        user_info: {
          username:            data.user_info?.username,
          status:              data.user_info?.status,
          exp_date:            data.user_info?.exp_date,
          is_trial:            data.user_info?.is_trial,
          active_connections:  data.user_info?.active_connections,
          max_connections:     data.user_info?.max_connections,
          created_at:          data.user_info?.created_at,
        },
      });
    } else {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password',
      });
    }

  } catch (error) {
    console.error('Auth error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error, please try again',
    });
  }
});

// ============================================
// PROXY كل الـ API calls تاني
// بعد اللوجين التطبيق هيكلم سيرفرك
// وسيرفرك هيحول للموزع
// ============================================
app.get('/player_api.php', async (req, res) => {
  try {
    const response = await axios.get(`${REAL_HOST}/player_api.php`, {
      params: req.query,
      timeout: 15000,
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Proxy error' });
  }
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Flix TV Proxy running on port ${PORT}`);
  console.log(`✅ Real host: ${REAL_HOST}`);
});

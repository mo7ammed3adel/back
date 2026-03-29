const express = require('express');
const axios   = require('axios');
const cors    = require('cors'); 
const app     = express();

// ✅ هنسحب الموزعين من المتغيرات (Variables) في Railway
// لو المتغير HOSTS مش موجود، هيجيب الـ REAL_HOST القديم بتاعك كاحتياطي
const hostsString = process.env.HOSTS || process.env.REAL_HOST || 'http://freeiptv.ottc.xyz:80';
const HOSTS = hostsString.split(',').map(h => h.trim()); // بيحولهم لمصفوفة سواء موزع أو أكتر

app.use(cors());
app.use(express.json());

// ── AUTH (نظام البحث الشامل في كل الموزعين) ───────────────────────────
app.get('/auth', async (req, res) => {
  const { username, password } = req.query;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password required' });
  }

  console.log('▶ Auth request for:', username);

  // هنجرب الموزعين واحد ورا التاني
  for (const host of HOSTS) {
    try {
      // بننظف اللينك لو في آخره شرطة مايلة بالغلط
      const cleanHost = host.endsWith('/') ? host.slice(0, -1) : host;
      
      const response = await axios.get(`${cleanHost}/player_api.php`, {
        params: { username, password },
        timeout: 10000, 
      });

      const data = response.data;

      if (data?.user_info?.auth === 1 || data?.user_info?.status === 'Active') {
        console.log(`✅ Auth success for: ${username} on ${cleanHost}`);
        return res.json({
          success: true,
          server_url: cleanHost, // بنرجع للموبايل والويب اسم الموزع اللي نفع
          username,
          password,
          user_info: data.user_info,
        });
      }
    } catch (error) {
       console.log(`⚠️ Failed on ${host}, trying next...`);
    }
  }

  console.log('❌ Auth failed on all hosts for:', username);
  return res.status(401).json({ success: false, message: 'Invalid username or password' });
});

// ── PROXY (خاص بحل مشكلة الويب الشامل) ───────────────────────────
app.get('/proxy', async (req, res) => {
  try {
    const targetUrl = req.query.url; 
    
    if (!targetUrl) {
      return res.status(400).json({ success: false, message: 'Missing URL parameter' });
    }

    const response = await axios.get(targetUrl, {
      timeout: 30000,
      responseType: 'stream'
    });
    
    response.data.pipe(res);
  } catch (error) {
    console.error('❌ Proxy Error:', error.message);
    res.status(500).json({ success: false, message: 'Proxy failed' });
  }
});

app.get('/ping', (req, res) => {
  res.json({ status: 'alive' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Flix TV Dynamic Proxy running on port ${PORT}`);
});

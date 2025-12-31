/*************************
 * SenPlayer 视频嗅探终极版
 * 1. 仅 Safari 生效 
 * 2. 自动筛选最高分辨率 
 * 3. 网页单次触发防抖 
 * 4. 解决连续播放跳转问题
 *************************/

const url = $request.url;
const headers = $request.headers;
const body = $response.body;

// ==== 1️⃣ 基础环境过滤 ====
if (!url) $done({});

const ua = (headers['User-Agent'] || headers['user-agent'] || "").toLowerCase();
const referer = headers['Referer'] || headers['referer'] || "";

// 判定是否为 Safari (排除常见内置浏览器)
const isSafari = ua.includes("safari") && !/micromessenger|quark|ucbrowser|mqqbrowser/i.test(ua);

// 限制：非 Safari 且无 Referer 的请求直接丢弃
if (!isSafari && !referer) {
  $done({});
}

// ==== 2️⃣ 视频流初步过滤 ====
// 排除碎片文件，只处理 m3u8 (mp4 逻辑由 response 决定是否进入)
if (!/\.m3u8/i.test(url)) {
  $done(body ? { body } : {});
}

// ==== 3️⃣ 核心：寻找最高分辨率链接 ====
let finalUrl = url;

if (body && body.includes("#EXT-X-STREAM-INF")) {
  const lines = body.split('\n');
  let maxBandwidth = 0;
  let bestStream = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes("BANDWIDTH=")) {
      // 匹配带宽数值
      const bwMatch = line.match(/BANDWIDTH=(\d+)/);
      const currentBw = bwMatch ? parseInt(bwMatch[1]) : 0;
      
      // 获取下一行（URL）
      let nextLine = "";
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].trim() && !lines[j].startsWith("#")) {
          nextLine = lines[j].trim();
          break;
        }
      }

      if (currentBw > maxBandwidth && nextLine) {
        maxBandwidth = currentBw;
        bestStream = nextLine;
      }
    }
  }

  // 补全相对路径
  if (bestStream) {
    if (bestStream.startsWith('http')) {
      finalUrl = bestStream;
    } else if (bestStream.startsWith('/')) {
      const origin = url.match(/^https?:\/\/[^\/]+/)[0];
      finalUrl = origin + bestStream;
    } else {
      const parent = url.substring(0, url.lastIndexOf('/') + 1);
      finalUrl = parent + bestStream;
    }
  }
}

// ==== 4️⃣ 强化防抖（防止多弹窗） ====
const now = Date.now();
const lastTimeKey = 'senplayer_last_time';
const lastUrlKey = 'senplayer_last_url';

const lastTime = parseInt($persistentStore.read(lastTimeKey) || "0");
const lastUrl = $persistentStore.read(lastUrlKey) || "";

// 指纹取 URL 前 60 位，防止动态参数干扰
const urlFingerprint = finalUrl.substring(0, 60);
const lastFingerprint = lastUrl.substring(0, 60);

// 8秒冷却时间 OR URL 指纹一致，则拦截
if (urlFingerprint === lastFingerprint || (now - lastTime < 8000)) {
  $done({});
}

// 记录当前状态
$persistentStore.write(now.toString(), lastTimeKey);
$persistentStore.write(finalUrl, lastUrlKey);

// ==== 5️⃣ 发送通知 ====
const encoded = encodeURIComponent(finalUrl);
// 增加 t=${now} 强制 App 识别为新链接，解决连续点击不跳转 bug
const playUrl = `senplayer://x-callback-url/play?url=${encoded}&t=${now}`;

$notification.post(
  '🎬 发现最高画质视频',
  '点击立即跳转 SenPlayer 播放',
  finalUrl,
  {
    "url": playUrl
  }
);

$done({});

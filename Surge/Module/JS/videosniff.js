/*************************
 * SenPlayer 视频嗅探（网页单次触发版）
 *************************/

const url = $request.url;
if (!url) $done({});

// ==== 1️⃣ 基础过滤 ====
if (
  url.includes('.ts') ||
  url.includes('seg-') ||
  url.includes('segment') ||
  url.includes('chunk')
) {
  $done({});
}

// ==== 2️⃣ 只接受 m3u8 / mp4 ====
if (!/\.m3u8|\.mp4/i.test(url)) {
  $done({});
}

// ==== 3️⃣ 主流判断 ====
let score = 0;
if (url.endsWith('.mp4')) score += 3;
if (url.includes('master')) score += 3;
if (url.includes('index')) score += 2;
if (url.includes('playlist')) score += 2;
if (url.includes('1080')) score += 2;
if (url.includes('720')) score += 1;

if (score < 2) {
  $done({});
}

// ==== 4️⃣ 强化防抖（网页级锁定） ====
const now = Date.now();
const lastTimeKey = 'senplayer_last_time';
const lastUrlKey = 'senplayer_last_url';

const lastTime = $persistentStore.read(lastTimeKey) || 0;
const lastUrl = $persistentStore.read(lastUrlKey) || "";

// 提取 URL 的前 60 个字符进行比对（过滤动态参数影响）
// 或者通过时间差拦截（6秒内只准弹一个视频流）
const urlFingerprint = url.substring(0, 60);
const lastFingerprint = lastUrl.substring(0, 60);

if (urlFingerprint === lastFingerprint || (now - lastTime < 6000)) {
  $done({});
}

// 立即写入当前状态，锁定后续请求
$persistentStore.write(now.toString(), lastTimeKey);
$persistentStore.write(url, lastUrlKey);

// ==== 5️⃣ 发送通知 ====
const encoded = encodeURIComponent(url);

$notification.post(
  '🎬 发现视频主流',
  '点击使用 SenPlayer 播放',
  url,
  {
    url: `senplayer://x-callback-url/play?url=${encoded}`
  }
);

$done({});

/*************************
 * SenPlayer 视频嗅探（Safari 专用 + 网页级防抖）
 *************************/

const url = $request.url;
const headers = $request.headers;
const ua = headers['User-Agent'] || headers['user-agent'] || "";

if (!url) $done({});

// ==== 1️⃣ 限制仅在 Safari 内生效 ====
// 解释：原生 Safari 的 UA 包含 "Safari" 但不包含特定 App 内部浏览器的标识（如 "MicroMessenger" 或 "Quark"）
// 同时通过判断是否存在 referer 来确保是从网页加载的流
const isSafari = /Safari/i.test(ua) && !/AppStore|Internal|Line|WeChat|MQQBrowser/i.test(ua);
const hasReferer = headers['Referer'] || headers['referer'];

if (!isSafari || !hasReferer) {
  $done({});
}

// ==== 2️⃣ 基础过滤 ====
if (
  url.includes('.ts') ||
  url.includes('seg-') ||
  url.includes('segment') ||
  url.includes('chunk')
) {
  $done({});
}

// ==== 3️⃣ 只接受 m3u8 / mp4 ====
if (!/\.m3u8|\.mp4/i.test(url)) {
  $done({});
}

// ==== 4️⃣ 主流判断 ====
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

// ==== 5️⃣ 强化防抖（基于网页来源的单次锁定） ====
const now = Date.now();
const lastTimeKey = 'senplayer_last_time';
const lastUrlKey = 'senplayer_last_url';

const lastTime = $persistentStore.read(lastTimeKey) || 0;
const lastUrl = $persistentStore.read(lastUrlKey) || "";

// 锁定策略：6秒内不重复，或 URL 前缀一致则视为同视频
const urlFingerprint = url.substring(0, 60);
const lastFingerprint = lastUrl.substring(0, 60);

if (urlFingerprint === lastFingerprint || (now - lastTime < 6000)) {
  $done({});
}

// 立即写入锁定
$persistentStore.write(now.toString(), lastTimeKey);
$persistentStore.write(url, lastUrlKey);

// ==== 6️⃣ 发送通知 ====
const encoded = encodeURIComponent(url);

$notification.post(
  '🎬 Safari 视频嗅探',
  '点击使用 SenPlayer 播放',
  url,
  {
    url: `senplayer://x-callback-url/play?url=${encoded}`
  }
);

$done({});

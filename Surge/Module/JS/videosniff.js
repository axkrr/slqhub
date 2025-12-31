/*************************
 * SenPlayer 视频嗅探（防抖修复版）
 *************************/

// 当前请求 URL
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

// ==== 3️⃣ 主流判断（权重） ====
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

// ==== 4️⃣ 防抖修复（解决并发重复通知） ====
const key = 'senplayer_last_url';
const last = $persistentStore.read(key);

// 如果当前 URL 与上次相同，或者与上次极短时间内的记录相同则跳过
if (last === url) {
  $done({});
}

// 【修复点】立即写入缓存，防止后续并发请求穿透
$persistentStore.write(url, key);

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

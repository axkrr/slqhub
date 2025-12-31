/*************************
 * SenPlayer 视频嗅探（增强防抖版）
 *************************/

const url = $request.url;
if (!url) $done({});

// 1. 基础过滤：排除切片文件
if (/\.(ts|m4s|mp4a|mp4v)|seg-|segment|chunk/i.test(url)) {
  $done({});
}

// 2. 类型检查：仅限 m3u8 和 mp4
if (!/\.(m3u8|mp4)(\?|$)/i.test(url)) {
  $done({});
}

// 3. 权重过滤：提高准确率
let score = 0;
if (url.includes('.mp4')) score += 3;
if (url.includes('master')) score += 3;
if (url.includes('index')) score += 2;
if (url.includes('playlist')) score += 2;
if (/\b(1080|720)\b/.test(url)) score += 2;

if (score < 2) {
  $done({});
}

// 4. 增强防抖逻辑
const key = 'sen_last_url';
const lastUrl = $persistentStore.read(key);

// 检查持久化存储
if (lastUrl === url) {
  $done({});
}

// 【关键修复】使用全局变量进行内存级拦截
// 防止持久化存储写入延迟导致的瞬间重复触发
if (typeof $sen_cache !== 'undefined' && $sen_cache === url) {
  $done({});
}
globalThis.$sen_cache = url; 

// 记录到持久化存储
$persistentStore.write(url, key);

// 5. 发送通知
const encoded = encodeURIComponent(url);
$notification.post(
  '🎬 发现视频主流',
  '点击使用 SenPlayer 播放',
  url,
  { "open-url": `senplayer://x-callback-url/play?url=${encoded}` }
);

$done({});

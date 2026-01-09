/**
 * SenPlayer Video Sniff (Quantumult X only)
 * 捕获 m3u8 / mp4 并跳转 SenPlayer
 */

const url = $request.url || "";
const DEBUG = false;

// 仅处理视频流
if (!/\.(m3u8|mp4)(\?.*)?$/i.test(url)) {
  $done({});
}

// ===== 去重（防止刷通知）=====
const KEY = "senplayer_last_url";
const last = $prefs.valueForKey(KEY);

if (last === url) {
  DEBUG && console.log("[videosniff] duplicate:", url);
  $done({});
}
$prefs.setValueForKey(url, KEY);

// ===== 生成 SenPlayer URL Scheme =====
// 常见格式：senplayer://play?url=ENCODED_URL
const playUrl = "senplayer://play?url=" + encodeURIComponent(url);

// ===== 通知 =====
$notify(
  "🎬 SenPlayer 视频嗅探",
  "已捕获视频流",
  url,
  { "open-url": playUrl }
);

DEBUG && console.log("[videosniff] hit:", url);

$done({});
/**
 * @name videosniff
 * @desc 获取网页视频流跳转SenPlayer播放（优化版）
 * @author axkrr
 * @update 2026-05-18
*/

const url = $request.url || "";
const headers = $request.headers || {};

const ONCE_KEY = "senplayer_once";
const videoRegex = /\.(m3u8|mp4|mov|avi|flv)(\?.*)?$|playlist\.m3u8/i;
const isQuanX = typeof $task !== "undefined";

// 存储工具
const getVal = k => isQuanX ? $prefs.valueForKey(k) : $persistentStore.read(k);
const setVal = (k, v) => isQuanX ? $prefs.setValueForKey(v, k) : $persistentStore.write(v, k);

// 通知工具
const notify = (title, subtitle, body, url) => {
  if (isQuanX) $notify(title, subtitle, body, { "open-url": url });
  else $notification.post(title, subtitle, body, { url });
};

// 防循环 & 浏览器 UA 检查
const ua = (headers["User-Agent"] || headers["user-agent"] || "").toLowerCase();
if (ua.includes("senplayer")) {
  console.log("🚫 SenPlayer 内部请求，跳过");
  $done({});
}
if (!["safari", "applewebkit"].some(key => ua.includes(key))) {
  console.log("🚫 非浏览器请求，跳过");
  $done({});
}

// 冷却锁（30秒）
const isCooling = () => {
  const last = parseInt(getVal(ONCE_KEY) || "0");
  return Date.now() - last < 30000;
};

// 主逻辑
if (videoRegex.test(url)) {
  if (/\.m3u8/i.test(url)) {
    fetchM3U8Duration(url).then(duration => {
      if (duration < 60) {
        console.log("🚫 视频时长 < 60 秒，跳过");
        $done({});
        return;
      }
      sendNotification(url);
    }).catch(() => $done({}));
  } else {
    sendNotification(url);
  }
} else {
  $done({});
}

// 获取 m3u8 视频时长
function fetchM3U8Duration(videoUrl) {
  if (isQuanX) {
    return $task.fetch({ url: videoUrl }).then(resp => {
      const body = resp.body || "";
      return parseM3U8Duration(body);
    });
  } else {
    return new Promise((resolve, reject) => {
      $httpClient.get({ url: videoUrl }, (err, resp, body) => {
        if (err) reject(err);
        else resolve(parseM3U8Duration(body || ""));
      });
    });
  }
}

// 解析 m3u8 时长
function parseM3U8Duration(content) {
  let duration = 0;
  content.split("\n").forEach(line => {
    if (line.startsWith("#EXTINF:")) {
      duration += parseFloat(line.replace("#EXTINF:", "")) || 0;
    }
  });
  return duration;
}

// 发送通知
function sendNotification(playUrl) {
  if (isCooling()) return;
  const senUrl = "senplayer://x-callback-url/play?url=" + encodeURIComponent(playUrl) + "&force=true";
  notify("🎬 SenPlayer", "发现视频流", "点击跳转播放", senUrl);
  setVal(ONCE_KEY, Date.now().toString());
  console.log("✅ 已发送通知");
}
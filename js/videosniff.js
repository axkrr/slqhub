/**
 * @name videosniff
 * @desc 获取网页视频流跳转SenPlayer播放（优化版+详细日志）
 * @author axkrr
 * @update 2026-05-18
*/

const url = $request.url || "";
const headers = $request.headers || {};

const ONCE_KEY = "senplayer_once"; // 冷却锁
const PAGE_KEY = "senplayer_page"; // 页面标识
const videoRegex = /\.(m3u8|mp4|mov|avi|flv)(\?.*)?$|playlist\.m3u8/i;
const isQuanX = typeof $task !== "undefined";

// 存储工具
const getVal = k => isQuanX ? $prefs.valueForKey(k) : $persistentStore.read(k);
const setVal = (k, v) => isQuanX ? $prefs.setValueForKey(v, k) : $persistentStore.write(v, k);

// 通知工具
const notify = (title, subtitle, body, url) => {
  console.log(`📣 通知: ${title} | ${subtitle} | ${body} | url=${url}`);
  if (isQuanX) $notify(title, subtitle, body, { "open-url": url });
  else $notification.post(title, subtitle, body, { url });
};

// --- 日志 ---
console.log("🔹 脚本启动");
console.log(`🔹 请求 URL: ${url}`);
console.log(`🔹 请求 UA: ${headers["User-Agent"] || headers["user-agent"] || "N/A"}`);
console.log(`🔹 请求 Referer: ${headers["Referer"] || headers["referer"] || "N/A"}`);

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

// 页面刷新检测
const currentPage = headers["Referer"] || url;
const lastPage = getVal(PAGE_KEY);
if (lastPage !== currentPage) {
  console.log("🔹 页面刷新，重置冷却锁");
  setVal(PAGE_KEY, currentPage);
  setVal(ONCE_KEY, "0"); // 页面刷新后重置冷却锁
} else {
  console.log("🔹 同一页面，使用现有冷却锁");
}

// 冷却锁（30秒）
const isCooling = () => {
  const last = parseInt(getVal(ONCE_KEY) || "0");
  const diff = Date.now() - last;
  console.log(`🔹 冷却锁检查: 上次触发=${last}, 当前时间=${Date.now()}, 差值=${diff}ms`);
  return diff < 30000;
};

// 主逻辑
if (videoRegex.test(url)) {
  console.log("🔹 视频链接匹配成功");
  if (/\.m3u8/i.test(url)) {
    console.log("🔹 检测到 m3u8 视频，开始获取时长");
    fetchM3U8Duration(url).then(duration => {
      console.log(`🔹 m3u8 视频时长: ${duration} 秒`);
      if (duration < 60) {
        console.log("🚫 视频时长 < 60 秒，跳过");
        $done({});
        return;
      }
      sendNotification(url, headers);
    }).catch(err => {
      console.log("❌ 获取 m3u8 时长失败:", err);
      $done({});
    });
  } else {
    console.log("🔹 非 m3u8 视频，直接通知");
    sendNotification(url, headers);
  }
} else {
  console.log("🔹 链接不匹配视频格式，跳过");
  $done({});
}

// 获取 m3u8 视频时长
function fetchM3U8Duration(videoUrl) {
  console.log(`🔹 fetchM3U8Duration: ${videoUrl}`);
  if (isQuanX) {
    return $task.fetch({ url: videoUrl }).then(resp => {
      console.log("🔹 m3u8 请求成功 (QuanX)");
      return parseM3U8Duration(resp.body || "");
    });
  } else {
    return new Promise((resolve, reject) => {
      $httpClient.get({ url: videoUrl }, (err, resp, body) => {
        if (err) {
          console.log("❌ m3u8 请求失败:", err);
          reject(err);
        } else {
          console.log("🔹 m3u8 请求成功 (Loon/Surge)");
          resolve(parseM3U8Duration(body || ""));
        }
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
  console.log(`🔹 解析 m3u8 时长完成: ${duration} 秒`);
  return duration;
}

// 发送通知，携带 UA 和 Referer
function sendNotification(playUrl, reqHeaders) {
  if (isCooling()) {
    console.log("🔹 冷却中，通知已跳过");
    return;
  }
  const referer = encodeURIComponent(reqHeaders["Referer"] || reqHeaders["referer"] || "");
  const userAgent = encodeURIComponent(reqHeaders["User-Agent"] || reqHeaders["user-agent"] || "");
  const senUrl = `senplayer://x-callback-url/play?url=${encodeURIComponent(playUrl)}&force=true&referer=${referer}&ua=${userAgent}`;
  console.log("🔹 发送 SenPlayer 通知 URL:", senUrl);
  notify("🎬 SenPlayer", "发现视频流", "点击跳转播放", senUrl);
  setVal(ONCE_KEY, Date.now().toString());
  console.log("✅ 已发送通知，更新冷却锁");
}
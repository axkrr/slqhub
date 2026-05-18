/**
 * @name videosniff
 * @desc 获取网页视频流跳转SenPlayer播放（最终可播放 m3u8 / mp4）
 * @author axkrr
 * @update 2026-05-18
*/

const url = $request.url || "";
const headers = $request.headers || {};

const ONCE_KEY = "senplayer_once";
const PAGE_KEY = "senplayer_page";
const videoRegex = /\.(m3u8|mp4|mov|avi|flv)(\?.*)?$|playlist\.m3u8/i;
const isQuanX = typeof $task !== "undefined";

// 存储
const getVal = k => isQuanX ? $prefs.valueForKey(k) : $persistentStore.read(k);
const setVal = (k, v) => isQuanX ? $prefs.setValueForKey(v, k) : $persistentStore.write(v, k);

// 通知
const notify = (t, s, b, u) => {
  console.log(`📣 通知: ${t} | ${s} | ${b} | ${u}`);
  if (isQuanX) $notify(t, s, b, { "open-url": u });
  else $notification.post(t, s, b, { url: u });
};

// --- 日志 ---
console.log("🔹 脚本启动");
console.log(`🔹 请求 URL: ${url}`);
console.log(`🔹 请求 UA: ${headers["User-Agent"] || headers["user-agent"] || "N/A"}`);
console.log(`🔹 请求 Referer: ${headers["Referer"] || headers["referer"] || "N/A"}`);

// UA 检查
const ua = (headers["User-Agent"] || headers["user-agent"] || "").toLowerCase();
if (ua.includes("senplayer")) { console.log("🚫 SenPlayer 内部请求，跳过"); $done({}); }
if (!["safari", "applewebkit"].some(key => ua.includes(key))) { console.log("🚫 非浏览器请求，跳过"); $done({}); }

// 页面刷新检测
const currentPage = headers["Referer"] || url;
if (getVal(PAGE_KEY) !== currentPage) {
  console.log("🔹 页面刷新，重置冷却锁");
  setVal(PAGE_KEY, currentPage);
  setVal(ONCE_KEY, "0");
} else console.log("🔹 同一页面，使用现有冷却锁");

// 冷却锁
const isCooling = () => {
  const last = parseInt(getVal(ONCE_KEY) || "0");
  console.log(`🔹 冷却锁检查: ${Date.now() - last}ms`);
  return Date.now() - last < 30000;
};

// 主逻辑
if (!videoRegex.test(url)) { console.log("🔹 链接不匹配视频格式，跳过"); $done({}); }
console.log("🔹 视频链接匹配成功");

if (/\.m3u8/i.test(url)) {
  console.log("🔹 m3u8 视频，获取最终 TS 链接生成可播放 m3u8");
  fetchM3U8Final(url).then(finalM3U8 => {
    if (!finalM3U8) { console.log("❌ 无有效 m3u8"); $done({}); return; }
    sendNotification(finalM3U8, headers);
  }).catch(err => { console.log("❌ m3u8 获取失败:", err); $done({}); });
} else {
  console.log("🔹 非 m3u8 视频，获取最终可下载 URL");
  fetchFinalUrl(url).then(finalUrl => {
    if (!finalUrl) { console.log("❌ 无效视频 URL"); $done({}); return; }
    sendNotification(finalUrl, headers);
  }).catch(err => { console.log("❌ 获取视频 URL 失败:", err); $done({}); });
}

// === 辅助函数 ===

// 获取最终 m3u8
function fetchM3U8Final(m3u8Url) {
  return new Promise((resolve, reject) => {
    console.log("🔹 fetchM3U8Final:", m3u8Url);
    const options = { url: m3u8Url };
    const clientCallback = (err, resp, body) => {
      if (err || !body) { reject(err || "body empty"); return; }
      console.log("🔹 m3u8 获取成功，解析 TS URL");
      const lines = body.split("\n");
      let base = m3u8Url.split("/").slice(0, -1).join("/") + "/";
      let tsUrls = lines.map(line => line && !line.startsWith("#") ? (line.startsWith("http") ? line : base + line) : null).filter(Boolean);
      if (tsUrls.length === 0) { reject("no TS"); return; }
      let finalM3U8 = "#EXTM3U\n" + tsUrls.map(u => `#EXTINF:10,\n${u}`).join("\n");
      resolve(`data:application/vnd.apple.mpegurl;base64,${Buffer.from(finalM3U8).toString("base64")}`);
    };

    if (isQuanX) $task.fetch(options).then(resp => clientCallback(null, resp, resp.body)).catch(reject);
    else $httpClient.get(options, clientCallback);
  });
}

// 获取最终重定向 URL
function fetchFinalUrl(videoUrl) {
  return new Promise((resolve, reject) => {
    console.log("🔹 fetchFinalUrl:", videoUrl);
    if (isQuanX) {
      $task.fetch({ url: videoUrl }).then(resp => resolve(resp.finalUrl || videoUrl)).catch(reject);
    } else {
      $httpClient.get({ url: videoUrl, followRedirect: true }, (err, resp) => {
        if (err) reject(err);
        else resolve(resp ? (resp.headers && resp.headers.Location ? resp.headers.Location : videoUrl) : videoUrl);
      });
    }
  });
}

// 发送通知
function sendNotification(playUrl, reqHeaders) {
  if (isCooling()) { console.log("🔹 冷却中，通知跳过"); return; }
  const referer = encodeURIComponent(reqHeaders["Referer"] || reqHeaders["referer"] || "");
  const userAgent = encodeURIComponent(reqHeaders["User-Agent"] || reqHeaders["user-agent"] || "");
  const senUrl = `senplayer://x-callback-url/play?url=${encodeURIComponent(playUrl)}&force=true&referer=${referer}&ua=${userAgent}`;
  console.log("🔹 发送 SenPlayer 通知 URL:", senUrl);
  notify("🎬 SenPlayer", "发现视频流", "点击跳转播放", senUrl);
  setVal(ONCE_KEY, Date.now().toString());
  console.log("✅ 通知已发送，更新冷却锁");
}
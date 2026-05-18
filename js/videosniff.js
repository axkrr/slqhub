/**
 * @name videosniff_direct
 * @desc 点击网页视频直接跳转 SenPlayer 播放
 * @author axkrr
 * @update 2026-05-18
*/

const url = $request.url || "";
const method = $request.method || "GET";
const headers = $request.headers || {};

const isQuanX = typeof $task !== "undefined";

// 视频匹配
const videoRegex = /\.(m3u8|mp4|mov|m4v|avi|flv|webm)(\?.*)?$|playlist\.m3u8/i;

// UA
const ua = (headers["User-Agent"] || headers["user-agent"] || "").toLowerCase();
const referer = headers["Referer"] || headers["referer"] || "";

// 日志
console.log("════════════════════════════");
console.log("🎬 videosniff_direct 启动");
console.log(`🔹 Method: ${method}`);
console.log(`🔹 URL: ${url}`);
console.log(`🔹 UA: ${ua}`);
console.log(`🔹 Referer: ${referer}`);

// 防止 SenPlayer 自己再次触发
if (ua.includes("senplayer")) {
  console.log("🚫 SenPlayer 内部请求，跳过");
  console.log("════════════════════════════");
  $done({});
}

// 仅处理浏览器请求
if (!["safari", "applewebkit"].some(k => ua.includes(k))) {
  console.log("🚫 非浏览器请求");
  console.log("════════════════════════════");
  $done({});
}

// 匹配视频
if (!videoRegex.test(url)) {
  console.log("🚫 非视频资源");
  console.log("════════════════════════════");
  $done({});
}

console.log("✅ 命中视频资源");

// 构建 SenPlayer URL
const senUrl =
  "senplayer://x-callback-url/play?" +
  "url=" + encodeURIComponent(url) +
  "&referer=" + encodeURIComponent(referer) +
  "&ua=" + encodeURIComponent(headers["User-Agent"] || headers["user-agent"] || "") +
  "&force=true";

console.log("🔹 SenPlayer URL:");
console.log(senUrl);

// 302 跳转
console.log("✅ 执行跳转");
console.log("════════════════════════════");

$done({
  status: "HTTP/1.1 302 Found",
  headers: {
    Location: senUrl
  }
});
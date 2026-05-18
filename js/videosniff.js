/**
 * @name videosniff_direct
 * @desc 网页端点击视频直接跳转 SenPlayer 播放，无需通知
 * @author axkrr
 * @update 2026-05-18
 */

const url = $request.url || "";
const headers = $request.headers || {};

const videoRegex = /\.(m3u8|mp4|mov|avi|flv)(\?.*)?$|playlist\.m3u8/i;
const isQuanX = typeof $task !== "undefined";

// UA 检查
const ua = (headers["User-Agent"] || headers["user-agent"] || "").toLowerCase();
if (!["safari", "applewebkit"].some(key => ua.includes(key))) {
    console.log("🚫 非浏览器请求，跳过");
    $done({});
}

// 如果是视频链接，则直接跳转 SenPlayer
if (videoRegex.test(url)) {
    const referer = encodeURIComponent(headers["Referer"] || headers["referer"] || "");
    const userAgent = encodeURIComponent(headers["User-Agent"] || headers["user-agent"] || "");
    const senUrl = `senplayer://x-callback-url/play?url=${encodeURIComponent(url)}&force=true&referer=${referer}&ua=${userAgent}`;
    console.log("🔹 视频点击直接跳转 SenPlayer:", senUrl);
    
    // 对网页直接跳转
    $done({
        status: 302,
        headers: { "Location": senUrl },
    });
} else {
    $done({});
}
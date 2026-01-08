/*************************
 * SenPlayer 视频嗅探（QX 专用稳定版）
 * 1. 仅 Safari 生效
 * 2. 自动选择最高码率 m3u8
 * 3. 强防抖（同视频只弹一次）
 * 4. 解决 QX 多次 response 触发
 *************************/

// ===== 基础对象 =====
const url = $request.url || "";
const headers = $request.headers || {};
const body = $response && $response.body;

// ===== 兜底 =====
if (!url || !body) {
  $done({});
}

// ===== Safari 判定 =====
const ua = (headers["User-Agent"] || headers["user-agent"] || "").toLowerCase();
const referer = headers["Referer"] || headers["referer"] || "";

const isSafari =
  ua.includes("safari") &&
  !/micromessenger|qq|weibo|quark|ucbrowser|mqqbrowser/i.test(ua);

// 非 Safari 且无 Referer，直接放行
if (!isSafari && !referer) {
  $done({});
}

// ===== 仅处理 m3u8 =====
if (!/\.m3u8(\?|$)/i.test(url)) {
  $done({});
}

// ===== 必须是 master playlist =====
if (!body.includes("#EXT-X-STREAM-INF")) {
  $done({});
}

// ===== 解析最高码率 =====
let finalUrl = url;
let maxBandwidth = 0;

const lines = body.split("\n");

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  if (line.startsWith("#EXT-X-STREAM-INF")) {
    const bwMatch = line.match(/BANDWIDTH=(\d+)/i);
    const bw = bwMatch ? parseInt(bwMatch[1], 10) : 0;

    // 找下一条非注释行
    let next = "";
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j] && !lines[j].startsWith("#")) {
        next = lines[j].trim();
        break;
      }
    }

    if (bw > maxBandwidth && next) {
      maxBandwidth = bw;

      if (next.startsWith("http")) {
        finalUrl = next;
      } else if (next.startsWith("/")) {
        const origin = url.match(/^https?:\/\/[^/]+/)[0];
        finalUrl = origin + next;
      } else {
        const base = url.substring(0, url.lastIndexOf("/") + 1);
        finalUrl = base + next;
      }
    }
  }
}

// ===== 强防抖（QX 核心） =====
const DEDUP_KEY = "senplayer_video_fingerprint";
const TIME_KEY = "senplayer_video_time";

const now = Date.now();
const fingerprint = finalUrl.substring(0, 120);

const lastFp = $persistentStore.read(DEDUP_KEY);
const lastTime = parseInt($persistentStore.read(TIME_KEY) || "0", 10);

// 同视频 or 10 秒内，直接拦截
if (fingerprint === lastFp || now - lastTime < 10000) {
  $done({});
}

// 写入状态
$persistentStore.write(fingerprint, DEDUP_KEY);
$persistentStore.write(String(now), TIME_KEY);

// ===== SenPlayer 跳转 =====
const encoded = encodeURIComponent(finalUrl);
const playUrl = `senplayer://x-callback-url/play?url=${encoded}&t=${now}`;

$notification.post(
  "🎬 发现最高画质视频",
  "点击使用 SenPlayer 播放",
  finalUrl,
  { url: playUrl }
);

$done({});
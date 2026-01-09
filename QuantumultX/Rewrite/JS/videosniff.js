/*************************
 * SenPlayer Video Sniff (QX FINAL)
 * Author: axkr
 * QX 专用，禁止 entry/core 包裹
 *************************/

const url = $request.url || "";
const headers = $request.headers || {};
const body = $response && $response.body;

// ---------- 基础校验 ----------
if (!url) {
  $done({});
  return;
}

// 仅处理 m3u8 / mp4
if (!/\.(m3u8|mp4)(\?.*)?$/i.test(url)) {
  $done(body ? { body } : {});
  return;
}

// ---------- Safari 判断 ----------
const ua = (headers["User-Agent"] || headers["user-agent"] || "").toLowerCase();
const referer = headers["Referer"] || headers["referer"] || "";
const isSafari =
  ua.includes("safari") &&
  !/micromessenger|qq|quark|ucbrowser|mqqbrowser/i.test(ua);

if (!isSafari && !referer) {
  $done(body ? { body } : {});
  return;
}

// ---------- m3u8 最高码率选择 ----------
let finalUrl = url;

if (body && body.includes("#EXT-X-STREAM-INF")) {
  const lines = body.split("\n");
  let maxBw = 0;
  let best = "";

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("BANDWIDTH=")) {
      const m = lines[i].match(/BANDWIDTH=(\d+)/);
      const bw = m ? parseInt(m[1]) : 0;

      let next = "";
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j] && !lines[j].startsWith("#")) {
          next = lines[j].trim();
          break;
        }
      }

      if (bw > maxBw && next) {
        maxBw = bw;
        best = next;
      }
    }
  }

  if (best) {
    if (best.startsWith("http")) {
      finalUrl = best;
    } else if (best.startsWith("/")) {
      const origin = url.match(/^https?:\/\/[^\/]+/)[0];
      finalUrl = origin + best;
    } else {
      const base = url.substring(0, url.lastIndexOf("/") + 1);
      finalUrl = base + best;
    }
  }
}

// ---------- 防重复 ----------
const now = Date.now();
const TIME_KEY = "senplayer_last_time";
const URL_KEY = "senplayer_last_url";

const lastTime = parseInt($prefs.valueForKey(TIME_KEY) || "0");
const lastUrl = $prefs.valueForKey(URL_KEY) || "";

const fp = finalUrl.substring(0, 80);
const lastFp = lastUrl.substring(0, 80);

// 8 秒内或同链接不再触发
if (fp === lastFp || now - lastTime < 8000) {
  $done(body ? { body } : {});
  return;
}

$prefs.setValueForKey(String(now), TIME_KEY);
$prefs.setValueForKey(finalUrl, URL_KEY);

// ---------- SenPlayer 跳转 ----------
const playUrl =
  "senplayer://x-callback-url/play?url=" +
  encodeURIComponent(finalUrl) +
  "&t=" +
  now;

$notification.post(
  "🎬 发现视频资源",
  "点击使用 SenPlayer 播放",
  finalUrl,
  { url: playUrl }
);

// 必须原样放行响应
$done(body ? { body } : {});
/*************************
 * SenPlayer 视频嗅探（最高画质优先版）
 * 需配置为 http-response 类型
 *************************/

const url = $request.url;
const headers = $request.headers;
const body = $response.body; // 获取返回的文件内容

// 1️⃣ 基础过滤与 Safari 判断
const ua = (headers['User-Agent'] || headers['user-agent'] || "").toLowerCase();
const isSafari = ua.includes("safari") && !/micromessenger|quark|ucbrowser|mqqbrowser/i.test(ua);
const referer = headers['Referer'] || headers['referer'] || "";

if (!url || (!isSafari && !referer)) {
  $done({});
}

// 2️⃣ 仅处理 m3u8
if (!/\.m3u8/i.test(url)) {
  $done(body ? { body } : {});
}

// 3️⃣ 核心：寻找最高分辨率链接
let finalUrl = url;

if (body && body.includes("#EXT-X-STREAM-INF")) {
  const lines = body.split('\n');
  let maxBandwidth = 0;
  let bestStream = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes("BANDWIDTH=")) {
      // 提取带宽数值
      const bwMatch = line.match(/BANDWIDTH=(\d+)/);
      const currentBw = bwMatch ? parseInt(bwMatch[1]) : 0;
      
      // 下一行通常是 URL
      const nextLine = lines[i + 1] && lines[i + 1].trim();
      if (currentBw > maxBandwidth && nextLine && !nextLine.startsWith("#")) {
        maxBandwidth = currentBw;
        bestStream = nextLine;
      }
    }
  }

  if (bestStream) {
    // 处理相对路径
    if (bestStream.startsWith('http')) {
      finalUrl = bestStream;
    } else if (bestStream.startsWith('/')) {
      const origin = url.match(/^https?:\/\/[^\/]+/)[0];
      finalUrl = origin + bestStream;
    } else {
      const parent = url.substring(0, url.lastIndexOf('/') + 1);
      finalUrl = parent + bestStream;
    }
  }
}

// 4️⃣ 防抖逻辑（同一视频仅一次）
const now = Date.now();
const lastTimeKey = 'senplayer_last_time';
const lastUrlKey = 'senplayer_last_url';
const lastTime = parseInt($persistentStore.read(lastTimeKey) || "0");
const lastUrl = $persistentStore.read(lastUrlKey) || "";

// 针对最高画质地址进行防抖校验
if (finalUrl === lastUrl || (now - lastTime < 8000)) {
  $done({});
}

// 写入锁定
$persistentStore.write(now.toString(), lastTimeKey);
$persistentStore.write(finalUrl, lastUrlKey);

// 5️⃣ 发送通知
const encoded = encodeURIComponent(finalUrl);
$notification.post(
  '🎬 发现最高画质视频',
  '已自动筛选最佳分辨率，点击播放',
  finalUrl,
  {
    url: `senplayer://x-callback-url/play?url=${encoded}`
  }
);

$done({});

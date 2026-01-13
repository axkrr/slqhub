/**
 * @name senplayervideosniff
 * @desc 获取网页视频流跳转SenPlayer播放
 * @author axkrr
*/

const url = $request.url;
const headers = $request.headers;
const body = $response.body;

// 基础环境过滤
if (!url) $done({});

const ua = (headers['User-Agent'] || headers['user-agent'] || "").toLowerCase();
const referer = headers['Referer'] || headers['referer'] || "";

// 判定是否为Safari
const isSafari = ua.includes("safari") && !/micromessenger|quark|ucbrowser|mqqbrowser/i.test(ua);

// 非Safari且无Referer的请求直接丢弃
if (!isSafari && !referer) {
  $done({});
}

// 视频流初步过滤
// 排除碎片文件只处理m3u8
if (!/\.m3u8/i.test(url)) {
  $done(body ? { body } : {});
}

// 寻找最高分辨率链接
let finalUrl = url;

if (body && body.includes("#EXT-X-STREAM-INF")) {
  const lines = body.split('\n');
  let maxBandwidth = 0;
  let bestStream = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes("BANDWIDTH=")) {
      // 匹配带宽数值
      const bwMatch = line.match(/BANDWIDTH=(\d+)/);
      const currentBw = bwMatch ? parseInt(bwMatch[1]) : 0;
      
      // 获取下一行（URL）
      let nextLine = "";
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].trim() && !lines[j].startsWith("#")) {
          nextLine = lines[j].trim();
          break;
        }
      }

      if (currentBw > maxBandwidth && nextLine) {
        maxBandwidth = currentBw;
        bestStream = nextLine;
      }
    }
  }

  // 补全相对路径
  if (bestStream) {
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

// 强化防抖
const now = Date.now();
const lastTimeKey = 'senplayer_last_time';
const lastUrlKey = 'senplayer_last_url';

const lastTime = parseInt($persistentStore.read(lastTimeKey) || "0");
const lastUrl = $persistentStore.read(lastUrlKey) || "";

// 指纹取URL前60位,防止动态参数干扰
const urlFingerprint = finalUrl.substring(0, 60);
const lastFingerprint = lastUrl.substring(0, 60);

// 8秒冷却时间OR URL指纹一致则拦截
if (urlFingerprint === lastFingerprint || (now - lastTime < 8000)) {
  $done({});
}

// 记录当前状态
$persistentStore.write(now.toString(), lastTimeKey);
$persistentStore.write(finalUrl, lastUrlKey);

// 发送通知
const encoded = encodeURIComponent(finalUrl);
// 强制App识别新链接
const playUrl = `senplayer://x-callback-url/play?url=${encoded}&t=${now}`;

$notification.post(
  '🎬发现最高画质视频',
  '点击立即跳转 SenPlayer 播放',
  finalUrl,
  {
    "url": playUrl
  }
);

$done({});

/**
 * SenPlayer 视频嗅探终极版 (QX)
 * 功能：
 * 1️⃣ 仅 Safari 生效
 * 2️⃣ 自动筛选最高分辨率
 * 3️⃣ 防抖处理
 * 4️⃣ 连续播放跳转问题修复
 */

const url = $request.url;
const headers = $request.headers || {};
const body = $response.body || "";

// —— 1️⃣ 基础环境过滤 ——
if (!url) $done({});

const ua = (headers['User-Agent'] || headers['user-agent'] || "").toLowerCase();
const referer = headers['Referer'] || headers['referer'] || "";

// 判定 Safari (排除常见内置浏览器)
const isSafari = ua.includes("safari") && !/micromessenger|quark|ucbrowser|mqqbrowser/i.test(ua);

// 非 Safari 且无 referer 直接返回
if (!isSafari && !referer) $done({});

// —— 2️⃣ 视频流初步过滤 ——
if (!/\.m3u8/i.test(url)) $done({ body });

// —— 3️⃣ 核心：寻找最高分辨率链接 ——
let finalUrl = url;

if (body.includes("#EXT-X-STREAM-INF")) {
    const lines = body.split('\n');
    let maxBw = 0, bestStream = "";

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes("BANDWIDTH=")) {
            const bwMatch = line.match(/BANDWIDTH=(\d+)/);
            const curBw = bwMatch ? parseInt(bwMatch[1]) : 0;

            // 找到下一行 URL
            let nextLine = "";
            for (let j = i + 1; j < lines.length; j++) {
                if (lines[j].trim() && !lines[j].startsWith("#")) {
                    nextLine = lines[j].trim();
                    break;
                }
            }

            if (curBw > maxBw && nextLine) {
                maxBw = curBw;
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

// —— 4️⃣ 防抖处理 ——
const now = Date.now();
const lastTimeKey = 'senplayer_last_time';
const lastUrlKey = 'senplayer_last_url';

const lastTime = parseInt($persistentStore.read(lastTimeKey) || "0");
const lastUrl = $persistentStore.read(lastUrlKey) || "";

const urlFp = finalUrl.substring(0, 60);
const lastFp = lastUrl.substring(0, 60);

// 8秒冷却 OR URL 指纹一致
if (urlFp === lastFp || (now - lastTime < 8000)) $done({});

// 记录当前状态
$persistentStore.write(now.toString(), lastTimeKey);
$persistentStore.write(finalUrl, lastUrlKey);

// —— 5️⃣ 发送通知 ——
const encoded = encodeURIComponent(finalUrl);
const playUrl = `senplayer://x-callback-url/play?url=${encoded}&t=${now}`;

$notification.post(
    '🎬 发现最高画质视频',
    '点击立即跳转 SenPlayer 播放',
    finalUrl,
    { "url": playUrl }
);

$done({});
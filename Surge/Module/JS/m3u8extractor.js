/**
 * @name 全网视频嗅探 (BoxJs 适配版)
 * @desc 监控全网 m3u8，读取 BoxJs 配置实现动态播放器跳转
 */

const body = $response.body;
const url = $request.url;

// --- 阶段 A: 处理信号并读取 BoxJs 配置触发跳转 ---
if (url.includes('surge_click_to_play=')) {
    const videoUrl = decodeURIComponent(url.split('surge_click_to_play=')[1]);
    
    // 1. 读取 BoxJs 配置 (对应 ID: scheme)
    let boxData = $persistentStore.read("scheme");
    let playerSelect = "SenPlayer"; // 默认值
    let customScheme = "";

    if (boxData) {
        try {
            let obj = JSON.parse(boxData);
            playerSelect = obj.scheme_select || "SenPlayer";
            customScheme = obj.scheme_custom || "";
        } catch (e) {
            console.log("BoxJs 配置解析失败，使用默认播放器");
        }
    }

    // 2. 根据 BoxJs 选择构造跳转协议
    let finalScheme = "";
    switch (playerSelect) {
        case "nPlayer":
            finalScheme = "nplayer-" + videoUrl;
            break;
        case "Infuse":
            finalScheme = "infuse://x-callback-url/play?url=" + encodeURIComponent(videoUrl);
            break;
        case "Safari":
            finalScheme = videoUrl;
            break;
        case "自定义":
            finalScheme = customScheme + videoUrl;
            break;
        case "SenPlayer":
        default:
            finalScheme = "senplayer://" + videoUrl;
            break;
    }

    // 3. 发送 Surge 通知
    $notification.post(
        "🎬 视频提取成功",
        `已适配播放器: ${playerSelect} (点击播放)`,
        "URL: " + videoUrl.split('?')[0],
        { "open-url": finalScheme }
    );
    
    $done({ status: "HTTP/1.1 204 No Content" });
} 

// --- 阶段 B: 注入 Tampermonkey 监控内核 (保持不变) ---
else if (body && body.includes('</head>')) {
    const injectCode = `
    <script>
    (function() {
        'use strict';
        const foundUrls = new Set();
        function sendToSurge(mUrl) {
            if (mUrl && mUrl.includes('.m3u8') && !foundUrls.has(mUrl)) {
                foundUrls.add(mUrl);
                const img = new Image();
                img.src = '/surge_click_to_play=' + encodeURIComponent(mUrl);
            }
        }
        const originalXHR = window.XMLHttpRequest.prototype.open;
        window.XMLHttpRequest.prototype.open = function(method, url) {
            if (typeof url === 'string' && url.includes('.m3u8')) sendToSurge(url);
            return originalXHR.apply(this, arguments);
        };
        const originalFetch = window.fetch;
        window.fetch = function(url, options) {
            const tUrl = (typeof url === 'string') ? url : (url && url.url ? url.url : "");
            if (tUrl && tUrl.includes('.m3u8')) sendToSurge(tUrl);
            return originalFetch.apply(this, arguments);
        };
        setInterval(() => {
            document.querySelectorAll('video, source').forEach(t => {
                const s = t.src || t.getAttribute('src');
                if (s && s.includes('.m3u8')) sendToSurge(s);
            });
        }, 2000);
    })();
    </script>
    `;
    $done({ body: body.replace('</head>', injectCode + '</head>') });
} else {
    $done({});
}

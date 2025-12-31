/**
 * @name 视频流提取器 (Surge 规范修复版)
 * @desc 修复 illegal result 报错，完善 BoxJs 读取与 SenPlayer 跳转
 */

const body = $response ? $response.body : null;
const url = $request.url;

// --- 阶段 A: 处理信号并触发跳转通知 ---
if (url.indexOf('surge_click_to_play=') != -1) {
    const videoUrl = decodeURIComponent(url.split('surge_click_to_play=')[1]);
    
    // 1. 读取 BoxJs 配置
    let playerSelect = "SenPlayer";
    let customScheme = "";
    const boxData = $persistentStore.read("scheme");
    
    if (boxData) {
        try {
            const obj = JSON.parse(boxData);
            playerSelect = obj.scheme_select || "SenPlayer";
            customScheme = obj.scheme_custom || "";
        } catch (e) { }
    }

    // 2. 构造跳转协议 (兼容 SenPlayer 标准格式)
    let finalScheme = "";
    if (playerSelect === "SenPlayer" || !playerSelect) {
        // SenPlayer 建议使用 Base64 规避特殊字符干扰跳转
        const base64Url = btoa(unescape(encodeURIComponent(videoUrl)));
        finalScheme = "senplayer://play?url=" + base64Url;
    } else if (playerSelect === "nPlayer") {
        finalScheme = "nplayer-" + videoUrl;
    } else if (playerSelect === "Infuse") {
        finalScheme = "infuse://x-callback-url/play?url=" + encodeURIComponent(videoUrl);
    } else if (playerSelect === "自定义" && customScheme) {
        finalScheme = customScheme + videoUrl;
    } else {
        finalScheme = videoUrl; // Safari
    }

    // 3. 推送通知
    $notification.post(
        "🎬 视频提取成功",
        "点击跳转 " + playerSelect + " 播放",
        "文件: " + videoUrl.split('?')[0].split('/').pop(),
        { "open-url": finalScheme }
    );
    
    // 修复点：确保返回合法的响应对象，避免 "illegal result"
    $done({
        response: {
            status: 204,
            headers: { "Content-Type": "text/plain" },
            body: ""
        }
    });
} 

// --- 阶段 B: 注入监控内核 ---
else if (body && body.indexOf('</head>') != -1) {
    const injectCode = `
    <script>
    (function() {
        'use strict';
        const foundUrls = new Set();
        function sendToSurge(mUrl) {
            if (mUrl && mUrl.indexOf('.m3u8') != -1 && !foundUrls.has(mUrl)) {
                foundUrls.add(mUrl);
                const img = new Image();
                img.src = '/surge_click_to_play=' + encodeURIComponent(mUrl);
            }
        }
        const originalXHR = window.XMLHttpRequest.prototype.open;
        window.XMLHttpRequest.prototype.open = function(method, url) {
            if (typeof url === 'string' && url.indexOf('.m3u8') != -1) sendToSurge(url);
            return originalXHR.apply(this, arguments);
        };
        const originalFetch = window.fetch;
        window.fetch = function(url, options) {
            const tUrl = (typeof url === 'string') ? url : (url && url.url ? url.url : "");
            if (tUrl && tUrl.indexOf('.m3u8') != -1) sendToSurge(tUrl);
            return originalFetch.apply(this, arguments);
        };
        setInterval(() => {
            const tags = document.querySelectorAll('video, source');
            tags.forEach(t => {
                const s = t.src || t.getAttribute('src');
                if (s && s.indexOf('.m3u8') != -1) sendToSurge(s);
            });
        }, 2000);
    })();
    </script>
    `;
    $done({ body: body.replace('</head>', injectCode + '</head>') });
} 

// --- 阶段 C: 兜底处理 ---
else {
    $done({ body: body || "" });
}

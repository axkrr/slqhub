/**
 * @name 视频流嗅探提取跳转器 (BoxJs 兼容强化版)
 */

const isResponse = typeof $response !== "undefined";
const requestUrl = $request.url;

if (requestUrl.indexOf('surge_click_to_play=') != -1) {
    const videoUrl = decodeURIComponent(requestUrl.split('surge_click_to_play=')[1]);
    
    // --- 1. 读取 BoxJs 配置 ---
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

    // --- 2. 构造跳转协议 (强制校准 SenPlayer 格式) ---
    let finalScheme = "";
    
    // 如果选择的是 SenPlayer，或者因为 BoxJs 报错没读到设置，都走这个逻辑
    if (playerSelect === "SenPlayer" || !playerSelect) {
        // 核心：btoa 编码必须配合 unescape(encodeURIComponent) 处理中文和特殊字符
        const b64 = btoa(unescape(encodeURIComponent(videoUrl)));
        finalScheme = `senplayer://play?url=${b64}`;
    } else if (playerSelect === "nPlayer") {
        finalScheme = `nplayer-${videoUrl}`;
    } else if (playerSelect === "Infuse") {
        finalScheme = `infuse://x-callback-url/play?url=${encodeURIComponent(videoUrl)}`;
    } else if (playerSelect === "自定义" && customScheme) {
        finalScheme = customScheme + videoUrl;
    } else {
        finalScheme = videoUrl; // Safari
    }

    // --- 3. 推送通知 ---
    $notification.post(
        "🎬 视频提取成功",
        `模式: ${playerSelect} (点击跳转播放)`,
        "文件: " + videoUrl.split('?')[0].split('/').pop(),
        { "open-url": finalScheme }
    );
    
    $done({
        response: {
            status: 204,
            headers: { "Content-Type": "text/plain", "Access-Control-Allow-Origin": "*" },
            body: ""
        }
    });
} 

// --- 阶段 B: 注入内核 (保持不变) ---
else if (isResponse && $response.body && $response.body.indexOf('</head>') != -1) {
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
    $done({ body: $response.body.replace('</head>', injectCode + '</head>') });
} else {
    $done({});
}

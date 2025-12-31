/**
 * @name 视频流嗅探 (复制+跳转版)
 * @desc 嗅探 m3u8，点击通知复制链接并唤起 SenPlayer
 */

const req = (typeof $request !== 'undefined') ? $request : null;
const res = (typeof $response !== 'undefined') ? $response : null;

// --- 阶段 A: 处理信号，复制地址并弹出通知 ---
if (req && req.url && req.url.indexOf('surge_click_to_play=') != -1) {
    const videoUrl = decodeURIComponent(req.url.split('surge_click_to_play=')[1]);
    
    // 1. 复制视频流地址到系统剪贴板
    const copySuccess = $copy(videoUrl);
    
    // 2. 构造通知
    // 唤起协议使用最基础的 senplayer:// 确保一定能打开 App
    const senUrl = "senplayer://";

    $notification.post(
        "🎬 视频地址已复制",
        "链接已入剪贴板，点击打开播放器",
        "地址: " + videoUrl.split('?')[0].split('/').pop() + (copySuccess ? " (复制成功)" : ""),
        { "open-url": senUrl }
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
else if (res && res.body && res.body.indexOf('</head>') != -1) {
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
                if (s && s.includes('.m3u8')) sendToSurge(s);
            });
        }, 2000);
    })();
    </script>
    `;
    $done({ body: res.body.replace('</head>', injectCode + '</head>') });
} 

// --- 阶段 C: 兜底退出 ---
else {
    $done({});
}

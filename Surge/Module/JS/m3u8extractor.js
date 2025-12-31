/**
 * @name 视频流提取器 (跳转修复版)
 * @desc 修复点击通知跳转 Surge 而非播放器的问题
 */

const body = $response.body;
const url = $request.url;

// --- 第一部分：处理信号并弹出通知 ---
if (url.includes('surge_click_to_play=')) {
    const videoUrl = decodeURIComponent(url.split('surge_click_to_play=')[1]);
    
    // 方案 A：使用 SenPlayer 标准的 Base64 协议
    // 注意：不再使用复杂的正则，直接进行标准的 Base64 转换
    const base64Url = btoa(unescape(encodeURIComponent(videoUrl)));
    const senUrl = "senplayer://play?url=" + base64Url;
    
    // 如果点击后依然只跳 Surge，请尝试【方案 B】(取消下面一行的注释，并注释掉上面的 senUrl)
    // const senUrl = "senplayer://" + videoUrl;

    $notification.post(
        "🎬 视频提取成功",
        "点击此通知，立即跳转 SenPlayer 播放",
        "文件: " + videoUrl.split('?')[0].split('/').pop(),
        { "open-url": senUrl }
    );
    
    $done({ status: "HTTP/1.1 204 No Content" });
} 

// --- 第二部分：注入监控内核 ---
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

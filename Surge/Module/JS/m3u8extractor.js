/**
 * @name 视频流提取器 (修复版)
 * @desc 修复 Data 变量未定义报错，使用原生 Base64 转换
 */

const body = $response.body;
const url = $request.url;

// --- 第一部分：Surge 处理信号并弹出通知 ---
if (url.includes('surge_click_to_play=')) {
    const videoUrl = decodeURIComponent(url.split('surge_click_to_play=')[1]);
    
    // 修复点：使用原生方式处理 Base64 编码，避免使用可能未定义的 Data 变量
    // 先将特殊字符转义，再进行 Base64 编码，确保 URL 安全
    const base64Url = btoa(encodeURIComponent(videoUrl).replace(/%([0-9A-F]{2})/g, function(match, p1) {
        return String.fromCharCode('0x' + p1);
    }));
    
    const senUrl = "senplayer://play?url=" + base64Url;
    
    $notification.post(
        "🎬 检测到视频流",
        "点击此通知立即跳转 SenPlayer 播放",
        "源地址: " + videoUrl.split('?')[0],
        { "open-url": senUrl }
    );
    
    $done({ status: "HTTP/1.1 204 No Content" });
} 

// --- 第二部分：注入 Tampermonkey 监控内核 ---
else if (body && body.includes('</head>')) {
    const injectCode = `
    <script>
    (function() {
        'use strict';
        const foundUrls = new Set();
        
        function sendToSurge(mUrl) {
            if (mUrl && mUrl.includes('.m3u8') && !foundUrls.has(mUrl)) {
                foundUrls.add(mUrl);
                // 使用 Image 发送信号，不干扰页面原本的 Fetch 逻辑
                const img = new Image();
                img.src = '/surge_click_to_play=' + encodeURIComponent(mUrl);
            }
        }

        // 监听 XHR
        const originalXHR = window.XMLHttpRequest.prototype.open;
        window.XMLHttpRequest.prototype.open = function(method, url) {
            if (typeof url === 'string' && url.includes('.m3u8')) sendToSurge(url);
            return originalXHR.apply(this, arguments);
        };

        // 监听 Fetch
        const originalFetch = window.fetch;
        window.fetch = function(url, options) {
            const tUrl = (typeof url === 'string') ? url : (url && url.url ? url.url : "");
            if (tUrl.includes('.m3u8')) sendToSurge(tUrl);
            return originalFetch.apply(this, arguments);
        };

        // 定期检查标签
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
    $done({ body: body.replace('</head>', injectCode + '</head>') });
} else {
    $done({});
}

/**
 * @name 视频流提取器 (Surge 通知版)
 * @desc 移植自御清弦原版 Tampermonkey 脚本，移除 UI，改为 Surge 通知跳转
 */

const body = $response.body;
const url = $request.url;

// --- 第一部分：Surge 处理信号并弹出通知 ---
if (url.includes('surge_click_to_play=')) {
    const videoUrl = decodeURIComponent(url.split('surge_click_to_play=')[1]);
    // 转换为 SenPlayer 协议
    const senUrl = "senplayer://play?url=" + Data.fromUTF8(videoUrl).toBase64();
    
    $notification.post(
        "🎬 检测到视频流",
        "点击此通知立即跳转 SenPlayer 播放",
        videoUrl.split('?')[0],
        { "open-url": senUrl }
    );
    // 204 No Content 确保不干扰网页业务
    $done({ status: "HTTP/1.1 204 No Content" });
} 

// --- 第二部分：将 Tampermonkey 内核注入网页 ---
else if (body && body.includes('</head>')) {
    const injectCode = `
    <script>
    (function() {
        'use strict';
        const foundUrls = new Set();
        
        // 核心：信号发射器 (替换原版的 addUrl UI 逻辑)
        function sendToSurge(url) {
            if (url && url.includes('.m3u8') && !foundUrls.has(url)) {
                foundUrls.add(url);
                // 借用 Image 对象发送信号给 Surge，不干扰网页原有 Fetch/XHR 逻辑
                const img = new Image();
                img.src = '/surge_click_to_play=' + encodeURIComponent(url);
            }
        }

        // 1. 监听 XHR 请求 (原版内核)
        const originalXHR = window.XMLHttpRequest.prototype.open;
        window.XMLHttpRequest.prototype.open = function(method, url) {
            if (typeof url === 'string') sendToSurge(url);
            return originalXHR.apply(this, arguments);
        };

        // 2. 监听 Fetch 请求 (原版内核)
        const originalFetch = window.fetch;
        window.fetch = function(url, options) {
            const targetUrl = (typeof url === 'string') ? url : (url && url.url ? url.url : "");
            sendToSurge(targetUrl);
            return originalFetch.apply(this, arguments);
        };

        // 3. 检查 video 标签 (原版内核)
        function checkVideoTags() {
            const videos = document.getElementsByTagName('video');
            for (const video of videos) {
                if (video.src) sendToSurge(video.src);
            }
        }

        // 4. 检查 source 标签 (原版内核)
        function checkSourceTags() {
            const sources = document.getElementsByTagName('source');
            for (const source of sources) {
                if (source.src) sendToSurge(source.src);
            }
        }

        // 定期检查标签 (原版 2000ms 频率)
        setInterval(() => {
            checkVideoTags();
            checkSourceTags();
        }, 2000);
    })();
    </script>
    `;
    // 注入脚本到 head 中
    $done({ body: body.replace('</head>', injectCode + '</head>') });
} else {
    $done({});
}

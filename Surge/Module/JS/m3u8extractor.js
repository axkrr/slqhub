/**
 * @name 全网视频流嗅探 (Surge 纯通知版)
 * @desc 适配 PH/TXH 及全网，捕获 m3u8 后通过通知跳转 SenPlayer
 */

const body = $response.body;
const url = $request.url;

// --- 阶段 A: 拦截内部信号并弹出 Surge 通知 ---
if (url.includes('surge_m3u8_sniff=')) {
    let videoUrl = decodeURIComponent(url.split('surge_m3u8_sniff=')[1]);
    // 过滤掉重复或无效的链接片段
    if (videoUrl.startsWith('http')) {
        let senUrl = "senplayer://play?url=" + Data.fromUTF8(videoUrl).toBase64();
        
        $notification.post(
            "🎬 发现视频源", 
            "点击跳转 SenPlayer 播放", 
            "链接: " + videoUrl.split('?')[0], 
            { "open-url": senUrl }
        );
    }
    $done({ status: "HTTP/1.1 204 No Content" });
} 

// --- 阶段 B: 向网页注入全网通用的监控钩子 ---
else if (body && body.includes('</head>')) {
    const injectCode = `
    <script>
    (function() {
        const foundUrls = new Set();
        function notifySurge(m3u8Url) {
            if (!m3u8Url || typeof m3u8Url !== 'string') return;
            // 确保是 m3u8 且未通知过
            if (m3u8Url.includes('.m3u8') && !foundUrls.has(m3u8Url)) {
                foundUrls.add(m3u8Url);
                // 借用当前域名发送信号，确保不触发跨域限制
                fetch('/surge_m3u8_sniff=' + encodeURIComponent(m3u8Url)).catch(()=>{});
            }
        }

        // 1. Hook XHR (Tampermonkey 核心逻辑)
        const originalXHR = window.XMLHttpRequest.prototype.open;
        window.XMLHttpRequest.prototype.open = function(method, url) {
            notifySurge(url);
            return originalXHR.apply(this, arguments);
        };

        // 2. Hook Fetch
        const originalFetch = window.fetch;
        window.fetch = function(url, options) {
            let t = (typeof url === 'string') ? url : (url.url || "");
            notifySurge(t);
            return originalFetch.apply(this, arguments);
        };

        // 3. 扫描标签兜底
        setInterval(() => {
            document.querySelectorAll('video, source').forEach(v => {
                notifySurge(v.src || v.getAttribute('src'));
            });
        }, 2000);
    })();
    </script>
    `;
    $done({ body: body.replace('</head>', injectCode + '</head>') });
} else {
    $done({});
}

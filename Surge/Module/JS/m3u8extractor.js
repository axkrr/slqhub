/**
 * @name 全网视频流嗅探 (Surge 通知版)
 * @desc 适配全网 m3u8，无网页 UI，点击 Surge 通知跳转 SenPlayer
 */

const body = $response.body;
const url = $request.url;

// 1. Surge 处理阶段：如果发现是脚本发出的信号，弹出通知
if (url.includes('surge_m3u8_sniff=')) {
    let videoUrl = decodeURIComponent(url.split('surge_m3u8_sniff=')[1]);
    let senUrl = "senplayer://play?url=" + Data.fromUTF8(videoUrl).toBase64();
    
    $notification.post(
        "🎬 发现视频源",
        "点击此通知跳转 SenPlayer 播放",
        videoUrl.split('?')[0], // 显示简化后的 URL
        { "open-url": senUrl }
    );
    $done({ status: "HTTP/1.1 204 No Content" }); // 终止信号请求，不产生实际流量
} 

// 2. 注入阶段：向网页注入 Tampermonkey 级别的监控钩子
else if (body && body.includes('</head>')) {
    const injectCode = `
    <script>
    (function() {
        const foundUrls = new Set();
        
        // 发送信号给 Surge 的函数
        function notifySurge(m3u8Url) {
            if (!foundUrls.has(m3u8Url)) {
                foundUrls.add(m3u8Url);
                // 构造一个特殊的图片请求或 fetch，让 Surge 拦截
                fetch('/surge_m3u8_sniff=' + encodeURIComponent(m3u8Url)).catch(()=>{});
            }
        }

        // --- Hook XHR ---
        const originalXHR = window.XMLHttpRequest.prototype.open;
        window.XMLHttpRequest.prototype.open = function(method, url) {
            if (url && url.includes('.m3u8')) notifySurge(url);
            return originalXHR.apply(this, arguments);
        };

        // --- Hook Fetch ---
        const originalFetch = window.fetch;
        window.fetch = function(url, options) {
            let targetUrl = (typeof url === 'string') ? url : (url.url || "");
            if (targetUrl.includes('.m3u8')) notifySurge(targetUrl);
            return originalFetch.apply(this, arguments);
        };

        // --- 扫描 Video 标签 ---
        setInterval(() => {
            const videos = document.querySelectorAll('video, source');
            videos.forEach(v => {
                const src = v.src || v.getAttribute('src');
                if (src && src.includes('.m3u8')) notifySurge(src);
            });
        }, 2000);
    })();
    </script>
    `;
    $done({ body: body.replace('</head>', injectCode + '</head>') });
} else {
    $done({});
}

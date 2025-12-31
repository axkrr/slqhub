/**
 * @name 视频嗅探回退版 (复制+跳转)
 * @desc 逻辑简单，只负责嗅探、复制链接、弹出通知并唤起播放器
 */

const isRes = typeof $response !== "undefined";

// --- A. 如果是信号请求：执行通知和复制 ---
if ($request.url.indexOf('surge_click_to_play=') != -1) {
    const videoUrl = decodeURIComponent($request.url.split('surge_click_to_play=')[1]);
    
    // 执行复制
    $copy(videoUrl);

    // 弹出通知 (只负责唤起，不负责自动播放，确保跳转成功)
    $notification.post(
        "🎬 视频流捕获成功",
        "链接已复制，点击打开播放器",
        "源: " + videoUrl.split('?')[0].split('/').pop(),
        { "open-url": "senplayer://" }
    );

    $done({ response: { status: 204, body: "" } });
} 

// --- B. 如果是网页响应：注入嗅探代码 ---
else if (isRes && $response.body && $response.body.indexOf('</head>') != -1) {
    const injectCode = `
    <script>
    (function() {
        var found = new Set();
        function send(url) {
            if (url && url.indexOf('.m3u8') != -1 && !found.has(url)) {
                found.add(url);
                var i = new Image();
                i.src = '/surge_click_to_play=' + encodeURIComponent(url);
            }
        }
        // XHR 钩子
        var open = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function() {
            send(arguments[1]);
            return open.apply(this, arguments);
        };
        // Fetch 钩子
        var oldFetch = window.fetch;
        window.fetch = function(t) {
            var u = (typeof t === 'string') ? t : (t.url || "");
            send(u);
            return oldFetch.apply(this, arguments);
        };
        // 标签扫描
        setInterval(function() {
            var el = document.querySelectorAll('video, source');
            for (var j=0; j<el.length; j++) {
                send(el[j].src || el[j].getAttribute('src'));
            }
        }, 3000);
    })();
    </script>
    `;
    $done({ body: $response.body.replace('</head>', injectCode + '</head>') });
} 

// --- C. 兜底 ---
else {
    $done({});
}

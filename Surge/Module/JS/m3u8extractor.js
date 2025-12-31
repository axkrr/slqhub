/**
 * @name 视频嗅探回退版 (精简修复)
 * @desc 去掉不稳定的 $copy，恢复通知核心功能
 */

const isRes = typeof $response !== "undefined";

// --- A. 如果是信号请求：直接弹出通知 ---
if ($request && $request.url && $request.url.indexOf('surge_click_to_play=') != -1) {
    const videoUrl = decodeURIComponent($request.url.split('surge_click_to_play=')[1]);

    // 重点：删除了会导致报错的 $copy 指令
    // 我们把地址放在通知的描述里，方便你长按通知手动复制
    $notification.post(
        "🎬 发现视频流",
        "点击跳转播放器 | 长按可拷贝地址",
        videoUrl, // 这里显示完整地址，方便拷贝
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
            if(arguments[1]) send(arguments[1]);
            return open.apply(this, arguments);
        };
        // Fetch 钩子
        var oldFetch = window.fetch;
        window.fetch = function(t) {
            var u = (typeof t === 'string') ? t : (t && t.url ? t.url : "");
            if(u) send(u);
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

/**
 * @name 视频嗅探 (兼容复制版)
 * @desc 尝试多种方式复制到剪贴板，若失败则通过通知展示
 */

const req = (typeof $request !== 'undefined') ? $request : null;
const res = (typeof $response !== 'undefined') ? $response : null;

if (req && req.url.indexOf('surge_click_to_play=') != -1) {
    const videoUrl = decodeURIComponent(req.url.split('surge_click_to_play=')[1]);
    
    // --- 尝试复制逻辑 (带容错) ---
    let copySuccess = false;
    try {
        if (typeof $copy !== 'undefined') {
            $copy(videoUrl);
            copySuccess = true;
        } else if (typeof $util !== 'undefined' && $util.copyToClipboard) {
            $util.copyToClipboard(videoUrl);
            copySuccess = true;
        }
    } catch (e) {
        console.log("复制指令执行失败: " + e);
    }

    // --- 发送通知 (无论复制成功与否都发送) ---
    $notification.post(
        copySuccess ? "✅ 链接已复制到剪贴板" : "🎬 发现视频流 (复制失败)",
        "点击打开播放器 | 长按可手动复制",
        videoUrl, 
        { "open-url": "senplayer://" }
    );

    $done({ response: { status: 204, body: "" } });
} 

else if (res && res.body && res.body.indexOf('</head>') != -1) {
    // --- 网页注入内核 ---
    const injectCode = `
    <script>
    (function() {
        var seen = new Set();
        function emit(url) {
            if (url && url.indexOf('.m3u8') != -1 && !seen.has(url)) {
                seen.add(url);
                var i = new Image();
                i.src = '/surge_click_to_play=' + encodeURIComponent(url);
            }
        }
        var _open = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function() {
            if(arguments[1]) emit(arguments[1]);
            return _open.apply(this, arguments);
        };
        var _fetch = window.fetch;
        window.fetch = function(t) {
            var u = (typeof t === 'string') ? t : (t && t.url ? t.url : "");
            if(u) emit(u);
            return _fetch.apply(this, arguments);
        };
        setInterval(function() {
            var tags = document.querySelectorAll('video, source');
            for (var i=0; i<tags.length; i++) {
                emit(tags[i].src || tags[i].getAttribute('src'));
            }
        }, 3000);
    })();
    </script>
    `;
    $done({ body: res.body.replace('</head>', injectCode + '</head>') });
} 

else {
    $done({});
}

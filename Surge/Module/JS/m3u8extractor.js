/**
 * @name 视频嗅探 (通知+跳转 最终版)
 * @desc 修复跳转问题，直接唤起播放器
 */

const req = (typeof $request !== 'undefined') ? $request : null;
const res = (typeof $response !== 'undefined') ? $response : null;

if (req && req.url.indexOf('surge_click_to_play=') != -1) {
    const videoUrl = decodeURIComponent(req.url.split('surge_click_to_play=')[1]);

    // 弹出通知：直接跳转 SenPlayer
    // 放弃复杂的快捷指令跳转，回归最稳的 senplayer://
    $notification.post(
        "🎬 发现视频流",
        "长按通知可拷贝地址，点击打开播放器",
        videoUrl, 
        { "open-url": "senplayer://" }
    );

    $done({ response: { status: 204, body: "" } });
} 

else if (res && res.body && res.body.indexOf('</head>') != -1) {
    // 注入代码：尝试在网页端就地复制 (针对支持的浏览器)
    const injectCode = `
    <script>
    (function() {
        var seen = new Set();
        function emit(url) {
            if (url && url.indexOf('.m3u8') != -1 && !seen.has(url)) {
                seen.add(url);
                // 尝试在网页端自动复制 (部分网站有效)
                try {
                    const el = document.createElement('textarea');
                    el.value = url;
                    document.body.appendChild(el);
                    el.select();
                    document.execCommand('copy');
                    document.body.removeChild(el);
                } catch(e) {}
                
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
} else {
    $done({});
}

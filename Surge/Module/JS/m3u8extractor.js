/**
 * @name 视频嗅探 (快捷指令中转版)
 * @desc 解决 $copy 报错，通过快捷指令实现复制并打开播放器
 */

const req = (typeof $request !== 'undefined') ? $request : null;
const res = (typeof $response !== 'undefined') ? $response : null;

if (req && req.url.indexOf('surge_click_to_play=') != -1) {
    const videoUrl = decodeURIComponent(req.url.split('surge_click_to_play=')[1]);
    const fileName = videoUrl.split('?')[0].split('/').pop();

    // --- 构造快捷指令跳转链接 ---
    // 快捷指令名称必须叫: PlayVideo
    const shortcutName = "PlayVideo";
    const openUrl = "shortcuts://run-shortcut?name=" + encodeURIComponent(shortcutName) + "&input=" + encodeURIComponent(videoUrl);

    $notification.post(
        "🎬 视频提取成功",
        "点击此通知：复制链接并打开播放器",
        "视频: " + fileName,
        { "open-url": openUrl }
    );

    $done({ response: { status: 204, body: "" } });
} 

else if (res && res.body && res.body.indexOf('</head>') != -1) {
    // --- 注入内核逻辑 (保持不变) ---
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
} else {
    $done({});
}

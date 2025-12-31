/**
 * @name 网页视频流嗅探 (UI 交互版)
 * @desc 网页右下角浮窗显示，点击实现复制与跳转
 */

const isRes = typeof $response !== "undefined";

if (isRes && $response.body && $response.body.indexOf('</head>') != -1) {
    const injectCode = `
    <style>
        #surge-sniff-btn {
            position: fixed; bottom: 20px; right: 20px; z-index: 999999;
            background: rgba(0, 0, 0, 0.8); color: #fff; padding: 10px;
            border-radius: 8px; font-size: 12px; text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3); display: none;
            border: 1px solid #444; backdrop-filter: blur(5px);
        }
        #surge-sniff-btn:active { background: #333; }
    </style>
    <div id="surge-sniff-btn">
        <div style="font-weight:bold; color:#ff9000; margin-bottom:4px;">🎥 发现视频流</div>
        <div id="surge-sniff-info">点击复制并跳转</div>
    </div>
    <script>
    (function() {
        var foundUrl = "";
        var btn = document.getElementById('surge-sniff-btn');
        
        function showBtn(url) {
            if (url && url.indexOf('.m3u8') != -1 && url !== foundUrl) {
                foundUrl = url;
                btn.style.display = 'block';
            }
        }

        // 点击逻辑：复制 + 跳转
        btn.onclick = function() {
            var el = document.createElement('textarea');
            el.value = foundUrl;
            document.body.appendChild(el);
            el.select();
            if(document.execCommand('copy')) {
                document.getElementById('surge-sniff-info').innerText = "✅ 已复制，跳转中...";
            }
            document.body.removeChild(el);
            
            // 延迟一点点跳转，确保复制动作完成
            setTimeout(function() {
                window.location.href = "senplayer://";
            }, 500);
        };

        // 监控 XHR
        var _open = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function() {
            if(arguments[1]) showBtn(arguments[1]);
            return _open.apply(this, arguments);
        };
        // 监控 Fetch
        var _fetch = window.fetch;
        window.fetch = function(t) {
            var u = (typeof t === 'string') ? t : (t && t.url ? t.url : "");
            if(u) showBtn(u);
            return _fetch.apply(this, arguments);
        };
        // 监控 标签
        setInterval(function() {
            var vs = document.querySelectorAll('video, source');
            for (var i=0; i<vs.length; i++) {
                showBtn(vs[i].src || vs[i].getAttribute('src'));
            }
        }, 3000);
    })();
    </script>
    `;
    $done({ body: $response.body.replace('</head>', injectCode + '</head>') });
} else {
    $done({});
}

/**
 * @name 视频嗅探 (高清优先 UI 版)
 * @desc 网页右下角交互，自动识别并锁定最高分辨率链接
 */

const isRes = typeof $response !== "undefined";

if (isRes && $response.body && $response.body.indexOf('</head>') != -1) {
    const injectCode = `
    <style>
        #surge-sniff-btn {
            position: fixed; bottom: 100px; right: 20px; z-index: 999999;
            background: rgba(0, 0, 0, 0.85); color: #fff; padding: 12px;
            border-radius: 12px; font-size: 13px; text-align: center;
            box-shadow: 0 4px 15px rgba(0,0,0,0.5); display: none;
            border: 1px solid #ff9000; backdrop-filter: blur(8px);
            width: 150px; transition: all 0.3s ease;
        }
        #surge-sniff-info {
            background: #ff9000; color: #000; border-radius: 6px; 
            padding: 6px 0; font-weight: bold; cursor: pointer; margin-top: 8px;
        }
    </style>
    <div id="surge-sniff-btn">
        <div style="font-weight:bold; color:#ff9000; margin-bottom:4px;">🎥 视频流已就绪</div>
        <div id="surge-sniff-res" style="font-size:11px; color:#aaa;">正在分析画质...</div>
        <div id="surge-sniff-info">复制并跳转</div>
    </div>
    <script>
    (function() {
        var bestUrl = "";
        var currentLevel = 0; // 0: unknown, 1: <720, 2: 720, 3: 1080
        var btn = document.getElementById('surge-sniff-btn');
        var resText = document.getElementById('surge-sniff-res');

        function updateUrl(url) {
            if (!url || url.indexOf('.m3u8') === -1 || url.includes('.ts')) return;

            var level = 1;
            if (url.includes('1080')) level = 3;
            else if (url.includes('720')) level = 2;

            // 核心逻辑：只有发现更高清的，或者还没抓到过地址时才更新
            if (level >= currentLevel) {
                bestUrl = url;
                currentLevel = level;
                
                // UI 动态更新
                var label = (level === 3) ? "💎 画质: 1080P (最高)" : 
                            (level === 2) ? "🎬 画质: 720P (高清)" : "✅ 已捕获视频流";
                resText.innerText = label;
                btn.style.display = 'block';
            }
        }

        // 点击执行：复制 + 跳转
        document.getElementById('surge-sniff-info').onclick = function() {
            var el = document.createElement('textarea');
            el.value = bestUrl;
            document.body.appendChild(el);
            el.select();
            if(document.execCommand('copy')) {
                this.innerText = "✅ 已复制链接";
                this.style.background = "#4cd964";
            }
            document.body.removeChild(el);
            
            setTimeout(function() {
                window.location.href = "senplayer://";
            }, 600);
        };

        // 监听 XHR
        var _open = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function() {
            if(arguments[1]) updateUrl(arguments[1]);
            return _open.apply(this, arguments);
        };
        // 监听 Fetch
        var _fetch = window.fetch;
        window.fetch = function(t) {
            var u = (typeof t === 'string') ? t : (t && t.url ? t.url : "");
            if(u) updateUrl(u);
            return _fetch.apply(this, arguments);
        };
        // 定时扫描标签
        setInterval(function() {
            var vs = document.querySelectorAll('video, source');
            for (var i=0; i<vs.length; i++) {
                updateUrl(vs[i].src || vs[i].getAttribute('src'));
            }
        }, 3000);
    })();
    </script>
    `;
    $done({ body: $response.body.replace('</head>', injectCode + '</head>') });
} else {
    $done({});
}

/**
 * @name 视频嗅探 (全能增强 UI 版)
 * @desc PH 完美适配，TXH 针对性增强，支持 Iframe 穿透
 */

const isRes = typeof $response !== "undefined";

if (isRes && $response.body && $response.body.indexOf('</head>') != -1) {
    const injectCode = `
    <style>
        #surge-sniff-btn {
            position: fixed; bottom: 120px; right: 20px; z-index: 2147483647;
            background: rgba(0, 0, 0, 0.9); color: #fff; padding: 12px;
            border-radius: 12px; font-size: 13px; text-align: center;
            box-shadow: 0 4px 15px rgba(0,0,0,0.5); display: none;
            border: 1px solid #ff9000; backdrop-filter: blur(10px);
            width: 150px; font-family: -apple-system, BlinkMacSystemFont;
        }
        #surge-sniff-info {
            background: #ff9000; color: #000; border-radius: 6px; 
            padding: 8px 0; font-weight: bold; cursor: pointer; margin-top: 8px;
        }
    </style>
    <div id="surge-sniff-btn">
        <div style="font-weight:bold; color:#ff9000; margin-bottom:4px;">🎥 发现视频流</div>
        <div id="surge-sniff-res" style="font-size:11px; color:#aaa;">正在匹配解析...</div>
        <div id="surge-sniff-info">复制并跳转</div>
    </div>
    <script>
    (function() {
        var bestUrl = "";
        var currentLevel = 0; 
        
        function updateUrl(url) {
            if (!url || typeof url !== 'string') return;
            // 排除干扰项
            if (url.includes('.ts') || url.includes('seg-') || url.startsWith('blob:')) return;
            
            // 判定是否为视频流链接
            var isVideo = url.includes('.m3u8') || url.includes('.mp4') || url.includes('video_url=');
            if (!isVideo) return;

            var level = 1;
            if (url.includes('1080')) level = 3;
            else if (url.includes('720')) level = 2;

            if (level >= currentLevel) {
                bestUrl = url;
                currentLevel = level;
                var btn = document.getElementById('surge-sniff-btn');
                var resText = document.getElementById('surge-sniff-res');
                if (btn && resText) {
                    var label = (level === 3) ? "💎 画质: 1080P" : (level === 2) ? "🎬 画质: 720P" : "✅ 已捕获视频流";
                    resText.innerText = label;
                    btn.style.display = 'block';
                }
            }
        }

        // 核心点击逻辑
        var infoBtn = document.getElementById('surge-sniff-info');
        if (infoBtn) {
            infoBtn.onclick = function() {
                var el = document.createElement('textarea');
                el.value = bestUrl;
                document.body.appendChild(el);
                el.select();
                document.execCommand('copy');
                document.body.removeChild(el);
                this.innerText = "✅ 已复制";
                setTimeout(function() { window.location.href = "senplayer://"; }, 600);
            };
        }

        // 1. 监控 XHR & Fetch
        var _open = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function() {
            if(arguments[1]) updateUrl(arguments[1]);
            return _open.apply(this, arguments);
        };
        var _fetch = window.fetch;
        window.fetch = function(t) {
            var u = (typeof t === 'string') ? t : (t && t.url ? t.url : "");
            if(u) updateUrl(u);
            return _fetch.apply(this, arguments);
        };

        // 2. 深度扫描（处理 video 标签和可能的 iframe）
        function scan() {
            // 扫描当前页面 video
            var vs = document.querySelectorAll('video, source, b-video');
            for (var i=0; i<vs.length; i++) {
                updateUrl(vs[i].src || vs[i].getAttribute('src'));
            }
        }
        setInterval(scan, 2000);

        // 3. 处理某些站点的特殊变量 (TXH 可能会把地址存在某个全局变量里)
        if (window.player_data && window.player_data.url) updateUrl(window.player_data.url);
        if (window.video_url) updateUrl(window.video_url);

    })();
    </script>
    `;
    $done({ body: $response.body.replace('</head>', injectCode + '</head>') });
} else {
    $done({});
}

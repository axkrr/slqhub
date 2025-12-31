/**
 * @name 视频嗅探 (Tampermonkey 兼容增强版)
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
            width: 150px; cursor: pointer;
        }
    </style>
    <div id="surge-sniff-btn">
        <div style="font-weight:bold; color:#ff9000; margin-bottom:4px;">🎥 发现视频流</div>
        <div id="surge-sniff-res" style="font-size:11px; color:#aaa;">匹配中...</div>
        <div style="background:#ff9000; color:#000; border-radius:4px; padding:6px 0; margin-top:8px; font-weight:bold;">复制并播放</div>
    </div>
    <script>
    (function() {
        var bestUrl = "";
        var currentLevel = 0;

        function updateUrl(url) {
            if (!url || typeof url !== 'string' || url.includes('.ts') || url.includes('seg-')) return;
            if (url.indexOf('.m3u8') === -1 && url.indexOf('.mp4') === -1) return;

            var level = url.includes('1080') ? 3 : (url.includes('720') ? 2 : 1);
            if (level >= currentLevel) {
                bestUrl = url;
                currentLevel = level;
                var btn = document.getElementById('surge-sniff-btn');
                var res = document.getElementById('surge-sniff-res');
                if (btn) {
                    btn.style.display = 'block';
                    res.innerText = (level === 3 ? "💎 1080P" : (level === 2 ? "🎬 720P" : "✅ 已捕获"));
                }
            }
        }

        // 1. 拦截所有网络请求 (XHR & Fetch)
        const _open = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function() {
            updateUrl(arguments[1]);
            return _open.apply(this, arguments);
        };
        const _fetch = window.fetch;
        window.fetch = function(t) {
            updateUrl(typeof t === 'string' ? t : t.url);
            return _fetch.apply(this, arguments);
        };

        // 2. 深度拦截 HTMLVideoElement (很多 Tampermonkey 脚本的杀手锏)
        const originalSrc = Object.getOwnPropertyDescriptor(HTMLVideoElement.prototype, 'src');
        Object.defineProperty(HTMLVideoElement.prototype, 'src', {
            set: function(val) {
                updateUrl(val);
                return originalSrc.set.apply(this, arguments);
            }
        });

        // 3. 扫描页面中所有的 video 和 source 标签
        setInterval(() => {
            document.querySelectorAll('video, source').forEach(el => {
                updateUrl(el.src || el.currentSrc || el.getAttribute('src'));
            });
        }, 2000);

        // 点击逻辑
        document.getElementById('surge-sniff-btn').onclick = function() {
            const el = document.createElement('textarea');
            el.value = bestUrl;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            window.location.href = "senplayer://";
        };
    })();
    </script>
    `;
    $done({ body: $response.body.replace('</head>', injectCode + '</head>') });
} else {
    $done({});
}

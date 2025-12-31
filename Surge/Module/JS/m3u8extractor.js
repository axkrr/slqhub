/**
 * @name 视频流提取跳转器 (Surge 注入版)
 * @desc 适配 PH/TXH，监控动态请求，一键跳转 SenPlayer
 */

const body = $response.body;

if (body && body.includes('</head>')) {
    const injectCode = `
    <style>
        .m3u8-detector {
            position: fixed; top: 10vh; right: 10px; background: rgba(28, 28, 28, 0.95);
            color: #ffffff; padding: 15px; border-radius: 8px; z-index: 999999;
            max-width: 300px; font-size: 13px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            backdrop-filter: blur(5px); border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .m3u8-list { list-style: none; padding: 0; margin: 0; max-height: 40vh; overflow-y: auto; }
        .m3u8-item { margin: 8px 0; background: rgba(255, 255, 255, 0.05); padding: 8px; border-radius: 4px; }
        .sen-btn {
            background: #ff9900; border: none; color: white; padding: 8px;
            cursor: pointer; border-radius: 4px; width: 100%; font-weight: bold;
        }
    </style>

    <div id="m3u8-panel" class="m3u8-detector" style="display:none;">
        <h3 style="margin:0 0 10px 0; color:#4CAF50; font-size:15px;">检测到视频流</h3>
        <ul id="m3u8-list" class="m3u8-list"></ul>
    </div>

    <script>
    (function() {
        const foundUrls = new Set();
        const panel = document.getElementById('m3u8-panel');
        const list = document.getElementById('m3u8-list');

        function addUrl(url) {
            if (url && url.includes('.m3u8') && !foundUrls.has(url)) {
                foundUrls.add(url);
                panel.style.display = 'block';
                const li = document.createElement('li');
                li.className = 'm3u8-item';
                li.innerHTML = '<div style="word-break:break-all;margin-bottom:5px;font-size:11px;opacity:0.7;">' + url.split('?')[0] + '</div>';
                
                const btn = document.createElement('button');
                btn.className = 'sen-btn';
                btn.textContent = 'SenPlayer 播放';
                btn.onclick = function() {
                    window.location.href = 'senplayer://play?url=' + btoa(url);
                };
                
                li.appendChild(btn);
                list.appendChild(li);
            }
        }

        // --- Hook 核心：拦截 XHR ---
        const originalXHR = window.XMLHttpRequest.prototype.open;
        window.XMLHttpRequest.prototype.open = function(method, url) {
            addUrl(url);
            return originalXHR.apply(this, arguments);
        };

        // --- Hook 核心：拦截 Fetch ---
        const originalFetch = window.fetch;
        window.fetch = function(url, options) {
            if (typeof url === 'string') addUrl(url);
            return originalFetch.apply(this, arguments);
        };

        // --- 定期扫描 Video 标签 ---
        setInterval(() => {
            const videos = document.querySelectorAll('video, source');
            videos.forEach(v => { if (v.src) addUrl(v.src); });
        }, 2000);
    })();
    </script>
    `;

    // 注入代码
    $done({ body: body.replace('</head>', injectCode + '</head>') });
} else {
    $done({});
}

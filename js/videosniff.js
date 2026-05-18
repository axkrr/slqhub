/**
 * @name sph_jsfile
 * @desc 网页视频自动嗅探劫持跳转 SenPlayer 终极版
 * @update 2026-05-18
 */

let body = $response.body || "";

const inject = `
<script>
(function () {
    if (window.__senplayer_hijacked__) return;
    window.__senplayer_hijacked__ = true;

    let bestUrl = "";
    let currentLevel = 0;
    let jumped = false;

    const log = (msg) => console.log("🎬 [SenPlayer] " + msg);

    // 过滤与补全链接逻辑
    function updateUrl(url) {
        if (!url || typeof url !== 'string' || url.startsWith('blob:')) return;
        if (url.includes('.ts') || url.includes('seg-') || url.includes('.m4s')) return;
        
        // 自动将相对路径转换为带域名的绝对路径
        try {
            url = new URL(url, window.location.href).href;
        } catch (e) {
            return;
        }

        const lowerUrl = url.toLowerCase().split('?')[0];
        const isVideo = /\\.(m3u8|mp4|mov|m4v|flv|webm)$/.test(lowerUrl) || url.includes("m3u8?");
        if (!isVideo) return;

        // 清晰度分级策略：1080p(3) > 720p(2) > 其他(1)
        let level = url.includes('1080') ? 3 : (url.includes('720') ? 2 : 1);
        if (level >= currentLevel) {
            bestUrl = url;
            currentLevel = level;
            log("捕获高优先级媒体源 [" + level + "级]: " + bestUrl);
            openSenPlayer(bestUrl);
        }
    }

    // 多重唤起逻辑
    function openSenPlayer(url) {
        if (!url || jumped) return;
        jumped = true;

        // 使用最优标准格式 Scheme 唤起
        const senUrl = "SenPlayer://x-callback-url/play?url=" + encodeURIComponent(url) + "&force=true";
        log("执行标准唤起: " + senUrl);

        // 1. A标签模拟点击
        try {
            const a = document.createElement("a");
            a.href = senUrl;
            a.style.display = "none";
            document.body.appendChild(a);
            a.click();
            setTimeout(() => a.remove(), 500);
        } catch (e) {
            log("A标签唤起失败");
        }

        // 2. Location 延迟兜底
        setTimeout(() => {
            try {
                window.location.href = senUrl;
            } catch (e) {}
        }, 200);
    }

    // 1. 拦截 XMLHttpRequest
    const _open = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function() {
        if (arguments[1]) updateUrl(arguments[1]);
        return _open.apply(this, arguments);
    };

    // 2. 拦截 Fetch
    const _fetch = window.fetch;
    window.fetch = function(t) {
        if (t) updateUrl(typeof t === 'string' ? t : t.url);
        return _fetch.apply(this, arguments);
    };

    // 3. 拦截 video 元素的 src 属性动态赋值
    try {
        const originalSrc = Object.getOwnPropertyDescriptor(HTMLVideoElement.prototype, 'src');
        if (originalSrc && originalSrc.set) {
            Object.defineProperty(HTMLVideoElement.prototype, 'src', {
                set: function(val) {
                    updateUrl(val);
                    return originalSrc.set.apply(this, arguments);
                }
            });
        }
    } catch(e){}

    // 4. 定时扫描与 DOM 监听动态节点
    function scanVideo() {
        document.querySelectorAll('video, source').forEach(el => {
            if (el) updateUrl(el.src || el.currentSrc);
        });
    }

    scanVideo();
    const observer = new MutationObserver(scanVideo);
    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

})();
</script>
`;

if (/<\/body>/i.test(body)) {
    body = body.replace(/(<\/body>)/i, inject + "\n$1");
} else if (/<\/head>/i.test(body)) {
    body = body.replace(/(<\/head>)/i, inject + "\n$1");
} else {
    body += inject;
}

$done({ body });

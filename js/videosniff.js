/**
 * @name sphpure_jsfile
 * @update 2026-05-18
 */

const isRequest = typeof $request !== "undefined";
const isResponse = typeof $response !== "undefined";

// ====== 1. 代理拦截层（处理通知信号与重写响应体） ======
if (isRequest) {
    // 捕获前端发送的特异性通知信号
    const urlStr = $request.url;
    if (urlStr.includes("senplayer-notify-trigger")) {
        try {
            const urlObj = new URL(urlStr);
            const videoUrl = urlObj.searchParams.get("video");
            const level = urlObj.searchParams.get("level") || "1";
            const levelMap = { "3": "1080P 超清", "2": "720P 高清", "1": "标清" };
            
            // 发送系统级通知
            $notification.post(
                "🎬 SenPlayer 强力嗅探",
                `成功捕获 [${levelMap[level] || "未知"}] 视频流`,
                `已尝试为您自动跳转播放：\n${decodeURIComponent(videoUrl)}`
            );
        } catch (e) {
            console.log("❌ 解析通知参数失败: " + e);
        }
        $done({ response: { status: 200, body: "ok" } });
    } else {
        $done({});
    }
} else if (isResponse) {
    let body = $response.body || "";

    // 前端注入代码
    const inject = `
<script>
(function () {
    if (window.__senplayer_hijacked__) return;
    window.__senplayer_hijacked__ = true;

    let bestUrl = "";
    let currentLevel = 0;
    let jumped = false;

    const log = (msg) => console.log("🎬 [SenPlayer] " + msg);

    // 触发系统通知机制（通过向本地发起回环请求实现）
    function triggerSystemNotification(videoUrl, level) {
        const notifyApi = window.location.protocol + "//localhost/senplayer-notify-trigger?video=" + encodeURIComponent(videoUrl) + "&level=" + level;
        // 使用原生 standard Image Beacon 或 fetch 发送，不影响主线程
        const img = new Image();
        img.src = notifyApi;
    }

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
            
            // 触发跳转与通知
            openSenPlayer(bestUrl, level);
        }
    }

    // 多重唤起与通知联动的逻辑
    function openSenPlayer(url, level) {
        if (!url || jumped) return;
        jumped = true;

        // 发起通知信号
        triggerSystemNotification(url, level);

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

    // 兼容性注入 HTML
    if (/<\/body>/i.test(body)) {
        body = body.replace(/(<\/body>)/i, inject + "\n$1");
    } else if (/<\/head>/i.test(body)) {
        body = body.replace(/(<\/head>)/i, inject + "\n$1");
    } else {
        body += inject;
    }

    $done({ body });
} else {
    $done({});
}

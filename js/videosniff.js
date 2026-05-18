/**
 * @name SenPlayerHijack
 * @desc 网页视频自动劫持跳转 SenPlayer（稳定完整版）
 * @author axkrr
 * @update 2026-05-18
*/

let body = $response.body || "";

console.log("════════════════════════════");
console.log("🎬 SenPlayer Hijack 启动");

// 防重复注入
const inject = `
<script>
(function () {

    if (window.__senplayer__) return;
    window.__senplayer__ = true;

    console.log("🎬 SenPlayer 已注入");

    let jumped = false;

    function log(msg) {
        console.log("🎬 " + msg);
    }

    function isVideo(url) {
        return typeof url === "string" &&
            (url.includes("m3u8") ||
             url.includes(".mp4") ||
             url.includes(".mov") ||
             url.includes(".m4v") ||
             url.includes(".flv") ||
             url.includes(".webm"));
    }

    // ⭐ 强制唤起 SenPlayer（关键修复）
    function openSenPlayer(url) {

        if (!url || jumped) return;

        if (url.startsWith("blob:")) {
            log("blob 跳过");
            return;
        }

        if (!isVideo(url)) {
            log("非视频链接跳过: " + url);
            return;
        }

        jumped = true;

        const senUrl =
            "senplayer://x-callback-url/play?url=" +
            encodeURIComponent(url) +
            "&force=true";

        log("🚀 捕获视频: " + url);
        log("🚀 SenPlayer URL: " + senUrl);

        // ===== 多重唤起方案（核心）=====

        // 1 iframe
        try {
            const iframe = document.createElement("iframe");
            iframe.style.display = "none";
            iframe.src = senUrl;
            document.documentElement.appendChild(iframe);
            setTimeout(() => iframe.remove(), 3000);
            log("iframe ok");
        } catch (e) {
            log("iframe fail");
        }

        // 2 a click（最重要）
        try {
            const a = document.createElement("a");
            a.href = senUrl;
            a.style.display = "none";
            document.body.appendChild(a);
            a.click();
            a.remove();
            log("a click ok");
        } catch (e) {
            log("a click fail");
        }

        // 3 window.open
        try {
            window.open(senUrl);
            log("window.open ok");
        } catch (e) {
            log("window.open fail");
        }

        // 4 location fallback
        try {
            window.location.href = senUrl;
            log("location ok");
        } catch (e) {
            log("location fail");
        }
    }

    // ===== fetch 劫持 =====
    const rawFetch = window.fetch;
    window.fetch = function (...args) {

        let url = args[0]?.url || args[0];

        log("fetch: " + url);

        if (isVideo(url)) openSenPlayer(url);

        return rawFetch.apply(this, args);
    };

    // ===== xhr 劫持 =====
    const rawOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {

        log("xhr: " + url);

        if (isVideo(url)) openSenPlayer(url);

        return rawOpen.apply(this, arguments);
    };

    // ===== video 监听 =====
    function hookVideo(v) {

        if (!v || v.__hooked__) return;
        v.__hooked__ = true;

        log("hook video");

        v.addEventListener("play", function () {

            const url =
                v.currentSrc ||
                v.src ||
                (v.querySelector("source")?.src || "");

            openSenPlayer(url);

        }, true);

        v.addEventListener("click", function () {

            setTimeout(() => {
                const url = v.currentSrc || v.src;
                openSenPlayer(url);
            }, 150);

        }, true);
    }

    // ===== 扫描 =====
    function scan() {
        document.querySelectorAll("video").forEach(hookVideo);
    }

    scan();

    const obs = new MutationObserver(scan);
    obs.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

})();
</script>
`;

if (body.includes("</body>")) {
    body = body.replace("</body>", inject + "</body>");
} else {
    body += inject;
}

console.log("✅ 注入完成");
console.log("════════════════════════════");

$done({ body });
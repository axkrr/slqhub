/**
 * @name SenPlayerHijack
 * @desc 自动劫持网页视频并跳转 SenPlayer
 * @author axkrr
 * @update 2026-05-18
 */

let body = $response.body || "";

console.log("════════════════════════════");
console.log("🎬 SenPlayer Hijack 启动");

const inject = `
<script>
(function () {

    if (window.__senplayer_hijack__) return;
    window.__senplayer_hijack__ = true;

    console.log("🎬 SenPlayer 劫持已启动");

    // 已跳转锁
    let jumped = false;

    // 视频匹配
    const videoRegex = /\\\\.(m3u8|mp4|mov|m4v|webm)(\\\\?|$)/i;

    // 跳转
    function jump(url) {

        if (!url) return;

        if (jumped) {
            console.log("⚠️ 已跳转过");
            return;
        }

        // blob 跳过
        if (url.startsWith("blob:")) {
            console.log("⚠️ blob 地址跳过");
            return;
        }

        // 非视频跳过
        if (!videoRegex.test(url) && !url.includes("m3u8")) {
            console.log("⚠️ 非视频链接:", url);
            return;
        }

        jumped = true;

        console.log("🚀 捕获视频:");
        console.log(url);

        const senUrl =
            "senplayer://x-callback-url/play?url=" +
            encodeURIComponent(url) +
            "&force=true";

        console.log("🚀 跳转 SenPlayer:");
        console.log(senUrl);

        location.href = senUrl;
    }

    // 劫持 fetch
    const rawFetch = window.fetch;

    window.fetch = async function (...args) {

        const url = args[0]?.url || args[0];

        console.log("🌐 fetch:", url);

        if (typeof url === "string") {
            jump(url);
        }

        return rawFetch.apply(this, args);
    };

    // 劫持 XHR
    const rawOpen = XMLHttpRequest.prototype.open;

    XMLHttpRequest.prototype.open = function (method, url) {

        console.log("🌐 xhr:", url);

        jump(url);

        return rawOpen.apply(this, arguments);
    };

    // 劫持 hls.js
    setInterval(() => {

        if (window.Hls && !window.__senplayer_hls__) {

            window.__senplayer_hls__ = true;

            console.log("🎬 检测到 Hls.js");

            const rawLoadSource = window.Hls.prototype.loadSource;

            window.Hls.prototype.loadSource = function (url) {

                console.log("🎬 Hls.loadSource:", url);

                jump(url);

                return rawLoadSource.apply(this, arguments);
            };
        }

    }, 1000);

    // 劫持 video.js
    setInterval(() => {

        if (window.videojs && !window.__senplayer_videojs__) {

            window.__senplayer_videojs__ = true;

            console.log("🎬 检测到 videojs");

            const rawSrc = window.videojs.Player.prototype.src;

            window.videojs.Player.prototype.src = function (source) {

                console.log("🎬 videojs src:", source);

                if (typeof source === "string") {
                    jump(source);
                }

                if (source && source.src) {
                    jump(source.src);
                }

                return rawSrc.apply(this, arguments);
            };
        }

    }, 1000);

    // 劫持原生 video
    setInterval(() => {

        const videos = document.querySelectorAll("video");

        videos.forEach(video => {

            if (video.__senplayer_hooked__) return;

            video.__senplayer_hooked__ = true;

            console.log("🎬 劫持原生 video");

            video.addEventListener("play", () => {

                console.log("▶️ play");

                const url =
                    video.currentSrc ||
                    video.src;

                jump(url);

            }, true);

        });

    }, 1000);

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

$done({
    body
});
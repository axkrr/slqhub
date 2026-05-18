/**
 * @name SenPlayerInject
 * @desc 网页视频直接调用 SenPlayer
 * @author axkrr
 * @update 2026-05-18
 */

let body = $response.body || "";

console.log("════════════════════════════");
console.log("🎬 SenPlayer Inject 启动");

const inject = `
<script>
(function () {

    console.log("🎬 SenPlayer 注入成功");

    // 防重复
    if (window.__senplayer_injected__) return;
    window.__senplayer_injected__ = true;

    // 获取真实视频地址
    function getVideoUrl(video) {

        if (!video) return "";

        let src = "";

        // video.src
        if (video.src) {
            src = video.src;
        }

        // source 标签
        if (!src) {
            const source = video.querySelector("source");
            if (source && source.src) {
                src = source.src;
            }
        }

        // currentSrc
        if (!src && video.currentSrc) {
            src = video.currentSrc;
        }

        console.log("🎬 检测视频地址:", src);

        return src;
    }

    // 跳转播放器
    function openSenPlayer(video) {

        const url = getVideoUrl(video);

        if (!url) {
            console.log("❌ 未获取到视频地址");
            return;
        }

        // blob 跳过
        if (url.startsWith("blob:")) {
            console.log("⚠️ blob 视频，暂不处理");
            return;
        }

        const senUrl =
            "senplayer://x-callback-url/play?url=" +
            encodeURIComponent(url) +
            "&force=true";

        console.log("🚀 跳转 SenPlayer:");
        console.log(senUrl);

        // 阻止网页播放
        video.pause();

        // 跳转
        location.href = senUrl;
    }

    // 劫持 video
    function hookVideo(video) {

        if (!video || video.__senplayer_hooked__) return;

        video.__senplayer_hooked__ = true;

        console.log("🎬 劫持 video:", video);

        // 点击播放
        video.addEventListener("play", function () {

            console.log("▶️ 用户播放视频");

            openSenPlayer(video);

        }, true);

        // 点击
        video.addEventListener("click", function () {

            console.log("🖱️ 点击视频");

            setTimeout(() => {
                openSenPlayer(video);
            }, 200);

        }, true);

    }

    // 扫描页面
    function scanVideos() {

        const videos = document.querySelectorAll("video");

        console.log("🎬 当前 video 数量:", videos.length);

        videos.forEach(v => {
            hookVideo(v);
        });

    }

    // 初始扫描
    scanVideos();

    // 动态监听
    const observer = new MutationObserver(() => {
        scanVideos();
    });

    observer.observe(document.documentElement, {
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

$done({
    body
});
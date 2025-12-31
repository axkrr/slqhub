/**
 * @name 视频流嗅探提取跳转器 (BoxJs 完整集成版)
 * @author 移植自御清弦 & 适配 ios151 BoxJs 配置
 * @desc 适配 PH/TXH 全网嗅探，读取 BoxJs 设置，点击通知跳转 SenPlayer/nPlayer/Infuse
 */

const isResponse = typeof $response !== "undefined";
const requestUrl = $request.url;

// --- 【阶段 A】处理嗅探到的信号并执行跳转 ---
if (requestUrl.indexOf('surge_click_to_play=') != -1) {
    const videoUrl = decodeURIComponent(requestUrl.split('surge_click_to_play=')[1]);
    
    // 1. 直接读取 BoxJs 配置数据 (对应您提供的 id: scheme)
    let playerSelect = "SenPlayer"; // 默认播放器
    let customScheme = "";
    const boxData = $persistentStore.read("scheme");
    
    if (boxData) {
        try {
            const obj = JSON.parse(boxData);
            playerSelect = obj.scheme_select || "SenPlayer";
            customScheme = obj.scheme_custom || "";
        } catch (e) {
            console.log("BoxJs 配置解析失败，请检查是否在 BoxJs 中点击了保存");
        }
    }

    // 2. 根据 BoxJs 的选择构造跳转协议 (集成大佬脚本跳转逻辑)
    let finalScheme = "";
    switch (playerSelect) {
        case "nPlayer":
            finalScheme = "nplayer-" + videoUrl;
            break;
        case "Infuse":
            finalScheme = "infuse://x-callback-url/play?url=" + encodeURIComponent(videoUrl);
            break;
        case "Safari":
            finalScheme = videoUrl;
            break;
        case "自定义":
            finalScheme = (customScheme || "") + videoUrl;
            break;
        case "SenPlayer":
        default:
            // SenPlayer 自动播放关键：使用 play?url= 且必须 Base64 编码
            try {
                const base64Url = btoa(unescape(encodeURIComponent(videoUrl)));
                finalScheme = "senplayer://play?url=" + base64Url;
            } catch (e) {
                finalScheme = "senplayer://" + videoUrl;
            }
            break;
    }

    // 3. 推送通知：点击直接唤起播放器
    $notification.post(
        "🎬 视频提取成功",
        `播放器: ${playerSelect} (点击通知跳转)`,
        "链接: " + videoUrl.split('?')[0].split('/').pop(),
        { "open-url": finalScheme }
    );
    
    // 4. 修复 illegal result 报错：必须返回完整的 response 对象
    $done({
        response: {
            status: 204,
            headers: { "Content-Type": "text/plain", "Access-Control-Allow-Origin": "*" },
            body: ""
        }
    });
} 

// --- 【阶段 B】向网页注入 Tampermonkey 监控内核 ---
else if (isResponse && $response.body && $response.body.indexOf('</head>') != -1) {
    const injectCode = `
    <script>
    (function() {
        'use strict';
        const foundUrls = new Set();
        
        // 信号发射器：将嗅探到的链接发送给 Surge 后台
        function sendToSurge(mUrl) {
            if (mUrl && mUrl.indexOf('.m3u8') != -1 && !foundUrls.has(mUrl)) {
                foundUrls.add(mUrl);
                // 使用 Image 对象发送伪请求，确保跨域兼容且不干扰网页原有逻辑
                const img = new Image();
                img.src = '/surge_click_to_play=' + encodeURIComponent(mUrl);
            }
        }

        // 1. 移植原版内核：监控 XMLHttpRequest (XHR)
        const originalXHR = window.XMLHttpRequest.prototype.open;
        window.XMLHttpRequest.prototype.open = function(method, url) {
            if (typeof url === 'string' && url.indexOf('.m3u8') != -1) sendToSurge(url);
            return originalXHR.apply(this, arguments);
        };

        // 2. 移植原版内核：监控 Fetch
        const originalFetch = window.fetch;
        window.fetch = function(url, options) {
            const tUrl = (typeof url === 'string') ? url : (url && url.url ? url.url : "");
            if (tUrl && tUrl.indexOf('.m3u8') != -1) sendToSurge(tUrl);
            return originalFetch.apply(this, arguments);
        };

        // 3. 移植原版内核：定期扫描 video/source 标签
        function checkTags() {
            const tags = document.querySelectorAll('video, source');
            for (let t of tags) {
                const s = t.src || t.getAttribute('src');
                if (s && s.indexOf('.m3u8') != -1) sendToSurge(s);
            }
        }

        // 初始化及定时器 (每2秒检查一次，与原版一致)
        setInterval(checkTags, 2000);
    })();
    </script>
    `;
    // 注入代码至网页 head 标签末尾
    $done({ body: $response.body.replace('</head>', injectCode + '</head>') });
} 

// --- 【阶段 C】兜底处理 ---
else {
    $done({});
}

/**
 * @name Video2SenPlayer
 * @desc 针对 PH 和 TXH067 优化的视频提取脚本
 */

let body = $response.body;

if (body && body.includes('</head>')) {
    const injectCode = `
    <script>
    (function() {
        // 创建悬浮按钮
        const btn = document.createElement('div');
        btn.innerHTML = '▶️';
        btn.style = 'position:fixed;bottom:100px;right:20px;width:55px;height:55px;background:#ff9900;color:#fff;border-radius:50%;text-align:center;line-height:55px;font-size:26px;z-index:999999;box-shadow:0 4px 12px rgba(0,0,0,0.4);cursor:pointer;font-weight:bold;';
        document.body.appendChild(btn);

        btn.onclick = function() {
            let videoUrl = "";
            
            // 1. 针对 PornHub 的提取逻辑
            if (window.location.host.includes('pornhub')) {
                if (typeof flashvars !== 'undefined') {
                    // 优先取最高画质 1080p > 720p
                    videoUrl = flashvars.mediaDefinitions.find(i => i.quality == '1080' || i.quality == '720')?.videoUrl || "";
                }
            }

            // 2. 针对通用 m3u8 (TXH067 等) 的提取逻辑
            if (!videoUrl) {
                const videoTags = document.querySelectorAll('video source, video');
                for (let v of videoTags) {
                    let src = v.src || v.getAttribute('src');
                    if (src && src.includes('m3u8')) {
                        videoUrl = src;
                        break;
                    }
                }
            }

            // 3. 全局正则兜底扫描
            if (!videoUrl) {
                const match = document.documentElement.outerHTML.match(/(https?:\\/\\/[^\\s'"]+\\.m3u8[^\\s'"]*)/);
                if (match) videoUrl = match[0];
            }

            if (videoUrl) {
                // 转换协议并跳转 SenPlayer
                // SenPlayer 格式: senplayer://play?url= (部分版本支持直接跟 URL，建议 Base64)
                const finalUrl = 'senplayer://play?url=' + btoa(videoUrl);
                window.location.href = finalUrl;
                
                // 提示用户
                btn.innerHTML = '✅';
                setTimeout(() => { btn.innerHTML = '▶️'; }, 2000);
            } else {
                alert('未检测到可提取的视频流，请等待视频开始加载后再试。');
            }
        };
    })();
    </script>
    `;
    body = body.replace('</head>', `${injectCode}</head>`);
    $done({ body });
} else {
    $done({});
}

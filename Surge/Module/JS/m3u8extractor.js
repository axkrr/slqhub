/**
 * @name Video2SenPlayer_Notify
 * @desc 嗅探 m3u8 并通过 Surge 通知推送，点击通知跳转 SenPlayer
 */

let body = $response.body;
let url = $request.url;

if (body) {
    let videoUrl = "";

    // 1. 针对 PornHub 的提取逻辑 (从页面变量提取)
    if (url.includes('pornhub.com')) {
        let match = body.match(/"videoUrl":"(https?.*?.m3u8.*?)"/);
        if (match) videoUrl = match[1].replace(/\\/g, "");
    }

    // 2. 通用正则提取 (针对 TXH067 或其他)
    if (!videoUrl) {
        let reg = /https?[:\/\w\.-]+\.m3u8[^\s"']*/;
        let match = body.match(reg);
        if (match) videoUrl = match[0];
    }

    // 3. 如果找到链接，推送 Surge 通知
    if (videoUrl) {
        // 构建 SenPlayer 跳转协议 (使用 Base64 编码)
        let senUrl = "senplayer://play?url=" + Data.fromUTF8(videoUrl).toBase64();
        
        $notification.post(
            "🎥 已成功嗅探视频源",
            "点击此通知立即跳转 SenPlayer 播放",
            "来源: " + (url.includes('pornhub') ? "PornHub" : "TXH067"),
            { "open-url": senUrl }
        );
    }
}

$done({ body });

/**
 * @name dxstjpure_jsfile
 * @description daxuesoutijiang ad blocking script
 */

let body = $response.body;
if (body) {
    try {
        let obj = JSON.parse(body);
        if (obj.data) {
            // 将渲染超时设为 0，实现秒跳
            if (obj.data.adPosConfig) {
                obj.data.adPosConfig.renderTimeout = 0;
            }
            // 清空广告列表
            if (obj.data.codePosList) {
                obj.data.codePosList = [];
            }
        }
        $done({ body: JSON.stringify(obj) });
    } catch (e) {
        $done({ body });
    }
} else {
    $done({ body });
}

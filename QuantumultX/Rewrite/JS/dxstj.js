/**
 * @name dxstjpure_jsfile
 * @description 大学搜题酱 ad blocking script
 */

let body = $response.body;
if (body) {
    try {
        let obj = JSON.parse(body);
        if (obj.data) {
            if (obj.data.adPosConfig) {
                obj.data.adPosConfig.renderTimeout = 0;
            }
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

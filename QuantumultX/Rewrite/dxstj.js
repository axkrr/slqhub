/**
 * @name dxstjpure_jsfile
 * @description daxuesoutijiang ad blocking script
 */

let body = $response.body;
if (body) {
    try {
        let obj = JSON.parse(body);
        if (obj.data) {
            // 将倒计时渲染时间设为 0
            obj.data.renderTimeout = 0;
            // 清空广告列表
            obj.data.adList = [];
        }
        $done({ body: JSON.stringify(obj) });
    } catch (e) {
        $done({ body });
    }
} else {
    $done({ body });
}

/**
 * @name dxstjpure_jsfile
 * @description daxuesoutijiang ad blocking script
 */

let body = $response.body;
if (body) {
    try {
        let obj = JSON.parse(body);

        // 修改倒计时渲染时间为 0
        if (obj.data) {
            obj.data.renderTimeout = 0;
        }
        
        // 清空广告列表
        if (obj.data) {
            obj.data.adList = [];
        }

        $done({ body: JSON.stringify(obj) });
    } catch (e) {
        $done({ body });
    }
} else {
    $done({ body });
}

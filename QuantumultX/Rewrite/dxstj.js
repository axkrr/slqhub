/**
 * @name dxstjpure_jsfile
 * @description daxuesoutijiang ad blocking script
 */

let body = $response.body;
if (body) {
    try {
        let obj = JSON.parse(body);

        // 清空广告数据列表
        if (obj.data && obj.data.adList) {
            obj.data.adList = [];
        }
        
        // 修改渲染超时时间实现秒跳
        if (obj.data && obj.data.renderTimeout) {
            obj.data.renderTimeout = 0;
        }

        // 针对部分版本可能存在的额外配置
        if (obj.data && obj.data.conf) {
            obj.data.conf = {};
        }

        $done({ body: JSON.stringify(obj) });
    } catch (e) {
        $done({ body });
    }
} else {
    $done({ body });
}

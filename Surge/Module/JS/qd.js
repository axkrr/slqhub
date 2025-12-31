/**
 * @name qdpure_jsfile
 * @desc 广告屏蔽脚本修正版
 */

// 检查是否有 body 数据
if (typeof $response !== "undefined" && $response.body) {
    let body = $response.body;
    try {
        let obj = JSON.parse(body);
        
        // 清空可能的广告列表数据
        if (obj.data && Array.isArray(obj.data)) {
            obj.data = [];
        }
        if (obj.bid && Array.isArray(obj.bid)) {
            obj.bid = [];
        }
        
        // 确保状态码正常，防止因数据为空导致客户端逻辑报错
        obj.code = 1;
        obj.message = "success";
        
        $done({ body: JSON.stringify(obj) });
    } catch (e) {
        // 如果不是 JSON 格式，直接返回原数据
        $done({ body });
    }
} else {
    // 无数据时直接结束
    $done({});
}

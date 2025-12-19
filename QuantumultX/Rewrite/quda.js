/**
 * @name qdpure_jsfile
 * @description quda ad blocking script
 */

let body = $response.body;
if (body) {
    try {
        let obj = JSON.parse(body);
        
        // 清空所有广告数据列表
        if (obj.data) {
            obj.data = [];
        }
        if (obj.bid) {
            obj.bid = [];
        }
        
        // 保持状态码为成功
        obj.code = 1;
        obj.message = "成功";
        
        $done({ body: JSON.stringify(obj) });
    } catch (e) {
        $done({ body });
    }
} else {
    $done({ body });
}

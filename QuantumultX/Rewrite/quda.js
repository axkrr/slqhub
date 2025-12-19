/**
 * 趣达(QuDa) 广告列表清空脚本
 * 作用：拦截广告调度，清空 Waterfall 列表实现秒跳
 */

let body = $response.body;
if (body) {
    try {
        let obj = JSON.parse(body);
        // 1. 清空所有的广告位数据
        if (obj.data) obj.data = [];
        if (obj.bid) obj.bid = [];
        // 2. 将广告配置数量设为 0
        if (obj.con) obj.con = 0;
        // 3. 保持状态码为 1 (成功)，避免报错进入超时逻辑
        obj.code = 1;
        obj.message = "成功";
        
        $done({ body: JSON.stringify(obj) });
    } catch (e) {
        $done({ body });
    }
} else {
    $done({ body });
}

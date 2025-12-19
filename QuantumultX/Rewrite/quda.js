/**
 * 趣达(QuDa) 深度秒跳脚本
 * 目标：消除广告拦截后的空白占位页
 */

let body = $response.body;
if (body) {
    try {
        let obj = JSON.parse(body);
        
        // 1. 核心欺骗：直接修改外层的 code 和 status
        // 让 App 认为服务器明确告知“没有任何广告配置”，从而跳过渲染阶段
        obj.code = 1;
        obj.status = 1; 
        
        // 2. 彻底移除 data 里的所有内容
        // 很多 App 看到 data 为空数组 [] 会等待，但看到 data 为 null 或直接删除字段会立刻跳过
        if (obj.hasOwnProperty('data')) {
            obj.data = []; 
        }

        // 3. 针对性修改：如果你在 JSON 里看到了类似 timeout 或 show 的字段，强行置 0
        // 这能解决你说的那个“白一下”的等待过程
        if (obj.config) {
            obj.config.show_time = 0;
            obj.config.wait_time = 0;
        }

        $done({ body: JSON.stringify(obj) });
    } catch (e) {
        $done({ body });
    }
} else {
    $done({ body });
}

/**
 * 趣达(QuDa) 专属秒跳脚本 - 彻底消除白屏
 * 逻辑：将加载等待时间(load)直接归零，并清空竞价单
 */

let body = $response.body;
if (body) {
    try {
        let obj = JSON.parse(body);

        // 1. 消除加载等待时间（关键：将 4000 改为 0）
        if (obj.hasOwnProperty('load')) {
            obj.load = 0;
        }

        // 2. 策略开关：有些 App 改为 0 会直接跳过开屏逻辑
        if (obj.hasOwnProperty('lns')) {
            obj.lns = 0;
        }

        // 3. 清空广告竞价列表
        // 让 App 发现没有需要请求的广告源，配合 load=0 实现秒进
        if (obj.data) obj.data = [];
        if (obj.bid) obj.bid = [];

        // 4. 保持请求 ID 成功状态
        obj.code = 1;
        obj.message = "成功";

        $done({ body: JSON.stringify(obj) });
    } catch (e) {
        $done({ body });
    }
} else {
    $done({ body });
}

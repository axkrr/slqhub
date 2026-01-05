/**
 * @name dxstjpure_jsfile
 * @desc 大学搜题酱去广告及秒跳修正版
 */

let body = $response.body;

if (body) {
    try {
        let obj = JSON.parse(body);
        
        if (obj.data) {
            // 1. 实现开屏/广告秒跳
            if (obj.data.adPosConfig) {
                // 将超时和渲染时间设为 0
                obj.data.adPosConfig.renderTimeout = 0;
                obj.data.adPosConfig.requestTimeout = 0;
                obj.data.adPosConfig.waitTimeout = 0;
            }
            
            // 2. 清空广告列表
            if (obj.data.codePosList) {
                obj.data.codePosList = [];
            }

            // 3. 额外清理可能存在的其他广告字段
            const extraKeys = ["adList", "bannerList", "configList"];
            extraKeys.forEach(k => {
                if (obj.data[k]) obj.data[k] = [];
            });
        }

        $done({ body: JSON.stringify(obj) });
    } catch (e) {
        // 解析失败则返回原体
        console.log("dxstjpure script error: " + e);
        $done({ body });
    }
} else {
    $done({});
}

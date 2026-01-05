/**
 * @name dxstjpure_pro
 * @desc 大学搜题酱：去开屏广告 + 去首页弹窗 + 去横幅 (Pro版)
 */

let body = $response.body;

if (body) {
    try {
        let obj = JSON.parse(body);
        
        if (obj.data) {
            // --- 1. 针对开屏/启动广告的处理 ---
            if (obj.data.adPosConfig) {
                obj.data.adPosConfig.renderTimeout = 0;
                obj.data.adPosConfig.requestTimeout = 0;
                obj.data.adPosConfig.waitTimeout = 0;
            }
            
            if (obj.data.codePosList) {
                obj.data.codePosList = [];
            }

            // --- 2. 针对首页弹窗/活动弹窗的处理 (新增) ---
            // 这里列出了常见的弹窗字段名，将它们全部设为 null 或空
            const popupKeys = [
                "dialogConfig",   // 常见通用弹窗
                "activityConfig", // 活动弹窗
                "homeDialog",     // 首页弹窗
                "popWindow",      // 浮窗
                "floatLayer",     // 悬浮层
                "notice",         // 公告
                "tips"            // 提示
            ];
            
            popupKeys.forEach(key => {
                if (obj.data[key]) {
                    // 部分App对null处理不好，给一个空对象更安全，
                    // 但如果是配置项，通常设为 null 或 undefined 即可隐藏
                    obj.data[key] = null; 
                }
            });

            // --- 3. 针对列表/横幅广告的清理 ---
            const adKeys = ["adList", "bannerList", "configList", "resourceList"];
            adKeys.forEach(k => {
                if (obj.data[k]) obj.data[k] = [];
            });
        }

        $done({ body: JSON.stringify(obj) });
    } catch (e) {
        console.log("脚本执行异常: " + e);
        $done({ body });
    }
} else {
    $done({});
}

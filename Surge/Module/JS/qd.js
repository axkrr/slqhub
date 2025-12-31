/**
 * @name qdpure_jsfile_v2
 * @desc 强力去广告修正版
 */

let body = $response.body;

if (body) {
    try {
        let obj = JSON.parse(body);

        // 1. 自动定位并清空常见的广告/列表字段
        const adKeys = ["data", "bid", "list", "ad_list", "ads", "items"];
        adKeys.forEach(key => {
            if (obj.hasOwnProperty(key)) {
                // 无论原本是对象还是数组，都处理为空数组
                obj[key] = [];
            }
        });

        // 2. 针对某些 APP 必须返回成功状态码的需求
        if (obj.code !== undefined) obj.code = 1;
        if (obj.status !== undefined) obj.status = 1;
        if (obj.message) obj.message = "success";

        $done({ body: JSON.stringify(obj) });
    } catch (e) {
        // 解析失败（可能不是 JSON）则直接返回原数据
        $done({ body });
    }
} else {
    $done({});
}

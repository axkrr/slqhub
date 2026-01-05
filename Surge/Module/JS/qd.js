let body = $response.body;

if (body) {
    try {
        let obj = JSON.parse(body);

        // 增加判断：确保 obj 是个对象且不为 null
        if (obj && typeof obj === 'object') {
            // 1. 自动定位并清空常见的广告/列表字段
            const adKeys = ["data", "bid", "list", "ad_list", "ads", "items"];
            adKeys.forEach(key => {
                // 安全起见，只修改存在的 key
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    obj[key] = [];
                }
            });

            // 2. 强制返回成功状态
            if (obj.code !== undefined) obj.code = 1;
            if (obj.status !== undefined) obj.status = 1;
            if (obj.message) obj.message = "success";

            $done({ body: JSON.stringify(obj) });
        } else {
            // 解析出来不是对象，原样返回
            $done({});
        }
    } catch (e) {
        console.log("Script Error: " + e); // 方便在日志看具体错误
        $done({});
    }
} else {
    $done({});
}

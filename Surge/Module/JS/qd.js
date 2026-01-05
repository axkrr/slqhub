/**
 * @name qdpure_jsfile_v2_final
 * @desc 强力去广告修正版 - 修复语法错误及缓存失效问题
 */

// 1. 获取基础数据
let body = $response.body;
let headers = $response.headers;
const url = $request.url;

// 2. 预处理：防止缓存导致脚本失效
// 删除缓存标记，强制服务器返回 200 而非 304
if (headers) {
    delete headers['ETag'];
    delete headers['Last-Modified'];
    headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    headers['Pragma'] = 'no-cache';
    headers['Expires'] = '0';
}

if (body) {
    try {
        let obj = JSON.parse(body);

        // 3. 核心逻辑：清空广告字段
        // 增加了一些常见的广告字段 key
        const adKeys = ["data", "bid", "list", "ad_list", "ads", "items", "banners", "advertisement"];
        
        if (obj && typeof obj === 'object') {
            adKeys.forEach(key => {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    // 保持原数据结构类型（数组或对象）
                    obj[key] = Array.isArray(obj[key]) ? [] : {};
                }
            });

            // 4. 状态修正（确保 App 逻辑正常通行）
            if (obj.code !== undefined) obj.code = 1;
            if (obj.status !== undefined) obj.status = 1;
            if (obj.message) obj.message = "success";
            if (obj.msg) obj.msg = "success";

            $done({ body: JSON.stringify(obj), headers: headers });
        } else {
            // 解析后不是对象，直接返回原 body 和修改后的 headers
            $done({ body, headers });
        }
    } catch (e) {
        // 如果解析失败（如图片、二进制或非 JSON 文本），直接返回
        console.log(`[qdpure] 解析跳过: ${url}`);
        $done({ body, headers });
    }
} else {
    // 处理 Body 为空的情况
    $done({ headers });
}

/**
 * @name qdpure_jsfile_v2_final
 * @desc 强力去广告修正版 - 修复语法错误及缓存失效问题
 */

// 安全兜底，防止非 Surge 执行环境炸模块
if (typeof $response === 'undefined') {
  $done({});
  return;
}

// 1. 获取基础数据
let body = $response.body;
let headers = $response.headers || {};
const url = $request.url;

// 2. 预处理：防止缓存导致脚本失效
delete headers['ETag'];
delete headers['Last-Modified'];
headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
headers['Pragma'] = 'no-cache';
headers['Expires'] = '0';

if (body) {
  try {
    let obj = JSON.parse(body);

    // 3. 核心逻辑：清空广告字段
    const adKeys = [
      'data',
      'bid',
      'list',
      'ad_list',
      'ads',
      'items',
      'banners',
      'advertisement'
    ];

    if (obj && typeof obj === 'object') {
      adKeys.forEach(key => {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          obj[key] = Array.isArray(obj[key]) ? [] : {};
        }
      });

      // 4. 状态修正
      if (obj.code !== undefined) obj.code = 1;
      if (obj.status !== undefined) obj.status = 1;
      if (obj.message) obj.message = 'success';
      if (obj.msg) obj.msg = 'success';

      $done({
        body: JSON.stringify(obj),
        headers: headers
      });
      return;
    }
  } catch (e) {
    console.log('[qdpure] JSON parse skip:', url);
  }
}

// 兜底返回
$done({
  body: body,
  headers: headers
});

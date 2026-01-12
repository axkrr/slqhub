/**
 * @name qdpure
 * @desc 去哒广告净化
 */

// 防止非Surge执行环境炸模块
if (typeof $response === 'undefined') {
  $done({});
  return;
}

// 获取基础数据
let body = $response.body;
let headers = $response.headers || {};
const url = $request.url;

// 防止缓存导致脚本失效
delete headers['ETag'];
delete headers['Last-Modified'];
headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
headers['Pragma'] = 'no-cache';
headers['Expires'] = '0';

if (body) {
  try {
    let obj = JSON.parse(body);

    // 清空广告字段
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

      // 状态修正
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

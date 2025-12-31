/*
 * MomentsPure
 * 微信朋友圈 JSON 级广告去除
 */

if (!$response || !$response.body) {
  $done({});
}

let body = $response.body;

try {
  let obj = JSON.parse(body);

  // 常见朋友圈信息流数组字段
  const feedKeys = ["ObjectList", "object_list", "list", "items"];

  feedKeys.forEach(key => {
    if (Array.isArray(obj[key])) {
      obj[key] = obj[key].filter(item => {
        // 广告特征字段
        if (!item) return false;

        if (
          item.adxml ||
          item.adInfo ||
          item.ad_info ||
          item.advertisement ||
          item.promotion ||
          item.isAd === true ||
          item.is_ad === 1 ||
          item.ad_type
        ) {
          return false;
        }

        return true;
      });
    }
  });

  // 删除全局广告字段
  delete obj.adInfo;
  delete obj.ad_info;
  delete obj.advertisement;
  delete obj.promotion;

  body = JSON.stringify(obj);
} catch (e) {
  // 非 JSON 或结构变化，直接放行
}

$done({ body });

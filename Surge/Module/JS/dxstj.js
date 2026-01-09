/**
 * @name dxstjpure_pro
 * @desc 大学搜题酱：去开屏广告 + 去首页弹窗 + 去横幅 (Pro版)
 */

// 安全兜底，防止非 Surge 环境或异常触发
if (typeof $response === 'undefined') {
  $done({});
  return;
}

let body = $response.body;

if (!body) {
  $done({});
  return;
}

try {
  let obj = JSON.parse(body);

  if (obj && obj.data && typeof obj.data === 'object') {

    // 1. 开屏 / 启动广告
    if (obj.data.adPosConfig && typeof obj.data.adPosConfig === 'object') {
      obj.data.adPosConfig.renderTimeout = 0;
      obj.data.adPosConfig.requestTimeout = 0;
      obj.data.adPosConfig.waitTimeout = 0;
    }

    if (Array.isArray(obj.data.codePosList)) {
      obj.data.codePosList = [];
    }

    // 2. 首页弹窗 / 活动弹窗 / 浮窗
    const popupKeys = [
      'dialogConfig',
      'activityConfig',
      'homeDialog',
      'popWindow',
      'floatLayer',
      'notice',
      'tips'
    ];

    popupKeys.forEach(key => {
      if (key in obj.data) {
        obj.data[key] = null;
      }
    });

    // 3. 横幅 / 列表广告
    const adKeys = [
      'adList',
      'bannerList',
      'configList',
      'resourceList'
    ];

    adKeys.forEach(key => {
      if (Array.isArray(obj.data[key])) {
        obj.data[key] = [];
      }
    });
  }

  $done({
    body: JSON.stringify(obj)
  });
} catch (e) {
  console.log('[dxstjpure] parse error');
  $done({ body });
}

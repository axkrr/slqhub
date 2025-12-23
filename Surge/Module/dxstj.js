/*
 * @name dxstjpure_jsfile
 * @description daxuesoutijiang ad blocking script
 */

let obj = JSON.parse($response.body);

// 移除开屏广告及首页弹窗
if (obj.data && obj.data.common_config) {
  delete obj.data.common_config.splash_screen;
  delete obj.data.common_config.popup_window;
}

// 屏蔽各类推广及横幅
if (obj.data && obj.data.banner_list) {
  obj.data.banner_list = [];
}

// 净化个人中心入口
if (obj.data && obj.data.mine_menu) {
  obj.data.mine_menu = obj.data.mine_menu.filter(item => !item.title.includes("推荐") && !item.title.includes("活动"));
}

$done({body: JSON.stringify(obj)});

/**
 * @name balance
 * @desc 获取一卡通Token，请记得添加boxjs订阅。打开近日校园app的余额页面自动获取Token。
 * @author axkrr
 * @update 2026-06-24
*/

const APIKey = 'CQU'
const ROOT_KEY = '#CQU'

$ = new API(APIKey, true)

if (typeof $request !== 'undefined') {
  GetToken()
}

function GetToken() {
  const headers = $request.headers || {}
  const token = headers['synjones-auth'] || ''

  if (token) {
    let root = {}
    try {
      root = JSON.parse($persistentStore.read('CQU') || '{}')
    } catch (e) {
      root = {}
    }
    root.CardBalance = root.CardBalance || {}
    root.CardBalance.Settings = root.CardBalance.Settings || {}
    root.CardBalance.Settings.Token = token

    $.write(JSON.stringify(root), '#CQU')

    $.notify(
      '重庆大学一卡通',
      'Token 写入成功',
      'CQU → CardBalance → Settings → Token'
    )
  } else {
    $.notify(
      '重庆大学一卡通',
      '未检测到 Token',
      '请确保已打开校园卡余额页面'
    )
  }

  $.done()
}
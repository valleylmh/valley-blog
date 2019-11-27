var sha1 = require('sha1')
var axios = require('axios')
var signature
const instance = axios.create({
  baseURL: 'https://api.weixin.qq.com/cgi-bin',
  timeout: 8000 //响应时间
});

(async () => {
  // 获取access_token
  var res = await instance.get('/token', {
    params: {
      grant_type: 'client_credential',
      appid: 'wx43852f8f0e199224',
      secret: '3fcaa30f1c7c52db0a60e17ce6dccf1d'
    }
  })
  // 获取ticket
  var res2 = await instance.get('/ticket/getticket', {
    params: {
      access_token: res.data.access_token,
      type: 'jsapi'
    }
  })
  var jsapi_ticket = res2.data.ticket
  var noncestr = '2nDgiWM7gCxhL8v0'
  var timestamp = '1420774989'
  var url = 'http://192.168.0.198:8000/demo.html'
  var string1 = 'jsapi_ticket='+ jsapi_ticket + '&noncestr='+ noncestr + '&timestamp='+ timestamp + '&url=' + url
  signature = sha1(string1)
})()

module.exports = signature


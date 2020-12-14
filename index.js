// ================ 配置 ================

// 部署网址的路径
const host = 'https://www.example.com/'

// 字符串长度
const strLen = 6

// ================ HTTP状态 ================

const status400 = '400 Bad Request'
const status404 = '404 Not Found'
const status503 = '503 Service Unavailable'

// ================ 页面 ================

function getHtmlTemplate(title, content) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
  </head>
  <body>
    <h1>${title}</h1>
    <p>${content}</p>
  </body>
  </html>
  `
}

// ================ 回复 ================

function getHtmlResponse(status, title, content) {
  return new Response(getHtmlTemplate(title, content), {
    headers: {
      'content-type': 'text/html;charset=UTF-8',
    },
    status: status,
  })
}

// ================ 代码 ================

// 生成随机字符串
// 可能可以更换成CRC-32，但需要引入新的库所以很麻烦
async function randomString(len) {
  len = len || 6 // 长度默认为6，可以修改
  let $chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678' // 默认去掉了容易混淆的字符oOLl,9gq,Vv,Uu,I1
  let maxPos = $chars.length
  let result = ''
  for (i = 0; i < len; i++) {
    result += $chars.charAt(Math.floor(Math.random() * maxPos))
  }
  return result
}

// 检查输入URL是否合规
async function checkURL(URL) {
  let str = URL
  let Expression = /http(s)?:\/\/([\w-]+\.)+[\w-]+(\/[\w- .\/?%&=]*)?/
  let objExp = new RegExp(Expression)
  if (objExp.test(str) == true) {
    if (str[0] == 'h') return true
    else return false
  } else {
    return false
  }
}

// 保存URL到KV
async function save_url(URL) {
  let random_key = await randomString(strLen)
  let is_exist = await LINKS.get(random_key)
  console.log(is_exist)
  if (is_exist == null) return await LINKS.put(random_key, URL), random_key
  else save_url(URL)
}

// 默认的处理请求函数
async function handleRequest(request) {
  if (request.method === 'POST') {
    // 读取传入的URL
    let req = await request.formData()
    let url = req.get('url')
    // URL不合规，报错
    if (!(await checkURL(url))) {
      return getHtmlResponse(400, status400, 'Illegal URL.')
    }
    // 保存URL
    let stat,
      random_key = await save_url(url)
    if (typeof stat == 'undefined') {
      return getHtmlResponse(200, 'Shortened URL', `${host}${random_key}`)
    } else {
      // 达到每日键值写入限制
      return getHtmlResponse(
        503,
        status503,
        'Reached the daily key-value write limit.'
      )
    }
  }

  // 获取请求的短链接键
  const requestURL = new URL(request.url)
  const path = requestURL.pathname.split('/')[1]
  // 没有键，显示首页
  if (!path) {
    const index = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>URL Shortener</title>
    </head>
    <body>
      <h1>URL Shortener</h1>
      <form action="#" method="post">
        <label for="url">URL:</label>
        <input type="text" name="url" id="url">
        <input type="submit" value="Shorten">
      </form>
    </body>
    </html>
    `
    return new Response(index, {
      headers: {
        'content-type': 'text/html;charset=UTF-8',
      },
    })
  }
  // 有键，获取值
  const value = await LINKS.get(path)
  const location = value
  // 有值，跳转到指定URL
  if (location) {
    return Response.redirect(location, 302)
  }
  // KV中找不到值则报错
  return getHtmlResponse(
    404,
    status404,
    'The requested URL could not be found.'
  )
}

// （Cloudflare标准）访问Worker时处理请求
addEventListener('fetch', async (event) => {
  event.respondWith(handleRequest(event.request))
})

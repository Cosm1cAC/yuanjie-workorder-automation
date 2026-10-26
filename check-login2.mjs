import { checkLogin } from './lib/preflight.mjs'
console.log('cookie 登录检查:', await checkLogin())

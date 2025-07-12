local secret = os.getenv('AUTH_IMG_HMAC_SECRET')
if not secret or secret == '' then
  ngx.log(ngx.ERR, 'AUTH_IMG_HMAC_SECRET is not set')
  return ngx.exit(ngx.HTTP_INTERNAL_SERVER_ERROR)
end

local exp = tonumber(ngx.var.arg_exp)
local sig = ngx.var.arg_sig
if not exp or not sig then
  return ngx.exit(ngx.HTTP_UNAUTHORIZED)
end

if exp < ngx.time() then
  return ngx.exit(ngx.HTTP_UNAUTHORIZED)
end

local image_path = ngx.var.uri:gsub('^/images/', '')
local data = image_path .. ':' .. exp
local hmac = ngx.hmac_sha256(secret, data)
local expected = require('resty.string').to_hex(hmac)

if sig ~= expected then
  return ngx.exit(ngx.HTTP_UNAUTHORIZED)
end
-- success

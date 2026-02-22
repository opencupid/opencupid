local hmac = require "resty.hmac"
local str = require "resty.string"

local secret = os.getenv('AUTH_IMG_HMAC_SECRET')
if not secret or secret == '' then
  ngx.log(ngx.ERR, 'AUTH_IMG_HMAC_SECRET is not set')
  return ngx.exit(ngx.HTTP_INTERNAL_SERVER_ERROR)
end

local exp = tonumber(ngx.var.arg_exp)
local sig = ngx.var.arg_sig
if not exp or not sig then
  -- ngx.log(ngx.ERR, 'Missing exp or sig query parameters')
  return ngx.exit(ngx.HTTP_UNAUTHORIZED)
end

if exp < ngx.time() then
  -- ngx.log(ngx.ERR, 'Signature expired: exp=', exp, ', current time=', ngx.time())
  return ngx.exit(ngx.HTTP_UNAUTHORIZED)
end

local image_path = ngx.var.uri:gsub('^/user%-content/', '')
local data = image_path .. ':' .. exp

local hmac_sha = hmac:new(secret, hmac.ALGOS.SHA256)
local digest = hmac_sha:final(data, true) -- true = binary output
local expected = digest

if sig ~= expected then
  -- ngx.log(ngx.ERR, 'Invalid signature: expected=', expected, ', got=', sig)
  return ngx.exit(ngx.HTTP_UNAUTHORIZED)
end
-- success

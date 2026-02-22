local hmac = require "resty.hmac"
local bit = require "bit"

-- Constant-time string comparison to prevent timing attacks.
-- Uses XOR accumulation so every byte is always compared regardless of mismatches.
local function constant_time_compare(a, b)
  if #a ~= #b then return false end
  local result = 0
  for i = 1, #a do
    result = bit.bor(result, bit.bxor(string.byte(a, i), string.byte(b, i)))
  end
  return result == 0
end

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
local digest = hmac_sha:final(data, true) -- true = hex output
local expected = digest

if not constant_time_compare(sig, expected) then
  -- ngx.log(ngx.ERR, 'Invalid signature: expected=', expected, ', got=', sig)
  return ngx.exit(ngx.HTTP_UNAUTHORIZED)
end
-- success

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

local cookie = ngx.var.cookie___media_token
if not cookie then
  return ngx.exit(ngx.HTTP_UNAUTHORIZED)
end

local colon = cookie:find(':', 1, true)
if not colon then
  return ngx.exit(ngx.HTTP_UNAUTHORIZED)
end

local exp = tonumber(cookie:sub(1, colon - 1))
local sig = cookie:sub(colon + 1)
if not exp or not sig or sig == '' then
  return ngx.exit(ngx.HTTP_UNAUTHORIZED)
end

local CLOCK_SKEW_GRACE = 30
if exp + CLOCK_SKEW_GRACE < ngx.time() then
  return ngx.exit(ngx.HTTP_UNAUTHORIZED)
end

local hmac_sha = hmac:new(secret, hmac.ALGOS.SHA256)
local expected = hmac_sha:final(tostring(exp), true) -- true = hex output

if not constant_time_compare(sig, expected) then
  return ngx.exit(ngx.HTTP_UNAUTHORIZED)
end
-- success

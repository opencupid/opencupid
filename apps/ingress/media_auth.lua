local redis = require "resty.redis"
local red = redis:new()
red:set_timeouts(500, 500, 500)

local ok, err = red:connect("redis", 6379)
if not ok then
  ngx.log(ngx.ERR, "redis connect failed: ", err)
  return ngx.exit(ngx.HTTP_INTERNAL_SERVER_ERROR)
end

local jwt = ngx.var.cookie___session
if not jwt or jwt == "" then
  red:set_keepalive(10000, 100)
  return ngx.exit(ngx.HTTP_UNAUTHORIZED)
end

local res, err = red:get("session:" .. jwt)

local ok_ka, ka_err = red:set_keepalive(10000, 100)
if not ok_ka then
  ngx.log(ngx.ERR, "redis keepalive failed: ", ka_err)
end

if err then
  ngx.log(ngx.ERR, "redis get failed: ", err)
  return ngx.exit(ngx.HTTP_INTERNAL_SERVER_ERROR)
end

if not res or res == ngx.null then
  return ngx.exit(ngx.HTTP_UNAUTHORIZED)
end
-- session exists → allow

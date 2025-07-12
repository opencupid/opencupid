function parseCookie(cookies, name) {
  var parts = cookies.split(/;\s*/);
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i].split('=');
    if (p[0] === name) return p[1];
  }
  return null;
}

function authorize(r) {
  var cookieHeader = r.headersIn.Cookie || '';
  var val = parseCookie(cookieHeader, 'auth_img');
  if (!val) {
    r.return(401);
    return;
  }

  var decoded;
  try {
    decoded = Buffer.from(val, 'base64').toString();
  } catch (e) {
    r.return(401);
    return;
  }

  var parts = decoded.split(':');
  if (parts.length !== 3) {
    r.return(401);
    return;
  }
  var userId = parts[0];
  var exp = parseInt(parts[1]);
  var sig = parts[2];
  if (!userId || !exp || !sig) {
    r.return(401);
    return;
  }
  if (Date.now() / 1000 > exp) {
    r.return(401);
    return;
  }

  var crypto = require('crypto');
  var payload = userId + ':' + exp;
  var secret = ngx.env.AUTH_IMG_HMAC_SECRET
  var calc = crypto.createHmac('sha256', secret)
                  .update(payload)
                  .digest('base64');
  if (calc !== sig) {
    r.return(401);
    return;
  }

  r.return(200);
}

export default { authorize };

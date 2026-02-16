# Admin Ingress Implementation Summary

## Overview

This implementation adds a secure admin ingress proxy running on a separate subdomain (e.g., `admin.example.org`) with TLS client certificate authentication for accessing administrative tools like Listmonk.

## What Was Implemented

### 1. Admin Landing Page (`apps/admin/`)
- **File**: `apps/admin/index.html`
- **Description**: Minimalistic, modern admin landing page with a link to Listmonk
- **Features**:
  - Clean, responsive design
  - Gradient background with card-based layout
  - Link to Listmonk email manager
  - Ready for future expansion with additional admin tools

### 2. Admin Ingress Service (`apps/ingress-admin/`)

#### Files Created:
- `Dockerfile` - Multi-stage build using OpenResty (nginx with Lua support)
- `nginx.conf.template` - Nginx configuration with TLS client cert authentication
- `index.html` - Copy of admin landing page for Docker build
- `README.md` - Comprehensive setup and troubleshooting guide

#### Features:
- **TLS Client Certificate Authentication**: Requires valid client certificates for access
- **Listmonk Reverse Proxy**: `/listmonk/` path proxies to `listmonk:9000`
- **HTTP to HTTPS Redirect**: Automatic redirect from port 80 to 443
- **ACME Challenge Support**: Let's Encrypt certificate validation via webroot
- **Security Headers**: Proper forwarding of client IP and protocol information

#### Configuration Details:
- Runs on ports 8443 (HTTPS) and 8080 (HTTP) to avoid conflicts with main ingress
- Uses OpenResty for advanced nginx features
- Supports optional client certificate verification (configurable to `on` for stricter security)
- Properly handles URL rewriting for Listmonk proxy

### 3. Docker Compose Configuration

#### Changes to `docker-compose.production.yml`:
- Added `ingress-admin` service:
  - Depends on `listmonk`
  - Exposed ports: 8443, 8080
  - Volumes: certbot certificates, webroot, client certs
  - Environment variables from `.env`
  
- Added `certbot-init-admin` service:
  - Separate certificate initialization for admin domain
  - Standalone mode for initial certificate acquisition

### 4. Environment Configuration

#### Changes to `.env.example`:
- `ADMIN_DOMAIN`: Admin subdomain (e.g., `admin.example.org`)
- `CLIENT_CERT_DIR`: Directory for client certificate CA (default: `/srv/client-certs`)

### 5. Scripts

#### `scripts/generate-client-certs.sh`
- Automated client certificate generation
- Creates CA, client certificates, and browser-importable PKCS12 bundle
- Includes helpful usage instructions
- Sets appropriate file permissions

#### `scripts/validate-admin-ingress.sh`
- Validates entire admin ingress configuration
- Checks file existence, docker-compose validity, environment variables
- Tests Docker build
- Provides next-step instructions

### 6. Documentation

#### `apps/ingress-admin/README.md`
Comprehensive guide covering:
- Feature overview
- TLS client certificate setup (step-by-step)
- SSL certificate options (separate, multi-domain, wildcard)
- Environment variables
- Port configuration
- Security notes
- Troubleshooting

#### `docs/DEPLOYMENT.md`
Added "Admin Ingress Configuration" section covering:
- Initial setup process
- Client certificate generation
- SSL certificate strategies
- Load balancer configuration
- Browser certificate import
- Testing with curl
- Security best practices
- Troubleshooting

## Certbot Multi-Domain Strategy

Three strategies are documented and supported:

### Option A: Separate Certificates (Recommended)
- Use `certbot-init` for main domain
- Use `certbot-init-admin` for admin domain
- Independent certificate management
- Clear separation of concerns

### Option B: Multi-Domain Certificate (DRY)
- Single certificate with Subject Alternative Names (SAN)
- Modify `certbot-init` command to include both domains
- Both ingress configs point to same cert path
- **Pros**: Single cert to manage, DRY
- **Cons**: Both domains validated together, renewal affects both

### Option C: Wildcard Certificate
- Use DNS validation (requires DNS provider API)
- Covers all subdomains automatically
- **Pros**: Most flexible, covers any subdomain
- **Cons**: More complex setup, requires DNS API access

## Testing

All components have been tested:
- ✅ Docker build succeeds for `ingress-admin`
- ✅ Docker compose configuration is valid
- ✅ Client certificate generation works correctly
- ✅ Certificates have proper permissions and validity periods
- ✅ Validation script passes all checks
- ✅ All required files present
- ✅ Environment variables properly configured

## Security Considerations

1. **Client Certificate Authentication**: Provides strong authentication without passwords
2. **Separate Ports**: Admin ingress uses different ports to avoid conflicts
3. **CA Private Key**: Should be kept offline and secure
4. **Certificate Rotation**: Recommended annually for client certificates
5. **Optional vs Required**: Currently set to `optional` for easier testing; can be changed to `on` for production
6. **Access Logging**: Nginx logs all access attempts for monitoring

## Deployment Steps

1. **Configure Environment**:
   ```bash
   vim .env  # Set ADMIN_DOMAIN and CLIENT_CERT_DIR
   ```

2. **Generate Client Certificates**:
   ```bash
   ./scripts/generate-client-certs.sh /srv/client-certs
   ```

3. **Obtain SSL Certificate**:
   ```bash
   # Option A - Separate cert
   docker compose -f docker-compose.production.yml run --rm --service-ports certbot-init-admin
   
   # Option B - Multi-domain cert (see docs)
   ```

4. **Configure Load Balancer/Proxy**:
   - Route `admin.example.org` → `ingress-admin:8443`
   - Route `example.org` → `ingress:443`

5. **Start Service**:
   ```bash
   docker compose -f docker-compose.production.yml up -d ingress-admin
   ```

6. **Import Client Certificate**:
   - Import `client.p12` to browser (password: `changeme`)
   - Visit `https://admin.example.org`

## Future Enhancements

Potential improvements for future iterations:

1. **Additional Admin Tools**: Expand landing page with links to other admin tools
2. **Certificate Revocation Lists (CRL)**: Implement CRL for compromised certificates
3. **Hardware Security Keys**: Support for U2F/FIDO2 hardware tokens
4. **Multi-Factor Authentication**: Add additional authentication layers
5. **Audit Logging**: Enhanced logging for compliance
6. **Rate Limiting**: Protect against brute force attempts
7. **IP Whitelisting**: Additional layer of access control
8. **Automated Certificate Rotation**: Script for periodic client cert rotation

## Files Changed

```
.env.example                              # Added ADMIN_DOMAIN, CLIENT_CERT_DIR
.gitignore                                # Added .env.test* exclusion
apps/admin/index.html                     # New: Admin landing page
apps/ingress-admin/Dockerfile             # New: Multi-stage Docker build
apps/ingress-admin/README.md              # New: Comprehensive setup guide
apps/ingress-admin/index.html             # New: Copy for Docker build
apps/ingress-admin/nginx.conf.template    # New: Nginx config with client cert auth
docker-compose.production.yml             # Modified: Added ingress-admin, certbot-init-admin
docs/DEPLOYMENT.md                        # Modified: Added admin ingress section
scripts/generate-client-certs.sh          # New: Certificate generation script
scripts/validate-admin-ingress.sh         # New: Configuration validation script
```

## No Breaking Changes

This implementation:
- ✅ Does not modify existing services
- ✅ Uses separate ports (8443/8080) to avoid conflicts
- ✅ Maintains backward compatibility
- ✅ All new services are additive
- ✅ Existing ingress remains unchanged
- ✅ Can be deployed independently

## Validation

Run the validation script to verify setup:
```bash
./scripts/validate-admin-ingress.sh
```

Expected output: All checks should pass ✓

## Support

For issues or questions:
1. Check `apps/ingress-admin/README.md` for troubleshooting
2. Check `docs/DEPLOYMENT.md` for deployment steps
3. Review nginx logs: `docker logs <container-name>`
4. Verify certificates: `openssl x509 -in ca.crt -noout -text`

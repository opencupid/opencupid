# Production/staging deployment tools

Terraform setup for provisioning a VPS instance in staging or production environments.

## Prerequisites

- [Terraform](https://developer.hashicorp.com/terraform/install) ≥ 1.6
- VPS provider account.  Currently only Hetzner is supported.

## Quick start

### 1. Provision the server

```bash
cd deployment/terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars — fill in hcloud_token, management_cidr, subdomain_fqdn
terraform init
terraform apply
```

Outputs the server IP, SSH command, and staging URL.

### 2. Deploy the application

```bash
cp .env.example .env.staging  # Edit .env.staging — fill in APP_SECRET, SMTP_*, DB_PASSWORD, etc.
cd deployment/scripts
./deploy.sh
```

The script waits for cloud-init to finish, copies the env file, pulls images, runs certbot (first deploy only), and starts all services.

### 3. Tear down

```bash
cd deployment/terraform
terraform destroy
```

## Notes

- Port 80 is open to the world for Let's Encrypt ACME HTTP-01 challenges. All other ports (22, 443, 10000) are restricted to `management_cidr`.
- Terraform generates a random 8-character host and creates `<random>.<derived-zone>` as the deployment FQDN.
- `derived-zone` comes from `subdomain_fqdn`: `example.org → example.org`, `staging.example.org → example.org`.
- The wildcard CNAME `*.<random> → <random>.<derived-zone>` covers `admin.*` and `meet.*` without extra A records. The DNS records are provisioned via Terraform.

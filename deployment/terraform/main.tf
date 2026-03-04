terraform {
  required_version = ">= 1.6"

  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.60"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
    }
  }
}

provider "hcloud" {
  token = var.hcloud_token
}

locals {
  # Split subdomain_fqdn into record name and DNS zone.
  # e.g. "staging.example.org" → record_name="staging", zone="example.org"
  _parts          = split(".", var.subdomain_fqdn)
  dns_record_name = local._parts[0]
  dns_zone        = join(".", slice(local._parts, 1, length(local._parts)))
  ssh_key_name    = "deploy-${var.project}-${var.environment}"
  ssh_key_relpath = "secrets"
  ssh_key_path    = "${path.module}/../../${local.ssh_key_relpath}/${local.ssh_key_name}"
}

# ── SSH Key ───────────────────────────────────────────────────────────────────
resource "tls_private_key" "staging" {
  algorithm = "ED25519"
}

resource "local_sensitive_file" "ssh_private_key" {
  filename        = local.ssh_key_path
  content         = tls_private_key.staging.private_key_openssh
  file_permission = "0600"
}

resource "local_file" "ssh_public_key" {
  filename        = "${local.ssh_key_path}.pub"
  content         = tls_private_key.staging.public_key_openssh
  file_permission = "0644"
}

resource "hcloud_ssh_key" "this" {
  name       = "opencupid-staging"
  public_key = tls_private_key.staging.public_key_openssh
}


# ── Firewall ──────────────────────────────────────────────────────────────────
# SSH, HTTPS, Jitsi: management IP only.
# Port 80: public — required for Let's Encrypt ACME HTTP-01 challenge.

resource "hcloud_firewall" "this" {
  name = "${var.project}-${var.environment}-fw"

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "22"
    source_ips = [var.management_cidr]
  }

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "80"
    source_ips = ["0.0.0.0/0", "::/0"]
  }

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "443"
    source_ips = [var.management_cidr]
  }

  rule {
    direction  = "in"
    protocol   = "udp"
    port       = "10000"
    source_ips = [var.management_cidr]
  }
}

# ── Server ────────────────────────────────────────────────────────────────────

resource "hcloud_server" "this" {
  name        = "opencupid-staging"
  image       = "debian-13"
  server_type = var.server_type
  location    = var.server_location
  ssh_keys    = [hcloud_ssh_key.this.id]

  user_data = templatefile("${path.module}/cloud-init.yaml.tpl", {
    app_user        = "user"
    ssh_public_key  = tls_private_key.staging.public_key_openssh
    node_version    = var.node_version
    management_cidr = var.management_cidr
  })

  firewall_ids = [hcloud_firewall.this.id]

  labels = {
    environment = var.environment
    project     = var.project
  }
}



# ── DNS Records ───────────────────────────────────────────────────────────────
# TTL 60 so DNS propagates fast after terraform apply / destroy.
#
# A record for the staging apex + wildcard CNAME for all subdomains.
data "hcloud_zone" "this" {
  name = local.dns_zone
}

resource "hcloud_zone_rrset" "staging" {
  zone    = data.hcloud_zone.this.id
  name    = local.dns_record_name
  type    = "A"
  ttl     = 60
  records = [{ value = hcloud_server.this.ipv4_address }]
}

resource "hcloud_zone_rrset" "staging_wildcard" {
  zone    = data.hcloud_zone.this.id
  name    = "*.${local.dns_record_name}"
  type    = "CNAME"
  ttl     = 60
  records = [{ value = "${var.subdomain_fqdn}." }]
}

variable "project" {
  description = "Project name for tagging resources in Hetzner Cloud."
  type        = string
  default     = "opencupid"
}

variable "environment" {
  description = "Environment name for tagging resources in Hetzner Cloud."
  type        = string
  default     = "staging"
}

variable "hcloud_token" {
  description = "Hetzner Cloud API token (read+write). Get from: https://console.hetzner.cloud → project → Security → API Tokens."
  type        = string
  sensitive   = true
}

variable "management_cidr" {
  description = "Your IP in CIDR notation (e.g. '1.2.3.4/32'). Only this address can reach SSH, HTTPS, and Jitsi on the staging server. Find your IP at https://ifconfig.me."
  type        = string
}

variable "subdomain_fqdn" {
  description = "Domain used to derive DNS zone (e.g. 'example.org' or 'staging.example.org')."
  type        = string
}

variable "server_type" {
  description = "Hetzner server type. cx32 (4 vCPU / 8 GB) is the minimum comfortable for the full stack (Postgres + Redis + Jitsi + app). cx42 (8 vCPU / 16 GB) if load testing."
  type        = string
  default     = "cx32"
}

variable "server_location" {
  description = "Hetzner datacenter. fsn1=Falkenstein, nbg1=Nuremberg, hel1=Helsinki, ash=Ashburn."
  type        = string
  default     = "fsn1"
}

variable "node_version" {
  description = "Node.js LTS version to install via nvm."
  type        = string
  default     = "22"
}

output "server_ip" {
  value       = hcloud_server.this.ipv4_address
  description = "Public IPv4 of the staging server. Also needed for JVB_ADVERTISE_IPS in .env.staging."
}

# The file path to the generated PRIVATE key (this is what ssh -i needs)
output "ssh_private_key_file" {
  value       = "../${local.ssh_key_relpath}/${local.ssh_key_name}"
  sensitive   = true
  description = "Path to the generated private SSH key file to use with ssh -i."
}

# Optional: the PUBLIC key content (what gets uploaded to Hetzner / authorized_keys)
output "ssh_public_key" {
  value       = local_file.ssh_public_key.content
  description = "Public SSH key (OpenSSH format) registered with Hetzner / placed on the server."
}

# Convenience command to connect (uses the PRIVATE key FILE)
output "ssh_command" {
  value       = "ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i ../${local.ssh_key_relpath}/${local.ssh_key_name} user@${hcloud_server.this.ipv4_address}"
  description = "SSH command to connect to the staging server (host key checking disabled)."
}

output "staging_url" {
  value       = "https://${var.subdomain_fqdn}"
  description = "Staging application URL."
}

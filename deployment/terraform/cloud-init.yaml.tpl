#cloud-config

package_update: true
package_upgrade: true

packages:
  - git
  - curl
  - jq
  - tmux
  
users:
  - name: ${app_user}
    groups:
      - sudo
      - docker
    shell: /bin/bash
    sudo: ALL=(ALL) NOPASSWD:ALL
    ssh_authorized_keys:
      - ${ssh_public_key}
    lock_passwd: true

write_files:
  - path: /etc/docker/daemon.json
    content: |
      {
        "log-driver": "json-file",
        "log-opts": {
          "max-size": "50m",
          "max-file": "5"
        },
        "live-restore": true
      }
    owner: root:root
    permissions: '0644'

runcmd:
  # 4 GB swap — essential: Jitsi + Postgres + Redis fills 8 GB RAM under load
  - fallocate -l 4G /swapfile
  - chmod 600 /swapfile
  - mkswap /swapfile
  - swapon /swapfile
  - echo '/swapfile none swap sw 0 0' >> /etc/fstab

  # Docker — official convenience script, installs CE + Compose plugin
  - curl -fsSL https://get.docker.com | sh
  - usermod -aG docker ${app_user}
  - systemctl enable docker
  - systemctl start docker

  # nvm + Node ${node_version} — local to ${app_user} only, no global symlinks
  # Single bash session: install nvm, source it, install node — all in one subshell
  - |
    sudo -u ${app_user} bash << 'ENDBASH'
    set -e
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
    export NVM_DIR="/home/${app_user}/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
    nvm install ${node_version}
    nvm alias default ${node_version}
    npm install -g pnpm
    ENDBASH

  # App data directories — owned by app user, mounted as Docker volumes
  - mkdir -p /srv/pgdata /srv/uploads /srv/certbot /srv/admin-ca
  - chown -R ${app_user}:${app_user} /srv

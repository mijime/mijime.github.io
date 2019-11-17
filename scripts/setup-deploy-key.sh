#!/usr/bin/env bash

set -ue

ssh_dir="${HOME}/.ssh"
mkdir -p "${ssh_dir}"
echo "${ACTIONS_DEPLOY_KEY}" > "${ssh_dir}/id_rsa"
ssh-keyscan -t rsa github.com > "${ssh_dir}/known_hosts"
chmod 400 "${ssh_dir}/id_rsa"

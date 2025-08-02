# 🧠 How to Use SSH Key to Access the GPU Server

## 1. Unzip the SSH key files

Double-click the zip file or run the following command in terminal:

    unzip my_ssh_keypair.zip -d ~/.ssh

This will extract:
- id_rsa (private key)
- id_rsa.pub (public key)

## 2. Set proper file permissions

Run these commands to secure the private key:

    chmod 700 ~/.ssh
    chmod 600 ~/.ssh/id_rsa

## 3. Connect to the GPU server

Run this command to SSH into the GPU server:

    ssh -i ~/.ssh/id_rsa root@134.199.198.206

## ⚠️ IMPORTANT

- Do NOT share or upload the `id_rsa` file anywhere publicly.
- This gives you full access to the GPU server.
- When done, delete the keys if no longer needed.

## 💡 Trouble?

If you see "Permission denied", make sure:
- The zip was extracted to `~/.ssh`
- The permissions were set correctly
- You're using the correct IP: `134.199.198.206`

You're ready to go 🚀

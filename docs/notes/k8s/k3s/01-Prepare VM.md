## Create VM on PVE
4c16g
- qp-k3s1
- qp-k3s2
- qp-k3s3

## Init VM

```bash
sudo apt update
sudo apt install -y vim git
```
1. Setting up a non-root user
```bash
sudo adduser qipan
sudo vim /etc/sudoers.d/qipan
# qipan ALL=(ALL) NOPASSWD: ALL

su - qipan
scp root@10.200.60.176:/root/id_rsa.pub .
cat id_rsa.pub >> ~/.ssh/authorized_keys

```

Disabling password authentication
```bash
 sudo vim /etc/ssh/sshd_config
 ## PasswordAuthentication no
```

## How to remove VM in PVE
1. ssh proxmox node
    ```bash
    ssh root@<Node IP>
    ```
2. list VMs(search VMID)
    ```bash
    qm list
    ```
3. stop VM
    ```bash
    qm stop <VMID> --force
    ```
4. remove VM
    ```bash
    qm destroy <VMID> --destroy-unreferenced-disks --purge
    ```
    - --destroy-unreferenced-disks：delete disk file.
    - --pure: delete all configuration files and backup files.
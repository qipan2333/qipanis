## References
- sshpiper repository and documentation https://github.com/tg123/sshpiper
- yaml plugin documentation https://github.com/tg123/sshpiper/tree/master/plugin/yaml

## Build
```bash
# Download code
git clone https://github.com/tg123/sshpiper
cd sshpiper
git submodule update --init --recursive

# Build binary executable
mkdir out
go build -tags full -o out ./...
```

## Install
### Environment Description
There are three hosts:
- **qp-k3s-1** Run sshpiper service on this machine
- qp-k3s-2 SSH test machine 1, has user qipan
- qp-k3s-3 SSH test machine 2, has users qipan and anthna
### Prepare Directories and Configuration on qp-k3s-1
```bash
mkdir -p /opt/sshpiper/
mkdir -p /opt/sshpiper/keys/users/
mkdir -p /opt/sshpiper/screening 
touch /opt/sshpiper/config.yaml

# to avoid sshpiper runtime error "/opt/sshpiper/config.yaml's perm is too open", use `--no-check-perm` in startup parameters during testing
# Replace root user with the actual user that will run the sshpiper process
sudo chown root:root /opt/sshpiper/config.yaml
sudo chmod 600 /opt/sshpiper/config.yaml
```

### Generate sshpiper upstream key on qp-k3s-1
```bash
# The upstream machine is the machine that the user ultimately wants to log in to
# The upstream key is the key used by the sshpiper service machine to log in to the upstream machine. The public key needs to be added to the authorized_keys of the upstream machine
ssh-keygen -t ed25519 -f /opt/sshpiper/keys/piper_upstream_key -C "sshpiper-upstream"
cat /opt/sshpiper/keys/piper_upstream_key.pub
```

### Distribute sshpiper public key to all upstream machines on qp-k3s-2 and qp-k3s-3
```bash
# "piper_upstream_key" is the content from the previous step's cat /opt/sshpiper/keys/piper_upstream_key.pub
# Add it to all users that need to be logged in
echo "piper_upstream_key" >> ~/.ssh/authorized_keys
```

### Collect public keys from downstream machines (which are also qp-k3s-2 and qp-k3s-3) on qp-k3s-1
```bash
# The downstream machine is the machine from which the user initiates the SSH request
# Please generate keys for the qipan user on qp-k3s-2 and qp-k3s-3 in advance
# According to the configuration below, the qipan user on qp-k3s-2 and qp-k3s-3 machines can access sshpiper
sudo vim /opt/sshpiper/keys/users/qipan/qp-k3s-3.ed25519.pub
sudo vim /opt/sshpiper/keys/users/qipan/qp-k3s-2.ed25519.pub
```

### Prepare yaml configuration file
```yaml title="/opt/sshpiper/config.yaml"
version: "1.0"
pipes:
  - from:
      - username: "^qp-k3s-3_(.+)$" # This piper matches routes to machine qp-k3s-3, with dynamic username
        username_regex_match: true # Enable regular expression
        authorized_keys:
        - /opt/sshpiper/keys/users/qipan/qp-k3s-2.ed25519.pub # Can initiate this piper from qp-k3s-2
    to:
      host: "qp-k3s-3"
      username: $1 # Dynamic username captured by regex
      private_key: /opt/sshpiper/keys/piper_upstream_key
      # known_hosts: /opt/sshpiper/known_hosts # Recommended for production environment, mutually exclusive with ignore_hostkey: true below
      ignore_hostkey: true

  - from:
      - username: "^qp-k3s-2_(.+)$" # This piper matches routes to machine qp-k3s-2, with dynamic username
        username_regex_match: true # Enable regular expression
        authorized_keys:
          - /opt/sshpiper/keys/users/qipan/qp-k3s-3.ed25519.pub
    to:
      host: "qp-k3s-2"
      username: $1
      private_key: /opt/sshpiper/keys/piper_upstream_key
      # known_hosts: /opt/sshpiper/known_hosts
      ignore_hostkey: true
```

### Start sshpiper on qp-k3s-1
```bash
# The sshpiperd binary and all plugin binaries are in the out directory built in the first step. The yaml plugin is enabled here
# --screen-recording-format asciicast and --screen-recording-dir /path/to/recordingdir to enable auditing
sudo ./out/sshpiperd --screen-recording-format asciicast --screen-recording-dir /opt/sshpiper/screening  ./out/yaml --config /opt/sshpiper/config.yaml 
```

## Check

```bash
# Execute these two commands on qp-k3s-2 to log in to the qipan and athna users on qp-k3s-3 respectively
ssh qp-k3s-3_qipan@qp-k3s-1 -p 2222
ssh qp-k3s-3_athna@qp-k3s-1 -p 2222

# Execute on qp-k3s-3 to log in to the qipan user on qp-k3s-2
ssh qp-k3s-2_qipan@qp-k3s-1 -p 2222
```

## Audit Replay
```bash
apt install -y asciinema
asciinema play /opt/sshpiper/screening/de306386-4e30-401d-8900-9508d40ac4f8/shell-channel-0.cast
```
Using user "root" to install K3s

## Reference
- https://docs.k3s.io/quick-start

## Set up the hostname and hosts
Set hostname for every VM
```
hostnamectl set-hostname qp-k3s-1
hostnamectl set-hostname qp-k3s-2
hostnamectl set-hostname qp-k3s-3
```

Set hosts for all VM
```
192.168.100.116 qp-k3s-1
192.168.100.124 qp-k3s-2
192.168.100.131 qp-k3s-3
```

## Installing K3s Cluster
1. configure /etc/rancher/k3s/registries.yaml on each node
    ```yaml
    mirrors:
    docker.io:
        endpoint:
        - "https://dockerproxy.net"
    ```
2. initialize first control panel
    ```bash
    curl -sfL https://rancher-mirror.rancher.cn/k3s/k3s-install.sh | INSTALL_K3S_MIRROR=cn sh -s - server --cluster-init --flannel-backend=vxlan --node-taint "node-role.kubernetes.io/control-plane=true:NoSchedule"
    ```
3. get join-token from control panel
    ```bash
    cat /var/lib/rancher/k3s/server/node-token
    ```
4. initialize workers(agent in k3s) and join to control panel with the token
    ```
    curl -sfL https://rancher-mirror.rancher.cn/k3s/k3s-install.sh | INSTALL_K3S_MIRROR=cn K3S_URL=https://qp-k3s-1:6443 K3S_TOKEN=<join-token> sh -
    ```

## Connecting to K3s Cluster

1. Install kubectl
    ```bash
    curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
    ```
2. Copy configuraton
    ```bash
    mkdir -p $HOME/.kube
    sudo cp /etc/rancher/k3s/k3s.yaml $HOME/.kube/config
    export KUBECONFIG=~/.kube/config

    kubectl get node
    # NAME       STATUS   ROLES                       AGE   VERSION
    # qp-k3s-1   Ready    control-plane,etcd,master   16h   v1.32.6+k3s1
    # qp-k3s-2   Ready    <none>                      16h   v1.32.6+k3s1
    # qp-k3s-3   Ready    <none>                      16h   v1.32.6+k3s1
    ```

## Using ingress-nginx
K3s uses Traefik as its default Ingress controller. I am similar to Nginx Ingress Controller more.
1. Disable Traefik
    - For Installing a new K3s cluster(Not Check)
        ``` bash
        curl -sfL https://rancher-mirror.rancher.cn/k3s/k3s-install.sh | INSTALL_K3S_MIRROR=cn sh -s - server \ 
             --cluster-init --flannel-backend=vxlan \ 
             --node-taint "node-role.kubernetes.io/control-plane=true:NoSchedule" \ 
             --disable=traefik
        ```
    - For a existed K3s cluster
    1. Edit or create K3s configuration file, only at master node
        The  configuration file of K3s is in /etc/rancher/k3s/config.yaml usually. If it not exists, create it.
        ```bash
        # create folder if need
        sudo mkdir -p /etc/rancher/k3s

        sudo vim /etc/rancher/k3s/config.yaml
        ```
    2. Add the disable rule
        ```yaml
        # /etc/rancher/k3s/config.yaml
        disable:
        - traefik
        ```
    3. Restart K3s service
        ```bash
        # master node
        sudo systemctl restart k3s
        # agent node
        kubectl get pods -n kube-system
        ```
    4. Check
        There should be no "traefik-" node
        ```bash
        kubectl get pods -n kube-system
        ```
2. Install Ingress-Nginx
    ```bash
    helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
    helm repo update
    helm install ingress-nginx ingress-nginx/ingress-nginx \
    --namespace ingress-nginx \
    --create-namespace
    ```
 ## Install
1. Prepare credentials secret
    ```bash
    kubectl get namespaces database > /dev/null 2>&1 || kubectl create namespace database
    kubectl -n database create secret generic mariadb-credentials \
    --from-literal=mariadb-root-password=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16) \
    --from-literal=mariadb-replication-password=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16) \
    --from-literal=mariadb-password=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16)

    ```
2. Prepare `mariadb.yaml`
   ```yaml
   apiVersion: argoproj.io/v1alpha1
   kind: Application
   metadata:
     name: mariadb
   spec:
     syncPolicy:
       syncOptions:
         - CreateNamespace=true
     project: default
     source:
       repoURL: https://charts.bitnami.com/bitnami
       chart: mariadb
       targetRevision: 16.3.2
       helm:
         releaseName: mariadb
         values: |
           architecture: standalone
           auth:
             database: geekcity
             username: ben.wangz
             existingSecret: mariadb-credentials
           primary:
             extraFlags: "--character-set-server=utf8mb4 --collation-server=utf8mb4_bin"
             persistence:
               enabled: false
           secondary:
             replicaCount: 1
             persistence:
               enabled: false
           image:
             registry: docker.io
             pullPolicy: IfNotPresent
           volumePermissions:
             enabled: false
             image:
               registry: docker.io
               pullPolicy: IfNotPresent
           metrics:
             enabled: true
             image:
               registry: docker.io
               pullPolicy: IfNotPresent
             annotations:
               prometheus.io/scrape: "true"
               prometheus.io/port: "9104"
             serviceMonitor:
               enabled: true
               namespace: monitor
               jobLabel: mariadb
               interval: 30s
               labels:
                 release: kube-prometheus-stack
             prometheusRule:
               enabled: true
               namespace: monitor
               additionalLabels:
                 release: kube-prometheus-stack
               rules:
               - alert: MariaDB-Down
                 expr: absent(up{job="mariadb"} == 1)
                 for: 5m
                 labels:
                   severity: warning
                   service: mariadb
                 annotations:
                   summary: MariaDB instance is down
                   message: 'MariaDB instance {{ `{{` }} $labels.instance {{ `}}` }} is down'
     destination:
       server: https://kubernetes.default.svc
       namespace: database
   ```

   Apply
   ```bash
   kubectl -n argocd apply -f mariadb.yaml
   argocd app sync argocd/mariadb
   ```
   
## Check
```bash
ROOT_PASSWORD=$(kubectl -n database get secret mariadb-credentials -o jsonpath='{.data.mariadb-root-password}' | base64 -d)
podman run --rm \
    -e MYSQL_PWD=${ROOT_PASSWORD} \
    -it docker.io/library/mariadb:11.2.2-jammy \
    mariadb \
    --host host.containers.internal \
    --port 32306 \
    --user root \
    --database mysql \
    --execute 'show databases'


```
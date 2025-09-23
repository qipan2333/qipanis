 ## Install
1. Prepare credentials secret
    ```bash
    kubectl get namespaces database > /dev/null 2>&1 || kubectl create namespace database
    kubectl -n database create secret generic redis-credentials \
    --from-literal=redis-password=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16)

    ```
2. Prepare `redis.yaml`
   ```yaml
   apiVersion: argoproj.io/v1alpha1
   kind: Application
   metadata:
     name: redis
   spec:
     syncPolicy:
       syncOptions:
         - CreateNamespace=true
     project: default
     source:
       repoURL: https://charts.bitnami.com/bitnami
       chart: redis
       targetRevision: 18.16.0
       helm:
         releaseName: redis
         values: |
           architecture: replication
           auth:
             enabled: true
             sentinel: true
             existingSecret: redis-credentials
           master:
             count: 1
             disableCommands:
               - FLUSHDB
               - FLUSHALL
             persistence:
               enabled: false
           replica:
             replicaCount: 3
             disableCommands:
               - FLUSHDB
               - FLUSHALL
             persistence:
               enabled: false
           image:
             registry: docker.io
             pullPolicy: IfNotPresent
           sentinel:
             enabled: false
             persistence:
               enabled: false
             image:
               registry: docker.io
               pullPolicy: IfNotPresent
           metrics:
             enabled: false
             image:
               registry: docker.io
               pullPolicy: IfNotPresent
           volumePermissions:
             enabled: false
             image:
               registry: docker.io
               pullPolicy: IfNotPresent
           sysctl:
             enabled: false
             image:
               registry: docker.io
               pullPolicy: IfNotPresent
     destination:
       server: https://kubernetes.default.svc
       namespace: database
   ```

   Apply
   ```bash
   kubectl -n argocd apply -f redis.yaml
   argocd app sync argocd/redis
   ```
   
## Check
```bash

```
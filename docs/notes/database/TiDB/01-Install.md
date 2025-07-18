## Preconditions
1. xx

## Install
1. Create a namespace "tidb-cluster"
    ```bash
    kubectl get namespace tidb-cluster > /dev/null 2>&1 \
    || kubectl create namespace tidb-cluster
    ```
2. Install TiDB Operator CRD
    -  Prepare `tidb-operator-crd.yaml`
        ```yml
        apiVersion: argoproj.io/v1alpha1
        kind: Application
        metadata:
        name: tidb-operator-crd
        namespace: argocd
        spec:
        syncPolicy:
            syncOptions:
            - ServerSideApply=true
        project: default
        source:
            repoURL: https://github.com/pingcap/tidb-operator.git
            targetRevision: v1.6.1
            path: manifests/crd
            directory:
            recurse: true
        destination:
            server: https://kubernetes.default.svc
            namespace: default
        ```
    -  Apply
        ```bash
        kubectl -n argocd apply -f tidb-operator-crd.yaml
        argocd app sync argocd/tidb-operator-crd
        argocd app wait argocd/tidb-operator-crd
        ```
3. Install TiDB Operator
    -  Prepare `tidb-operator.yaml`
        ```yml
        apiVersion: argoproj.io/v1alpha1
        kind: Application
        metadata:
        name: tidb-operator
        spec:
        syncPolicy:
            syncOptions:
            - CreateNamespace=true
        project: default
        source:
            repoURL: https://charts.pingcap.org/
            chart: tidb-operator
            targetRevision: v1.6.1
            helm:
            releaseName: tidb
            valuesObject:
                timezone: Asia/Shanghai
                operatorImage: m.daocloud.io/docker.io/pingcap/tidb-operator:v1.6.1
                tidbBackupManagerImage: m.daocloud.io/docker.io/pingcap/tidb-backup-manager:v1.6.1
                scheduler:
                kubeSchedulerImageName: m.daocloud.io/registry.k8s.io/kube-scheduler
                advancedStatefulset:
                image: m.daocloud.io/pingcap/advanced-statefulset:v0.7.0
        destination:
            server: https://kubernetes.default.svc
            namespace: tidb-admin
        ```
    - Apply
        ```bash
        kubectl -n argocd apply -f tidb-operator.yaml
        argocd app sync argocd/tidb-operator
        argocd app wait argocd/tidb-operator
        ```
4. Create TiDB cluster(3PD 2TiDB 3TiKV)
    - Prepare `tidb-cluster.yaml`
        ```yml
        kind: TidbCluster
        metadata:
        name: basic
        spec:
        version: v8.5.0
        timezone: Asia/Shanghai
        pvReclaimPolicy: Retain
        enableDynamicConfiguration: true
        configUpdateStrategy: RollingUpdate
        discovery: {}
        helper:
            image: m.daocloud.io/docker.io/library/alpine:3.16.0
        pd:
            baseImage: m.daocloud.io/docker.io/pingcap/pd
            maxFailoverCount: 0
            replicas: 3
            storageClassName: rook-cephfs-01
            requests:
            storage: "20Gi"
            cpu: "1000m"
            memory: "4Gi"
            limits:
            cpu: "2000m"
            memory: "8Gi"
            config: {}
        tikv:
            baseImage: m.daocloud.io/docker.io/pingcap/tikv
            maxFailoverCount: 0
            # defines the timeout for region leader eviction in golang `Duration` format, if raft region leaders are not transferred to other stores after this duration, TiDB Operator will delete the Pod forcibly.
            evictLeaderTimeout: 3m
            replicas: 3
            storageClassName: rook-cephfs-01
            requests:
            storage: "150Gi"
            cpu: "2000m"
            memory: "8Gi"
            limits:
            cpu: "4000m"
            memory: "16Gi"
            config: {}
        tidb:
            baseImage: m.daocloud.io/docker.io/pingcap/tidb
            maxFailoverCount: 0
            replicas: 2
            storageClassName: rook-cephfs-01
            service:
            type: ClusterIP
            requests:
            storage: "30Gi"
            cpu: "2000m"
            memory: "8Gi"
            limits:
            cpu: "4000m"
            memory: "16Gi"
            config: {}
        ```
    - Apply
        ```bash
        kubectl -n tidb-cluster apply -f tidb-cluster.yaml
        ```
5. Initialize cluster
    - prepare a secret named basic-tidb-credentials to store the credential of tidb root user
        ```bash
        kubectl -n tidb-cluster create secret generic basic-tidb-credentials --from-literal=root=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16)
        ```
    - prepare `tidb-init-sql.configmap.yaml`
        ```yml
        apiVersion: v1
        kind: ConfigMap
        metadata:
        name: tidb-init-sql
        data:
        init-sql: |-
            -- create database
            CREATE DATABASE IF NOT EXISTS shopping;
            -- create users
            CREATE TABLE IF NOT EXISTS shopping.users (id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(50) NOT NULL, age INT, email VARCHAR(100) UNIQUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
            -- batch insert multiple users records
            INSERT INTO shopping.users (name, age, email) VALUES ('Bob', 25, 'bob@example.com'), ('Charlie', 35, 'charlie@example.com'), ('David', 28, 'david@example.com'), ('Eve', 32, 'eve@example.com'), ('Frank', 40, 'frank@example.com');
            -- create orders table
            CREATE TABLE IF NOT EXISTS shopping.orders (order_id INT PRIMARY KEY AUTO_INCREMENT, user_id INT, product_name VARCHAR(50), amount DECIMAL(10,2), FOREIGN KEY (user_id) REFERENCES shopping.users(id));
            -- batch insert orders records
            INSERT INTO shopping.orders (user_id, product_name, amount) VALUES ((SELECT id FROM shopping.users WHERE name = 'Bob'), 'Laptop', 1200.00), ((SELECT id FROM shopping.users WHERE name = 'Charlie'), 'Smartphone', 800.00), ((SELECT id FROM shopping.users WHERE name = 'David'), 'Headphones', 150.00), ((SELECT id FROM shopping.users WHERE name = 'Eve'), 'Tablet', 500.00), ((SELECT id FROM shopping.users WHERE name = 'Frank'), 'Camera', 900.00);
        ```
    - prepare `tidb-initializer.yaml`
        ```yml
        apiVersion: pingcap.com/v1alpha1
        kind: TidbInitializer
        metadata:
        name: initialize-basic-tidb
        spec:
        image: m.daocloud.io/docker.io/tnir/mysqlclient
        imagePullPolicy: IfNotPresent
        cluster:
            name: basic
        initSqlConfigMap: tidb-init-sql
        passwordSecret: "basic-tidb-credentials"
        timezone: "Asia/Shanghai"
        resources:
            limits:
            cpu: 300m
            memory: 500Mi
            requests:
            cpu: 100m
            memory: 50Mi
        ```
    - Apply
        ```bash
        kubectl -n tidb-cluster apply -f tidb-init-sql.configmap.yaml
        kubectl -n tidb-cluster apply -f tidb-initializer.yaml
        ```
6. install mysql-client
    - prepare `mysql-client.yaml`
        ```bash
        apiVersion: apps/v1
        kind: Deployment
        metadata:
        name: mysql-client
        spec:
        replicas: 1
        selector:
            matchLabels:
            app: mysql-client
        template:
            metadata:
            labels:
                app: mysql-client
            spec:
            containers:
            - name: mysql-client
                image: m.daocloud.io/docker.io/library/mysql:9.3.0
                command:
                - /usr/bin/sleep
                args:
                - inf
                env:
                - name: MYSQL_SERVICE_IP
                    value: basic-tidb.tidb-cluster.svc.cluster.local
                - name: MYSQL_SERVICE_PORT
                    value: "4000"
                - name: MYSQL_ROOT_PASSWORD
                    valueFrom:
                    secretKeyRef:
                        name: basic-tidb-credentials
                        key: root
                        optional: false
        ```

## Check
Running querys by tidb(mysql interface)
prepare `query.job.yaml`
```yml
apiVersion: batch/v1
kind: Job
metadata:
  name: mysql-query-job
spec:
  template:
    spec:
      containers:
      - name: mysql-client
        image: m.daocloud.io/docker.io/library/mysql:9.3.0
        command: ['sh', '-c']
        args:
          - |
            export MYSQL_PWD=$MYSQL_ROOT_PASSWORD
            mysql -h $MYSQL_SERVICE_IP -P $MYSQL_SERVICE_PORT -u root -e "
            USE shopping;
            SELECT users.name, orders.product_name, orders.amount
            FROM users
            JOIN orders ON users.id = orders.user_id;
            "
        env:
          - name: MYSQL_SERVICE_IP
            value: basic-tidb.tidb-cluster.svc.cluster.local
          - name: MYSQL_SERVICE_PORT
            value: "4000"
          - name: MYSQL_ROOT_PASSWORD
            valueFrom:
              secretKeyRef:
                name: basic-tidb-credentials
                key: root
                optional: false
      restartPolicy: Never
  backoffLimit: 4

```

Apply
```bash
kubectl -n tidb-cluster apply -f query.job.yaml
kubectl -n tidb-cluster wait --for=condition=complete job/mysql-query-job
kubectl -n tidb-cluster logs -l job-name=mysql-query-job
```
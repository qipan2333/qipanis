## Install juices-fs
1. Prepare namespace storage

    ```bash
    kubectl get namespace storage > /dev/null 2>&1 || kubectl create namespace storage
    ```

2. Prepare dashboard secret

    ```bash
    kubectl -n storage create secret generic juicefs-dashboard-secret \
    --from-literal=username=admin \
    --from-literal=password=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16)
    ```

3. Prepare `juicefs-csi.yaml`

    ````yaml
    apiVersion: argoproj.io/v1alpha1
    kind: Application
    metadata:
    name: juicefs-csi
    spec:
    syncPolicy:
        syncOptions:
        - CreateNamespace=true
    project: default
    source:
        repoURL: https://juicedata.github.io/charts
        chart: juicefs-csi-driver
        targetRevision: 0.28.2
        helm:
        releaseName: juicefs-csi
        valuesObject:
            image:
            repository: m.daocloud.io/docker.io/juicedata/juicefs-csi-driver
            dashboardImage:
            repository: m.daocloud.io/docker.io/juicedata/csi-dashboard
            sidecars:
            livenessProbeImage:
                repository: m.daocloud.io/registry.k8s.io/sig-storage/livenessprobe
            nodeDriverRegistrarImage:
                repository: m.daocloud.io/registry.k8s.io/sig-storage/csi-node-driver-registrar
            csiProvisionerImage:
                repository: m.daocloud.io/registry.k8s.io/sig-storage/csi-provisioner
            csiResizerImage:
                repository: m.daocloud.io/registry.k8s.io/sig-storage/csi-resizer
            imagePullSecrets: []
            mountMode: mountpod
            driverName: "csi.juicefs.com"
            jfsMountDir: /var/lib/juicefs/volume
            jfsConfigDir: /var/lib/juicefs/config
            immutable: false
            controller:
            enabled: true
            cacheClientConf: false
            replicas: 3
            resources:
                limits:
                cpu: 1000m
                memory: 1Gi
                requests:
                cpu: 100m
                memory: 512Mi
            node:
            enabled: true
            resources:
                limits:
                cpu: 1000m
                memory: 1Gi
                requests:
                cpu: 100m
                memory: 512Mi
            validatingWebhook:
            enabled: true
            dashboard:
            enabled: true
            enableManager: true
            auth:
                enabled: true
                existingSecret: "juicefs-dashboard-secret"
            replicas: 1
            resources:
                limits:
                cpu: 1000m
                memory: 1Gi
                requests:
                cpu: 100m
                memory: 200Mi
            ingress:
                enabled: true
                className: "nginx"
                annotations:
                cert-manager.io/cluster-issuer: self-signed-ca-issuer
                hosts:
                - host: "juice-fs-dashboard.dev.qipanis.com"
                paths:
                - path: /
                    pathType: ImplementationSpecific
                tls:
                - secretName: juice-fs-dashboard.dev.qipanis.com-tls
                hosts:
                - juice-fs-dashboard.dev.qipanis.com
    destination:
        server: https://kubernetes.default.svc
        namespace: storage
    ```

4. Apply to k8s

    ```bash
    kubectl -n argocd apply -f juicefs-csi.yaml
    argocd app sync argocd/juicefs-csi
    argocd app wait argocd/juicefs-csi
    ```

## Test
Prepare juice fs credentials secret

```bash
oss_ACCESS_KEY=$(kubectl -n storage get secret oss-credentials -o jsonpath='{.data.rootUser}' | base64 -d)
oss_SECRET_KEY=$(kubectl -n storage get secret oss-credentials -o jsonpath='{.data.rootPassword}' | base64 -d)
kubectl -n storage create secret generic juice-fs-tidb-oss-credential \
--from-literal=name=juice-fs-tidb-oss \
--from-literal=metaurl=tikv://basic-pd.tidb-cluster:2379/juice-fs-tidb-oss \
--from-literal=storage=oss \
--from-literal=bucket=http://juice-fs-dev.oss-cn-hangzhou-zjy-d01-a.ops.cloud.zhejianglab.com \
--from-literal=access-key=${oss_ACCESS_KEY} \
--from-literal=secret-key=${oss_SECRET_KEY}
kubectl -n storage patch secret juice-fs-tidb-oss-credential -p '{"metadata":{"labels":{"juicefs.com/validate-secret":"true"}}}'
```

### Dynamic provisioning
#### Prepare storage  class
```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: juice-fs-tidb-oss
provisioner: csi.juicefs.com
parameters:
  csi.storage.k8s.io/provisioner-secret-name: juice-fs-tidb-oss-credential
  csi.storage.k8s.io/provisioner-secret-namespace: storage
  csi.storage.k8s.io/node-publish-secret-name: juice-fs-tidb-oss-credential
  csi.storage.k8s.io/node-publish-secret-namespace: storage
  pathPattern: "${.pvc.namespace}-${.pvc.name}"
reclaimPolicy: Retain
allowVolumeExpansion: true
```

```yaml
kubectl -n default apply -f juice-fs-tidb-oss-test.storageclass.yaml
```

#### Prepare a pvc and do a test
```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: busybox-storage-class-test-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
  storageClassName: juice-fs-tidb-oss

---

apiVersion: batch/v1
kind: Job
metadata:
  name: busybox-storage-class-test-job
spec:
  completions: 1
  parallelism: 1
  backoffLimit: 4
  template:
    metadata:
      labels:
        app: busybox-storage-class-test
    spec:
      restartPolicy: Never
      containers:
      - name: busybox-pvc-test
        image: m.daocloud.io/docker.io/library/busybox:latest
        command:
          - sh
          - -c
          - |
            echo "Writing to PVC..."
            RANDOM_STR=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16)
            echo "hello local path provisioner $RANDOM_STR" > /data/hello.txt
            echo "Reading from PVC..."
            READ_STR=$(cat /data/hello.txt)
            echo "Written content: hello local path provisioner $RANDOM_STR"
            echo "Read content: $READ_STR"
            if [ "$READ_STR" = "hello local path provisioner $RANDOM_STR" ]; then
              echo "PVC test completed successfully!"
            else
              echo "PVC test failed!"
              exit 1
            fi
        volumeMounts:
        - name: juice-fs-tidb-oss-vol
          mountPath: /data
      volumes:
      - name: juice-fs-tidb-oss-vol
        persistentVolumeClaim:
          claimName: busybox-storage-class-test-pvc
```

```yaml
kubectl apply -f busybox-storage-class-test.yaml
```


### Static provisioning

```yaml title=" juice-fs-test.pv.yaml"
apiVersion: v1
kind: PersistentVolume
metadata:
  name: juice-fs-test-pv
  labels:
    juicefs-name: juice-fs-tidb-oss
spec:
  # any valid value will work,
  # but the capacity is not supported by JuiceFS CSI driver yet
  capacity:
    storage: 10Gi
  volumeMode: Filesystem
  accessModes:
    - ReadWriteMany
  persistentVolumeReclaimPolicy: Retain
  csi:
    driver: csi.juicefs.com
    # unique, recommend to be same as pv name
    volumeHandle: juice-fs-test-pv
    fsType: juicefs
    nodePublishSecretRef:
      name: juice-fs-tidb-oss-credential
      namespace: storage
```
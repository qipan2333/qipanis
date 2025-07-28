## Install On Podman
### Server
```bash
mkdir -p $(pwd)/minio/data
podman run --rm \
    --name minio-server \
    -p 9000:9000 \
    -p 9001:9001 \
    -v $(pwd)/minio/data:/data \
    -d m.daocloud.io/docker.io/minio/minio:latest server /data --console-address :9001
```

- Web Console http://localhost:9000
- S3 Endpoint http://localhost:9001

### Client
```bash
podman run --rm \
    --entrypoint bash \
    -it m.daocloud.io/docker.io/minio/mc:latest \
    -c "mc alias set metadata-minio http://host.containers.internal:9000 minioadmin minioadmin \
        && mc ls minio \
        && mc mb --ignore-existing minio/test \
        && mc cp /etc/hosts minio/test/etc/hosts \
        && mc ls --recursive minio"
```

## Install On K8s

```yml
# todo
```

### Operate Job
```yml  title="make bucket public"
apiVersion: batch/v1
kind: Job
metadata:
  name: minio-client-job
spec:
  completions: 1
  parallelism: 1
  backoffLimit: 1
  template:
    metadata:
      labels:
        app: minio-client
    spec:
      restartPolicy: Never
      containers:
      - name: minio-client
        image: docker.io/minio/mc:latest
        command:
          - sh
          - -c
          - |
            set -e
            echo "starting..."
            mc alias set myminio http://data-warehouse-minio.metadata.svc.cluster.local:9000 admin password
            mc anonymous set public myminio/flink-public-jars
            echo "make the bucket 'myminio/flink-public-jars' public successfully"
```
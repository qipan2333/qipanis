## Command Of Sync
According to the official documentation[Sync Without Mount Point](https://juicefs.com/docs/zh/community/guide/sync#sync-without-mount-point)，it is recommended to use the following command for synchronizing JFS with other filesystems:

```bash
myfs=redis://10.10.0.8:6379/1 juicefs sync s3://ABCDEFG:HIJKLMN@aaa.s3.us-west-1.amazonaws.com/movies/ jfs://myfs/movies/
```
:::warning
Note that splitting the command into two parts is mandatory. The environment variable myfs (the name is arbitrary) must be defined, as JuiceFS will automatically extract its name from the second part of the command. Refer to the source code below for details.
:::
[https://github.com/juicedata/juicefs/blob/5518d1a01f2efeae08c8cc7c3d7aba12b07466ea/cmd/sync.go](https://github.com/juicedata/juicefs/blob/5518d1a01f2efeae08c8cc7c3d7aba12b07466ea/cmd/sync.go)

![](./imgs/juicefs-2.png)

Additionally, JuiceFS defaults to using HTTPS for all endpoints. If the endpoint uses HTTP, the --no-https flag must be specified for the sync command.

[https://github.com/juicedata/juicefs/blob/5518d1a01f2efeae08c8cc7c3d7aba12b07466ea/cmd/sync.go](https://github.com/juicedata/juicefs/blob/5518d1a01f2efeae08c8cc7c3d7aba12b07466ea/cmd/sync.go)

![](./imgs/juicefs-3.png)

## Data Sync Job
### Prepare Dokcer image
```dockerfile
FROM ubuntu:20.04

RUN apt update && apt install -y curl fuse && \
    apt-get autoremove && \
    apt-get clean && \
    rm -rf \
    /tmp/* \
    /var/lib/apt/lists/* \
    /var/tmp/*

RUN set -x && \
    mkdir /juicefs && \
    cd /juicefs && \
    curl -s -L "https://github.com/juicedata/juicefs/releases/download/v1.2.3/juicefs-1.2.3-linux-amd64.tar.gz" \
    | tar -zx && \
    install juicefs /usr/bin && \
    cd .. && \
    rm -rf /juicefs

# install envsubst
RUN apt-get update && apt-get install -y gettext-base

CMD [ "juicefs" ]
```

### Prepare Job YAML
:::info
Supporting either source or target as JFS only - if adapting for both to be JFS, the `META_DEFINITION` needs to be split into two variables.
:::

```bash
apiVersion: batch/v1
kind: Job
metadata:
  name: juicefs-sync-job-demo
spec:
  completions: 1
  parallelism: 1
  backoffLimit: 1
  template:
    metadata:
      labels:
        app: juicefs-sync-job
    spec:
      restartPolicy: Never
      containers:
        - name: bench
          image: docker-registry.lab.zverse.space/data-and-computing-dev/juicefs:latest
          command:
            - bash
            - -c
            - |
              set -e

              META_DEFINITION=""
              qmark='?'

              PROCESSED_SOURCE=$(echo "${SOURCE_PATH}" | envsubst)
              if [[ "${SOURCE_PATH}" == jfs://* && "${SOURCE_PATH}" == *"$qmark"* ]]; then
                META_DEFINITION="${SOURCE_PATH#*"$qmark"}"
                PROCESSED_SOURCE="${SOURCE_PATH%"$qmark"*}"
                echo "JFS source detected. Meta definition set to: [${META_DEFINITION}]. Path updated to: [${PROCESSED_SOURCE}]"
              fi

              PROCESSED_TARGET=$(echo "${TARGET_PATH}" | envsubst)
              if [[ "${FINAL_TARGET}" == jfs://* && "${FINAL_TARGET}" == *"$qmark"* ]]; then
                META_DEFINITION="${FINAL_TARGET#*"$qmark"}"
                PROCESSED_TARGET="${FINAL_TARGET%"$qmark"*}"
                echo "JFS target detected. Meta definition set to: [${META_DEFINITION}]. Path updated to: [${PROCESSED_TARGET}]"
              fi

              echo "Final source path: ${PROCESSED_SOURCE}"
              echo "Final target path: ${PROCESSED_TARGET}"
              echo "Starting sync..."

              if [ -n "${META_DEFINITION}" ]; then
                eval "${META_DEFINITION} juicefs sync '${PROCESSED_SOURCE}' '${PROCESSED_TARGET}' --no-https"
              else
                juicefs sync "${PROCESSED_SOURCE}" "${PROCESSED_TARGET}" --no-https
              fi

              echo "Sync completed successfully."
          env:
            - name: SOURCE_PATH
              value: "jfs://myfs/test.parquet?myfs=tikv://basic-tidb-pd.tidb-cluster:2379/juice-fs-tidb-oss-dev-test"
            - name: TARGET_PATH
              value: "oss://${OSS_ACCESS_KEY_ID}:${OSS_ACCESS_KEY_SECRET}@csst-prod.oss-cn-hangzhou-zjy-d01-a.ops.cloud.zhejianglab.com/qp-test/from-juice.parquet"
            - name: OSS_ACCESS_KEY_ID
              valueFrom:
                secretKeyRef:
                  key: access-key
                  name: oss-zhejianglab-credentials
            - name: OSS_ACCESS_KEY_SECRET
              valueFrom:
                secretKeyRef:
                  key: access-secret
                  name: oss-zhejianglab-credentials
```


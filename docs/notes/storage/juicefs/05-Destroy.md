According to the official documentation [https://juicefs.com/docs/zh/community/administration/destroy](https://juicefs.com/docs/zh/community/administration/destroy)

1. Get the UUID of file system  
  Run a pod to exec status command
    ```yaml
    apiVersion: v1
    kind: Pod
    metadata:
      name: test-pod
    spec:
      containers:
      - name: viewer
        image: docker-registry.lab.zverse.space/data-and-computing-dev/juicefs:latest
        command: ["sleep", "100000000"]
    ```

    ```bash
    juicefs status tikv://basic-tidb-pd.tidb-cluster:2379/juice-fs-tidb-oss
    ```
    `"UUID": "e31884cd-7a75-4e01-9175-97f96aae5088"` can to found in the result of status
    <details>
    <summary>Result of status</summary>
    2025/07/07 07:59:09.051218 juicefs[85] <INFO>: Meta address: tikv://basic-tidb-pd.tidb-cluster:2379/juice-fs-tidb-oss [interface.go:504]
    2025/07/07 07:59:09.051420 juicefs[85] <INFO>: TiKV gc interval is set to 3h0m0s [tkv_tikv.go:84]
    {
      "Setting": {
        "Name": "juice-fs-tidb-oss",
        "UUID": "e31884cd-7a75-4e01-9175-97f96aae5088",
        "Storage": "oss",
        "Bucket": "http://juice-fs-dev.oss-cn-hangzhou-zjy-d01-a.ops.cloud.zhejianglab.com",
        "AccessKey": "dHhEJoLjXS7BI7tG",
        "SecretKey": "removed",
        "BlockSize": 4096,
        "Compression": "none",
        "EncryptAlgo": "aes256gcm-rsa",
        "KeyEncrypted": true,
        "TrashDays": 1,
        "MetaVersion": 1,
        "MinClientVersion": "1.1.0-A",
        "DirStats": true,
        "EnableACL": false
      },
      "Sessions": [
        {
          "Sid": 5,
          "Expire": "2025-07-07T02:00:47Z",
          "Version": "1.2.3+2025-01-22.4f2aba8f",
          "HostName": "pvc-6258f422-6339-43de-b7bc-a80454f8639e",
          "IPAddrs": [
            "10.233.97.131",
            "fe80::9079:69ff:feee:eb8c"
          ],
          "MountPoint": "/jfs/pvc-6258f422-6339-43de-b7bc-a80454f8639e-lnayil",
          "MountTime": "2025-07-07T01:59:23.271365341Z",
          "ProcessID": 54
        }
      ],
      "Statistic": {
        "UsedSpace": 4347416576,
        "AvailableSpace": 1125895559426048,
        "UsedInodes": 409,
        "AvailableInodes": 10485760
      }
    }
    </details>
    
2. Exec the destroy command
    ```bash
    juicefs destroy tikv://basic-tidb-pd.tidb-cluster:2379/juice-fs-tidb-oss e31884cd-7a75-4e01-9175-97f96aae5088
    ```
    <details>
    <summary>Destroy log</summary>
    2025/07/07 08:01:09.023066 juicefs[106] <INFO>: Meta address: tikv://basic-tidb-pd.tidb-cluster:2379/juice-fs-tidb-oss [interface.go:504]

    2025/07/07 08:01:09.023252 juicefs[106] <INFO>: TiKV gc interval is set to 3h0m0s [tkv_tikv.go:84]

    2025/07/07 08:01:09.075156 juicefs[106] <INFO>: clean up stale session 5 {Version:1.2.3+2025-01-22.4f2aba8f HostName:pvc-6258f422-6339-43de-b7bc-a80454f8639e IPAddrs:[10.233.97.131 fe80::9079:69ff:feee:eb8c] MountPoint:/jfs/pvc-6258f422-6339-43de-b7bc-a80454f8639e-lnayil MountTime:2025-07-07 01:59:23.271365341 +0000 UTC ProcessID:54}: <nil> [base.go:516]

    volume name: juice-fs-tidb-oss

    volume UUID: e31884cd-7a75-4e01-9175-97f96aae5088

    data storage: oss://juice-fs-dev/juice-fs-tidb-oss/

    used bytes: 4347416576

    used inodes: 409

    WARNING: The target volume will be permanently destroyed, including:

    WARNING: 1. ALL objects in the data storage: oss://juice-fs-dev/juice-fs-tidb-oss/

    WARNING: 2. ALL entries in the metadata engine: tikv://basic-tidb-pd.tidb-cluster:2379/juice-fs-tidb-oss

    Proceed anyway? [y/N]: y

    Deleted objects: 1428 2450.2/s

    2025/07/07 08:01:24.848055 juicefs[106] <INFO>: The volume has been destroyed! You may need to delete cache directory manually. [destroy.go:216]
    </details>
  
    **Confirmed that all files in OSS have been deleted, while Tikv remains unchecked.**


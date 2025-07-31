1. Prepare `oss-performance.yaml`
    ```yaml
    apiVersion: v1
    kind: Pod
    metadata:
      name: ossutil-benchmark-pod
      labels:
        app: ossutil-benchmark
    spec:
      nodeSelector:
        kubernetes.io/hostname: node4
      containers:
      - name: ossutil-benchmark-container
        image: m.lab.zverse.space/docker.io/baijunyao/ossutil:1.7.0
        command: ["/bin/sh", "-c"]
        args:
          - |
            #!/bin/bash

            # 配置 ossutil
            touch ~/.ossutilconfig
            echo "[Credentials]" > ~/.ossutilconfig
            echo "endpoint = $OSS_ENDPOINT" >> ~/.ossutilconfig
            echo "accessKeyID = $OSS_ACCESS_KEY_ID" >> ~/.ossutilconfig
            echo "accessKeySecret = $OSS_ACCESS_KEY_SECRET" >> ~/.ossutilconfig

            TEST_FILE_NAME="test_file_${FILE_SIZE_MB}MB_$(date +%s).bin"
            DOWNLOAD_FILE_NAME="downloaded_${TEST_FILE_NAME}"

            echo "生成测试文件: ${TEST_FILE_NAME}，大小: ${FILE_SIZE_MB}MB..."
            dd if=/dev/zero of="/tmp/${TEST_FILE_NAME}" bs=1M count="${FILE_SIZE_MB}"

            if [ $? -ne 0 ]; then
              echo "文件生成失败！"
              exit 1
            fi
            echo "文件生成完成。"

            echo "开始上传测试..."
            # 上传文件到 OSS
            ossutil cp "/tmp/${TEST_FILE_NAME}" "oss://${OSS_BUCKET_NAME}/qp-test/${TEST_FILE_NAME}"

            if [ $? -ne 0 ]; then
              echo "上传失败！"
              exit 1
            fi
            echo "开始下载测试..."
            # 下载文件
            echo "Attempting download with command: ossutil cp \"oss://${OSS_BUCKET_NAME}/qp-test/$   {TEST_FILE_NAME}\" \"/tmp/${DOWNLOAD_FILE_NAME}\" -f"
            ossutil cp "oss://${OSS_BUCKET_NAME}/qp-test/${TEST_FILE_NAME}" "/tmp/${DOWNLOAD_FILE_NAME}"

            if [ $? -ne 0 ]; then
              echo "下载失败！"
              exit 1
            fi

            echo "清理测试文件..."
            # 清理本地和 OSS 上的测试文件
            rm "/tmp/${TEST_FILE_NAME}" "/tmp/${DOWNLOAD_FILE_NAME}"
            ossutil rm "oss://${OSS_BUCKET_NAME}/qp-test/${TEST_FILE_NAME}"

            echo "所有测试和清理工作完成。"

        env:
          - name: OSS_ENDPOINT
            value: "http://oss-cn-hangzhou-zjy-d01-a.ops.cloud.zhejianglab.com"
          - name: OSS_ACCESS_KEY_ID
            value: "your-key"
          - name: OSS_ACCESS_KEY_SECRET
            value: "your-secret"
          - name: OSS_BUCKET_NAME
            value: "csst-prod"
          - name: FILE_SIZE_MB
            value: "51200" # 设置生成文件的大小，单位：MB。
        resources:
          requests:
            cpu: "2"
            memory: "4Gi"
          limits:
            cpu: "4"
            memory: "8Gi"
      restartPolicy: Never
      volumes:
      - name: empty-dir-storage
        emptyDir: {}
    ```
2. Apply
    ```bash
    kubectl -n data-and-computing apply -f oss-performance.yaml
    kubectl -n data-and-computing logs ossutil-benchmark-pod -f
    ```
    Log:
    ```
    生成测试文件: test_file_51200MB_1753861051.bin，大小: 51200MB...
    51200+0 records in
    51200+0 records out
    53687091200 bytes (54 GB, 50 GiB) copied, 188.193 s, 285 MB/s
    文件生成完成。
    开始上传测试...
    Succeed: Total num: 1, size: 53,687,091,200. OK num: 1(upload 1 files).

    average speed 349459000(byte/s)

    153.661364(s) elapsed
    开始下载测试...
    Attempting download with command: ossutil cp "oss://csst-prod/qp-test/test_file_51200MB_1753861051.bin" "/tmp/downloaded_test_file_51200MB_1753861051.bin" -f
    Succeed: Total num: 1, size: 53,687,091,200. OK num: 1(download 1 objects).

    average speed 191050000(byte/s)

    281.014731(s) elapsed
    清理测试文件...
    Error: oss: service returned error: StatusCode=403, ErrorCode=AccessDenied, ErrorMessage="You have no right to access this object because of bucket acl.", RequestId=6889CE2E659E9B3933462AB5, Bucket=csst-prod, Object=qp-test/test_file_51200MB_1753861051.bin
    所有测试和清理工作完成。
    ```
    Upload speed is about 300MB/s, download speed is about 200MB/s.
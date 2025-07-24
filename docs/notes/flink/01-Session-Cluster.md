## Reference
- https://nightlies.apache.org/flink/flink-kubernetes-operator-docs-main/docs/custom-resource/overview/

## Create a Session Cluster
Session cluster is very similar to  the Standalone cluster on bare metal servers.
Session clusters use a similar spec to application clusters with the only difference that job is not defined.  
For Session clusters the operator only provides very basic management and monitoring that cover:
- Start Session cluster
- Monitor overall cluster health
- Stop / Delete Session cluster

```yaml
apiVersion: flink.apache.org/v1beta1
kind: FlinkDeployment
metadata:
  name: basic-session-cluster
spec:
  mode: native
  serviceAccount: flink
  flinkVersion: v1_19
  image: docker-registry.lab.zverse.space/astro-base-images/flink-oss-updated:1.19-java17
  podTemplate:
    spec:
      imagePullSecrets:
      - name: registry-zhejianglab-image-pull
      containers:
      - name: flink-main-container
        imagePullPolicy: Always
        env:
        - name: TZ
          value: Asia/Shanghai
        - name: ENABLE_BUILT_IN_PLUGINS
          value: flink-s3-fs-hadoop-1.19.1.jar
        ports:
        - containerPort: 9249
          name: flink-metric
          protocol: TCP
  flinkConfiguration:
    env.java.opts: --add-opens java.base/java.util=ALL-UNNAMED
    s3.access-key: ZQg7KiOE7JAnRfxD
    s3.secret-key: fB*******j
    s3.endpoint: http://minio.data-and-computing:9000
    s3.path.style.access: "true"
    state.checkpoints.dir: s3://flink-test/checkpoints
    state.savepoints.dir: s3://flink-test/savepoints
    taskmanager.numberOfTaskSlots: "2"
  jobManager:
    replicas: 1
    resource:
      cpu: 1
      memory: 2Gi
  taskManager:
    replicas: 3
    resource:
      cpu: 2
      memory: 8Gi
  ingress:
    annotations:
      cert-manager.io/cluster-issuer: self-signed-ca-issuer
      nginx.ingress.kubernetes.io/rewrite-target: /$2
    className: nginx
    template: flink.k8s.io/{{namespace}}/{{name}}(/|$)(.*)
```

:::info
There is no taskmanager pod when no job running.
:::
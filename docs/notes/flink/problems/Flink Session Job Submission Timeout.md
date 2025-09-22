
## 1. The Problem

We were using the Flink Kubernetes Operator to submit a Flink Session Job (`flink-es-ingest-job`) to a Flink Session Cluster. The job's Fat Jar was quite large, at around **260MB**.

During submission, the Flink Operator failed with a `java.util.concurrent.TimeoutException`, and the logs showed a submission failure:

```
2025-08-05 03:21:19,026 o.a.f.k.o.s.AbstractFlinkService [ERROR][metadata/flink-es-ingest-job] Failed to submit job to session cluster.
java.util.concurrent.TimeoutException
...
```

Initially, we suspected a network issue between the Flink Operator and the Session Cluster, or that the cluster itself was under heavy load, causing the submission to time out.

## 2. The Debugging Process

Upon closer inspection of the JobManager logs within the Session Cluster, we found a more specific error:

```
Caused by: org.apache.flink.util.FlinkException: Could not upload job files.
...
Caused by: java.io.FileNotFoundException: /tmp/flink-web-.../flink-web-upload/..._flink-es-ingest-job-1.0.0-all.jar (No such file or directory)
```

This error seemed contradictory. How could the jar file be missing when our code's `main` method had clearly started executing, as evidenced by the log `allFiles.size: 73260`?

This led us to re-examine the Flink **Application Mode** submission process:

1.  **Executing the `main` method:** The Flink Operator uploads the jar to the JobManager, which then loads and runs the `main` method to generate the JobGraph. This is why our log line appeared.
2.  **Distributing job dependencies:** After the JobGraph is created, the Flink client (now running inside the JobManager process) attempts to upload all job dependency files—including the main jar—to Flink's internal **Blob Storage**. This is what allows TaskManagers to download and run the tasks.

The `FileNotFoundException` wasn't about the initial upload from the Operator. It happened in the second stage. The 260MB jar file was too large, causing the internal upload to the Blob Storage to take too long and **exceed a default timeout**. The upload failed, the file was never fully stored, and the subsequent attempts to retrieve it resulted in the `FileNotFoundException`.

#### 3\. The Solution

The root cause of the problem was the **large file size and a related timeout**. While the best practice is to always slim down the jar by using `provided` dependencies for Flink core libraries, we opted for a quick fix by adjusting the configuration.

We modified the Flink Operator's `ConfigMap` to increase the client timeout for communication with the cluster. We edited the `flink-operator-config` ConfigMap with the following command:

```bash
kubectl -n flink edit configmap flink-operator-config
```

Inside the `data` section, we added `kubernetes.operator.flink.client.timeout` and set its value from the default `60s` to `120s`:

```yaml
apiVersion: v1
data:
  kubernetes.operator.flink.client.timeout: "120s"
kind: ConfigMap
metadata:
  name: flink-operator-config
  namespace: flink
```

**To apply the change:**
After updating the `ConfigMap`, we needed to delete the Flink Operator's Pod. Kubernetes then automatically created a new Pod that picked up the new configuration.

```bash
# Get the Flink Operator Pod name
kubectl get pods -n flink
# Delete the Pod
kubectl delete pod <flink-operator-pod-name> -n flink
```

#### 4\. Conclusion

By increasing `kubernetes.operator.flink.client.timeout` to `120s` and restarting the Flink Operator, the job was successfully submitted, and the issue was resolved.

Key takeaways from this experience:

  * **Timeouts aren't always a network issue.** With Flink's Application Mode, large files can cause internal processing and distribution to exceed timeout limits.
  * The **`kubernetes.operator.flink.client.timeout`** parameter is crucial for stable job submissions. For large or complex jobs, consider increasing this value.
  * **Slimming down your jar file is the best long-term solution.** Using `compileOnly` (Gradle) or `provided` (Maven) dependencies for Flink core libraries will drastically reduce jar size, improving both submission reliability and efficiency.
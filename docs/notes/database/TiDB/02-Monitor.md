## Reference
- https://docs.pingcap.com/zh/tidb/stable/tidb-monitoring-framework
- https://docs.pingcap.com/zh/tidb-in-kubernetes/stable/monitor-a-tidb-cluster


## Install Monitor
1. Prepare secret "basic-grafana-credentials"
    ```bash
    kubectl -n tidb-cluster create secret generic basic-grafana-credentials \
    --from-literal=username=admin \
    --from-literal=password=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16)
    ```
2. prepare `tidb-monitor.yaml`
    ```yml
    apiVersion: pingcap.com/v1alpha1
    kind: TidbMonitor
    metadata:
    name: basic
    spec:
    clusters:
        - name: basic
    prometheus:
        baseImage: m.daocloud.io/docker.io/prom/prometheus
        version: v2.27.1
    grafana:
        baseImage: m.daocloud.io/docker.io/grafana/grafana
        version: 7.5.11
        usernameSecret:
        name: basic-grafana-credentials
        key: username
        passwordSecret:
        name: basic-grafana-credentials
        key: password
    initializer:
        baseImage: m.daocloud.io/docker.io/pingcap/tidb-monitor-initializer
        version: v8.5.0
    reloader:
        baseImage: m.daocloud.io/docker.io/pingcap/tidb-monitor-reloader
        version: v1.0.1
    prometheusReloader:
        baseImage: m.daocloud.io/quay.io/prometheus-operator/prometheus-config-reloader
        version: v0.49.0
    imagePullPolicy: IfNotPresent
    ```
3. Apply
    ```bash
    kubectl -n tidb-cluster apply -f tidb-monitor.yaml
    ```

## See metrics in grafana
1. Get granama username and password.
    ```bash
    kubectl -n tidb-cluster get secret basic-grafana-credentials -o jsonpath="{.data.username}" | base64 -d && echo
    kubectl -n tidb-cluster get secret basic-grafana-credentials -o jsonpath="{.data.password}" | base64 -d && echo
    ```
2. port-forward the Grafana service
    ```bash
    kubectl -n tidb-cluster port-forward svc/basic-grafana 31641:3000 --address 0.0.0.0
    ```
3. Browsing the grafana website.
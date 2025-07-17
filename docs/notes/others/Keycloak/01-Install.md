
## Helm Chart Installation Method
1.  Prepare `keycloak-values.yaml`

    ```yaml
    production: true
    proxy: edge      # For SSL offloading with Ingress
    image:
      registry: m.lab.zverse.space/docker.io
      pullPolicy: IfNotPresent
    auth:
      adminUser: admin
      adminPassword: "admin"
    ingress:
      enabled: true
      hostname: keycloak.astronomy.zhejianglab.com
      tls: true
      secrets:
        - name: keycloak.astronomy.zhejianglab.com-tls
      annotations:
        cert-manager.io/cluster-issuer: self-signed-ca-issuer
      ingressClassName: nginx
      path: /
    extraEnvVars:
      - name: KC_HOSTNAME
        value: "https://keycloak.astronomy.zhejianglab.com:32443"
    resources:
      requests:
        cpu: 1
        memory: 2Gi
      limits:
        cpu: 2
        memory: 4Gi
    postgresql:
      image:
        registry: m.lab.zverse.space/docker.io
        pullPolicy: IfNotPresent
    ```

2.  apply

    ```yaml
    helm repo add bitnami https://charts.bitnami.com/bitnami

    helm install keycloak bitnami/keycloak \
      --namespace keycloak \
      --create-namespace \
      --atomic \
      -f keycloak-values.yaml --debug
    ```

3.  check  
  Access https://keycloak.astronomy.zhejianglab.com:32443 in the browser with username "admin" and password "admin".
  ![keycloak login page](/assets/img/doc.notes.others.keycloak/keycloak-login.png)
  Keycloak works correctly if the login page redirects to this page:
  ![keycloak logged](/assets/img/doc.notes.others.keycloak/keycloak-logged.png)

## Configuration and Parameter Explanation

### edge proxy

```yaml
proxy: edge
```

From [https://github.com/bitnami/charts/blob/main/bitnami/keycloak/README.md\#use-with-ingress-offloading-ssl](https://github.com/bitnami/charts/blob/main/bitnami/keycloak/README.md#use-with-ingress-offloading-ssl), the description in the document is:
![proxy: edge](/assets/img/doc.notes.others.keycloak/edge.png)

### (TODO)Initial administrator account and password configuration

```yaml
auth:
  adminUser: admin
  adminPassword: "admin"
```

According to the installation documentation, it should be possible to use an existing secret for configuration. The current method requires changing the password immediately after installation.

### KC\_HOSTNAME

```yaml
extraEnvVars:
  - name: KC_HOSTNAME
    value: "https://keycloak.astronomy.zhejianglab.com"
```

If this parameter is not set, a problem will occur: `accessing https://keycloak.lab.zverse.space:32443 in the browser is always redirected to https://keycloak.lab.zverse.space/admin/, making it impossible to access the Keycloak page.`

Refer to the official documentation [https://www.keycloak.org/server/hostname\#\_defining\_specific\_parts\_of\_the\_hostname\_option](https://www.keycloak.org/server/hostname#_defining_specific_parts_of_the_hostname_option)

It can be seen that a startup parameter `hostname` is provided. After providing this parameter, the redirect address is directly extracted from this variable statically; otherwise, Keycloak dynamically pieces it together. Keycloak does not know what port the Ingress is exposing externally.

## (TODO) ArgoCD Installation Method

Monitoring has been added, pending testing.

```yaml
---
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: keycloak
spec:
  syncPolicy:
    syncOptions:
    - CreateNamespace=true
  project: default
  source:
    repoURL: https://charts.bitnami.com/bitnami
    chart: keycloak
    targetRevision: 22.0.0
    helm:
      releaseName: keycloak
      values: |
        production: true
        proxy: edge      # For SSL offloading with Ingress
        image:
          registry: m.lab.zverse.space/docker.io
          pullPolicy: IfNotPresent
        auth:
          adminUser: admin
          adminPassword: "admin"
        ingress:
          enabled: true
          hostname: keycloak.astronomy.zhejianglab.com
          tls: true
          secrets:
            - name: keycloak.astronomy.zhejianglab.com-tls
          annotations:
            cert-manager.io/cluster-issuer: self-signed-ca-issuer
          ingressClassName: nginx
          path: /
        extraEnvVars:
          - name: KC_HOSTNAME
            value: "https://keycloak.astronomy.zhejianglab.com:32443"
        resources:
          requests:
            cpu: 1
            memory: 2Gi
          limits:
            cpu: 2
            memory: 4Gi
        postgresql:
          image:
            registry: m.lab.zverse.space/docker.io
            pullPolicy: IfNotPresent
        metrics:
          enabled: true
          image:
            registry: m.lab.zverse.space/docker.io
            pullPolicy: IfNotPresent
          serviceMonitor:
            enabled: true
            namespace: monitor
            jobLabel: keycloak
            selector:
              app.kubernetes.io/name: keycloak
              app.kubernetes.io/instance: keycloak
            labels:
              release: kube-prometheus-stack
  destination:
    server: https://kubernetes.default.svc
    namespace: keycloak
```
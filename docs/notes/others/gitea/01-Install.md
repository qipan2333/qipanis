 ## Install
1. Prepare credentials secret
    ```bash
    kubectl -n application create secret generic gitea-admin-secret \
    --from-literal=username=gitea_admin \
    --from-literal=password=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16)
    ```

2. Prepare `gitea.application.yaml`
   :::info
   If OIDC Login is needed, these config are required
     openid:
       ENABLE_OPENID_SIGNIN: true
       ENABLE_OPENID_SIGNUP: true
     service:
       DISABLE_REGISTRATION: false
       REGISTER_EMAIL_CONFIRM: false
     oauth2_client:
       ENABLE_AUTO_REGISTRATION: true
   :::
   
   ```yaml
   apiVersion: argoproj.io/v1alpha1
   kind: Application
   metadata:
     name: application-gitea
   spec:
     project: default
     syncPolicy:
       syncOptions:
         - CreateNamespace=true
     source:
       repoURL: https://dl.gitea.io/charts/
       chart: gitea
       targetRevision: 12.1.0
       helm:
         releaseName: gitea
         valuesObject:
           global:
             security:
               allowInsecureImages: true
           image:
             registry: m.lab.zverse.space/docker.io
             repository: gitea/gitea
             pullPolicy: IfNotPresent
           service:
             http:
               type: ClusterIP
             ssh:
               type: NodePort
               port: 22
               nodePort: 30126
           ingress:
             enabled: true
             className: nginx
             annotations:
               nginx.ingress.kubernetes.io/proxy-body-size: 10g
               nginx.ingress.kubernetes.io/rewrite-target: /$1
               cert-manager.io/cluster-issuer: self-signed-ca-issuer
             hosts:
               - host: gitea.astronomy.zhejianglab.com
                 paths:
                   - path: /?(.*)
                     pathType: ImplementationSpecific
             tls:
               - secretName: gitea.astronomy.zhejianglab.com-tls
                 hosts:
                   - gitea.astronomy.zhejianglab.com
           persistence:
             size: 5Gi
             storageClass: nfs-external
           gitea:
             admin:
               existingSecret: gitea-admin-secret
               email: "blwsyed@gmail.com"
             config:
               repository:
                 MAX_CREATION_LIMIT: 10
                 DISABLED_REPO_UNITS: repo.wiki,repo.ext_wiki,repo.projects
                 DEFAULT_REPO_UNITS: repo.code,repo.releases,repo.issues,repo.pulls
                 DISABLE_STARS: true
                 DEFAULT_BRANCH: main
               ui:
                 SHOW_USER_EMAIL: false
                 SEARCH_REPO_DESCRIPTION: false
               server:
                 PROTOCOL: http
                 ROOT_URL: https://gitea.astronomy.zhejianglab.com:32443/
                 LANDING_PAGE: login
                 DOMAIN: gitea.astronomy.zhejianglab.com
                 SSH_DOMAIN: gitea.astronomy.zhejianglab.com
                 SSH_PORT: 1022
                 SSH_AUTHORIZED_PRINCIPALS_ALLOW: email
               admin:
                 DISABLE_REGULAR_ORG_CREATION: true
               security:
                 INSTALL_LOCK: true
               service:
                 REGISTER_EMAIL_CONFIRM: false
                 DISABLE_REGISTRATION: false
                 ENABLE_NOTIFY_MAIL: true
                 DEFAULT_ALLOW_CREATE_ORGANIZATION: false
                 SHOW_MILESTONES_DASHBOARD_PAGE: false
               explore:
                 DISABLE_USERS_PAGE: true
               mailer:
                 ENABLED: true
                 IS_TLS_ENABLED: true
                 MAILER_TYPE: smtp
                 HOST: smtpdm.aliyun.com:465
                 FROM: messager@email.gitea.astronomy.zhejianglab.com
                 USER: messager@email.gitea.astronomy.zhejianglab.com
                 PASSWD: change_password_to_your_own
               i18n:
                 LANGS: en-US,zh-CN
                 NAMES: English,简体中文
               oauth2:
                 ENABLED: false
               other:
                 SHOW_FOOTER_VERSION: false
               openid:
                 ENABLE_OPENID_SIGNIN: true
                 ENABLE_OPENID_SIGNUP: true
               oauth2_client:
                 ENABLE_AUTO_REGISTRATION: true
           valkey-cluster:
             enabled: true
             image:
               registry: m.lab.zverse.space/docker.io
               repository: bitnami/valkey-cluster
               tag: 8.1.2-debian-12-r0
             usePassword: false
             usePasswordFiles: false
             cluster:
               nodes: 3
               replicas: 0
             service:
               ports:
                 valkey: 6379
             persistence:
               enabled: true
               storageClass: nfs-external
               size: 5Gi
           postgresql-ha:
             enabled: false
           postgresql:
             enabled: true
             image:
               registry: m.lab.zverse.space/docker.io
               repository: bitnami/postgresql
               tag: 17.5.0-debian-12-r11
             global:
               postgresql:
                 auth:
                   database: gitea
                   username: gitea
                   password: gitea
                 service:
                   ports:
                     postgresql: 5432
             primary:
               persistence:
                 enabled: true
                 storageClass: nfs-external
                 size: 5Gi
     destination:
       server: https://kubernetes.default.svc
       namespace: application
   
   
   ```
3. Apply And Sync App
   ```bash
   kubectl -n argocd apply -f gitea.application.yaml
   argocd app sync argocd/application-gitea
   ```

## Uninstall
```
argocd app delete -y argocd/application-gitea
```

## References
1. https://docs.gitea.com/administration/config-cheat-sheet
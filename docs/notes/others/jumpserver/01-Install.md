## Preconditions
1. [Install the redis](/docs/notes/database/redis/Install)
2. [Install the mariadb](/docs/notes/database/mariadb/Install)

## Install
1. Prepare `jumpserver-values.yaml`
   ```yaml
   # 模板 https://github.com/jumpserver/helm-charts/blob/main/charts/jumpserver/values.yaml
   # Default values for jumpserver.
   # This is a YAML-formatted file.
   # Declare variables to be passed into your templates.
   
   nameOverride: ""
   fullnameOverride: ""
   
   ## @param global.imageRegistry Global Docker image registry
   ## @param global.imagePullSecrets Global Docker registry secret names as an array
   ## @param global.storageClass Global StorageClass for Persistent Volume(s)
   ## @param global.redis.password Global Redis&trade; password (overrides `auth.password`)
   ##
   global:
     imageRegistry: "m.daocloud.io/docker.io"    # 国内可以使用华为云加速
     imageTag: v2.28.8             # 版本号
     ## E.g.
     #  imagePullSecrets:
     #    - name: harborsecret
     #
     #  storageClass: "jumpserver-data"
     ##
     imagePullSecrets: [ ]
     # - name: yourSecretKey
     storageClass: "nfs-external"              # (*必填) NFS SC
   
   ## Please configure your MySQL server first
   ## Jumpserver will not start the external MySQL server.
   ##
   externalDatabase: #  (*必填) 数据库相关设置
     engine: mysql
     host: mariadb.database
     port: 3306
     user: root
     password: "WzSKw5poCuDlRyEF"
     database: jumpserver
   
   ## Please configure your Redis server first
   ## Jumpserver will not start the external Redis server.
   ##
   externalRedis: #  (*必填) Redis 设置
     host: redis-master.database
     port: 6379
     password: "4IjUSnwa6oeaDqFP"
   
   serviceAccount:
     # Specifies whether a service account should be created
     create: false
     # The name of the service account to use.
     # If not set and create is true, a name is generated using the fullname template
     name:
   
   ingress:
     enabled: true                             # 不使用 ingress 可以关闭
     annotations:
       # kubernetes.io/tls-acme: "true"
       compute-full-forwarded-for: "true"
       use-forwarded-headers: "true"
       kubernetes.io/ingress.class: nginx
       cert-manager.io/cluster-issuer: self-signed-ca-issuer
       nginx.ingress.kubernetes.io/configuration-snippet: |
         proxy_set_header Upgrade "websocket";
         proxy_set_header Connection "Upgrade";
     hosts:
       - "jumpserver.astronomy.zhejianglab.com"                 # 对外域名
     tls:
       - secretName: jumpserver.astronomy.zhejianglab.com-tls
         hosts:
           - jumpserver.astronomy.zhejianglab.com
   
   core:
     enabled: true
     
     labels:
       app.jumpserver.org/name: jms-core
     
     config:
       # Generate a new random secret key by execute `cat /dev/urandom | tr -dc A-Za-z0-9 | head -c 50`
       # secretKey: "B3f2w8P2PfxIAS7s4URrD9YmSbtqX4vXdPUL217kL9XPUOWrmy"
       secretKey: "B3f2w8P2PfxIAS7s4URrD9YmSbtqX4vXdPUL217kL9XPUOWrmy"                            #  (*必填)    加    密敏感信息的 secret_key, 长度推荐大于 50 位
       # Generate a new random bootstrap token by execute `cat /dev/urandom | tr -dc A-Za-z0-9 | head -c 16`
       # bootstrapToken: "7Q11Vz6R2J6BLAdO"
       bootstrapToken: "7Q11Vz6R2J6BLAdO"                       #  (*必填) 组件认证使用的 token, 长度推荐大于    24     位
       # Enabled it for debug
       debug: false
       log:
         level: ERROR
     
     replicaCount: 1
     
     image:
       registry: docker.io
       repository: jumpserver/core
       tag: v2.28.8
       pullPolicy: IfNotPresent
     
     command: [ ]
     
     env:
       # See: https://docs.jumpserver.org/zh/master/admin-guide/env/#core
       SESSION_EXPIRE_AT_BROWSER_CLOSE: true
       # SESSION_COOKIE_AGE: 86400
       # SECURITY_VIEW_AUTH_NEED_MFA: true
       DOMAINS: "jumpserver.astronomy.zhejianglab.com:32443"
     
     livenessProbe:
       failureThreshold: 30
       httpGet:
         path: /api/health/
         port: web
     
     readinessProbe:
       failureThreshold: 30
       httpGet:
         path: /api/health/
         port: web
     
     podSecurityContext: { }
     # fsGroup: 2000
     
     securityContext: { }
       # capabilities:
       #   drop:
     #   - ALL
     # readOnlyRootFilesystem: true
     # runAsNonRoot: true
     # runAsUser: 1000
     
     service:
       type: ClusterIP
       web:
         port: 8080
       ws:
         port: 8070
     
     resources: { }
       # We usually recommend not to specify default resources and to leave this as a conscious
       # choice for the user. This also increases chances charts run on environments with little
       # resources, such as Minikube. If you do want to specify resources, uncomment the following
       # lines, adjust them as necessary, and remove the curly braces after 'resources:'.
       # limits:
       #   cpu: 1000m
     #   memory: 2048Mi
     # requests:
     #   cpu: 500m
     #   memory: 1024Mi
     
     persistence:
       storageClassName: jumpserver-data
       accessModes:
         - ReadWriteMany
       size: 1Gi
       # annotations: {}
       finalizers:
         - kubernetes.io/pvc-protection
       # subPath: ""
       # existingClaim:
     
     volumeMounts: [ ]
     
     volumes: [ ]
     
     nodeSelector: { }
     
     tolerations: [ ]
     
     affinity: { }
   
   koko:
     enabled: true
     
     labels:
       app.jumpserver.org/name: jms-koko
     
     config:
       log:
         level: ERROR
     
     replicaCount: 1
     
     image:
       registry: docker.io
       repository: jumpserver/koko
       tag: v2.28.8
       pullPolicy: IfNotPresent
     
     command: [ ]
     
     env: [ ]
       # See: https://docs.jumpserver.org/zh/master/admin-guide/env/#koko
     # LANGUAGE_CODE: zh
     # REUSE_CONNECTION: true
     # ENABLE_LOCAL_PORT_FORWARD: true
     # ENABLE_VSCODE_SUPPORT: true
     
     livenessProbe:
       failureThreshold: 30
       httpGet:
         path: /koko/health/
         port: web
     
     readinessProbe:
       failureThreshold: 30
       httpGet:
         path: /koko/health/
         port: web
     
     podSecurityContext: { }
     # fsGroup: 2000
     
     securityContext:
       privileged: true
       # capabilities:
       #   drop:
       #   - ALL
       # readOnlyRootFilesystem: true
       # runAsNonRoot: true
       # runAsUser: 1000
     
     service:
       type: ClusterIP
       web:
         port: 5000
       ssh:
         port: 2222
     
     resources: { }
       # We usually recommend not to specify default resources and to leave this as a conscious
       # choice for the user. This also increases chances charts run on environments with little
       # resources, such as Minikube. If you do want to specify resources, uncomment the following
       # lines, adjust them as necessary, and remove the curly braces after 'resources:'.
       # limits:
       #   cpu: 100m
     #   memory: 128Mi
     # requests:
     #   cpu: 100m
     #   memory: 128Mi
     
     persistence:
       storageClassName: jumpserver-data
       accessModes:
         - ReadWriteMany
       size: 1Gi
       # annotations: {}
       finalizers:
         - kubernetes.io/pvc-protection
     
     volumeMounts: [ ]
     
     volumes: [ ]
     
     nodeSelector: { }
     
     tolerations: [ ]
     
     affinity: { }
   
   lion:
     enabled: true
     
     labels:
       app.jumpserver.org/name: jms-lion
     
     config:
       log:
         level: ERROR
     
     replicaCount: 1
     
     image:
       registry: docker.io
       repository: jumpserver/lion
       tag: v2.28.8
       pullPolicy: IfNotPresent
     
     command: [ ]
     
     env:
       # See: https://docs.jumpserver.org/zh/master/admin-guide/env/#lion
       JUMPSERVER_ENABLE_FONT_SMOOTHING: true
       # JUMPSERVER_COLOR_DEPTH: 32
       # JUMPSERVER_ENABLE_WALLPAPER: true
       # JUMPSERVER_ENABLE_THEMING: true
       # JUMPSERVER_ENABLE_FULL_WINDOW_DRAG: true
       # JUMPSERVER_ENABLE_DESKTOP_COMPOSITION: true
       # JUMPSERVER_ENABLE_MENU_ANIMATIONS: true
     
     livenessProbe:
       failureThreshold: 30
       httpGet:
         path: /lion/health/
         port: web
     
     readinessProbe:
       failureThreshold: 30
       httpGet:
         path: /lion/health/
         port: web
     
     podSecurityContext: { }
     # fsGroup: 2000
     
     securityContext: { }
       # capabilities:
       #   drop:
     #   - ALL
     # readOnlyRootFilesystem: true
     # runAsNonRoot: true
     # runAsUser: 1000
     
     service:
       type: ClusterIP
       web:
         port: 8081
     
     resources: { }
       # We usually recommend not to specify default resources and to leave this as a conscious
       # choice for the user. This also increases chances charts run on environments with little
       # resources, such as Minikube. If you do want to specify resources, uncomment the following
       # lines, adjust them as necessary, and remove the curly braces after 'resources:'.
       # limits:
       #   cpu: 100m
     #   memory: 512Mi
     # requests:
     #   cpu: 100m
     #   memory: 512Mi
     
     persistence:
       storageClassName: jumpserver-data
       accessModes:
         - ReadWriteMany
       size: 1Gi
       # annotations: {}
       finalizers:
         - kubernetes.io/pvc-protection
     
     volumeMounts: [ ]
     
     volumes: [ ]
     
     nodeSelector: { }
     
     tolerations: [ ]
     
     affinity: { }
   
   # v2.27.0 版本 magnus 做了大改，需要开放很多端口，等待后续优化
   magnus:
     enabled: true
     
     labels:
       app.jumpserver.org/name: jms-magnus
     
     config:
       log:
         level: ERROR
     
     replicaCount: 1
     
     image:
       registry: docker.io
       repository: jumpserver/magnus
       tag: v2.28.8
       pullPolicy: IfNotPresent
     
     command: [ ]
     
     env: [ ]
     
     livenessProbe:
       failureThreshold: 30
       tcpSocket:
         port: 9090
     
     readinessProbe:
       failureThreshold: 30
       tcpSocket:
         port: 9090
     
     podSecurityContext: { }
     # fsGroup: 2000
     
     securityContext: { }
       # capabilities:
       #   drop:
     #   - ALL
     # readOnlyRootFilesystem: true
     # runAsNonRoot: true
     # runAsUser: 1000
     
     
     resources: { }
       # We usually recommend not to specify default resources and to leave this as a conscious
       # choice for the user. This also increases chances charts run on environments with little
       # resources, such as Minikube. If you do want to specify resources, uncomment the following
       # lines, adjust them as necessary, and remove the curly braces after 'resources:'.
       # limits:
       #   cpu: 100m
     #   memory: 512Mi
     # requests:
     #   cpu: 100m
     #   memory: 512Mi
     
     persistence:
       storageClassName: jumpserver-data
       accessModes:
         - ReadWriteMany
       size: 1Gi
       # annotations: {}
       finalizers:
         - kubernetes.io/pvc-protection
     
     volumeMounts: [ ]
     
     volumes: [ ]
     
     nodeSelector: { }
     
     tolerations: [ ]
     
     affinity: { }
   
   xpack:
     enabled: false      # 企业版本打开此选项
   
   omnidb:
     labels:
       app.jumpserver.org/name: jms-omnidb
     
     config:
       log:
         level: ERROR
     
     replicaCount: 1
     
     image:
       registry: registry.fit2cloud.com
       repository: jumpserver/omnidb
       tag: v2.28.8
       pullPolicy: IfNotPresent
     
     command: [ ]
     
     env: [ ]
     
     livenessProbe:
       failureThreshold: 30
       tcpSocket:
         port: web
     
     readinessProbe:
       failureThreshold: 30
       tcpSocket:
         port: web
     
     podSecurityContext: { }
     # fsGroup: 2000
     
     securityContext: { }
       # capabilities:
       #   drop:
     #   - ALL
     # readOnlyRootFilesystem: true
     # runAsNonRoot: true
     # runAsUser: 1000
     
     service:
       type: ClusterIP
       web:
         port: 8082
     
     resources: { }
       # We usually recommend not to specify default resources and to leave this as a conscious
       # choice for the user. This also increases chances charts run on environments with little
       # resources, such as Minikube. If you do want to specify resources, uncomment the following
       # lines, adjust them as necessary, and remove the curly braces after 'resources:'.
       # limits:
       #   cpu: 100m
     #   memory: 128Mi
     # requests:
     #   cpu: 100m
     #   memory: 128Mi
     
     persistence:
       storageClassName: jumpserver-data
       accessModes:
         - ReadWriteMany
       size: 1Gi
       # annotations: {}
       finalizers:
         - kubernetes.io/pvc-protection
     
     volumeMounts: [ ]
     
     volumes: [ ]
     
     nodeSelector: { }
     
     tolerations: [ ]
     
     affinity: { }
   
   razor:
     labels:
       app.jumpserver.org/name: jms-razor
     
     config:
       log:
         level: ERROR
     
     replicaCount: 1
     
     image:
       registry: registry.fit2cloud.com
       repository: jumpserver/razor
       tag: v2.28.8
       pullPolicy: IfNotPresent
     
     command: [ ]
     
     env: [ ]
     
     livenessProbe:
       failureThreshold: 30
       tcpSocket:
         port: rdp
     
     readinessProbe:
       failureThreshold: 30
       tcpSocket:
         port: rdp
     
     podSecurityContext: { }
     # fsGroup: 2000
     
     securityContext: { }
       # capabilities:
       #   drop:
     #   - ALL
     # readOnlyRootFilesystem: true
     # runAsNonRoot: true
     # runAsUser: 1000
     
     service:
       type: ClusterIP
       rdp:
         port: 3389
     
     resources: { }
       # We usually recommend not to specify default resources and to leave this as a conscious
       # choice for the user. This also increases chances charts run on environments with little
       # resources, such as Minikube. If you do want to specify resources, uncomment the following
       # lines, adjust them as necessary, and remove the curly braces after 'resources:'.
       # limits:
       #   cpu: 100m
     #   memory: 128Mi
     # requests:
     #   cpu: 100m
     #   memory: 128Mi
     
     persistence:
       storageClassName: jumpserver-data
       accessModes:
         - ReadWriteMany
       size: 1Gi
       # annotations: {}
       finalizers:
         - kubernetes.io/pvc-protection
     
     volumeMounts: [ ]
     
     volumes: [ ]
     
     nodeSelector: { }
     
     tolerations: [ ]
     
     affinity: { }
   
   web:
     enabled: true
     
     labels:
       app.jumpserver.org/name: jms-web
     
     replicaCount: 1
     
     image:
       registry: docker.io
       repository: jumpserver/web
       tag: v2.28.8
       pullPolicy: IfNotPresent
     
     command: [ ]
     
     env: [ ]
     # nginx client_max_body_size, default 4G
     # CLIENT_MAX_BODY_SIZE: 4096m
     
     livenessProbe:
       failureThreshold: 30
       httpGet:
         path: /api/health/
         port: web
     
     readinessProbe:
       failureThreshold: 30
       httpGet:
         path: /api/health/
         port: web
     
     podSecurityContext: { }
     # fsGroup: 2000
     
     securityContext: { }
       # capabilities:
       #   drop:
     #   - ALL
     # readOnlyRootFilesystem: true
     # runAsNonRoot: true
     # runAsUser: 1000
     
     service:
       type: ClusterIP
       web:
         port: 80
     
     resources: { }
       # We usually recommend not to specify default resources and to leave this as a conscious
       # choice for the user. This also increases chances charts run on environments with little
       # resources, such as Minikube. If you do want to specify resources, uncomment the following
       # lines, adjust them as necessary, and remove the curly braces after 'resources:'.
       # limits:
       #   cpu: 100m
     #   memory: 128Mi
     # requests:
     #   cpu: 100m
     #   memory: 128Mi
     
     persistence:
       storageClassName: jumpserver-data
       accessModes:
         - ReadWriteMany
       size: 1Gi
       # annotations: {}
       finalizers:
         - kubernetes.io/pvc-protection
     
     volumeMounts: [ ]
     
     volumes: [ ]
     
     nodeSelector: { }
     
     tolerations: [ ]
     
     affinity: { }
   ```

2. apply
   ```bash
   helm repo add jumpserver https://jumpserver.github.io/helm-charts
   helm install jumpserver jumpserver/jumpserver \
      -n jumpserver --create-namespace  \
      --vsersion v4.10.8 \
      --atomic --debug --timeout 10m -f \
      jumpserver-valus.yaml
   ```
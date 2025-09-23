1.  Prepare `openldap.yaml`

    ```yaml
    apiVersion: v1
    kind: Secret
    metadata:
      name: openldap-secret
    type: Opaque
    data:
      LDAP_ADMIN_PASSWORD: "YWRtaW4xMjM="
    
    ---
    # 2. PersistentVolumeClaim (PVC): 申请持久化存储卷
    # --------------------------------------------------
    apiVersion: v1
    kind: PersistentVolumeClaim
    metadata:
      name: openldap-data-pvc
    spec:
      accessModes:
        - ReadWriteOnce
      resources:
        requests:
          storage: 2Gi
      storageClassName: nfs-external
    
    ---
    # 3. Deployment: 定义和管理 OpenLDAP Pod
    # --------------------------------------------------
    apiVersion: apps/v1
    kind: Deployment
    metadata:
      name: openldap-deployment
      labels:
        app: openldap
    spec:
      replicas: 1
      selector:
        matchLabels:
          app: openldap
      template:
        metadata:
          labels:
            app: openldap
        spec:
          containers:
          - name: openldap
            image: m.daocloud.io/docker.io/bitnami/openldap:2.6.9-debian-12-r9
            ports:
            - name: ldap-port
              containerPort: 1389
            env:
            - name: LDAP_ROOT
              value: "dc=geekcity,dc=tech"
            - name: LDAP_ADMIN_USERNAME
              value: "admin"
            - name: LDAP_ENABLE_TLS
              value: "no"
            - name: LDAP_ADMIN_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: openldap-secret
                  key: LDAP_ADMIN_PASSWORD
            volumeMounts:
            - name: openldap-data
              mountPath: /bitnami/openldap
          volumes:
          - name: openldap-data
            persistentVolumeClaim:
              claimName: openldap-data-pvc
    
    ---
    # 4. Service: 在集群内部暴露 OpenLDAP 服务
    # --------------------------------------------------
    apiVersion: v1
    kind: Service
    metadata:
      name: openldap-service
    spec:
      type: ClusterIP
      selector:
        app: openldap
      ports:
        - protocol: TCP
          port: 389
          targetPort: 1389
    
    ```

2.  apply

    ```bash
    kubectl -n ldap apply -f openldap-deployment.yaml
    ```

3.  check  
    ```bash
    podman run --rm --network=host \
    m.daocloud.io/docker.io/library/ubuntu:latest \
    bash -c \
    "apt update && apt install -y ldap-utils; ldapsearch -x -H ldap://localhost:31389 -D 'cn=admin,  dc=geekcity,dc=tech' -w admin123 -b 'dc=geekcity,dc=tech' 'uid=test001'"
    ```

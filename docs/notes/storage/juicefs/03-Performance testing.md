According to the official documentation at https://juicefs.com/docs/zh/community/performance_evaluation_guide, the following performance testing tools are available:

1. JuiceFS Client:
    - Built-in simple performance testing commands
    - Limited to single-machine testing

2. Fio:
    - Industry-standard testing tool
    - Supports more complex testing scenarios
    - Limited to single-machine testing

3. Vdbench:
    - Industry-standard testing tool
    - Capable of multi-machine concurrent testing

## JuiceFS Client
### Build docker image
First create a JuiceFS Client docker images for use in k8s，referring to [https://juicefs.com/docs/zh/community/getting-started/installation/#docker](https://juicefs.com/docs/zh/community/getting-started/installation/#docker)

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

CMD [ "juicefs" ]
```

 

```bash
podman build -f Dockerfile . -t localhost/juicefs:v1.2.3
podman tag a2be1bd2fdb2 docker-registry.lab.zverse.space/data-and-computing-dev/juicefs:v1.2.3
podman push docker-registry.lab.zverse.space/data-and-computing-dev/juicefs:v1.2.3
```

### Performance testing job
```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: juicefs-bench-test-pvc
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 100Gi
  storageClassName: juice-fs-tidb-oss

---

apiVersion: batch/v1
kind: Job
metadata:
  name: juicefs-bench-build-in-job
spec:
  completions: 1
  parallelism: 1
  backoffLimit: 1
  template:
    metadata:
      labels:
        app: juicefs-bench-build-in
    spec:
      restartPolicy: Never
      containers:
      - name: bench
        image: docker-registry.lab.zverse.space/data-and-computing-dev/juicefs:v1.2.3
        command:
          - sh
          - -c
          - |
            set -e
            echo "starting..."
            ## This configuration sets the trash retention time to 0. The official recommendation is to enable this during performance testing to save storage space
            ## However, adding this configuration will cause errors and crashes during k3s testing.
            juicefs bench /data -p 
        volumeMounts:
        - name: juice-fs-tidb-oss-vol
          mountPath: /data
      volumes:
      - name: juice-fs-tidb-oss-vol
        persistentVolumeClaim:
          claimName: juicefs-bench-test-pvc
```

```bash
kubectl apply -f juicefs-bench-build-in.yaml

starting...
2025/06/27 08:45:06.232553 juicefs[7] <WARNING>: Failed to clean kernel caches: exit status 2 [bench.go:350]
2025/06/27 08:51:09.684055 juicefs[7] <WARNING>: Failed to clean kernel caches: exit status 2 [bench.go:350]
2025/06/27 08:57:25.482750 juicefs[7] <WARNING>: Failed to clean kernel caches: exit status 2 [bench.go:350]
2025/06/27 08:57:25.683879 juicefs[7] <WARNING>: Failed to clean kernel caches: exit status 2 [bench.go:350]
Benchmark finished!
BlockSize: 1.0 MiB, BigFileSize: 1.0 GiB, SmallFileSize: 128 KiB, SmallFileCount: 100, NumThreads: 4
Time used: 740.3 s, CPU: 9.7%, Memory: 617.4 MiB
+------------------+------------------+---------------+
|       ITEM       |       VALUE      |      COST     |
+------------------+------------------+---------------+
|   Write big file |      11.27 MiB/s | 363.45 s/file |
|    Read big file |      11.07 MiB/s | 369.85 s/file |
| Write small file |     67.3 files/s | 59.43 ms/file |
|  Read small file |   1995.2 files/s |  2.00 ms/file |
|        Stat file |   8993.4 files/s |  0.44 ms/file |
|   FUSE operation | 71742 operations |   60.81 ms/op |
|      Update meta |  2305 operations |    2.72 ms/op |
|       Put object |  2282 operations | 4369.62 ms/op |
|       Get object |  1074 operations | 8499.71 ms/op |
|    Delete object |     0 operations |    0.00 ms/op |
| Write into cache |  1657 operations |    1.35 ms/op |
|  Read from cache |  1469 operations |    1.43 ms/op |
+------------------+------------------+---------------+
```



## Fio
Run four Fio task: sequential write, sequential read, random write, and random read.

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: juicefs-bench-test-pvc
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 100Gi
  storageClassName: juice-fs-tidb-oss

---

apiVersion: batch/v1
kind: Job
metadata:
  name: juicefs-bench-fio-job
spec:
  completions: 1
  parallelism: 1
  backoffLimit: 1
  template:
    metadata:
      labels:
        app: juicefs-bench-fio
    spec:
      restartPolicy: Never
      containers:
      - name: bench
        image: docker.io/ljishen/fio:latest
        command:
          - sh
          - -c
          - |
            set -e
            echo "starting..."
            fio --name=jfs-test --directory=/data --ioengine=libaio --rw=write --bs=1m --size=1g --numjobs=4 --direct=1 --group_reporting
            fio --name=jfs-test --directory=/data --ioengine=libaio --rw=read --bs=1m --size=1g --numjobs=4 --direct=1 --group_reporting
            fio --name=jfs-test --directory=/data --ioengine=libaio --rw=randwrite --bs=1m --size=1g --numjobs=4 --direct=1 --group_reporting
            fio --name=jfs-test --directory=/data --ioengine=libaio --rw=randread --bs=1m --size=1g --numjobs=4 --direct=1 --group_reporting
        volumeMounts:
        - name: juice-fs-tidb-oss-vol
          mountPath: /data
      volumes:
      - name: juice-fs-tidb-oss-vol
        persistentVolumeClaim:
          claimName: juicefs-bench-test-pvc
```

```bash
kubectl apply -f juicefs-bench-fio.yaml

starting...
jfs-test: (g=0): rw=write, bs=(R) 1024KiB-1024KiB, (W) 1024KiB-1024KiB, (T) 1024KiB-1024KiB, ioengine=libaio, iodepth=1
...
fio-3.36
Starting 4 processes
jfs-test: Laying out IO file (1 file / 1024MiB)
jfs-test: Laying out IO file (1 file / 1024MiB)
jfs-test: Laying out IO file (1 file / 1024MiB)
jfs-test: Laying out IO file (1 file / 1024MiB)

jfs-test: (groupid=0, jobs=4): err= 0: pid=9: Mon Jun 30 01:47:47 2025
  write: IOPS=12, BW=12.7MiB/s (13.3MB/s)(4096MiB/322509msec); 0 zone resets
    slat (usec): min=214, max=3519.8k, avg=313315.77, stdev=473750.35
    clat (nsec): min=698, max=27496, avg=3873.49, stdev=1725.43
     lat (usec): min=214, max=3519.8k, avg=313319.65, stdev=473750.76
    clat percentiles (nsec):
     |  1.00th=[  796],  5.00th=[ 1192], 10.00th=[ 2320], 20.00th=[ 2832],
     | 30.00th=[ 3120], 40.00th=[ 3376], 50.00th=[ 3664], 60.00th=[ 3984],
     | 70.00th=[ 4384], 80.00th=[ 4832], 90.00th=[ 5664], 95.00th=[ 6432],
     | 99.00th=[ 8768], 99.50th=[12480], 99.90th=[17536], 99.95th=[25728],
     | 99.99th=[27520]
   bw (  KiB/s): min= 8192, max=634880, per=100.00%, avg=21019.59, stdev=8293.67, samples=1591
   iops        : min=    8, max=  620, avg=20.52, stdev= 8.10, samples=1591
  lat (nsec)   : 750=0.15%, 1000=4.03%
  lat (usec)   : 2=3.81%, 4=52.39%, 10=38.82%, 20=0.73%, 50=0.07%
  cpu          : usr=0.01%, sys=0.03%, ctx=32788, majf=0, minf=38
  IO depths    : 1=100.0%, 2=0.0%, 4=0.0%, 8=0.0%, 16=0.0%, 32=0.0%, >=64=0.0%
     submit    : 0=0.0%, 4=100.0%, 8=0.0%, 16=0.0%, 32=0.0%, 64=0.0%, >=64=0.0%
     complete  : 0=0.0%, 4=100.0%, 8=0.0%, 16=0.0%, 32=0.0%, 64=0.0%, >=64=0.0%
     issued rwts: total=0,4096,0,0 short=0,0,0,0 dropped=0,0,0,0
     latency   : target=0, window=0, percentile=100.00%, depth=1

Run status group 0 (all jobs):
  WRITE: bw=12.7MiB/s (13.3MB/s), 12.7MiB/s-12.7MiB/s (13.3MB/s-13.3MB/s), io=4096MiB (4295MB), run=322509-322509msec
jfs-test: (g=0): rw=read, bs=(R) 1024KiB-1024KiB, (W) 1024KiB-1024KiB, (T) 1024KiB-1024KiB, ioengine=libaio, iodepth=1
...
fio-3.36
Starting 4 processes

jfs-test: (groupid=0, jobs=4): err= 0: pid=15: Mon Jun 30 01:54:03 2025
  read: IOPS=10, BW=10.9MiB/s (11.4MB/s)(4096MiB/375817msec)
    slat (usec): min=208, max=16198k, avg=360757.81, stdev=1561314.06
    clat (nsec): min=705, max=69900, avg=1838.83, stdev=2274.01
     lat (usec): min=208, max=16198k, avg=360759.65, stdev=1561315.32
    clat percentiles (nsec):
     |  1.00th=[  732],  5.00th=[  740], 10.00th=[  748], 20.00th=[  764],
     | 30.00th=[  780], 40.00th=[  796], 50.00th=[  836], 60.00th=[ 1020],
     | 70.00th=[ 1704], 80.00th=[ 2480], 90.00th=[ 4576], 95.00th=[ 6304],
     | 99.00th=[ 9408], 99.50th=[10816], 99.90th=[17024], 99.95th=[20352],
     | 99.99th=[70144]
   bw (  KiB/s): min=26624, max=294912, per=100.00%, avg=97347.92, stdev=18399.30, samples=339
   iops        : min=   26, max=  288, avg=95.06, stdev=17.97, samples=339
  lat (nsec)   : 750=9.23%, 1000=50.34%
  lat (usec)   : 2=15.28%, 4=13.92%, 10=10.47%, 20=0.68%, 50=0.05%
  lat (usec)   : 100=0.02%
  cpu          : usr=0.00%, sys=0.01%, ctx=33067, majf=0, minf=1062
  IO depths    : 1=100.0%, 2=0.0%, 4=0.0%, 8=0.0%, 16=0.0%, 32=0.0%, >=64=0.0%
     submit    : 0=0.0%, 4=100.0%, 8=0.0%, 16=0.0%, 32=0.0%, 64=0.0%, >=64=0.0%
     complete  : 0=0.0%, 4=100.0%, 8=0.0%, 16=0.0%, 32=0.0%, 64=0.0%, >=64=0.0%
     issued rwts: total=4096,0,0,0 short=0,0,0,0 dropped=0,0,0,0
     latency   : target=0, window=0, percentile=100.00%, depth=1

Run status group 0 (all jobs):
   READ: bw=10.9MiB/s (11.4MB/s), 10.9MiB/s-10.9MiB/s (11.4MB/s-11.4MB/s), io=4096MiB (4295MB), run=375817-375817msec
jfs-test: (g=0): rw=randwrite, bs=(R) 1024KiB-1024KiB, (W) 1024KiB-1024KiB, (T) 1024KiB-1024KiB, ioengine=libaio, iodepth=1
...
fio-3.36
Starting 4 processes

jfs-test: (groupid=0, jobs=4): err= 0: pid=21: Mon Jun 30 02:00:07 2025
  write: IOPS=13, BW=13.0MiB/s (13.7MB/s)(4096MiB/314071msec); 0 zone resets
    slat (usec): min=280, max=1803.6k, avg=306049.01, stdev=365897.10
    clat (nsec): min=707, max=29747, avg=4231.58, stdev=1962.29
     lat (usec): min=280, max=1803.6k, avg=306053.24, stdev=365897.52
    clat percentiles (nsec):
     |  1.00th=[  796],  5.00th=[ 1128], 10.00th=[ 2448], 20.00th=[ 2960],
     | 30.00th=[ 3280], 40.00th=[ 3664], 50.00th=[ 4048], 60.00th=[ 4448],
     | 70.00th=[ 4896], 80.00th=[ 5472], 90.00th=[ 6176], 95.00th=[ 6944],
     | 99.00th=[10816], 99.50th=[12608], 99.90th=[22144], 99.95th=[25216],
     | 99.99th=[29824]
   bw (  KiB/s): min= 8192, max=610304, per=100.00%, avg=19273.05, stdev=7541.05, samples=1736
   iops        : min=    8, max=  596, avg=18.82, stdev= 7.36, samples=1736
  lat (nsec)   : 750=0.12%, 1000=3.88%
  lat (usec)   : 2=3.59%, 4=41.28%, 10=49.98%, 20=0.95%, 50=0.20%
  cpu          : usr=0.02%, sys=0.02%, ctx=32784, majf=0, minf=31
  IO depths    : 1=100.0%, 2=0.0%, 4=0.0%, 8=0.0%, 16=0.0%, 32=0.0%, >=64=0.0%
     submit    : 0=0.0%, 4=100.0%, 8=0.0%, 16=0.0%, 32=0.0%, 64=0.0%, >=64=0.0%
     complete  : 0=0.0%, 4=100.0%, 8=0.0%, 16=0.0%, 32=0.0%, 64=0.0%, >=64=0.0%
     issued rwts: total=0,4096,0,0 short=0,0,0,0 dropped=0,0,0,0
     latency   : target=0, window=0, percentile=100.00%, depth=1

Run status group 0 (all jobs):
  WRITE: bw=13.0MiB/s (13.7MB/s), 13.0MiB/s-13.0MiB/s (13.7MB/s-13.7MB/s), io=4096MiB (4295MB), run=314071-314071msec
jfs-test: (g=0): rw=randread, bs=(R) 1024KiB-1024KiB, (W) 1024KiB-1024KiB, (T) 1024KiB-1024KiB, ioengine=libaio, iodepth=1
...
fio-3.36
Starting 4 processes

jfs-test: (groupid=0, jobs=4): err= 0: pid=35: Mon Jun 30 02:00:18 2025
  read: IOPS=393, BW=393MiB/s (412MB/s)(4096MiB/10418msec)
    slat (usec): min=217, max=3965.2k, avg=6952.78, stdev=84885.56
    clat (nsec): min=715, max=45845, avg=3014.57, stdev=2133.15
     lat (usec): min=217, max=3965.2k, avg=6955.79, stdev=84885.65
    clat percentiles (nsec):
     |  1.00th=[  764],  5.00th=[  852], 10.00th=[ 1032], 20.00th=[ 1480],
     | 30.00th=[ 1912], 40.00th=[ 2256], 50.00th=[ 2672], 60.00th=[ 3056],
     | 70.00th=[ 3536], 80.00th=[ 4128], 90.00th=[ 5088], 95.00th=[ 6240],
     | 99.00th=[ 9280], 99.50th=[13632], 99.90th=[24704], 99.95th=[25984],
     | 99.99th=[45824]
   bw (  KiB/s): min=116736, max=1822720, per=100.00%, avg=784588.80, stdev=141384.09, samples=40
   iops        : min=  114, max= 1780, avg=766.20, stdev=138.07, samples=40
  lat (nsec)   : 750=0.46%, 1000=8.84%
  lat (usec)   : 2=22.97%, 4=45.68%, 10=21.22%, 20=0.63%, 50=0.20%
  cpu          : usr=0.12%, sys=0.89%, ctx=32806, majf=0, minf=1062
  IO depths    : 1=100.0%, 2=0.0%, 4=0.0%, 8=0.0%, 16=0.0%, 32=0.0%, >=64=0.0%
     submit    : 0=0.0%, 4=100.0%, 8=0.0%, 16=0.0%, 32=0.0%, 64=0.0%, >=64=0.0%
     complete  : 0=0.0%, 4=100.0%, 8=0.0%, 16=0.0%, 32=0.0%, 64=0.0%, >=64=0.0%
     issued rwts: total=4096,0,0,0 short=0,0,0,0 dropped=0,0,0,0
     latency   : target=0, window=0, percentile=100.00%, depth=1

Run status group 0 (all jobs):
   READ: bw=393MiB/s (412MB/s), 393MiB/s-393MiB/s (412MB/s-412MB/s), io=4096MiB (4295MB), run=10418-10418msec
```

## Test Record

### Testing Environment
CSST Infrastructure Team's development K8s cluster

### Test Items
JuiceFS, CephFS, and NFS were each subjected to four FIO tests (sequential write, sequential read, random write, random read).

### Test Results

#### juicefs
bs=1m

**bs=4m**

WRITE: bw=911MiB/s (955MB/s), 911MiB/s-911MiB/s (955MB/s-955MB/s), io=4096MiB (4295MB), run=4498-4498msec

**WRITE: bw=944MiB/s (990MB/s), 944MiB/s-944MiB/s (990MB/s-990MB/s), io=16.0GiB (17.2GB), run=17358-17358msec**

READ: bw=561MiB/s (588MB/s), 561MiB/s-561MiB/s (588MB/s-588MB/s), io=4096MiB (4295MB), run=7307-7307msec

**READ: bw=556MiB/s (583MB/s), 556MiB/s-556MiB/s (583MB/s-583MB/s), io=16.0GiB (17.2GB), run=29483-29483msec**

WRITE: bw=322MiB/s (337MB/s), 322MiB/s-322MiB/s (337MB/s-337MB/s), io=4096MiB (4295MB), run=12738-12738msec

**WRITE: bw=685MiB/s (719MB/s), 685MiB/s-685MiB/s (719MB/s-719MB/s), io=16.0GiB (17.2GB), run=23906-23906msec**

READ: bw=150MiB/s (157MB/s), 150MiB/s-150MiB/s (157MB/s-157MB/s), io=4096MiB (4295MB), run=27358-27358msec

**READ: bw=139MiB/s (145MB/s), 139MiB/s-139MiB/s (145MB/s-145MB/s), io=16.0GiB (17.2GB), run=118122-118122msec**

#### cephfs
bs=1m

**bs=4m**

WRITE: bw=120MiB/s (125MB/s), 120MiB/s-120MiB/s (125MB/s-125MB/s), io=4096MiB (4295MB), run=34256-34256msec

**WRITE: bw=146MiB/s (153MB/s), 146MiB/s-146MiB/s (153MB/s-153MB/s), io=16.0GiB (17.2GB), run=112542-112542msec**

READ: bw=269MiB/s (283MB/s), 269MiB/s-269MiB/s (283MB/s-283MB/s), io=4096MiB (4295MB), run=15199-15199msec

**READ: bw=368MiB/s (386MB/s), 368MiB/s-368MiB/s (386MB/s-386MB/s), io=16.0GiB (17.2GB), run=44526-44526msec**

WRITE: bw=110MiB/s (116MB/s), 110MiB/s-110MiB/s (116MB/s-116MB/s), io=4096MiB (4295MB), run=37170-37170msec

**WRITE: bw=141MiB/s (148MB/s), 141MiB/s-141MiB/s (148MB/s-148MB/s), io=16.0GiB (17.2GB), run=115852-115852msec**

READ: bw=296MiB/s (311MB/s), 296MiB/s-296MiB/s (311MB/s-311MB/s), io=4096MiB (4295MB), run=13830-13830msec

**READ: bw=383MiB/s (401MB/s), 383MiB/s-383MiB/s (401MB/s-401MB/s), io=16.0GiB (17.2GB), run=42805-42805msec**

#### nfs
bs=1m

**bs=4m**

WRITE: bw=74.1MiB/s (77.7MB/s), 74.1MiB/s-74.1MiB/s (77.7MB/s-77.7MB/s), io=4096MiB (4295MB), run=55293-55293msec

**WRITE: bw=156MiB/s (163MB/s), 156MiB/s-156MiB/s (163MB/s-163MB/s), io=16.0GiB (17.2GB), run=105293-105293msec**

READ: bw=334MiB/s (350MB/s), 334MiB/s-334MiB/s (350MB/s-350MB/s), io=4096MiB (4295MB), run=12280-12280msec

**READ: bw=322MiB/s (338MB/s), 322MiB/s-322MiB/s (338MB/s-338MB/s), io=16.0GiB (17.2GB), run=50819-50819msec**

WRITE: bw=54.9MiB/s (57.6MB/s), 54.9MiB/s-54.9MiB/s (57.6MB/s-57.6MB/s), io=4096MiB (4295MB), run=74587-74587msec

**WRITE: bw=135MiB/s (142MB/s), 135MiB/s-135MiB/s (142MB/s-142MB/s), io=16.0GiB (17.2GB), run=121233-121233msec**

READ: bw=312MiB/s (327MB/s), 312MiB/s-312MiB/s (327MB/s-327MB/s), io=4096MiB (4295MB), run=13141-13141msec

**READ: bw=319MiB/s (335MB/s), 319MiB/s-319MiB/s (335MB/s-335MB/s), io=16.0GiB (17.2GB), run=51325-51325msec**




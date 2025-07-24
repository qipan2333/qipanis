## Install
```bash
ARCH_IN_FILE_NAME=linux-amd64
FILE_NAME=helm-v3.13.3-${ARCH_IN_FILE_NAME}.tar.gz
curl -sSLo ${FILE_NAME} "http://oss-cn-hangzhou-zjy-d01-a.ops.cloud.zhejianglab.com/data-and-computing/public/get.helm.sh/${FILE_NAME}"
tar zxf ${FILE_NAME}
mkdir -p ${HOME}/bin
mv -f ${ARCH_IN_FILE_NAME}/helm ${HOME}/bin
rm -rf ./${FILE_NAME}
rm -rf ./${ARCH_IN_FILE_NAME}
chmod u+x ${HOME}/bin/helm
```
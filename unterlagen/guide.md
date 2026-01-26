# Kubernetes - Advanced

This course is specialies to provide the participant with content and exercises we only skimmed over in the introduction to kubernetes seminar. We recommend that the user first visit the introduction course before coming to this one. But both are recommended to get a good full understanding of kubernetes. 

## Agenda

🌞 Day 1
- 09:00 - 09:15 | Welcome and Start
- 09:15 - 10:30 | Fundamentals Recap
- 10:30 - 10:45 | Break
- 10:45 - 12:00 | Cluster Setup & Management
- 12:00 - 13:00 | Lunch Break
- 13:00 - 14:15 | Kubernetes at Scale
- 14:15 - 14:30 | Break
- 14:30 - 15:30 | Security in Kubernetes
- 15:30 - 15:45 | Break
- 15:45 - 16:45 | Advanced Security & Compliance
- 16:45 - 17:00 | Q&A

🌞 Day 2
- 09:00 - 09:15 | Recap Day 1
- 09:15 - 10:30 | Networking in Kubernetes
- 10:30 - 10:45 | Break
- 10:45 - 12:00 | Observability & Monitoring
- 12:00 - 13:00 | Lunch Break
- 13:00 - 14:15 | GitOps
- 14:15 - 14:30 | Break
- 14:30 - 15:30 | Performance & Optimization
- 15:30 - 15:45 | Break
- 15:45 - 16:45 | Ecosystem & Future
- 16:45 - 17:00 | Q&A

### 🌞 1 | 09:00 - 09:15 | Welcome and Start
### 🌞 1 | 09:15 - 10:30 | Fundamentals Recap

> SLIDE: fundamentals.pdf

In this block you want to recap the "introduction to kubernetes" sminar and its topics. You do not need to talk everything though here. Though we recommend that you at least see if all participants are on board and ready to work. 

The mission is to make sure that the fundamental know how is still there for all participants and that they are able to follow along in what we are going to do later. If there are any missing gaps or areas you should recap then BEFORE continuing further.

### 🌞 1 | 10:45 - 12:00 | Cluster Setup & Management

> SLIDE: cluster-setup-and-management.pdf

In this part you need to do the following. Build up and setup a working kubernetes Cluster for each participant. Let them explore and test out that cluster. We recommend that if the participants have been to the introduction to kubernetes seminar that you let them do the setup and instalation on there own for the most part and only interact and work with them in a limited way. 

Below you can find the instalation instructions for a working vanilla kubernetes cluster. These are the base point for everything we are going to do. You need to make sure each participant is up to date in this.

Pre-Requirements:
- 3 Nodes per Participant
- 1 CP - 2 Workers
- Each node should have
    - 2 CPU Cores at LEAST
    - 4 GB of RAM
    - 30 GB Storage

#### Steps to do on each node
```bash
sudo su
cd

apt-get update && apt-get upgrade -y

apt install curl apt-transport-https \
git wget software-properties-common \
lsb-release ca-certificates socat

swapoff -a

modprobe overlay
modprobe br_netfilter

cat << EOF | tee /etc/sysctl.d/kubernetes.conf
net.bridge.bridge-nf-call-ip6tables = 1
net.bridge.bridge-nf-call-iptables = 1
net.ipv4.ip_forward = 1
EOF

sysctl --system

mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
| gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) \
signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu \
$(lsb_release -cs) stable" | \
tee /etc/apt/sources.list.d/docker.list

apt-get update && apt-get install containerd.io -y

containerd config default | tee /etc/containerd/config.toml

sed -e 's/SystemdCgroup = false/SystemdCgroup = true/g' \
-i /etc/containerd/config.toml

systemctl restart containerd

mkdir -p -m 755 /etc/apt/keyrings

curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.33/deb/Release.key \
| gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg

echo "deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] \
https://pkgs.k8s.io/core:/stable:/v1.33/deb/ /" | \
tee /etc/apt/sources.list.d/kubernetes.list

apt-get update
apt-get install -y kubeadm=1.33.1-1.1 \
kubelet=1.33.1-1.1 kubectl=1.33.1-1.1

apt-mark hold kubelet kubeadm kubectl

hostname -I
```

These steps will install all required elements that need to be on each node. You "can" just copy and paste them though we recommend that you take the time and do this step by step while explaning everything.

The following steps are now split into "control-plane" and "worker" steps. You need to do both on there respected nodes.

#### Steps for control-plane

```bash
nano /etc/hosts 
# Hier die IP-Adresse der ControlPlane eintragen
# Beispiel:
127.22.16.52 cp

```

The configuration for our Cluster. If needed or wanted add the SDN for your CPS IP and Adress so you can connect via lens/kubectl externaly.

```yaml
apiVersion: kubeadm.k8s.io/v1beta3
kind: ClusterConfiguration
kubernetesVersion: 1.33.1
controlPlaneEndpoint: "cp:6443"
networking:
  podSubnet: 192.168.0.0/16
```

```bash
kubeadm init --config=kubeadm-config.yaml --upload-certs --node-name=cp | tee kubeadm-init.out

mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config

CILIUM_CLI_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/cilium-cli/main/stable.txt)
CLI_ARCH=amd64
if [ "$(uname -m)" = "aarch64" ]; then CLI_ARCH=arm64; fi
curl -L --fail --remote-name-all https://github.com/cilium/cilium-cli/releases/download/${CILIUM_CLI_VERSION}/cilium-linux-${CLI_ARCH}.tar.gz{,.sha256sum}
sha256sum --check cilium-linux-${CLI_ARCH}.tar.gz.sha256sum
sudo tar xzvfC cilium-linux-${CLI_ARCH}.tar.gz /usr/local/bin
rm cilium-linux-${CLI_ARCH}.tar.gz{,.sha256sum}

cilium install --version 1.17.2
cilium status --wait


watch kubectl get nodes -o wide

```

#### Steps for workers

```bash
nano /etc/hosts 
# Hier die IP-Adresse der ControlPlane eintragen
# Beispiel:
127.22.16.52 cp


kubeadm join cp:6443 --token <token> --discovery-token-ca-cert-hash sha256:<hash> --certificate-key <key> --node-name=<worker-node-name>
```

When both the CP as well as the workers are running. You can do a simple test that everything is working correctly.

```bash
kubectl create deployment web --image=nginx --replicas=10

kubectl expose deployment web --port=80
```

Once you have done that let the participants think about and then list things that might now be "perfect" or good about this deployment.

### 🌞 1 | 13:00 - 14:15 | Kubernetes at Scale

> SLIDES: kubernetes-and-scale.pdf

This section is all about making the participant aware of how a cluster and applications scale. What benefits are there for scaling and which downsides might arise from a cluster that scales to much or to little. Below is a example that can be used for this.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  replicas: 1   # initial pod count
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
        - name: nginx
          image: nginx:latest
          ports:
            - containerPort: 80
          resources:   # required for HPA to know resource requests
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 200m
              memory: 256Mi
```

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: nginx-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: nginx-deployment
  minReplicas: 1
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 50   # target: 50% CPU usage
```

To test scaling now you can do the following:

```bash
kubectl get deployments
kubectl get hpa
kubectl run -i --tty load-generator --image=busybox -- /bin/sh
# inside container
while true; do wget -q -O- http://nginx-deployment; done
```

One very important part of scaling is making sure that the pods are distributed in a specific way. The next example shows how we could make sure that the application has at least a pod on each node, and then scales based on just traffic.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  replicas: 2   # start with at least 2 pods (for spreading)
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchExpressions:
                  - key: app
                    operator: In
                    values:
                      - nginx
              topologyKey: "kubernetes.io/hostname"  
              # ensures pods are scheduled on different nodes
      containers:
        - name: nginx
          image: nginx:latest
          ports:
            - containerPort: 80
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 200m
              memory: 256Mi
```

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: nginx-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: nginx-deployment
  minReplicas: 2    # at least 2 pods, one per node if possible
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 50   # scale when average CPU > 50%
```

Another scenario that we sometimes face is making sure that the application perferes a certain node because of location or other critiria. The below example showcases this.

```bash
# Run this once on your cluster (replace node-name with your actual node):
kubectl label nodes node-name preferred-node=true

```

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  replicas: 2   # will scale up with HPA
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      affinity:
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100   # higher weight = stronger preference
              preference:
                matchExpressions:
                  - key: preferred-node
                    operator: In
                    values:
                      - "true"
      containers:
        - name: nginx
          image: nginx:latest
          ports:
            - containerPort: 80
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 200m
              memory: 256Mi
```

How it behaves:
- Kubernetes will prefer scheduling most pods on the node labeled preferred-node=true.
- If that node runs out of resources, remaining pods will spill over to other nodes.
- The HPA still manages scaling (2 → 10 pods) based on CPU utilization.


### 🌞 1 | 14:30 - 15:30 | Security in Kubernetes

> SLIDES: security-in-kubernetes.pdf

#### Prerequisites:

Create a working namespace so you don’t touch default:

```bash
kubectl create ns sec-lab
kubectl config set-context --current --namespace=sec-lab
```

#### Identity & Least Privilege (ServiceAccounts + RBAC):

Stop using the all-powerful kubeconfig everywhere. Give Pods only the rights they need. Create a read-only Role and bind it to a ServiceAccount.

```bash
# ServiceAccount
cat <<'YAML' | kubectl apply -f -
apiVersion: v1
kind: ServiceAccount
metadata:
  name: reader
YAML

# Role: can only list/get pods in sec-lab
cat <<'YAML' | kubectl apply -f -
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: pod-reader
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get","list","watch"]
YAML

# Bind Role to SA
cat <<'YAML' | kubectl apply -f -
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-pods
subjects:
- kind: ServiceAccount
  name: reader
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
YAML
```

Now let us test this in a pod:

```bash
cat <<'YAML' | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: rbac-test
spec:
  serviceAccountName: reader
  containers:
  - name: app
    image: bitnami/kubectl:latest
    command: ["sleep","3600"]
YAML

kubectl exec -it rbac-test -- sh -c 'kubectl get pods'
# should succeed (listing pods)
kubectl exec -it rbac-test -- sh -c 'kubectl get secrets'
# should FAIL (forbidden)

kubectl delete pod rbac-test
```

Key takeaways:

- Use ServiceAccounts per workload.
- Bind the smallest Role/ClusterRole needed.
- Prefer Role + RoleBinding (namespace-scoped) unless you truly need cluster-wide access.

#### Pod Security Standards (Pod Security Admission)

K8s >=1.25 ships Pod Security Admission enforcing baseline/restricted via namespace labels.

```bash
# Enforce restricted on the namespace
kubectl label ns sec-lab \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/warn=restricted \
  --overwrite

# Try to run an insecure Pod and watch it fail
cat <<'YAML' | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: bad-pod
spec:
  containers:
  - name: c
    image: busybox
    command: ["sh","-c","sleep 3600"]
    securityContext:
      privileged: true
YAML
# Expect: Forbidden: violates PodSecurity "restricted"


# Run a compliant Pod
cat <<'YAML' | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: good-pod
spec:
  securityContext:
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: c
    image: busybox
    command: ["sh","-c","sleep 3600"]
    securityContext:
      allowPrivilegeEscalation: false
      capabilities:
        drop: ["ALL"]
      runAsNonRoot: true
      readOnlyRootFilesystem: true
YAML
kubectl get pod good-pod

```

#### Network Isolation with NetworkPolicies

> Requires CNI that enforces NP (Calico/Cilium). We’ll create a “default deny” and then selectively allow.

```bash
# server
cat <<'YAML' | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata: { name: hello-srv, labels: { app: hello } }
spec:
  containers:
  - name: c
    image: hashicorp/http-echo
    args: ["-text=hello"]
---
apiVersion: v1
kind: Service
metadata: { name: hello }
spec:
  selector: { app: hello }
  ports:
  - port: 5678
    targetPort: 5678
YAML

# client
cat <<'YAML' | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata: { name: curl, labels: { app: curl } }
spec:
  containers:
  - name: c
    image: curlimages/curl
    command: ["sleep","3600"]
YAML

# quick connectivity check (should work initially)
kubectl exec curl -- sh -c 'curl -s hello:5678'


cat <<'YAML' | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
spec:
  podSelector: {}   # all pods in namespace
  policyTypes: ["Ingress"]
YAML

kubectl exec curl -- sh -c 'curl -s --max-time 2 hello:5678'  # should HANG/FAIL

cat <<'YAML' | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-curl-to-hello
spec:
  podSelector:
    matchLabels:
      app: hello
  policyTypes: ["Ingress"]
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: curl
    ports:
    - protocol: TCP
      port: 5678
YAML

# Test again (should work now)
kubectl exec curl -- sh -c 'curl -s hello:5678'
```

#### Secrets: Safer Usage Patterns

```bash
# Mount as files (avoid env vars for long-lived secrets)
kubectl create secret generic db-cred \
  --from-literal=username=app \
  --from-literal=password='S3cure!'

cat <<'YAML' | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: secret-vol
spec:
  containers:
  - name: app
    image: busybox
    command: ["sh","-c","ls -l /etc/creds; cat /etc/creds/username; sleep 3600"]
    volumeMounts:
    - name: creds
      mountPath: /etc/creds
      readOnly: true
  volumes:
  - name: creds
    secret:
      secretName: db-cred
YAML


# Disable token automount unless needed
kubectl patch serviceaccount default -p '{"automountServiceAccountToken": false}'

```

#### Image Hygiene

```bash
# Disallow :latest, require imagePullPolicy: IfNotPresent
cat <<'YAML' | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: image-hygiene-ok
spec:
  containers:
  - name: c
    image: busybox:1.36.1
    imagePullPolicy: IfNotPresent
    command: ["sleep","3600"]
YAML

# Private registries (pull secret)
# Example (replace placeholders)
kubectl create secret docker-registry regcred \
  --docker-server=REGISTRY_URL \
  --docker-username=USER \
  --docker-password=PASS

kubectl patch serviceaccount reader -p '{"imagePullSecrets":[{"name":"regcred"}]}'
```

### 🌞 1 | 15:45 - 16:45 | Advanced Security & Compliance

> SLIDES: advanced-security-and-compliance.pdf

A good idea now to compleat the first day is not use keyverno. First we are going to install it. Then we are going to let the participants take there time and reasearch different ways to "safegauard" the cluster with policies. Let them search and apply 50 policies and see how they work with that.

```bash
helm repo add kyverno https://kyverno.github.io/kyverno/
helm repo update
helm install kyverno kyverno/kyverno -n kyverno --create-namespace
# Wait for the 3 controller pods to be Ready:
kubectl -n kyverno get pods
```

> We’ll write policies in the same sec-lab namespace (cluster policies affect all namespaces; here we’ll keep it local to practice).

### 🌞 2 | 09:15 - 10:30 | Networking in Kubernetes

> SLIDES: networking-in-kubernetes.pdf

This block will deal with network policies. And how to make the most out of networking in kubernetes. Includes exercises to highlight how networking works for and with kubernetes.

#### 1. **Pod-to-Pod Communication**
- Deploy two pods (`pod-a` and `pod-b`) in the same namespace.
- Use `kubectl exec` to ping/communicate from one to the other.
- Example:
  ```bash
  kubectl run pod-a --image=busybox --restart=Never -- sleep 3600
  kubectl run pod-b --image=busybox --restart=Never -- sleep 3600
  kubectl exec pod-a -- ping pod-b
  ```

#### 2. **Network Policy Basics**
- Apply a network policy to block all ingress traffic to `pod-b`.
- Try to ping again from `pod-a`—should fail.
- Example NetworkPolicy:
  ```yaml
  apiVersion: networking.k8s.io/v1
  kind: NetworkPolicy
  metadata:
    name: deny-all-ingress
  spec:
    podSelector:
      matchLabels: {}
    policyTypes:
    - Ingress
  ```
  ```bash
  kubectl apply -f deny-all-ingress.yaml
  ```

#### 3. **Allow Specific Traffic**
- Modify the policy to only allow traffic from `pod-a` to `pod-b`.
- Test connectivity.

#### 4. **Challenge**
- Create a policy that allows only traffic from a specific namespace or label.
- Discuss implications.

### 🌞 2 | 10:45 - 12:00 | Observability & Monitoring

> SLIDES: observability-and-monitoring.pdf

In this block we are going to install and run a simple monitoring setup to see what the cluster does and how we can use this to keep the cluster running.

#### 1. **Install Prometheus Using Helm**
- Step-by-step install:
  ```bash
  helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
  helm repo update
  helm install prometheus prometheus-community/prometheus
  ```

#### 2. **Access Prometheus UI**
- Forward Prometheus service port:
  ```bash
  kubectl port-forward svc/prometheus-server 9090
  ```
- Open Prometheus UI in browser (`localhost:9090`).

#### 3. **Deploy Sample App and Generate Load**
- Deploy a simple app (e.g., nginx).
- Use a tool like `hey` or `ab` to generate requests.

#### 4. **View Metrics**
- Explore built-in metrics (`node_cpu_seconds_total`, `container_memory_usage_bytes`, etc.) in Prometheus.
- Optional: Install Grafana and connect to Prometheus.

#### 5. **Create a Dashboard**
- Create a basic Grafana dashboard to visualize pod resource usage.

### 🌞 2 | 13:00 - 14:15 | GitOps

> SLIDES: gitops_and-cicd.pdf

#### 1. **Install ArgoCD**
  ```bash
  kubectl create namespace argocd
  kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
  ```

#### 2. **Expose ArgoCD UI**
  ```bash
  kubectl port-forward svc/argocd-server -n argocd 8080:443
  ```

#### 3. **Connect ArgoCD to a Git Repo**
- Use the UI or CLI to add a repository with sample manifests.

#### 4. **Deploy an Application via Git**
- Change a value (e.g., container image tag) in the repo.
- Watch ArgoCD auto-sync and update the deployment.

#### 5. **Rollback via Git**
- Revert the change and observe ArgoCD perform the rollback.

### 🌞 2 | 14:30 - 15:30 | Performance & Optimization

> SLIDES: performance-and-cost-optemization.pdf

Here we are going to deploy argocd and setup a git repository through which we can then deliver our configurations and manifests for kubernetes.

#### 1. **Set Resource Requests and Limits**
- Deploy a CPU-intensive app with requests/limits.
  ```yaml
  resources:
    requests:
      cpu: "100m"
      memory: "128Mi"
    limits:
      cpu: "500m"
      memory: "256Mi"
  ```

#### 2. **Horizontal Pod Autoscaler**
  ```bash
  kubectl autoscale deployment <your-app> --cpu-percent=50 --min=1 --max=5
  ```
- Generate load and observe scaling.

#### 3. **Cost Optimization Discussion**
- Experiment with scaling down resources.
- Discuss spot/preemptible node pools.

#### 4. **Challenge**
- Right-size a deployment based on observed metrics.

### 🌞 2 | 15:45 - 16:45 | Ecosystem & Future

> SLIDES: ecosystem-and-future.pdf

Here we are going into more detail about what is going to come next in kubernetes.

#### 1. **Explore CNCF Landscape**
- Have students browse [landscape.cncf.io](https://landscape.cncf.io/).
- Identify a tool/project of interest.

#### 2. **Try an Ecosystem Tool**
- Optionally install and play with a tool (e.g., Helm, Kustomize, Linkerd).
- Quick demo: install Helm and deploy a chart.

#### 3. **Discussion**
- Each student shares a project/tool they want to try.
- Discuss future trends, e.g., service mesh, AI/ML workloads.
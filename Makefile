# Variables
DOCKER_REGISTRY = yuchingt
NAMESPACE = bookstore-ns
SERVICES = book-service bff-web bff-mobile customer-service crm-service

make_folders_server:
	@echo "Creating folders on server..."
	mkdir -p $(PWD)/book-service/k8s
	mkdir -p $(PWD)/bff-web/k8s
	mkdir -p $(PWD)/bff-mobile/k8s
	mkdir -p $(PWD)/customer-service/k8s
	mkdir -p $(PWD)/crm-service/k8s
	mkdir -p $(PWD)/k8s

# Build Docker images
build:
	@echo "Building Docker images..."
	# Move to the parent directory to execute the build commands
	docker build -f bff-web/Dockerfile -t ${DOCKER_REGISTRY}/bff-web .
	docker build -f bff-mobile/Dockerfile ff -t ${DOCKER_REGISTRY}/bff-mobile .
	docker build -f customer-service/Dockerfile -t ${DOCKER_REGISTRY}/customer-service .
	docker build -f book-service/Dockerfile -t ${DOCKER_REGISTRY}/book-service .
	docker build -f crm-service/Dockerfile -t ${DOCKER_REGISTRY}/crm-service .
push:
	docker push ${DOCKER_REGISTRY}/bff-web
	docker push ${DOCKER_REGISTRY}/bff-mobile
	docker push ${DOCKER_REGISTRY}/customer-service
	docker push ${DOCKER_REGISTRY}/book-service
	docker push ${DOCKER_REGISTRY}/crm-service
# Apply Kubernetes configuration files
apply:
	@echo "Applying Kubernetes configs..."
	kubectl apply -f k8s/namespace.yaml

apply-bffs:
	@echo "Applying Kubernetes configs for BFF Web..."
	kubectl apply -f bff-web/k8s/service.yaml
	kubectl apply -f bff-web/k8s/deployment.yaml

	@echo "Applying Kubernetes configs for BFF Mobile..."
	kubectl apply -f bff-mobile/k8s/service.yaml
	kubectl apply -f bff-mobile/k8s/deployment.yaml

apply-services:
	@echo "Applying Kubernetes configs for Customer Service..."
	kubectl apply -f customer-service/k8s/service.yaml
	kubectl apply -f customer-service/k8s/deployment.yaml

	@echo "Applying Kubernetes configs for Book Service..."
	kubectl apply -f book-service/k8s/service.yaml
	kubectl apply -f book-service/k8s/deployment.yaml

	@echo "Applying Kubernetes configs for CRM Service..."
	kubectl apply -f crm-service/k8s/service.yaml
	kubectl apply -f crm-service/k8s/deployment.yaml

# Get service URLs
get-urls:
	@echo "Fetching service URLs..."
	kubectl get services -n $(NAMESPACE)

# Port forward (optional for local testing)
# port-forward:
# 	@echo "Forwarding ports to local machine..."
# 	# kubectl port-forward service/customer-service 8082:3000 -n $(NAMESPACE) &
# 	kubectl port-forward service/book-service 8080:3000 -n $(NAMESPACE) &
# 	# kubectl port-forward service/bff-web 8081:80 -n $(NAMESPACE) &
# 	# kubectl port-forward service/bff-mobile 8800:80 -n $(NAMESPACE) &

setup-namespace:
	@echo "Creating namespace $(NAMESPACE)..."
	kubectl create namespace $(NAMESPACE)

setup-secrets:
	@echo "Creating required secrets..."
	kubectl create secret generic db-credentials --from-literal=password=password -n $(NAMESPACE)

clean-all:
	@echo "Performing complete Kubernetes cleanup..."
	# Delete all resources in the namespace
	kubectl delete all --all -n $(NAMESPACE)
	# Delete the namespace itself (will delete all resources in it)
	kubectl delete namespace $(NAMESPACE)
	# Delete any persistent volumes or claims related to this namespace
	kubectl delete pv,pvc --selector=app.kubernetes.io/instance=$(NAMESPACE)
	# Delete any secrets we created
	kubectl delete secret db-credentials -n $(NAMESPACE) --ignore-not-found=true
	# Delete any config maps 
	kubectl delete configmap --all -n $(NAMESPACE) --ignore-not-found=true
	# Delete any custom resources if you're using any
	# kubectl delete <custom-resource> --all -n $(NAMESPACE) --ignore-not-found=true
	@echo "Kubernetes cleanup complete."

# Combine the two for a full reset
reset-k8s: clean-all setup-namespace

.PHONY: build apply get-urls port-forward clean
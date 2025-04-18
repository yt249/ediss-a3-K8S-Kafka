# ediss-a3-K8S-Kafka

17-647 Assignment A3: Circuit Breaker, Kubernetes (EKS), Kafka

# Step 1:

- handle deployment into AWS; for k8s [do this now or later]
- write your yaml for k8; DONE

# Step 2:

- Include recommendation url
- Test whether it works or no; postman

# Step 3:

- Circuit Breaker; just write the logic

# Step 4:

- CRM Service --> Kafka
  (1) POST /customer or ADD_CUSTOMER -> You will push to KAFKA
  (2) CRM Service --- IS ALWAYS RUNNING; they POLL/PULL from kafka --> Send email

(1) --> Push to Kafka --> (2) CRM Service; PULL from Kafka --> (3) Send Email

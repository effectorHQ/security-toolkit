# OpenClaw Security Hardening Guide

A comprehensive guide for DevOps teams and system administrators to secure OpenClaw instances against the most common attack vectors and misconfigurations.

## Table of Contents

1. [Network Security](#network-security)
2. [Authentication & Access Control](#authentication--access-control)
3. [Encryption & TLS](#encryption--tls)
4. [API Key Management](#api-key-management)
5. [Firewall Configuration](#firewall-configuration)
6. [Session Management](#session-management)
7. [Logging & Monitoring](#logging--monitoring)
8. [Webhook Security](#webhook-security)
9. [Deployment Best Practices](#deployment-best-practices)
10. [Incident Response](#incident-response)

## Network Security

### 1. Restrict Network Binding

OpenClaw should never listen on `0.0.0.0` in production. This exposes your service to all network interfaces.

**Current Risk**: 135,000+ exposed instances are listening on all interfaces.

**Configuration**:
```yaml
gateway:
  # WRONG - Exposes to all networks
  # bind_address: 0.0.0.0

  # CORRECT - Localhost only
  bind_address: 127.0.0.1

  # OR for private networks
  bind_address: 192.168.1.50      # Internal network
  bind_address: 10.0.0.50         # Private network
```

**Verification**:
```bash
# Check what interfaces OpenClaw is listening on
sudo netstat -tulpn | grep openclaw
sudo ss -tulpn | grep openclaw

# Should only show localhost or private IP
# NOT 0.0.0.0 or all IPv6 addresses
```

### 2. Use Non-Standard Ports

While port 18789 is the default, consider using a non-standard port to reduce automated scanning.

**Configuration**:
```yaml
gateway:
  port: 21847  # Non-standard port
```

**Note**: This provides minimal security (security through obscurity), but combined with firewall rules, it helps reduce automated attacks.

### 3. Network Segmentation

Deploy OpenClaw in isolated network segments.

```
[Public Internet]
         ↓
    [Firewall]
         ↓
[DMZ - Load Balancer]
         ↓
    [Firewall]
         ↓
[Private Network - OpenClaw Instances]
```

**Recommendations**:
- Place OpenClaw in a private subnet
- Only expose through reverse proxy/load balancer
- Use VPN for administrative access
- Implement network ACLs (Access Control Lists)

## Authentication & Access Control

### 1. Enable Authentication

**CRITICAL**: Authentication must be enabled on all production instances.

**Configuration**:
```yaml
gateway:
  auth:
    enabled: true
    type: api_key    # or jwt, ldap

    # API Key Configuration
    api_keys:
      - name: production_key
        key: "<your-api-key>"  # e.g. from env; never commit real keys
        permissions: [read, write]
        rate_limit: 1000    # requests per minute

      - name: read_only_key
        key: "<your-read-only-key>"
        permissions: [read]
        rate_limit: 5000

    # OR JWT Configuration
    jwt:
      enabled: true
      issuer: https://your-auth-server.com
      audience: openclaw-api
      public_key: /etc/openclaw/keys/public.pem

    # OR LDAP Configuration
    ldap:
      enabled: true
      server: ldap://ldap.example.com
      base_dn: dc=example,dc=com
      user_search: uid={username}
```

### 2. Disable Default Credentials

Some OpenClaw distributions ship with default credentials. Change them immediately.

```bash
# Change default admin password
openclaw-admin change-password admin NewSecurePassword123!

# List all users
openclaw-admin list-users

# Remove unnecessary service accounts
openclaw-admin remove-user guest
```

### 3. Implement Role-Based Access Control (RBAC)

Define minimum-privilege roles for different operations.

```yaml
gateway:
  auth:
    roles:
      - name: viewer
        permissions:
          - read:configuration
          - read:logs

      - name: operator
        permissions:
          - read:configuration
          - write:channels
          - read:logs

      - name: admin
        permissions:
          - read:*
          - write:*
          - delete:*
          - admin:users
          - admin:security
```

### 4. Audit User Access

Monitor who accesses your OpenClaw instance.

```bash
# Enable detailed authentication logging
export OPENCLAW_AUTH_LOG_LEVEL=debug

# View authentication events
tail -f /var/log/openclaw/auth.log | grep "failed\|success"
```

## Encryption & TLS

### 1. Enable TLS/SSL

All OpenClaw communication must use TLS encryption in production.

**Configuration**:
```yaml
gateway:
  tls:
    enabled: true

    # Using Let's Encrypt certificates
    certificate_path: /etc/letsencrypt/live/openclaw.example.com/fullchain.pem
    key_path: /etc/letsencrypt/live/openclaw.example.com/privkey.pem

    # TLS version enforcement
    min_tls_version: "1.2"
    # max_tls_version: "1.3"

    # Cipher suites (strong ciphers only)
    cipher_suites:
      - TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384
      - TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384
      - TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256
      - TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
```

### 2. Certificate Management

**Best Practices**:
- Use certificates from trusted Certificate Authorities (Let's Encrypt is free)
- Auto-renew certificates before expiration (45 days before expiry)
- Monitor certificate expiration dates
- Use separate certificates for each domain

**Setup with Let's Encrypt**:
```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot certonly --standalone -d openclaw.example.com

# Setup auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Test renewal
sudo certbot renew --dry-run
```

### 3. Disable Insecure Protocols

Never allow unencrypted HTTP in production.

```yaml
gateway:
  # Don't expose HTTP
  http:
    enabled: false

  # Force HTTPS redirect (if supporting HTTP)
  https_redirect: true
```

### 4. Certificate Pinning

For critical integrations, implement certificate pinning.

```yaml
gateway:
  tls:
    cert_pinning:
      enabled: true
      pins:
        - sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
        - sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=
```

## API Key Management

### 1. Never Hardcode API Keys

Move all credentials to environment variables.

**WRONG**:
```yaml
gateway:
  api_key: "<hardcoded-key-placeholder>"  # SECURITY RISK!
```

**CORRECT**:
```yaml
gateway:
  api_key: ${OPENCLAW_API_KEY}  # Read from environment
```

**Set in environment**:
```bash
export OPENCLAW_API_KEY="<your-api-key>"

# Or use .env file (never commit to git!)
echo "OPENCLAW_API_KEY=<your-key>" > /etc/openclaw/.env
chmod 600 /etc/openclaw/.env  # Only readable by openclaw user
```

### 2. Use Key Rotation

Rotate API keys regularly (recommend quarterly).

```bash
# Generate new key
NEW_KEY=$(openclaw-keygen --format api_key)
echo "New API key: $NEW_KEY"

# Update service
export OPENCLAW_API_KEY=$NEW_KEY

# Verify connection
openclaw-test-connection

# After verification, revoke old key
openclaw-admin revoke-key "<old-key-to-revoke>"
```

### 3. Implement Key Scoping

Limit each API key's permissions and usage.

```yaml
gateway:
  auth:
    api_keys:
      - name: ci_deploy_key
        permissions: [write:channels, write:routes]
        # Restrict to specific IP ranges
        allowed_ips:
          - 192.168.1.100/32
          - 10.0.0.0/8
        # Rate limiting
        rate_limit: 100     # requests/minute
        # Time-based expiration
        expires_at: "2027-03-05T00:00:00Z"

      - name: monitoring_key
        permissions: [read:*]
        rate_limit: 1000    # High limit for monitoring
```

### 4. Store Keys Securely

**Using hashicorp/vault**:
```bash
# Store API key in Vault
vault kv put secret/openclaw/api_key value=$OPENCLAW_API_KEY

# Retrieve in application
export OPENCLAW_API_KEY=$(vault kv get -field=value secret/openclaw/api_key)
```

**Using AWS Secrets Manager**:
```bash
# Store secret
aws secretsmanager create-secret \
  --name openclaw/api-key \
  --secret-string "$OPENCLAW_API_KEY"

# Retrieve in application
OPENCLAW_API_KEY=$(aws secretsmanager get-secret-value \
  --secret-id openclaw/api-key \
  --query SecretString \
  --output text)
```

## Firewall Configuration

### 1. Network-Level Firewall Rules

Restrict access to OpenClaw to only authorized networks.

**iptables/ufw (Linux)**:
```bash
# Allow SSH access (for management)
sudo ufw allow 22/tcp

# Allow OpenClaw from internal network only
sudo ufw allow from 192.168.1.0/24 to any port 18789

# Allow from load balancer
sudo ufw allow from 192.168.1.10 to any port 18789

# Deny all other access
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw enable
```

**AWS Security Groups**:
```bash
# Allow from private subnet
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxx \
  --protocol tcp \
  --port 18789 \
  --cidr 10.0.1.0/24

# Allow from bastion host
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxx \
  --protocol tcp \
  --port 18789 \
  --source-group sg-bastion
```

### 2. Application-Level Firewall Rules

Configure OpenClaw's built-in firewall.

```yaml
gateway:
  firewall:
    enabled: true

    # Whitelist mode (recommended)
    default_policy: deny
    rules:
      # Allow monitoring
      - action: allow
        source: 192.168.1.100    # Prometheus
        methods: [GET]
        paths: [/metrics]

      # Allow internal services
      - action: allow
        source: 10.0.0.0/8
        methods: [GET, POST, PUT]
        paths: [/api/*]

      # Allow from load balancer
      - action: allow
        source: 192.168.1.10
        methods: [*]
        paths: [*]

      # Deny specific abuse patterns
      - action: deny
        patterns:
          - ".*\\.php"           # PHP injections
          - ".*;.*="             # SQL injection patterns
          - ".*<.*>"             # HTML/Script injections

    # Rate limiting
    rate_limiting:
      enabled: true
      per_ip: 100       # 100 requests per minute per IP
      per_key: 1000     # 1000 requests per minute per API key
```

### 3. DDoS Protection

For exposed instances, implement DDoS mitigation.

**CloudFlare/CDN-based protection**:
```yaml
gateway:
  # Behind CloudFlare - trust their IPs only
  trusted_proxies:
    - 173.245.48.0/20
    - 103.21.244.0/22
    - 103.22.200.0/22
    # ... see https://www.cloudflare.com/ips/
```

**Local rate limiting**:
```yaml
gateway:
  rate_limiting:
    # Global rate limit
    global: 10000       # 10k req/min total

    # Per IP address
    per_ip: 100        # 100 req/min per IP

    # Burst allowance
    burst_size: 200    # Allow temporary spikes
```

## Session Management

### 1. Configure Session Timeouts

Prevent session hijacking with appropriate timeouts.

```yaml
gateway:
  session:
    # Idle timeout (30 minutes)
    timeout: 1800

    # Absolute timeout (12 hours)
    max_lifetime: 43200

    # Refresh interval (before expiration)
    refresh_before: 300  # 5 minutes before expiry

    # Secure cookies
    cookie_secure: true
    cookie_httponly: true
    cookie_samesite: Strict
```

### 2. Implement Session Binding

Bind sessions to device/client fingerprint.

```yaml
gateway:
  session:
    binding:
      enabled: true
      # Bind to IP address
      bind_ip: true
      # Bind to user agent
      bind_user_agent: true
      # Bind to TLS certificate fingerprint
      bind_tls_cert: true
```

### 3. Monitor Session Activity

```bash
# View active sessions
openclaw-admin list-sessions

# Terminate suspicious session
openclaw-admin terminate-session SESSION_ID

# View session logs
tail -f /var/log/openclaw/session.log
```

## Logging & Monitoring

### 1. Enable Comprehensive Audit Logging

```yaml
gateway:
  logging:
    # Overall log level
    level: info

    # Audit logging
    audit:
      enabled: true
      level: debug
      destinations:
        - file: /var/log/openclaw/audit.log
        - syslog: localhost:514

    # Authentication logging
    auth:
      enabled: true
      level: debug
      log_failures: true
      log_successes: true

    # API request logging
    api:
      enabled: true
      log_headers: true
      log_payload: true
      exclude_paths:
        - /healthz
        - /metrics

    # Error logging
    error:
      enabled: true
      include_stack_trace: true
      send_alerts: true
```

### 2. Configure Log Rotation

Prevent disk space issues with proper log rotation.

**Using logrotate**:
```bash
# /etc/logrotate.d/openclaw
/var/log/openclaw/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 openclaw openclaw
    sharedscripts
    postrotate
        systemctl reload openclaw > /dev/null 2>&1 || true
    endscript
}
```

### 3. Setup Centralized Logging

Forward logs to centralized system for analysis.

**ELK Stack (Elasticsearch/Logstash/Kibana)**:
```yaml
gateway:
  logging:
    destinations:
      # File logging
      - file: /var/log/openclaw/main.log

      # Forward to Logstash
      - logstash:
          host: logstash.monitoring.svc
          port: 5000
          ssl: true
          ca_cert: /etc/openclaw/certs/ca.pem
```

### 4. Monitor Key Metrics

```bash
# Setup Prometheus monitoring
cat > /etc/openclaw/prometheus.yaml << EOF
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'openclaw'
    static_configs:
      - targets: ['localhost:18789']
    scheme: 'https'
    tls_config:
      ca_file: /etc/openclaw/certs/ca.pem
EOF

# Monitor these metrics:
# - openclaw_auth_failures_total
# - openclaw_api_errors_total
# - openclaw_request_latency_seconds
# - openclaw_active_sessions
# - openclaw_tls_cert_expiry_seconds
```

## Webhook Security

### 1. Enable Signature Validation

All webhook endpoints must validate request signatures.

```yaml
gateway:
  webhooks:
    # Enable signature validation
    signature_validation:
      enabled: true
      algorithm: hmac-sha256

    # Shared secret (store in env variable!)
    secret: ${WEBHOOK_SECRET}

    # Require signature header
    require_signature: true
    signature_header: X-OpenClaw-Signature

    # Timestamp validation (prevent replay attacks)
    validate_timestamp: true
    max_timestamp_age: 300  # 5 minutes
```

**Webhook Consumer Implementation**:
```javascript
// Verify webhook signature
const crypto = require('crypto');

app.post('/webhook', (req, res) => {
  const signature = req.headers['x-openclaw-signature'];
  const timestamp = req.headers['x-openclaw-timestamp'];
  const secret = process.env.WEBHOOK_SECRET;

  // Verify timestamp
  const requestAge = Date.now() - parseInt(timestamp) * 1000;
  if (requestAge > 300000) {  // 5 minutes
    return res.status(401).json({ error: 'Request too old' });
  }

  // Verify signature
  const payload = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');

  if (!crypto.timingSafeEqual(signature, expectedSignature)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Process webhook
  res.json({ success: true });
});
```

### 2. Webhook Endpoint Security

```yaml
gateway:
  webhooks:
    # Whitelist webhook endpoints
    allowed_endpoints:
      - https://app1.example.com/webhooks/openclaw
      - https://app2.example.com/webhooks/openclaw

    # Timeout for webhook delivery
    timeout: 30

    # Retry policy
    retries: 3
    retry_backoff: exponential

    # TLS verification
    verify_tls: true
    ca_cert: /etc/openclaw/certs/ca.pem
```

## Deployment Best Practices

### 1. Minimal Container Images

Use distroless or minimal base images for Docker.

```dockerfile
# Multi-stage build for smaller image
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM distroless/nodejs18-debian11
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/package*.json /app/
COPY . /app

EXPOSE 18789
CMD ["/app/bin/openclaw-audit.js"]
```

### 2. Run as Non-Root User

```dockerfile
FROM distroless/nodejs18-debian11
RUN useradd -m openclaw
USER openclaw
# ... rest of Dockerfile
```

### 3. Use Secrets Management

**Docker Secrets**:
```bash
echo "<your-secret-value>" | docker secret create openclaw_api_key -
```

**Kubernetes Secrets**:
```bash
kubectl create secret generic openclaw-secrets \
  --from-literal=api_key="<your-api-key>" \
  --from-literal=webhook_secret=...
```

### 4. Network Policies

**Kubernetes Network Policy**:
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: openclaw-network-policy
spec:
  podSelector:
    matchLabels:
      app: openclaw
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: istio-system
      ports:
        - protocol: TCP
          port: 18789
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              name: default
      ports:
        - protocol: TCP
          port: 5432  # Database
```

## Incident Response

### 1. Incident Detection

Monitor for these warning signs:

```bash
# Unusual authentication failures
grep "failed\|error" /var/log/openclaw/auth.log | tail -100

# Unusual API activity
grep "ERROR\|CRITICAL" /var/log/openclaw/api.log | tail -100

# Configuration changes
grep "CONFIG_CHANGE" /var/log/openclaw/audit.log

# Suspicious network connections
netstat -an | grep ESTABLISHED | grep 18789
```

### 2. Incident Response Procedures

**If Compromised**:
1. **Isolate**: Immediately disconnect from network
2. **Preserve**: Preserve logs and memory dumps
3. **Assess**: Determine scope of compromise
4. **Revoke**: Revoke all API keys and sessions
5. **Notify**: Alert all stakeholders
6. **Remediate**: Fix underlying vulnerability
7. **Restore**: Rebuild from clean image

**Revoke Compromised Credentials**:
```bash
# Revoke all API keys
openclaw-admin revoke-all-keys

# Force logout all sessions
openclaw-admin terminate-all-sessions

# Change admin password
openclaw-admin change-password admin NewSecurePassword123!

# Restart service
systemctl restart openclaw
```

### 3. Security Audit Checklist

Run the security audit tool regularly:

```bash
# Weekly security scan
0 0 * * 0 /usr/local/bin/openclaw-audit scan /etc/openclaw/gateway.yaml

# Check configuration
0 6 * * * /usr/local/bin/openclaw-audit report \
  /etc/openclaw/gateway.yaml --format json | \
  curl -X POST https://siem.example.com/api/security-reports

# Verify firewall rules
0 12 * * * openclaw-admin verify-firewall-rules
```

## Compliance Checklists

### OWASP Top 10 for OpenClaw

- [ ] **A01:2021 - Broken Access Control**: Implement RBAC, verify permissions
- [ ] **A02:2021 - Cryptographic Failures**: Enable TLS, rotate keys, secure storage
- [ ] **A03:2021 - Injection**: Validate all inputs, use parameterized queries
- [ ] **A04:2021 - Insecure Design**: Follow security architecture principles
- [ ] **A05:2021 - Security Misconfiguration**: Use this hardening guide, run audits
- [ ] **A06:2021 - Vulnerable Components**: Keep OpenClaw updated
- [ ] **A07:2021 - Identification/Authentication**: Enable auth, implement 2FA
- [ ] **A08:2021 - Software/Data Integrity**: Verify signatures, use secure channels
- [ ] **A09:2021 - Logging/Monitoring**: Enable comprehensive logging
- [ ] **A10:2021 - SSRF**: Validate webhook endpoints, restrict outbound connections

### CIS Benchmarks

- [ ] Network access restricted to authorized IPs
- [ ] TLS 1.2+ enforced
- [ ] Strong cipher suites configured
- [ ] Audit logging enabled
- [ ] Regular security updates applied
- [ ] Secrets stored in secret management system
- [ ] Role-based access control implemented
- [ ] Session timeouts configured
- [ ] Rate limiting enabled
- [ ] Regular security assessments conducted

## Additional Resources

- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [CIS Benchmarks](https://www.cisecurity.org/cis-benchmarks/)
- [OpenClaw Official Documentation](https://docs.openclaw.io)
- [Security Headers](https://securityheaders.com)

---

**Last Updated**: 2026-03-05
**Version**: 1.0
**Maintainer**: OpenClaw Security Team

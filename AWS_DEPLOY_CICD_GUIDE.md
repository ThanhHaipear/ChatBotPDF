# AWS Deployment and CI/CD Guide for StudyDocs AI

This guide is tailored to the current project structure:

- `frontend/`: React + Vite static app
- `backend/`: NestJS API + Prisma
- Database: PostgreSQL + `pgvector`
- External APIs: OpenAI and Hugging Face
- Runtime upload path today: `backend/uploads` via local disk

## Recommended AWS Architecture

Use this for a practical production deployment:

```text
Users
  |
  v
CloudFront + S3
  | serves frontend static files
  v
Browser
  |
  | HTTPS API calls
  v
Application Load Balancer
  |
  v
ECS Fargate service: backend container
  |
  +-- RDS PostgreSQL with pgvector
  +-- AWS Secrets Manager / SSM Parameter Store
  +-- CloudWatch Logs
  +-- S3 bucket for uploaded PDFs, recommended next step
```

Why this fits the repo:

- Vite builds to static files, so S3 + CloudFront is the simplest frontend host.
- NestJS backend is a long-running HTTP API, so ECS Fargate is simpler than Lambda for PDF parsing, vector indexing, and large requests.
- RDS PostgreSQL supports the `vector` extension, matching `prisma/schema.prisma`.
- Secrets should not be stored in GitHub or `.env` on the server.

## Important Changes Before Production

### 1. Add a backend Dockerfile

Create `backend/Dockerfile`:

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package*.json ./
RUN mkdir -p uploads
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
```

Create `backend/.dockerignore`:

```text
node_modules
dist
coverage
uploads
.env
.env.*
npm-debug.log
```

### 2. Restrict CORS

Current backend allows all origins:

```ts
app.enableCors({ origin: '*' });
```

For production, use an env var such as `FRONTEND_URL`:

```ts
app.enableCors({
  origin: process.env.FRONTEND_URL?.split(',') ?? '*',
});
```

Set `FRONTEND_URL=https://your-cloudfront-domain-or-custom-domain`.

### 3. Decide PDF Storage

The current upload code stores files in `./uploads`. On ECS Fargate this is ephemeral. The database still stores extracted text and embeddings, so chat will work after indexing, but original uploaded PDF files may disappear after a task restart.

For production, use one of these:

- Short term: keep local upload only if you do not need to download original PDFs later.
- Better: upload PDFs to S3 and store the S3 key or URL in `Document.fileUrl`.
- Alternative: mount EFS into ECS if you want filesystem-style persistence.

## AWS Setup

### 1. Create RDS PostgreSQL

Create an RDS PostgreSQL instance using a version that supports `pgvector`. Use PostgreSQL 16 or 17 if available in your region.

Recommended minimum for small demo:

- Engine: PostgreSQL
- Instance: `db.t4g.micro` or `db.t4g.small`
- Storage: 20 GB gp3
- Public access: No
- VPC: same VPC as ECS
- Security group: allow inbound `5432` only from the ECS backend security group

Database variables:

```text
DB name: studydocs_ai
Username: studydocs
Password: generate a strong password
```

Production `DATABASE_URL` format:

```text
postgresql://studydocs:<password>@<rds-endpoint>:5432/studydocs_ai?schema=public
```

Prisma migration already contains:

```sql
CREATE EXTENSION IF NOT EXISTS "vector";
```

If permission fails, connect as the RDS master user and run:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Then run:

```bash
cd backend
npx prisma migrate deploy
```

After migration, apply the manual HNSW index:

```bash
psql "$DATABASE_URL" -f prisma/migrations/manual_vector_index.sql
```

### 2. Store Secrets

Store these in AWS Secrets Manager or SSM Parameter Store:

```text
DATABASE_URL
HUGGINGFACE_API_KEY
HUGGINGFACE_API_BASE_URL
HUGGINGFACE_EMBEDDING_MODEL
HUGGINGFACE_EMBEDDING_DIMENSIONS
HUGGINGFACE_EMBEDDING_FALLBACK
HUGGINGFACE_RERANK_MODEL
RAG_VECTOR_TOP_K
RAG_RERANK_TOP_K
OPENAI_API_KEY
PORT
FRONTEND_URL
```

Use current values from `backend/.env`, but never commit `.env`.

### 3. Create ECR Repository

```bash
aws ecr create-repository --repository-name studydocs-ai-backend
```

Build and push manually once:

```bash
cd backend
aws ecr get-login-password --region ap-southeast-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.ap-southeast-1.amazonaws.com
docker build -t studydocs-ai-backend .
docker tag studydocs-ai-backend:latest <account-id>.dkr.ecr.ap-southeast-1.amazonaws.com/studydocs-ai-backend:latest
docker push <account-id>.dkr.ecr.ap-southeast-1.amazonaws.com/studydocs-ai-backend:latest
```

Use `ap-southeast-1` for Singapore, or choose the AWS region closest to your users.

### 4. Create ECS Fargate Backend

Create:

- ECS cluster: `studydocs-ai`
- Task definition: `studydocs-ai-backend`
- Container image: ECR image above
- Container port: `3000`
- CPU/memory: start with `0.5 vCPU / 1 GB`, increase if PDF indexing is slow
- Logging: CloudWatch Logs
- Environment/secrets: inject from Secrets Manager or SSM
- Service: Fargate service behind an Application Load Balancer

Health check path:

```text
/
```

The current `AppController` should return a basic response at `/`. If you want a clearer health endpoint, add `GET /health`.

### 5. Deploy Frontend to S3 + CloudFront

Create a frontend env file for production build:

```text
frontend/.env.production
VITE_API_URL=https://your-api-domain
```

Build:

```bash
cd frontend
npm ci
npm run build
```

Upload `frontend/dist` to S3:

```bash
aws s3 sync dist/ s3://your-frontend-bucket --delete
```

Put CloudFront in front of the bucket. For a React SPA, configure CloudFront custom error responses:

```text
403 -> /index.html -> 200
404 -> /index.html -> 200
```

Then invalidate cache after deployment:

```bash
aws cloudfront create-invalidation --distribution-id <distribution-id> --paths "/*"
```

## GitHub Actions CI/CD

Use GitHub OIDC to assume an AWS IAM role. Do not store long-lived AWS keys in GitHub secrets.

Required GitHub secrets or variables:

```text
AWS_ROLE_ARN
AWS_REGION
AWS_ACCOUNT_ID
ECR_REPOSITORY
ECS_CLUSTER
ECS_SERVICE
ECS_TASK_DEFINITION
ECS_CONTAINER_NAME
FRONTEND_BUCKET
CLOUDFRONT_DISTRIBUTION_ID
VITE_API_URL
```

### Backend Workflow

Create `.github/workflows/backend.yml`:

```yaml
name: Backend CI/CD

on:
  push:
    branches: [main]
    paths:
      - "backend/**"
      - ".github/workflows/backend.yml"
  pull_request:
    paths:
      - "backend/**"

permissions:
  id-token: write
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: backend/package-lock.json
      - run: npm ci
      - run: npm run build
      - run: npm test

  deploy:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ${{ vars.AWS_REGION }}

      - uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push backend image
        working-directory: backend
        env:
          ECR_REGISTRY: ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.${{ vars.AWS_REGION }}.amazonaws.com
          ECR_REPOSITORY: ${{ vars.ECR_REPOSITORY }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          echo "IMAGE_URI=$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG" >> $GITHUB_ENV

      - name: Download current task definition
        run: |
          aws ecs describe-task-definition \
            --task-definition ${{ vars.ECS_TASK_DEFINITION }} \
            --query taskDefinition > task-definition.json

      - uses: aws-actions/amazon-ecs-render-task-definition@v1
        id: render
        with:
          task-definition: task-definition.json
          container-name: ${{ vars.ECS_CONTAINER_NAME }}
          image: ${{ env.IMAGE_URI }}

      - uses: aws-actions/amazon-ecs-deploy-task-definition@v2
        with:
          task-definition: ${{ steps.render.outputs.task-definition }}
          service: ${{ vars.ECS_SERVICE }}
          cluster: ${{ vars.ECS_CLUSTER }}
          wait-for-service-stability: true
```

### Frontend Workflow

Create `.github/workflows/frontend.yml`:

```yaml
name: Frontend CI/CD

on:
  push:
    branches: [main]
    paths:
      - "frontend/**"
      - ".github/workflows/frontend.yml"
  pull_request:
    paths:
      - "frontend/**"

permissions:
  id-token: write
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: frontend/package-lock.json
      - run: npm ci
      - run: npm run build
        env:
          VITE_API_URL: ${{ vars.VITE_API_URL }}

  deploy:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    needs: build
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: frontend/package-lock.json
      - run: npm ci
      - run: npm run build
        env:
          VITE_API_URL: ${{ vars.VITE_API_URL }}

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ${{ vars.AWS_REGION }}

      - name: Upload frontend to S3
        run: aws s3 sync dist/ s3://${{ vars.FRONTEND_BUCKET }} --delete

      - name: Invalidate CloudFront
        run: aws cloudfront create-invalidation --distribution-id ${{ vars.CLOUDFRONT_DISTRIBUTION_ID }} --paths "/*"
```

## IAM Notes for GitHub OIDC

The GitHub Actions AWS role should be scoped to this repository and branch. Trust policy condition should restrict:

```text
token.actions.githubusercontent.com:sub = repo:<github-org-or-user>/<repo-name>:ref:refs/heads/main
```

Minimum permissions needed:

- ECR push/pull for backend repository
- ECS describe/register/deploy task definition and update service
- S3 sync permissions for the frontend bucket
- CloudFront invalidation

Keep production API keys in AWS Secrets Manager/SSM, not GitHub.

## Deployment Order

1. Add `backend/Dockerfile` and `backend/.dockerignore`.
2. Create RDS PostgreSQL and verify `CREATE EXTENSION vector`.
3. Create Secrets Manager/SSM values.
4. Create ECR repository.
5. Build and push backend image once.
6. Create ECS task definition, service, ALB, and target group.
7. Run Prisma migrations against RDS.
8. Create S3 bucket and CloudFront distribution for frontend.
9. Build frontend with `VITE_API_URL=https://your-api-domain`.
10. Configure GitHub OIDC role and repository variables.
11. Add GitHub Actions workflows.
12. Push to `main` and verify both deployments.

## Post-Deploy Checks

Backend:

```bash
curl https://your-api-domain/
curl https://your-api-domain/documents
```

Frontend:

- Open CloudFront URL.
- Upload a small PDF.
- Confirm a document row appears.
- Ask a question.
- Check CloudWatch logs if indexing or chat fails.

Database:

```sql
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';
SELECT COUNT(*) FROM "Document";
SELECT COUNT(*) FROM "DocumentChunk";
```

## Cost Control

For a student/demo environment:

- Use one small RDS instance.
- Use one ECS task.
- Keep CloudWatch log retention short, for example 7 or 14 days.
- Stop non-production RDS/ECS when not testing.
- Watch OpenAI and Hugging Face API usage separately; AWS budgets will not cover those vendors.

## Sources Checked

- AWS announced RDS PostgreSQL support for `pgvector` on PostgreSQL 15.2 and higher.
- AWS RDS PostgreSQL extension release notes list current `pgvector` extension versions by engine version.
- GitHub and AWS document the official ECS deployment flow with GitHub Actions.
- `aws-actions/configure-aws-credentials` supports OIDC role assumption for GitHub Actions.

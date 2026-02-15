import os
from datetime import timedelta
from pathlib import Path
from corsheaders.defaults import default_headers

# ==========================================
# PATH CONFIGURATION
# ==========================================
BASE_DIR = Path(__file__).resolve().parent.parent

# ==========================================
# CORE SETTINGS
# ==========================================
SECRET_KEY = 'django-insecure-rv0t)82bs+_h(1!wxjgzt(21+evgrrf9e4y+j)d!78df=6&-@x'
DEBUG = True

ALLOWED_HOSTS = [
    '127.0.0.1',
    'localhost',
    'demo.localhost',
    'oxford.localhost',
]

# ==========================================
# INSTALLED APPS
# ==========================================

# 1. SHARED_APPS (Public Schema)
SHARED_APPS = [
    'corsheaders',
    'django_tenants',
    'rest_framework',
    'rest_framework_simplejwt',
    'clients',
    'django.contrib.contenttypes',
    'django.contrib.auth',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.admin',
]

# 2. TENANT_APPS (Tenant Schema)
TENANT_APPS = [
    'school',
    'admissions',
    'academics',
    'library',
    'parent_portal',
    'hr',
    'staff_mgmt',
    'assets',
    'communication',
    'reporting',
    'django.contrib.contenttypes',
    'django.contrib.auth',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.admin',
]

INSTALLED_APPS = list(set(SHARED_APPS) | set(TENANT_APPS))

# ==========================================
# MIDDLEWARE (CRITICAL ORDER)
# ==========================================
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',      # 1. Security First
    'corsheaders.middleware.CorsMiddleware',             # 2. CORS Next (Must be early)
    'django_tenants.middleware.main.TenantMainMiddleware', # 3. Tenancy (Determines Schema)
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# ==========================================
# DATABASE
# ==========================================
DATABASES = {
    'default': {
        'ENGINE': 'django_tenants.postgresql_backend',
        'NAME': 'sms_school_db',
        'USER': 'postgres',
        'PASSWORD': 'MugambiBrian@13',
        'HOST': 'localhost',
        'PORT': '5432', # Ensure this matches your PG config
    }
}

# ==========================================
# TENANCY SETTINGS
# ==========================================
TENANT_MODEL = "clients.Tenant"
TENANT_DOMAIN_MODEL = "clients.Domain"

# ???? ADD THESE TWO LINES (PUBLIC CONFIG)
# This tells Django: "When visiting generic localhost, use 'config.public_urls'"
# "When visiting demo.localhost, use the tenant router."
PUBLIC_SCHEMA_NAME = "public"
PUBLIC_SCHEMA_URLCONF = "config.public_urls"

# Allow Frontend to specify tenant via HTTP Header (Cleaner for local dev)
TENANT_HEADERS = ["X-Tenant-ID"]


DATABASE_ROUTERS = (
    'django_tenants.routers.TenantSyncRouter',
)

# ==========================================
# REST FRAMEWORK & AUTH
# ==========================================
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DATETIME_FORMAT': '%Y-%m-%d %H:%M:%S',
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
}

# ==========================================
# CORS CONFIGURATION (FRONTEND INTEGRATION)
# ==========================================
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://demo.localhost:3000",
    "http://demo.localhost:8000", # Allow Backend to call Backend
]

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = list(default_headers) + ['x-tenant-id']

# ==========================================
# STATIC FILES
# ==========================================
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ==========================================
# COMMUNICATION PROVIDER PLACEHOLDERS
# ==========================================
COMMUNICATION_SMS_API_KEY = os.getenv("COMMUNICATION_SMS_API_KEY", "")
COMMUNICATION_WHATSAPP_API_KEY = os.getenv("COMMUNICATION_WHATSAPP_API_KEY", "")
COMMUNICATION_PUSH_SERVER_KEY = os.getenv("COMMUNICATION_PUSH_SERVER_KEY", "")
COMMUNICATION_WEBHOOK_TOKEN = os.getenv("COMMUNICATION_WEBHOOK_TOKEN", "")
COMMUNICATION_WEBHOOK_SHARED_SECRET = os.getenv("COMMUNICATION_WEBHOOK_SHARED_SECRET", "")

# ==========================================
# FINANCE GATEWAY PLACEHOLDERS
# ==========================================
FINANCE_PAYMENT_GATEWAY_PROVIDER = os.getenv("FINANCE_PAYMENT_GATEWAY_PROVIDER", "placeholder")
FINANCE_PAYMENT_GATEWAY_API_KEY = os.getenv("FINANCE_PAYMENT_GATEWAY_API_KEY", "")
FINANCE_WEBHOOK_TOKEN = os.getenv("FINANCE_WEBHOOK_TOKEN", "")
FINANCE_WEBHOOK_SHARED_SECRET = os.getenv("FINANCE_WEBHOOK_SHARED_SECRET", "")

# Parent Portal linkage behavior:
# False -> use explicit ParentStudentLink records only (recommended production setting)
# True  -> fallback to guardian name/email matching when no explicit link exists (migration phase)
PARENT_PORTAL_ALLOW_GUARDIAN_FALLBACK = os.getenv("PARENT_PORTAL_ALLOW_GUARDIAN_FALLBACK", "true").lower() == "true"


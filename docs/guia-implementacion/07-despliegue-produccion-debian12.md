# Guía de Despliegue en Producción - Debian 12 (Bookworm)

Este documento detalla los requisitos, configuraciones y pasos necesarios para desplegar el sistema ERP-LG en un servidor Debian 12 de producción. Está diseñado para que un asistente de IA pueda interpretar y automatizar la configuración del Frontend, Backend y Base de Datos.

## 1. Stack Tecnológico del Proyecto
- **Sistema Operativo:** Debian 12 (Bookworm)
- **Base de Datos:** MariaDB 10.11
- **Backend:** Python (Django 5.0+, Django REST Framework, Gunicorn, Whitenoise)
- **Frontend:** Node.js (React 18, Vite, Tailwind CSS 4)
- **Servidor Web / Proxy Inverso:** Nginx

---

## 2. Requisitos Previos del Servidor (Instalación Base)

El asistente debe asegurar que el servidor cuente con los siguientes paquetes y repositorios:

```bash
# Actualizar repositorios y sistema base
sudo apt update && sudo apt upgrade -y

# Instalar dependencias esenciales
sudo apt install -y curl wget gnupg2 ca-certificates lsb-release apt-transport-https software-properties-common build-essential git
```

### Opciones de Despliegue
Se recomienda un **Despliegue Tradicional (Bare Metal) con Nginx** o **Despliegue con Docker**. A continuación, se detalla el enfoque tradicional (Bare-Metal + Nginx) al ser el más óptimo para extraer el máximo rendimiento de un servidor Linux, aunque los conceptos de variables aplican también para contenedores.

Si se usa Docker, instalar: `docker-ce docker-ce-cli containerd.io docker-compose-plugin`.
Si es Bare-Metal, instalar: `python3 python3-pip python3-venv mariadb-server nginx nodejs npm`.

*(Nota para la IA: Validar con el usuario qué modalidad prefiere, o por defecto usar Bare-Metal + Nginx como se detalla abajo).*

---

## 3. Configuración de la Base de Datos (MariaDB)

### Instalación y Seguridad
```bash
sudo apt install mariadb-server -y
sudo systemctl enable mariadb
sudo systemctl start mariadb
sudo mysql_secure_installation # La IA debe simular o ejecutar esto de forma no interactiva
```

### Creación de Credenciales
El asistente de IA debe ejecutar las siguientes sentencias SQL (reemplazando contraseñas por valores seguros generados dinámicamente):

```sql
CREATE DATABASE erp_industrial CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'erp_user'@'localhost' IDENTIFIED BY 'contraseña_fuerte_aqui';
GRANT ALL PRIVILEGES ON erp_industrial.* TO 'erp_user'@'localhost';
FLUSH PRIVILEGES;
```

---

## 4. Configuración del Backend (Django)

### Preparación del Entorno Python
```bash
sudo apt install python3-venv python3-dev default-libmysqlclient-dev pkg-config -y
cd /opt/erp-lg/backend # Asumiendo /opt/erp-lg como directorio de despliegue
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn mysqlclient
```

### Variables de Entorno (.env de Producción)
El asistente debe crear el archivo `/opt/erp-lg/backend/.env` con los siguientes valores críticos:

```ini
DEBUG=False
SECRET_KEY=generar_un_secret_key_largo_y_aleatorio
DATABASE_URL=mysql://erp_user:contraseña_fuerte_aqui@localhost:3306/erp_industrial
ALLOWED_HOSTS=midominio.com,www.midominio.com,12.34.56.78
CORS_ALLOWED_ORIGINS=https://midominio.com
```

### Migraciones y Archivos Estáticos
```bash
python manage.py migrate
python manage.py collectstatic --noinput
```

### Configuración de Gunicorn (Servicio Systemd)
La IA debe crear el archivo `/etc/systemd/system/erp-backend.service`:

```ini
[Unit]
Description=Gunicorn daemon for ERP Backend
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/opt/erp-lg/backend
ExecStart=/opt/erp-lg/backend/venv/bin/gunicorn --access-logfile - --workers 3 --bind unix:/opt/erp-lg/backend/erp.sock config.wsgi:application

[Install]
WantedBy=multi-user.target
```

Luego habilitar y arrancar:
```bash
sudo systemctl daemon-reload
sudo systemctl start erp-backend
sudo systemctl enable erp-backend
```

---

## 5. Configuración del Frontend (React + Vite)

### Construcción (Build)
```bash
# Instalar Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs

cd /opt/erp-lg/frontend
npm install
# La IA debe asegurar que las variables de entorno para Vite apunten a la API de producción
# Ejemplo: echo "VITE_API_URL=https://midominio.com/api" > .env.production
npm run build
```

Los archivos resultantes estarán en `/opt/erp-lg/frontend/dist`. Estos serán servidos por Nginx.

---

## 6. Configuración de Nginx (Proxy y Archivos Estáticos)

El asistente de IA debe crear el archivo de configuración en `/etc/nginx/sites-available/erp-lg`:

```nginx
server {
    listen 80;
    server_name midominio.com 12.34.56.78; # Reemplazar por dominio/IP real

    # Servir Frontend (React SPA)
    location / {
        root /opt/erp-lg/frontend/dist;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    # Proxy para el Backend (API)
    location /api/ {
        include proxy_params;
        proxy_pass http://unix:/opt/erp-lg/backend/erp.sock;
        
        # Headers importantes para Django
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Estáticos de Django (Admin panel, Swagger, etc.)
    location /static/ {
        alias /opt/erp-lg/backend/staticfiles/;
    }
}
```

Luego habilitar el sitio y reiniciar Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/erp-lg /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 7. Protocolo de Ejecución para el Asistente de IA

Cuando se le pida al asistente realizar el despliegue basado en este documento, debe seguir este flujo:

1. **Validación:** Confirmar si el despliegue es Bare-Metal (Systemd+Nginx) o vía Docker Compose de Producción. Confirmar el dominio público o IP.
2. **Setup Base:** Ejecutar instalación de paquetes del sistema vía `run_shell_command`.
3. **Base de Datos:** Configurar MariaDB, generar contraseña robusta e inicializar esquemas.
4. **Backend:** Configurar `.env` con variables de producción, aplicar `migrate` y `collectstatic`, y configurar el socket de Gunicorn vía Systemd.
5. **Frontend:** Inyectar variables de entorno de producción (ej. `VITE_API_URL`) y ejecutar `npm run build`.
6. **Nginx:** Escribir la configuración del VirtualHost, crear el symlink y recargar el servicio.
7. **Seguridad (Opcional pero recomendado):** Configurar UFW (Firewall) permitiendo OpenSSH, HTTP y HTTPS. Instalar y configurar Certbot (Let's Encrypt) si hay un dominio configurado.
8. **Verificación final:** Ejecutar peticiones locales (`curl`) para validar que tanto el frontend servido por Nginx como el backend (Gunicorn) responden 200 OK.
# ERP-LG — Manual de Referencia Técnica
## Capítulo 6: Infraestructura y Testing

---

## 6.1 Infraestructura Dockerizada

El proyecto ERP-LG está contenerizado para garantizar paridad entre entornos de desarrollo y futuros despliegues en producción. La arquitectura no utiliza un único `docker-compose.yml` monolítico, sino **3 stacks separados**.

### 6.1.1 Los 3 Stacks Docker
1. **Database Stack (`database/docker-compose.yml`)**: Contiene el motor MariaDB 10.11. Es el primer servicio que debe levantarse porque almacena el estado del sistema.
2. **Backend Stack (`backend/docker-compose.yml`)**: Ejecuta el servidor Django (`manage.py runserver`). Depende de que la base de datos esté lista para aceptar conexiones.
3. **Frontend Stack (`frontend/docker-compose.yml`)**: Ejecuta el servidor de desarrollo de Vite.

**¿Por qué están separados?**
Para aislar dominios de falla y facilitar flujos de CI/CD. Por ejemplo, en un entorno de producción o QA, el stack de base de datos no se utiliza (se apunta a un Amazon RDS gestionado), pero sí se despliegan los contenedores de backend y frontend de forma independiente.

### 6.1.2 La Red Externa: `erp-network`
Para que los contenedores en diferentes stacks puedan comunicarse (ej. el backend contactando al `database`, o el proxy de Vite contactando al `backend`), se define una red compartida tipo bridge llamada `erp-network`.
El script de orquestación (`erp.sh`) se asegura de crear esta red si no existe antes de levantar los contenedores.

### 6.1.3 Healthchecks
* **MariaDB:** Usa `healthcheck.sh --connect --innodb_initialized` configurado en el contenedor para confirmar que el motor está aceptando conexiones reales.
* **Orquestador (`erp.sh`):** Implementa un script que consulta el estado del contenedor `db` mediante `docker inspect` hasta que el estado cambia a `healthy`, previniendo errores de "Connection Refused" en Django.

### 6.1.4 Deuda Técnica Documentada
Anteriormente existía una inconsistencia arquitectónica donde Django intentaba conectarse a PostgreSQL mediante `psycopg2` mientras que Docker definía MariaDB. Esta deuda técnica **ha sido resuelta**, unificando todo el entorno bajo **MariaDB** (`mysqlclient`).

---

## 6.2 Testing y Calidad de Código

ERP-LG implementa una estrategia de testing híbrida: Unit Testing en el backend y End-to-End (E2E) en el frontend.

### 6.2.1 Backend: Pytest y Factory Boy
Se utiliza `pytest` junto a `pytest-django`.

* **Configuración (`pytest.ini`):** El parámetro `--reuse-db` está configurado para evitar la costosa recreación del esquema de base de datos en cada ejecución de prueba, acelerando significativamente el ciclo TDD.
* **Factory Boy:** Para no acoplar los tests a datos duros en la base de datos, se utilizan *Factories* (`comercial/factories.py`) que generan instancias de modelos (ej. `OrdenFabricacionFactory`) con datos sintéticos mediante la librería `Faker`.

### 6.2.2 Frontend: Pruebas E2E con Playwright
El flujo crítico del usuario se valida utilizando **Playwright**. Los tests se encuentran en `tests/e2e/`.

* **Aislamiento de tests (`test.describe.serial`):** Dado que un flujo E2E del ERP (crear OF -> hacer pedido -> fabricar -> despachar) requiere pasos secuenciales estables sobre la misma base de datos, se usa el modo serial para evitar colisiones de estado.
* **Asersiones de red (`waitForRequest` / `waitForResponse`):** Las pruebas no solo validan el DOM (botones y textos), sino que interceptan y validan que el navegador efectivamente envió el payload `JSON` o `FormData` correcto a la API.

### 6.2.3 Estado de Cobertura Actual
* **Cubierto:** Happy paths de ABM básicos en Comercial y Compras. Flujo general E2E.
* **Faltante (Pendiente):** Casos borde (ej. intentar despachar una OF sin stock), aserciones de error en UI, tests unitarios exhaustivos para calculos de stock e inventario en Pañol.

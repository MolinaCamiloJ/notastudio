# NotaStudio 🐶

App de escritorio para subir repositorios a GitHub de forma simple: elegís una carpeta, le ponés un nombre y NotaStudio se encarga de crear el repositorio y subir todo el contenido.

---

## 📥 Para usuarios: instalar NotaStudio

No hace falta instalar nada de programación. Solo:

1. Andá a la sección **[Releases](../../releases)** de este repositorio.
2. Descargá el archivo `NotaStudio Setup X.X.X.exe` de la versión más reciente.
3. Ejecutalo e instalá como cualquier programa de Windows.
4. Abrí NotaStudio desde el menú inicio o el acceso directo del escritorio.
5. La primera vez te va a pedir iniciar sesión con GitHub (se abre el navegador y se cierra solo al terminar).

Requisito: tener **Git** instalado en tu PC (https://git-scm.com/downloads), ya que NotaStudio lo usa por detrás para subir los archivos.

---

## 🛠️ Para desarrolladores: correr o modificar el código

### Requisitos
- [Node.js](https://nodejs.org) 18 o superior
- [Git](https://git-scm.com/downloads)

### Instalación

```bash
git clone https://github.com/TU_USUARIO/notastudio.git
cd notastudio
npm install
```

### Configurar tu propia GitHub OAuth App

NotaStudio necesita una OAuth App de GitHub para poder iniciar sesión. Cada quien que corra el código en modo desarrollo debe crear la suya (es gratis):

1. Andá a https://github.com/settings/applications/new
2. Completá:
   - **Application name**: NotaStudio (o el nombre que quieras)
   - **Homepage URL**: `http://127.0.0.1:53219`
   - **Authorization callback URL**: `http://127.0.0.1:53219/callback`
3. Copiá el **Client ID** y generá un **Client Secret**.
4. Creá un archivo `config.json` en la raíz del proyecto (este archivo está en `.gitignore`, nunca se sube):

```json
{
  "githubClientId": "TU_CLIENT_ID",
  "githubClientSecret": "TU_CLIENT_SECRET",
  "oauthCallbackPort": 53219
}
```

### Ejecutar en modo desarrollo

```bash
npm start
```

### Compilar el instalador localmente

```bash
npm install --save-dev electron-builder
npx electron-builder --win
```

El `.exe` queda en `dist/`.

---

## 🤖 Compilación automática (GitHub Actions)

Este repositorio incluye un workflow (`.github/workflows/build.yml`) que compila el instalador automáticamente cada vez que creás un **Release** en GitHub, y lo adjunta como archivo descargable — así los usuarios finales nunca necesitan tocar código.

Para que funcione, quien administre el repositorio debe cargar dos "Secrets" en:
**Settings → Secrets and variables → Actions → New repository secret**

| Nombre del secret | Valor |
|---|---|
| `GH_CLIENT_ID` | El Client ID de tu GitHub OAuth App |
| `GH_CLIENT_SECRET` | El Client Secret de tu GitHub OAuth App |

Estos quedan encriptados por GitHub y solo se usan durante la compilación — nunca aparecen en el código ni en el historial del repositorio.

Una vez cargados los secrets, para publicar una nueva versión:
1. Actualizá la versión en `package.json` (por ejemplo `"version": "1.0.1"`).
2. Subí los cambios y creá un **Release** desde la pestaña "Releases" de GitHub (con un tag como `v1.0.1`).
3. El workflow se dispara solo, compila el `.exe` y lo adjunta al Release en unos minutos.

---

## 🌐 Idiomas disponibles

Inglés (por defecto), Español, Português, العربية, 中文, Русский, 日本語 — seleccionables desde la esquina inferior izquierda de la app.

## 🎨 Diseño

Fondo blanco con paleta marrón pastel, inspirada en el ícono de la app (un pug).

## 📂 Estructura del proyecto

```
notastudio/
├── .github/workflows/build.yml   # Compilación automática del instalador
├── main.js                        # Proceso principal (login, git, IPC)
├── preload.js                     # Puente seguro renderer ⇄ main
├── package.json
├── config.example.json            # Plantilla de configuración (config.json va en .gitignore)
├── assets/
│   └── pug_icon.ico / .png
└── renderer/
    ├── index.html
    ├── styles.css
    ├── renderer.js
    ├── i18n.js
    └── locales/                   # en, es, pt, ar, zh, ru, ja
```

## Licencia

MIT — ver [LICENSE](LICENSE).

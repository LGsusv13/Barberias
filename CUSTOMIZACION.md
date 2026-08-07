# Cómo personalizar esta app para un nuevo cliente

Todo lo que ves en el sitio (nombre, colores, logo, fotos, servicios, barberos) se controla
desde **un solo archivo**: `public/config.js`. No hace falta tocar HTML ni CSS.

---

## 1. Qué puedes cambiar

Abre `public/config.js` con el Bloc de notas o VS Code. Vas a ver estas secciones:

### Identidad del negocio
```js
businessName: "Barbería Elite",       // Nombre que aparece en el título y textos
logoText: "BARBERÍA ELITE",           // Texto del logo en la barra superior
logoImageUrl: "",                     // Si pones una URL de imagen aquí, se usa esa
                                       // imagen como logo en vez del texto
heroImageUrl: "https://...",          // Foto de fondo grande de la portada
faviconUrl: "",                       // Ícono de la pestaña del navegador (opcional)
establishedText: "ESTABLECIDO EN 2024",
heroTitle: "EL ARTE DEL AFEITADO...",
heroDescription: "Un espacio exclusivo...",
```

### Tipografía y estilo visual (NUEVO)
```js
fonts: {
  googleFontsUrl: "https://fonts.googleapis.com/css2?family=Oswald...",
  heading: "'Oswald', sans-serif",   // Fuente de títulos
  body: "'Inter', sans-serif",        // Fuente de texto normal
  headingLetterSpacing: "0.5px",
},
style: {
  borderRadius: "14px",   // "0px" = esquinas rectas (vintage), "14px" = redondeadas (moderno)
  cardShadow: true,        // true = tarjetas con sombra, false = planas
},
```
**Cómo conseguir una combinación de fuentes:** ve a [fonts.google.com](https://fonts.google.com),
elige dos fuentes (una para títulos, otra para texto normal), selecciona los pesos que quieras,
y copia el link que te da en la sección "Use on the web" — pégalo en `googleFontsUrl`.

Ejemplos de combinaciones:
- **Vintage/clásico** (el original): `Cinzel` + `Montserrat`, `borderRadius: "0px"`
- **Moderno/urbano**: `Oswald` + `Inter`, `borderRadius: "14px"`, `cardShadow: true`
- **Elegante/spa**: `Playfair Display` + `Lato`, `borderRadius: "8px"`

### Colores
```js
colors: {
  bgDark: "#0a0a0a",        // Fondo general del sitio
  bgCard: "#141414",        // Fondo de las tarjetas (servicios, barberos, formulario)
  bgInput: "#1c1c1c",       // Fondo de los campos del formulario
  goldPrimary: "#c5a059",   // Color principal (botones, precios, acentos)
  goldHover: "#e5c178",     // Color principal al pasar el mouse/tocar
  textMain: "#f5f5f5",      // Color del texto principal
  textMuted: "#9e9e9e",     // Color del texto secundario/gris
},
```
Cambia estos 7 valores y **todo el sitio se actualiza solo** — botones, bordes, precios, etc.

### Servicios
```js
services: [
  {
    id: "Corte de Cabello",           // Identificador interno (no lo muestres al cliente)
    name: "Corte Clásico & Peinado",  // Nombre visible
    description: "Corte personalizado...",
    price: 20,
    image: "https://...",             // Foto del servicio
  },
  // agrega, quita o edita los que necesites
],
```

### Barberos / empleados
```js
barbers: [
  {
    name: "Carlos Silva",
    role: "Master Barber / Especialista en Cortes Clásicos",
    image: "https://...",             // Foto del barbero
  },
  // agrega, quita o edita los que necesites
],
```

---

## 2. De dónde sacar las imágenes

- **Fotos propias del negocio (recomendado):** sube tus fotos a un servicio gratuito como
  [imgbb.com](https://imgbb.com) o [Cloudinary](https://cloudinary.com), copia el link directo
  de la imagen (debe terminar en `.jpg`, `.png` o similar) y pégalo en `config.js`.
- **Fotos de stock gratuitas:** [unsplash.com](https://unsplash.com) o [pexels.com](https://pexels.com) —
  busca la foto, clic derecho > "Copiar dirección de la imagen", y pégala en `config.js`.
- Usa fotos horizontales y de buena resolución (al menos 800px de ancho) para que no se vean
  pixeladas.

---

## 3. Proceso completo para lanzar un cliente nuevo

1. **Duplica** esta carpeta completa del proyecto (cópiala con otro nombre, ej. `barberia-cliente2`).
2. Abre `public/config.js` en la copia nueva y cambia todo: nombre, colores, logo, servicios,
   barberos, imágenes.
3. Sube esta copia a un repositorio de GitHub **nuevo y separado** (no el mismo del primer cliente).
   Ver la sección 5 más abajo para el proceso exacto.
4. En Render, crea un **nuevo Web Service** apuntando a ese repositorio nuevo (sigue los mismos
   pasos del `README.md` principal: variables de entorno, Secret File de Google, etc., pero con
   los datos de este cliente).
5. Cada cliente queda como un sitio y una base de datos totalmente independientes.

---

## 5. Cómo subir el proyecto de un cliente nuevo a GitHub (paso a paso)

1. **Crea el repositorio vacío:** entra a [github.com/new](https://github.com/new), ponle un
   nombre (ej. `barberia-cliente2`), y **NO marques** las casillas de README/.gitignore/license.
   Dale "Create repository".

2. **Quita la conexión vieja de Git** (si duplicaste la carpeta de otro cliente, trae una
   conexión antigua). En PowerShell, dentro de la carpeta nueva:
   ```
   rmdir /s /q .git
   ```

3. **Inicializa Git de nuevo:**
   ```
   git init
   git add .
   git commit -m "Primera version - Cliente nuevo"
   git branch -M deploy
   ```

4. **Conecta y sube** (reemplaza la URL por la de tu repositorio nuevo, la encuentras en la
   página de GitHub bajo "Quick setup"):
   ```
   git remote add origin https://github.com/tu-usuario/nombre-del-repo.git
   git push -u origin deploy
   ```

5. Verifica en GitHub que todos los archivos se hayan subido correctamente.

Desde ese momento, para subir cambios futuros de ese cliente usas los mismos comandos de
siempre (`git add .`, `git commit -m "..."`, `git push origin deploy`).

---

## 4. Después de editar config.js

Como siempre, para que el cambio se vea en internet:
```
git add .
git commit -m "Actualizar configuracion del cliente"
git push origin deploy
```
(recuerda usar `origin deploy` al final, no solo `git push`, para asegurar que suba a la rama
correcta que usa Render).

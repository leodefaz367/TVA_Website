# Team Vivas Academy — guía para empezar

Esta copia contiene el código fuente de la primera versión visual. No incluye `node_modules`, porque esas dependencias se regeneran en cada computadora con `npm install`.

## 1. Programas necesarios

Instala en este orden:

1. Visual Studio Code.
2. Node.js 24 LTS para Windows x64.
3. Git para Windows.

Después reinicia Windows o cierra y vuelve a abrir VS Code.

## 2. Abrir el proyecto

1. Descomprime el ZIP en una carpeta normal, por ejemplo `Documentos/Proyectos/Team-Vivas-Academy`.
2. Abre VS Code.
3. Ve a **Archivo > Abrir carpeta** y selecciona `team-vivas-academy`.
4. Abre la terminal integrada con **Terminal > Nueva terminal**.

## 3. Verificar el entorno

Ejecuta cada comando por separado:

```powershell
node -v
npm -v
git --version
```

Node debe mostrar una versión 24.x o, como mínimo, 22.13.

## 4. Instalar y ejecutar

En la terminal, dentro de la carpeta del proyecto:

```powershell
npm install
npm run dev
```

La terminal mostrará una dirección local. Habitualmente será `http://localhost:5173`. Ábrela en el navegador. Para detener el servidor presiona `Ctrl + C`.

## 5. Archivos que vamos a estudiar

- `app/page.tsx`: contenido y estructura de la página en React/JSX.
- `app/globals.css`: colores, tamaños, distribución y adaptación a celular.
- `app/layout.tsx`: idioma, título y descripción usados por el navegador.
- `public/assets/`: logo y fotografías que aparecen en la web.
- `package.json`: dependencias y comandos del proyecto.

## 6. Cómo se construyó la primera versión

1. Se convirtió la información de TVA en secciones: portada, academia, profesor, instruccionales, tienda y contacto.
2. En `page.tsx` se escribió la estructura con componentes HTML dentro de JSX.
3. Los productos repetidos se guardaron en el arreglo `products` y se renderizan con `products.map(...)`.
4. En `globals.css` se definió el sistema visual negro, blanco y rojo.
5. Las reglas `@media` reorganizan la página para tablet y celular.
6. Las fotos se guardaron en `public/assets` y se usan mediante rutas como `/assets/logo-tva.png`.

## 7. Método de aprendizaje desde ahora

Cada módulo se trabajará así:

1. Definimos qué debe hacer.
2. Revisamos el concepto necesario.
3. Tú escribes una primera versión corta.
4. Ejecutas y pruebas.
5. Revisamos el resultado y corregimos errores.
6. Guardamos el avance con Git.

El siguiente ejercicio será reconocer la estructura de `page.tsx` y modificar de forma controlada el texto de la portada.

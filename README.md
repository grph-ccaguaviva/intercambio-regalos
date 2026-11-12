# Intercambio de Regalos

Comunidad Cristiana Agua Viva · Red Asencios · Grupo Conexión Guzmán.

Web estática, pensada para celular, para organizar el intercambio de regalos después del sorteo. Hay dos intercambios separados: **mayores** e **hijos**.

## Privacidad

- Cada participante entra con un **link secreto** que contiene un código aleatorio de 24 caracteres (`.../?k=...`). No hay lista pública de nombres, así que nadie puede hacerse pasar por otro.
- La información de **a quién le regala cada uno** está en la base de datos y solo se puede leer con ese link. Nadie puede listar las asignaciones, salvo el organizador.
- El organizador entra con un PIN que Firebase valida en el servidor. El PIN no está en el código público.
- Riesgo que queda: si alguien reenvía su link, quien lo reciba puede entrar. En ese caso, en el panel se usa **"Nuevo link"** y el link anterior deja de funcionar.

## Flujo

**Participante** (con su link):

1. Indica a quién le tocó. Solo aparecen personas de su mismo intercambio que nadie ha elegido aún.
2. Escribe 3 opciones de regalo (mínimo S/ 40), con dónde comprarlo y detalles.
3. Ve la lista de deseos de su amigo secreto, que se actualiza sola.

Los niños tienen su propio link, que reciben los papás. Ellos indican a quién le tocó al niño y llenan su lista.

**Organizador** (`admin.html`, PIN):

- Carga la lista inicial con un clic. Está definida en `js/config.js` (`participantesIniciales`).
- **Regalos que da**: cuántas personas le tocan a cada uno. Gian tiene 2. Si alguien no regala, se le pone 0.
- **Le regala a**: se asigna a quienes no estuvieron en el sorteo.
- **WhatsApp**: envía a cada uno su link con un mensaje listo. En el caso de los niños, el mensaje va dirigido a los papás.
- **Abrir / llenar**: llenas la página de alguien en su nombre.
- **Pendientes**: muestra quién falta indicar a quién regala y a quién nadie eligió todavía.

## Configuración de Firebase (gratis, una sola vez)

1. Crea un proyecto en https://console.firebase.google.com. Analytics no es necesario.
2. **Firestore Database > Crear base de datos**, en modo producción y en la región `southamerica-east1`.
3. **Authentication > Comenzar > Correo electrónico/contraseña > Habilitar**.
4. **Authentication > Users > Agregar usuario** con:
   - Correo: `organizador@intercambio-regalos.app` (debe coincidir con `correoAdmin` en `js/config.js`).
   - Contraseña: el PIN que usarás en el panel (mínimo 6 dígitos). No lo escribas en ningún archivo del repositorio.
5. Copia el **User UID** de ese usuario.
6. **Firestore > Reglas**: pega `firestore.rules`, reemplaza `UID_DEL_ORGANIZADOR` por el UID y publica. Las escrituras se cierran solas el 31/01/2027.
7. **Configuración del proyecto > Tus apps > Web (`</>`)**: registra la app y copia `firebaseConfig` en `js/config.js`.

Mientras `apiKey` empiece con `TU_`, el sistema funciona en **modo demo**. En ese modo los datos se guardan solo en ese navegador y el PIN es `demo`.

> La `apiKey` web de Firebase no es secreta. Lo que protege los datos son las reglas.

Para cambiar el PIN: en Firebase, Authentication > Users > restablecer la contraseña de ese usuario.

## Probar en local

```bash
npx serve .
```

Abre http://localhost:3000/admin.html.

## Publicar en GitHub Pages

1. Crea un repositorio y sube estos archivos a la rama `main`.
2. **Settings > Pages > Deploy from a branch**, con rama `main` y carpeta `/ (root)`.
3. La web queda en `https://<usuario>.github.io/<repositorio>/` y el panel en `.../admin.html`.
4. Genera y envía los links desde el panel **después** de publicar, para que apunten a la dirección de GitHub y no a `localhost`.

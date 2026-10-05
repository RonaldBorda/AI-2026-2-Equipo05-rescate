# Simulador de Rescate IA - Equipo [##]

**Problema y quién lo sufre.** En zonas de desastre tras un sismo, los equipos de primera respuesta y los drones de exploración sufren la pérdida de tiempo crítico y el agotamiento de recursos (batería) debido a la falta de planificación de rutas óptimas ante entornos colapsados e impredecibles.

**Modo base.** El dron actúa de forma reactiva y a ciegas: intenta avanzar en línea recta hacia el objetivo y, al chocar con un escombro, elige un desvío inmediato de forma aleatoria, lo que agota su batería rápidamente sin garantía de éxito.

**Técnicas comparadas.** 
* Parte 1: Búsqueda en Anchura (BFS) y Búsqueda A* (A-Star)[cite: 10].

| Técnica | Nodos Expandidos | Batería Restante | Rescatados (Métrica) | Tiempo/Corridas |
| :--- | :--- | :--- | :--- | :--- |
| Base | 50 | 0% | 0 | 15.06s / 1 simulación |
| BFS | 144 | 36% | 4 | 9.64s / 1 simulación |
| A* (A-Star) | 60 | 36% | 4 | 9.64s / 1 simulación |

**Cómo ejecutarlo.** 
* **Enlace público:** https://fronterarescate.netlify.app/
* **Local:** Clonar el repositorio. Dado que se utilizan texturas locales en Three.js, es necesario abrir el archivo `index.html` utilizando un servidor local (por ejemplo, la extensión "Live Server" en Visual Studio Code) para evitar errores de CORS.

**Uso de IA.** 
Se empleó IA generativa (Gemini) para establecer la estructura del entorno 3D con Three.js, la interfaz gráfica con estilo *Glassmorphism* (HTML/CSS) y la estructura base de los algoritmos de grafos. Se modificó sustancialmente la lógica del Raycaster para que interactúe exclusivamente con el mapa (evitando interferencias con la UI) y se reescribió el motor de movimiento dinámico en JavaScript para que los algoritmos calculen rutas esquivando obstáculos de la cuadrícula en lugar de reiniciar la posición.

**Roles.** 
* Ronald Borda Bernaola (Líder): Integración del motor 3D, corrección de los algoritmos BFS y A*, e implementación de las físicas del dron. [Enlace a commits]
* [Nombre Integrante 2]: [Qué hizo]. [Enlace a commits]
* [Nombre Integrante 3]: [Qué hizo]. [Enlace a commits]


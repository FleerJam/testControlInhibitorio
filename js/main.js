// main.js
// Importa las funciones principales de Firebase desde las CDN
// Asegúrate de que las URLs y versiones sean las correctas y estén actualizadas.
// Usamos la misma versión (11.8.0) que mencionaste.
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.0/firebase-app.js";

// Importa la configuración de Firebase desde tu archivo local
import { firebaseConfig } from './firebase-config.js';

// Si habilitaste Analytics en tu proyecto, añade el SDK de Firebase para Google Analytics
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.8.0/firebase-analytics.js";

// Añade los productos de Firebase que quieras usar
import { getAuth } from "https://www.gstatic.com/firebasejs/11.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.8.0/firebase-firestore.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/11.8.0/firebase-database.js"; // Para Realtime Database

// Inicializa Firebase
const app = initializeApp(firebaseConfig);

// Obtén las instancias de los servicios que vas a usar
const realtimeDb = getDatabase(app); // Si usas Realtime Database

// Hace que 'realtimeDb' (la instancia de Realtime Database) sea global o accesible para tu código jsPsych
// Esto es útil si jsPsych o algún otro script antiguo espera encontrarlo en el objeto 'window'.
window.firebaseDb = realtimeDb;

console.log("Firebase inicializado y Realtime Database disponible en window.firebaseDb");

// --- Global Variable for participantId and groupId ---
let participantId = null; // Se asignará después de obtener el group_id
let groupId = null; // Se obtendrá del parámetro de la URL

// --- Utility Functions ---
// Esta función ahora será para generar la parte única del ID
function generateFirebasePushId() {
    const participantsRef = ref(realtimeDb, 'participants_temp'); // Usa una referencia temporal para generar el ID
    const newParticipantRef = push(participantsRef); // Genera un nuevo push ID
    return newParticipantRef.key; // Retorna solo la clave generada
}

// Function to show a specific section and hide others
function showSection(sectionToShow) {
    const sections = { // Define sections here to make them accessible
        consent: document.getElementById("consent-section"),
        demographics: document.getElementById("demographics-section"),
        jspsychDisplay: document.getElementById("experiment-section"),
        completionMessage: document.getElementById("completion-message"),
    };

    Object.values(sections).forEach((section) => {
        if (section) {
            section.style.display = "none";
        }
    });
    if (sectionToShow) {
        sectionToShow.style.display = "block";
    }
}

// Función para obtener parámetros de la URL
function getUrlParameter(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
    var results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

document.addEventListener("DOMContentLoaded", async () => { // Usamos 'async' para el await de la asignación del ID
    // Obtener el ID del grupo de la URL
    groupId = getUrlParameter('group');

    if (!groupId) {
        // Manejar el caso donde no se proporciona el grupo (ej. redireccionar, mostrar un mensaje de error)
        alert("Error: No se ha especificado el grupo experimental en la URL. Por favor, usa el link correcto.");
        // Opcional: podrías mostrar una sección de error o redirigir
        showSection(document.getElementById("error-section")); // Asegúrate de tener un div con id="error-section"
        return; // Detener la ejecución si no hay grupo
    }

    // Generar el participantId después de obtener el groupId
    // Formato: GrupoX_FIREBASE_PUSH_ID
    participantId = `${groupId}_${generateFirebasePushId()}`;

    // --- Global Variables (moved participantId declaration outside) ---
    let participantData = {}; // To store socio-demographic data

    // References to HTML sections (moved inside DOMContentLoaded as they rely on DOM)
    const sections = {
        consent: document.getElementById("consent-section"),
        demographics: document.getElementById("demographics-section"),
        jspsychDisplay: document.getElementById("experiment-section"),
        completionMessage: document.getElementById("completion-message"),
    };

    // References to buttons and interactive elements from the HTML
    const acceptConsentBtn = document.getElementById("accept-consent");
    const demographicsForm = document.getElementById("demographics-form");
    const musicStudyRadios = document.querySelectorAll(
        'input[name="musicStudy"]'
    );
    const musicGenreGroup = document.getElementById("music-genre-group");

    // --- Section Navigation Handling ---

    // 1. Consent Section
    acceptConsentBtn.addEventListener("click", () => {
        showSection(sections.demographics);
    });

    // 2. Socio-demographic Form Section
    // Conditional display for music genre question
    musicStudyRadios.forEach((radio) => {
        radio.addEventListener("change", () => {
            if (radio.value !== "Nunca") {
                musicGenreGroup.style.display = "block";
                document
                    .getElementById("musicGenre")
                    .setAttribute("required", "required");
            } else {
                musicGenreGroup.style.display = "none";
                document.getElementById("musicGenre").removeAttribute("required");
                document.getElementById("musicGenre").value = ""; // Clear selection
            }
        });
    });

    demographicsForm.addEventListener("submit", async (event) => { // Usamos 'async' para guardar en Firebase
        event.preventDefault(); // Prevent default form submission

        // Collect data from the form based on index.html structure
        participantData = {
            participantId: participantId, // Use the globally declared ID
            groupId: groupId, // Add the group ID to the data
            gender:
                document.querySelector('input[name="gender"]:checked')?.value || null,
            age: document.getElementById("age").value || null,
            semester: document.getElementById("semester").value || null,
            drive:
                document.querySelector('input[name="drive"]:checked')?.value || null,
            sleep:
                document.querySelector('input[name="sleep"]:checked')?.value || null,
            musicStudy:
                document.querySelector('input[name="musicStudy"]:checked')?.value ||
                null,
            musicGenre:
                document.getElementById("musicGenre").value || "No escucha nada", // Default if "Nunca" was selected
            concentration:
                document.querySelector('input[name="concentration"]:checked')?.value ||
                null,
            screenTime:
                document.querySelector('input[name="screenTime"]:checked')?.value ||
                null,
            timestamp: new Date().toISOString(), // Add timestamp
        };

        // --- Guardar datos sociodemográficos en Firebase ---
        try {
            const participantRef = ref(realtimeDb, `participants/${participantId}`);
            await set(participantRef, participantData);
            console.log("Datos sociodemográficos guardados en Firebase:", participantData);
        } catch (error) {
            console.error("Error al guardar datos sociodemográficos en Firebase:", error);
            alert("Hubo un error al guardar tus datos. Por favor, inténtalo de nuevo.");
            return; // Detener el proceso si hay un error al guardar
        }


        console.log("Datos sociodemográficos capturados:", participantData);
        document.getElementById("container").style.display = "none";
        showSection(sections.jspsychDisplay);
        // Asegúrate de que `startJsPsychExperiment` esté definido en algún lugar y acepte `participantData` y `showSection`
        startJsPsychExperiment(participantData, showSection);
    });

    // --- Initial Display ---
    showSection(sections.consent); // Show the consent section first when the page loads

    // --- DEBUGGING CODE (Comment out or remove for production) ---
    // This part bypasses the consent and demographic sections for quick testing.
    /*
    document.getElementById("container").style.display = "none";
    participantData = {
        participantId: 'DEBUG_' + participantId, // Use the global participantId for debug as well
        groupId: groupId, // Also include group ID in debug data
        gender: 'Hombre',
        age: '22',
        semester: '4',
        drive: 'Si',
        sleep: '7 a 8',
        musicStudy: 'A veces',
        musicGenre: 'Rock',
        concentration: 'Moderadamente',
        screenTime: '4 a 6',
        juegaVideojuegos: 'Sí', // Ensure this field exists in your HTML if used
        timestamp: new Date().toISOString()
    };
    showSection(sections.jspsychDisplay);
    startJsPsychExperiment(participantData, showSection);
    */
});
// main.js

// Importa las funciones principales de Firebase desde las CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.0/firebase-app.js";

// Importa la configuración de Firebase desde tu archivo local
import { firebaseConfig } from "./firebase-config.js";

import {
  getDatabase,
  ref,
  push,
  set,
  get, // ¡Añadimos 'get' para leer datos!
} from "https://www.gstatic.com/firebasejs/11.8.0/firebase-database.js"; // Para Realtime Database

// Inicializa Firebase
const app = initializeApp(firebaseConfig);

// Obtén las instancias de los servicios que vas a usar
const realtimeDb = getDatabase(app); // Si usas Realtime Database

// Hace que 'realtimeDb' (la instancia de Realtime Database) sea global o accesible para tu código jsPsych
window.firebaseDb = realtimeDb;

console.log(
  "Firebase inicializado y Realtime Database disponible en window.firebaseDb"
);

// --- Global Variable for participantId and groupId ---
let participantId = null; // Se asignará y gestionará de forma persistente
let groupId = null; // Se obtendrá del parámetro de la URL
const SESSION_ID_KEY = 'experiment_session_id'; // Clave para localStorage

// --- Utility Functions ---
function generateFirebasePushId() {
  const participantsRef = ref(realtimeDb, "temp_id_generator"); 
  const newParticipantRef = push(participantsRef); 
  return newParticipantRef.key;
}

function showSection(sectionToShow) {
  const sections = {
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

async function saveToFirebaseRobustly(path, data, retries = 3, delay = 1000) {
  const dataRef = ref(realtimeDb, path);

  for (let i = 0; i <= retries; i++) {
    try {
      await set(dataRef, data);
      console.log(`Datos guardados con éxito en ${path} (intento ${i + 1})`);
      return;
    } catch (error) {
      console.error(`Error al guardar en ${path} (intento ${i + 1}/${retries + 1}):`, error);
      if (i < retries) {
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error(`Fallo definitivo al guardar datos en ${path} después de múltiples reintentos.`);
        alert(`¡Ups! Hubo un problema al guardar tus datos importantes. Por favor, asegúrate de tener conexión a Internet. Si el problema persiste, contacta al investigador.`);
        throw new Error("Fallo al guardar en Firebase después de reintentos.");
      }
    }
  }
}


document.addEventListener("DOMContentLoaded", async () => {
  const allowedGroups = [
    "Piloto",
  ]; // Agrega aquí los grupos válidos
  const validCode = "b!%21%26HEt9i3%2359dvEJJ%5E3P"; // Asegúrate de que este sea el código URL-encoded
  const experimentContent = document.getElementById("container");
  const deniedMessage = document.getElementById("access-denied-message");

  const urlParams = new URLSearchParams(window.location.search);
  groupId = urlParams.get("group");
  const codeParam = urlParams.get("code");

  if (codeParam === validCode && groupId && allowedGroups.includes(groupId)) {
    if (experimentContent) {
      experimentContent.style.display = "block";
    }
    if (deniedMessage) {
      deniedMessage.style.display = "none";
    }
    console.log("Acceso concedido. Iniciando configuración del experimento...");

    // --- SOLUCIÓN: Declara participantData aquí, en el ámbito superior de DOMContentLoaded ---
    let participantData = {}; // Inicializa como un objeto vacío para evitar ReferenceError

    // --- Gestionar participantId de forma persistente ---
    let storedParticipantId = localStorage.getItem(SESSION_ID_KEY);
    let participantDataFromDb = null; // Para almacenar los datos existentes del participante

    if (storedParticipantId) {
      participantId = storedParticipantId;
      console.log("Sesión reanudada con ID de participante:", participantId);
      
      // Intentar cargar datos existentes del participante desde Firebase
      try {
        const participantRef = ref(realtimeDb, `participants/${groupId}/${participantId}`);
        const snapshot = await get(participantRef);
        if (snapshot.exists()) {
          participantDataFromDb = snapshot.val();
          console.log("Datos de participante cargados desde Firebase:", participantDataFromDb);
        } else {
          console.log("No se encontraron datos existentes para el ID de participante en Firebase.");
          // Si el ID existe en localStorage pero no en DB (quizás borrado manual), generar uno nuevo.
          const newPushId = generateFirebasePushId();
          participantId = `${groupId}${newPushId}`;
          localStorage.setItem(SESSION_ID_KEY, participantId);
          console.log("Generado nuevo ID de participante:", participantId);
        }
      } catch (error) {
        console.error("Error al cargar datos del participante desde Firebase:", error);
        // En caso de error de carga, forzar un nuevo ID para evitar problemas.
        const newPushId = generateFirebasePushId();
        participantId = `${groupId}${newPushId}`;
        localStorage.setItem(SESSION_ID_KEY, participantId);
        console.log("Error al cargar datos, generado nuevo ID de participante:", participantId);
      }
    } else {
      // Si no hay ID en localStorage, generar uno nuevo y guardarlo
      const newPushId = generateFirebasePushId();
      participantId = `${groupId}${newPushId}`;
      localStorage.setItem(SESSION_ID_KEY, participantId);
      console.log("Nueva sesión iniciada con ID de participante:", participantId);
    }
    
    // --- Determine initial section based on loaded data or lack thereof ---
    const sections = { // Re-definir sections aquí para que estén en scope
        consent: document.getElementById("consent-section"),
        demographics: document.getElementById("demographics-section"),
        jspsychDisplay: document.getElementById("experiment-section"),
        completionMessage: document.getElementById("completion-message"),
    };

    let initialProgressStage = 'start'; // Default stage

    if (participantDataFromDb && participantDataFromDb.experiment_results && participantDataFromDb.experiment_results.completion_timestamp) {
        // If experiment is already completed, show completion message
        showSection(sections.completionMessage);
        console.log("Experimento ya completado para este participante.");
        return; // Exit main.js execution
    } else if (participantDataFromDb && participantDataFromDb.current_stage) {
        // If demographics are already saved, load participantData and determine current_stage
             // Start from demographics_completed if stage not explicitly saved
        participantData = participantDataFromDb; // Use data from DB
        initialProgressStage =participantDataFromDb.current_stage;
        showSection(sections.jspsychDisplay); // Show experiment section
        console.log("Reanudando experimento desde la etapa:", initialProgressStage);
        startJsPsychExperiment(participantData, showSection, saveToFirebaseRobustly, initialProgressStage, showSection );
    } else {
        // No demographics or completion found, start from consent/demographics
        showSection(sections.consent); // Show the consent section first
        console.log("Iniciando experimento desde la etapa de consentimiento.");
        // Ensure participantData starts with at least participantId and groupId for demographics saving
        participantData = { participantId: participantId, groupId: groupId }; // Initial minimal participantData
    }

    // --- Section Navigation Handling for Consent/Demographics ---
    const acceptConsentBtn = document.getElementById("accept-consent");
    const demographicsForm = document.getElementById("demographics-form");
    const musicStudyRadios = document.querySelectorAll('input[name="musicStudy"]');
    const musicGenreGroup = document.getElementById("music-genre-group");

    // This part should only run if consent/demographics are not yet completed
    if (!participantDataFromDb || !participantDataFromDb.demographics) {
        acceptConsentBtn.addEventListener("click", () => {
            showSection(sections.demographics);
        });

        musicStudyRadios.forEach((radio) => {
            radio.addEventListener("change", () => {
                if (radio.value !== "Nunca") {
                    musicGenreGroup.style.display = "block";
                    document.getElementById("musicGenre").setAttribute("required", "required");
                } else {
                    musicGenreGroup.style.display = "none";
                    document.getElementById("musicGenre").removeAttribute("required");
                    document.getElementById("musicGenre").value = "";
                }
            });
        });

        demographicsForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const currentDemographicsData = {
                groupId: groupId,
                gender: document.querySelector('input[name="gender"]:checked')?.value || null,
                age: document.getElementById("age").value || null,
                semester: document.getElementById("semester").value || null,
                carrera: document.getElementById("carrera").value || null,
                drive: document.querySelector('input[name="drive"]:checked')?.value || null,
                sleep: document.querySelector('input[name="sleep"]:checked')?.value || null,
                musicStudy: document.querySelector('input[name="musicStudy"]:checked')?.value || null,
                musicGenre: document.getElementById("musicGenre").value || "No escucha nada",
                concentration: document.querySelector('input[name="concentration"]:checked')?.value || null,
                screenTime: document.querySelector('input[name="screenTime"]:checked')?.value || null,
                timestamp: new Date().toISOString(),
            };

            try {
                // Update participantData to include demographics for passing to jsPsych
                participantData.demographics = currentDemographicsData;
                participantData.participantId = participantId; // Ensure participantId is present for rule
                participantData.groupId = groupId; // Ensure groupId is present

                // Save demographics and initial stage in Firebase
                await saveToFirebaseRobustly(`participants/${groupId}/${participantId}`, {
                    participantId: participantId, // For rules
                    demographics: currentDemographicsData,
                    current_stage: 'demographics_completed',
                    groupId: groupId // Set initial stage
                });
                console.log("Datos sociodemográficos guardados en Firebase:", currentDemographicsData);
                
                showSection(sections.jspsychDisplay);
                startJsPsychExperiment(participantData, showSection, saveToFirebaseRobustly, 'demographics_completed', showSection );

            } catch (error) {
                return;
            }
        });
    }

    // --- DEBUGGING CODE (Comment out or remove for production) ---
    /*
    document.getElementById("container").style.display = "none";
    const debugParticipantId = `${groupId}_DEBUG_${generateFirebasePushId()}`;
    localStorage.setItem(SESSION_ID_KEY, debugParticipantId);
    participantId = debugParticipantId;
    
    const debugDemographicsData = {
        participantId: participantId,
        groupId: groupId,
        gender: 'Hombre', age: '22', semester: '4', drive: 'Si', sleep: '7 a 8',
        musicStudy: 'A veces', musicGenre: 'Rock', concentration: 'Moderadamente',
        screenTime: '4 a 6', juegaVideojuegos: 'Sí', timestamp: new Date().toISOString()
    };
    participantData = { 
        participantId: participantId, 
        groupId: groupId, // Asegurarse de que groupId esté en participantData
        demographics: debugDemographicsData 
    }; 
    
    // Simular un estado de progreso para depuración
    // let debugInitialStage = 'demographics_completed'; // Comienza después de demográficos
    // let debugInitialStage = 'simon_completed'; // Comienza después de Simon
    let debugInitialStage = 'stroop_completed'; // Comienza después de Stroop

    await saveToFirebaseRobustly(`participants/${participantId}`, {
        participantId: participantId,
        demographics: debugDemographicsData,
        current_stage: debugInitialStage // Simula el progreso guardado
    });

    showSection(sections.jspsychDisplay);
    startJsPsychExperiment(participantData, showSection, saveToFirebaseRobustly, debugInitialStage);
    */

  } else {
    if (experimentContent) {
      experimentContent.style.display = "none";
    }
    if (deniedMessage) {
      deniedMessage.style.display = "block";
    }
    console.warn("Acceso denegado: Código de URL incorrecto o ausente o groupId faltante.");
  }
});
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.0/firebase-app.js";
import { firebaseConfig } from "./firebase-config.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.8.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  get,
} from "https://www.gstatic.com/firebasejs/11.8.0/firebase-database.js";

// --- Firebase Initialization ---
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth();

window.firebaseDb = db;
console.log(
  "Firebase inicializado y Realtime Database disponible en window.firebaseDb"
);

// 🔐 Admin UID (ensure this UID is correct for your admin account)
const ADMIN_UID = "GY7cuY08o9NUTQIm7V9CtcRlpXA3"; // !!! VERIFY THIS UID !!!

// --- Global Data Cache ---
// Esta variable almacenará los datos de los participantes una vez cargados
let allParticipantsDataCache = null;

// --- DOM Elements ---
const loadStatisticsButton = document.getElementById("loadStadistics-button");
const loginForm = document.getElementById("login-form");
const dataDisplayDiv = document.getElementById("data-display");
const errorMessageSpan = document.getElementById("error-message");
const loginSection = document.getElementById("login-section");
const adminSection = document.getElementById("admin-section");
const downloadButton = document.getElementById("download-button");
const logoutButton = document.getElementById("logout-button");
const downloadStatsButton = document.getElementById("downloadStats-button");
const refreshDataButton = document.getElementById("refresh-data-button");

// --- Authentication State Listener ---
onAuthStateChanged(auth, (user) => {
  if (user) {
    if (user.uid === ADMIN_UID) {
      console.log("Admin logged in.");
      showAdminUI(true);
      // Cargar los datos una sola vez al inicio de sesión
      loadAndDisplayData();
    } else {
      console.log("Non-admin user logged in, signing out.");
      signOut(auth);
      showAdminUI(false);
    }
  } else {
    console.log("No one logged in.");
    showAdminUI(false);
    if (dataDisplayDiv) {
      dataDisplayDiv.innerHTML = "";
    }
    // Limpiar el caché en memoria al cerrar sesión
    allParticipantsDataCache = null;
  }
});

/**
 * Toggles the visibility of admin and login sections.
 * @param {boolean} isAdminLoggedIn - True if admin is logged in, false otherwise.
 */
function showAdminUI(isAdminLoggedIn) {
  if (loginSection)
    loginSection.style.display = isAdminLoggedIn ? "none" : "block";
  if (adminSection)
    adminSection.style.display = isAdminLoggedIn ? "block" : "none";
  if (logoutButton)
    logoutButton.style.display = isAdminLoggedIn ? "block" : "none";
  if (downloadButton)
    downloadButton.style.display = isAdminLoggedIn ? "block" : "none";
  if (loadStatisticsButton)
    loadStatisticsButton.style.display = isAdminLoggedIn ? "block" : "none";
  if (downloadStatsButton)
    downloadStatsButton.style.display = isAdminLoggedIn ? "block" : "none";
  if (refreshDataButton)
    refreshDataButton.style.display = isAdminLoggedIn ? "block" : "none";
}

// --- Data Loading and Display ---

/**
 * Loads data from a local JSON file or from localStorage.
 * This function is now internal and only called by loadAndDisplayData when needed.
 * @param {string} path - The path to the JSON file.
 * @returns {Promise<Object|null>} The parsed JSON data or null if an error occurs.
 */
async function _loadDataFromSource(path) {
  try {
    console.log(`Cargando datos desde la fuente: ${path}...`);
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Convertir a string para evaluar el tamaño
    const jsonString = JSON.stringify(data);

    console.log("Datos cargados desde la fuente.");
    return data;
  } catch (error) {
    console.error(`Error loading local data from ${path}:`, error);
    return null;
  }
}

/**
 * Loads all experiment data from Firebase Realtime Database.
 * This function is now internal and only called by loadAndDisplayData when needed.
 * @param {string} path - The Firebase database path.
 * @param {number} [retries=3] - Number of retry attempts.
 * @param {number} [delay=1000] - Delay between retries in milliseconds.
 * @returns {Promise<Object|null>} The data from Firebase or null if not found/error.
 */

async function _loadDataFromFirebaseSource(path, retries = 3, delay = 1000) {
  const dataRef = ref(db, path);
  console.log("Attempting to get data from path:", path);

  for (let i = 0; i <= retries; i++) {
    try {
      const snapshot = await get(dataRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        console.log(
          `Data loaded successfully from ${path} (attempt ${i + 1}).`
        );
        return data;
      } else {
        console.log(`No data found at ${path} (attempt ${i + 1})`);
        return null;
      }
    } catch (error) {
      console.error(
        `Error loading from ${path} (attempt ${i + 1}/${retries + 1}):`,
        error
      );
      if (i < retries) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        console.error(
          `Failed to load data from ${path} after multiple retries.`
        );
        throw new Error(
          "Fallo al cargar desde Firebase después de reintentos."
        );
      }
    }
  }
}

/**
 * Orchestrates loading and displaying data, using the in-memory cache.
 * This function is called once on admin login, or when refreshing.
 * @param {boolean} forceReload - If true, forces data reload from the original source (Firebase or JSON file).
 */

async function loadAndDisplayData(forceReload = false) {
  if (!forceReload && allParticipantsDataCache) {
    console.log("Datos ya en memoria (cache). No se necesita recargar.");
    if (dataDisplayDiv) {
      dataDisplayDiv.innerHTML = "";
    }
    displaySummaryStatistics(allParticipantsDataCache);
    const detailedStats = calculateDetailedStatistics(allParticipantsDataCache);
    displayDetailedStatistics(detailedStats);
    return;
  }

  if (dataDisplayDiv) {
    dataDisplayDiv.innerHTML = "<p>Cargando datos...</p>";
  }

  // Cargar desde fuente original (ya no se usa localStorage)
  let dataFromSource = null;
  try {
    //dataFromSource = await _loadDataFromSource("./data/data.json");
    dataFromSource = await _loadDataFromFirebaseSource("participants");
    if (dataFromSource) {
      allParticipantsDataCache = dataFromSource;
      console.log(
        "Datos cargados desde la fuente original al caché en memoria."
      );
    }
  } catch (error) {
    console.error("Error al cargar datos desde la fuente original:", error);
    if (dataDisplayDiv) {
      dataDisplayDiv.innerHTML = `<p style="color: red;">Error al cargar los datos: ${error.message}</p>`;
    }
    allParticipantsDataCache = null;
    return;
  }

  if (allParticipantsDataCache) {
    console.log(
      "Data for all participants (from source):",
      allParticipantsDataCache
    );
    if (dataDisplayDiv) {
      dataDisplayDiv.innerHTML = "";
    }
    displaySummaryStatistics(allParticipantsDataCache);
    const detailedStats = calculateDetailedStatistics(allParticipantsDataCache);
    displayDetailedStatistics(detailedStats);
  } else {
    if (dataDisplayDiv) {
      dataDisplayDiv.innerHTML =
        "<p>No se encontraron datos de participantes.</p>";
    }
  }
}

/**
 * Displays summary statistics of participants.
 * @param {object} data - The participant data.
 */
function displaySummaryStatistics(data) {
  if (!dataDisplayDiv) return;

  const numGroups = Object.keys(data).length;
  dataDisplayDiv.innerHTML += `<p><b>Total de grupos:</b> ${
    numGroups - (data.Piloto ? 1 : 0)
  }</p>`;

  for (const groupId in data) {
    if (groupId === "Piloto") continue;

    let totalHombres = 0;
    let totalMujeres = 0;
    const groupParticipants = data[groupId];
    const numParticipantsInGroup = Object.keys(groupParticipants).length;
    const prettyGroupName = capitalizeFirstLetter(separateByUpperCase(groupId));

    dataDisplayDiv.innerHTML += `<p><b>Grupo ${prettyGroupName}:</b> ${numParticipantsInGroup} participantes</p>`;

    for (const participantId in groupParticipants) {
      const participantData = groupParticipants[participantId];
      if (participantData.demographics && participantData.demographics.gender) {
        if (participantData.demographics.gender === "Hombre") {
          totalHombres++;
        } else if (participantData.demographics.gender === "Mujer") {
          totalMujeres++;
        }
      }
    }
    dataDisplayDiv.innerHTML += `<p>Total de Hombres → ${totalHombres}</p>`;
    dataDisplayDiv.innerHTML += `<p>Total de Mujeres → ${totalMujeres}</p>`;
  }
}

// --- Data Transformation and Utility Functions ---

function separateByUpperCase(text) {
  return text.replace(/([A-Z])/g, " $1").trim();
}

function capitalizeFirstLetter(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function mapColorResponse(response) {
  switch (response) {
    case "Digit1":
      return "Amarillo";
    case "Digit2":
      return "Azul";
    case "Digit3":
      return "Rojo";
    default:
      return "No Respondió";
  }
}

function getTableColumns() {
  return [
    "Id",
    "Grupo",
    "Sexo",
    "Edad",
    "Maneja",
    "Concentracion al estudiar",
    "Escucha musica al estudiar",
    "Genero que escucha",
    "Tiempo en pantallas",
    "Semestre",
    "Carrera",
    "Horas de sueño",
    "Prueba",
    "# Ensayo",
    "Fase",
    "Ronda",
    "Condicion",
    "Correcta",
    "Intrusion",
    "RT",
  ];
}

function processTrialData(ensayo, numEnsayo = 0) {
  const rowData = {};
  let tipo = "";
  if (ensayo.test_part === "Stroop") {
    if (ensayo.stimWord === "XXXXX") {
      tipo = "Neutra";
    } else if (
      ensayo.stimWord === ensayo.stimColor ||
      ensayo.stimWord === "Circulo"
    ) {
      tipo = "Congruente";
    } else {
      tipo = "Incongruente";
    }
  } else if (ensayo.test_part === "Go/NoGo") {
    tipo = ensayo.go_nogo_type === "Go" ? "Go" : "NoGo";
  }

  rowData["Prueba"] = ensayo.test_part || "N/A";
  rowData["Fase"] = ensayo.fase || "N/A";
  rowData["Condicion"] = tipo;
  rowData["Ronda"] = ensayo.ronda || 0;
  rowData["# Ensayo"] = numEnsayo;
  rowData["RT"] = ensayo.rt && typeof ensayo.rt === "number" ? ensayo.rt : null;
  rowData["Correcta"] = ensayo.correct;
  rowData["Intrusion"] = false;
  if (
    ensayo.test_part === "Stroop" &&
    ensayo.stimWord !== ensayo.stimColor &&
    ensayo.stimWord !== "XXXXX"
  ) {
    if (ensayo.stimWord === mapColorResponse(ensayo.response)) {
      rowData["Intrusion"] = true;
    }
  }
  return rowData;
}

/**
 * Creates and downloads a CSV file from participant data (now uses allParticipantsDataCache).
 * @param {object} data - The participant data.
 */
function createCSVFromData(data) {
  const columns = getTableColumns();
  let csvContent = columns.map((col) => `"${col}"`).join(";") + "\n";
  let participantCounter = 0; // 🔹 Contador global
  for (const groupId in data) {
    if (groupId === "Piloto") continue;
    for (const participantId in data[groupId]) {
      participantCounter++;
      const participantData = data[groupId][participantId];
      const demographics = participantData.demographics || {};
      const experimentResults = participantData.experiment_results || {};

      const trials = [
        //...(experimentResults.stroop_results?.practica || []),
        //...(experimentResults.stroop_results?.automatizacion || []),
        ...(experimentResults.stroop_results?.prueba || []),
        //...(experimentResults.gonogo_results?.practica || []),
        ...(experimentResults.gonogo_results?.prueba || []),
      ];

      let trialCounter = 0;
      let currentRonda = 0;

      trials.forEach((trial) => {
        if (trial.ronda && trial.ronda !== currentRonda) {
          trialCounter = 0;
          currentRonda = trial.ronda;
        }
        trialCounter++;

        const processedTrial = processTrialData(trial, trialCounter);

        const rowValues = columns.map((col) => {
          let value;
          let valueOfMusicStudy;
          let valueOfConcentracion;
          switch (col) {
            case "Id":
              value = participantCounter;
              break;
            case "Grupo":
              value = capitalizeFirstLetter(separateByUpperCase(groupId));
              break;
            case "Sexo":
              value = demographics.gender || "";
              break;
            case "Edad":
              value = demographics.age || "";
              break;
            case "Maneja":
              value = demographics.drive || "";
              break;
            case "Concentracion al estudiar":
              valueOfConcentracion = demographics.concentration || "";
              if (
                valueOfConcentracion === "Nada" ||
                valueOfConcentracion === "Poco"
              ) {
                value = "Sin Concentracion";
              } else if (valueOfConcentracion === "Moderadamente") {
                value = "Concentracion Moderada";
              } else if (
                valueOfConcentracion === "Mucho" ||
                valueOfConcentracion === "Totalmente"
              ) {
                value = "Concentracion Optima";
              } else {
                value = "Valor No Definido";
              }
              break;
            case "Escucha musica al estudiar":
              valueOfMusicStudy = demographics.musicStudy || "";

              if (
                valueOfMusicStudy === "Nunca" ||
                valueOfMusicStudy === "A veces"
              ) {
                value = "No"; // O "Poca Frecuencia"
              } else if (
                valueOfMusicStudy === "Frecuentemente" ||
                valueOfMusicStudy === "Siempre"
              ) {
                value = "Si"; // O "Mucha Frecuencia"
              } else {
                value = "Valor No Definido"; // Para manejar datos inesperados
              }
              break;
            case "Genero que escucha":
              value = demographics.musicGenre || "";
              break;
            case "Tiempo en pantallas":
              value = demographics.screenTime || "";
              break;
            case "Semestre":
              value = demographics.semester || "";
              break;
            case "Carrera":
              value = demographics.carrera || "";
              break;
            case "Horas de sueño":
              value = demographics.sleep || "";
              break;
            case "Prueba":
              value = processedTrial.Prueba;
              break;
            case "# Ensayo":
              value = processedTrial["# Ensayo"];
              break;
            case "Fase":
              value = trial.fase || "";
              break;
            case "Ronda":
              value = processedTrial.Ronda;
              break;
            case "Condicion":
              value = processedTrial.Condicion;
              break;
            case "Correcta":
              value = processedTrial.Correcta ? 1 : 0;
              break;
            case "Intrusion":
              value = processedTrial.Intrusion ? 1 : 0;
              break;
            case "RT":
              value = processedTrial.RT !== null ? processedTrial.RT : "";
              break;
            default:
              value = trial[col] !== undefined ? trial[col] : "";
              break;
          }

          if (
            typeof value === "string" &&
            (value.includes(";") || value.includes(","))
          ) {
            value = `"${value.replace(/"/g, '""')}"`;
          } else if (value === null || value === undefined) {
            value = "";
          }
          return value;
        });

        csvContent += rowValues.join(";") + "\n";
      });
    }
  }

  const BOM = "\uFEFF"; // BOM para UTF-8
  const blob = new Blob([BOM + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "datos_experimento_RAW.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// --- Statistical Functions ---

function median(arr) {
  if (arr.length === 0) return NaN;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function calculateIQRBounds(values, factor = 1.5) {
  if (values.length < 2)
    return { Q1: NaN, Q3: NaN, IQR: NaN, lowerBound: NaN, upperBound: NaN };
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = percentile(sorted, 25);
  const q3 = percentile(sorted, 75);
  const iqr = q3 - q1;
  const lowerBound = q1 - factor * iqr;
  const upperBound = q3 + factor * iqr;
  return {
    Q1: q1,
    Q3: q3,
    IQR: iqr,
    LimiteInferior: lowerBound,
    LimiteSuperior: upperBound,
  };
}

function percentile(arr, p) {
  if (arr.length === 0) return NaN;
  const index = (p / 100) * (arr.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index % 1;
  if (upper >= arr.length) return arr[lower];
  return arr[lower] * (1 - weight) + arr[upper] * weight;
}

function average(arr) {
  if (arr.length === 0) return NaN;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * Calculates detailed statistics per participant, and pivots them to a single row per participant.
 * @param {object} data - The raw experiment data.
 * @returns {object} An object containing 'stats' (array of participant rows) and 'columns' (array of column names).
 */
function calculateDetailedStatistics(data) {
  const participantsStats = [];
  const allPossibleStatColumns = new Set(); // Para recolectar todos los nombres de columnas dinámicos

  // Define el número de decimales para los resultados
  const numDecimales = 3;

  let participantCounter = 0;
  for (const groupId in data) {
    if (groupId === "Piloto") continue; // Saltar el grupo "Piloto"
    for (const participantId in data[groupId]) {
      participantCounter++;
      const participantData = data[groupId][participantId];
      const experimentResults = participantData.experiment_results || {};
      const demographics = participantData.demographics || {};

      // Objeto para almacenar las estadísticas de este participante
      const participantRow = {
        Id: participantCounter,
        Grupo: capitalizeFirstLetter(separateByUpperCase(groupId)),
        Sexo: demographics.gender || "",
        Edad: demographics.age || "",
        Maneja: demographics.drive || "",
        "Concentracion al estudiar": (() => {
          // <--- Aquí se define y se ejecuta inmediatamente
          let valueOfConcentracion = demographics.concentration || "";
          let value = ""; // Inicializamos la variable 'value'

          if (
            valueOfConcentracion === "Nada" ||
            valueOfConcentracion === "Poco"
          ) {
            value = "Sin Concentracion";
          } else if (valueOfConcentracion === "Moderadamente") {
            value = "Concentracion Moderada";
          } else if (
            valueOfConcentracion === "Mucho" ||
            valueOfConcentracion === "Totalmente"
          ) {
            value = "Concentracion Optima";
          } else {
            value = "Valor No Definido";
          }
          return value; // <--- El resultado de esta función (el valor de 'value') se asigna a "Concentracion al estudiar"
        })(),
        "Escucha musica al estudiar": (() => {
          let valueOfMusicStudy = demographics.musicStudy || "";
          let value = ""; // Inicializamos la variable 'value'

          if (
            valueOfMusicStudy === "Nunca" ||
            valueOfMusicStudy === "A veces"
          ) {
            value = "No"; // O "Poca Frecuencia"
          } else if (
            valueOfMusicStudy === "Frecuentemente" ||
            valueOfMusicStudy === "Siempre"
          ) {
            value = "Si"; // O "Mucha Frecuencia"
          } else {
            value = "Valor No Definido"; // Para manejar datos inesperados
          }
          return value;
        })(), // Asegúrate de retornar el valor
        "Genero que escucha": demographics.musicGenre || "",
        "Tiempo en pantallas": demographics.screenTime || "",
        Semestre: demographics.semester || "",
        Carrera: demographics.carrera || "",
        "Horas de sueño": demographics.sleep || "",
      };

      // --- Procesamiento de Stroop ---
      const stroopTrials = [
        ...(experimentResults.stroop_results?.prueba || []), // Solo 'prueba' según tu ajuste
      ];

      const groupedStroopTrials = {};
      stroopTrials.forEach((trial) => {
        const processed = processTrialData(trial);
        const faseMap = { Prueba: "T", Practica: "P", Automatizacion: "A" };
        const faseKey = `F${faseMap[trial.fase] || "NA"}`; // Usa trial.fase directamente para la fase
        const key = `${processed.Prueba.toUpperCase()}_${processed.Condicion.toUpperCase()}_${faseKey}`;
        if (!groupedStroopTrials[key]) groupedStroopTrials[key] = [];
        groupedStroopTrials[key].push(processed);
      });

      // Ordenar las condiciones de Stroop para consistencia en las columnas
      const ordenCondicionesStroop = ["CONGRUENTE", "NEUTRA", "INCONGRUENTE"];
      const orderedStroopKeys = Object.keys(groupedStroopTrials).sort(
        (a, b) => {
          const condA =
            ordenCondicionesStroop.find((cond) => a.includes(`_${cond}_`)) ||
            "";
          const condB =
            ordenCondicionesStroop.find((cond) => b.includes(`_${cond}_`)) ||
            "";
          return (
            ordenCondicionesStroop.indexOf(condA) -
            ordenCondicionesStroop.indexOf(condB)
          );
        }
      );

      for (const key of orderedStroopKeys) {
        const trialsInGroup = groupedStroopTrials[key];
        if (trialsInGroup.length === 0) continue;

        // RTs para respuestas correctas Stroop (sin filtrado de outliers)
        const rts = trialsInGroup
          .filter((t) => t.Correcta)
          .map((t) => t.RT)
          .filter((rt) => rt !== null && !isNaN(rt));

        const averageRT = average(rts); // Calcula el promedio de todos los RTs, sin normalizar

        const correctResponses = trialsInGroup.filter((t) => t.Correcta).length;
        const totalTrials = trialsInGroup.length;
        const percentCorrect =
          totalTrials > 0 ? (correctResponses / totalTrials) * 100 : 0;

        const intrusions = trialsInGroup.filter((t) => t.Intrusion).length;
        const percentIntrusions =
          totalTrials > 0 ? (intrusions / totalTrials) * 100 : 0;

        // Asignar estadísticas de Stroop al participantRow
        // Se elimina la columna _NUM_OUTLIERS
        participantRow[`${key}_PROMEDIO_RT`] = isNaN(averageRT) // Se cambia el nombre de la columna para reflejar que no hay outliers
          ? "N/A"
          : averageRT.toFixed(numDecimales);
        participantRow[`${key}_NUM_CORRECTAS`] = correctResponses;
        participantRow[`${key}_PORCENTAJE_CORRECTAS`] =
          percentCorrect.toFixed(numDecimales);

        if (key.includes("INCONGRUENTE")) {
          participantRow[`${key}_NUM_INTRUSIONES`] = intrusions;
          participantRow[`${key}_PORCENTAJE_INTRUSIONES`] =
            percentIntrusions.toFixed(numDecimales);
        }
      }

      // --- Procesamiento de Go/NoGo ---
      const gonogoTrials = [
        ...(experimentResults.gonogo_results?.prueba || []), // Solo 'prueba' según tu ajuste
      ];

      const groupedGoNoGoTrials = {};
      gonogoTrials.forEach((trial) => {
        const processed = processTrialData(trial);
        const faseMap = { Prueba: "T", Practica: "P" }; // Ajusta si hay otras fases
        const faseKey = `F${faseMap[trial.fase] || "NA"}`;
        const key = `GNG_${processed.Condicion.toUpperCase()}_${faseKey}`;
        if (!groupedGoNoGoTrials[key]) groupedGoNoGoTrials[key] = [];
        groupedGoNoGoTrials[key].push(processed);
      });

      // Ordenar las condiciones de Go/NoGo para consistencia en las columnas
      const ordenCondicionesGoNoGo = ["GO", "NOGO"]; // Go primero, luego NoGo
      const orderedGoNoGoKeys = Object.keys(groupedGoNoGoTrials).sort(
        (a, b) => {
          const condA =
            ordenCondicionesGoNoGo.find((cond) => a.includes(`_${cond}_`)) ||
            "";
          const condB =
            ordenCondicionesGoNoGo.find((cond) => b.includes(`_${cond}_`)) ||
            "";
          return (
            ordenCondicionesGoNoGo.indexOf(condA) -
            ordenCondicionesGoNoGo.indexOf(condB)
          );
        }
      );

      for (const key of orderedGoNoGoKeys) {
        const trialsInGroup = groupedGoNoGoTrials[key];
        if (trialsInGroup.length === 0) continue;

        // --- Estadísticas Go ---
        if (key.includes("_GO_")) {
          const goCorrectRTs = trialsInGroup
            .filter((t) => t.Correcta) // Solo RTs correctos de Go
            .map((t) => t.RT)
            .filter((rt) => rt !== null && !isNaN(rt));

          const averageGoRT = average(goCorrectRTs); // Calcula el promedio de todos los RTs, sin normalizar
          const numCorrectGo = trialsInGroup.filter((t) => t.Correcta).length;
          const totalGoTrials = trialsInGroup.length;
          const numErrorOmission = totalGoTrials - numCorrectGo; // Correctas eran respuestas, incorrectas son omisiones en Go
          const percErrorOmission =
            totalGoTrials > 0 ? (numErrorOmission / totalGoTrials) * 100 : 0;

          // Se elimina la columna _NUM_OUTLIERS
          participantRow[`${key}_PROMEDIO_RT`] = isNaN(averageGoRT) // Se cambia el nombre de la columna para reflejar que no hay outliers
            ? "N/A"
            : averageGoRT.toFixed(numDecimales);
          participantRow[`${key}_NUM_CORRECTAS`] = numCorrectGo; // Esto es para GO (respuestas correctas)
          participantRow[`${key}_NUM_ERRORES_OMISION`] = numErrorOmission;
          participantRow[`${key}_PORCENTAJE_ERRORES_OMISION`] =
            percErrorOmission.toFixed(numDecimales);
        }

        // --- Estadísticas No-Go ---
        if (key.includes("_NOGO_")) {
          // En NoGo, una respuesta *incorrecta* es un error de comisión
          const numErrorCommission = trialsInGroup.filter(
            (t) => t.Correcta === false
          ).length;
          const totalNoGoTrials = trialsInGroup.length;
          const percErrorCommission =
            totalNoGoTrials > 0
              ? (numErrorCommission / totalNoGoTrials) * 100
              : 0;

          const numCorrectNoGo = trialsInGroup.filter(
            (t) => t.Correcta === true
          ).length; // Correctas en NoGo son las no respuestas

          participantRow[`${key}_NUM_CORRECTAS_NOGO`] = numCorrectNoGo; // Para saber cuántas veces se abstuvo correctamente
          participantRow[`${key}_NUM_ERRORES_COMISION`] = numErrorCommission;
          participantRow[`${key}_PORCENTAJE_ERRORES_COMISION`] =
            percErrorCommission.toFixed(numDecimales); // Usar la precisión consistente
        }
      }

      // Recolectar todas las columnas generadas para este participante
      Object.keys(participantRow).forEach((col) =>
        allPossibleStatColumns.add(col)
      );

      participantsStats.push(participantRow);
    }
  }

  // --- Construcción del Orden Final de Columnas ---
  const staticColumns = [
    "Id",
    "Grupo",
    "Sexo",
    "Edad",
    "Maneja",
    "Concentracion al estudiar",
    "Escucha musica al estudiar",
    "Genero que escucha",
    "Tiempo en pantallas",
    "Semestre",
    "Carrera",
    "Horas de sueño",
  ];

  // Orden para las condiciones de Stroop (y fases si aplica)
  const stroopConditionOrder = ["CONGRUENTE", "NEUTRA", "INCONGRUENTE"];
  const stroopFaseOrder = ["FT", "FA", "FP", "FNA"]; // Orden de fases Stroop
  const stroopStatSuffixOrder = [
    "_PROMEDIO_RT", // Se ha cambiado de _PROMEDIO_RT_OUT
    "_NUM_CORRECTAS",
    "_PORCENTAJE_CORRECTAS",
    "_NUM_INTRUSIONES",
    "_PORCENTAJE_INTRUSIONES",
  ];

  // Orden para las condiciones de Go/NoGo (y fases si aplica)
  const gngConditionOrder = ["GO", "NOGO"];
  const gngFaseOrder = ["FT", "FP", "FNA"]; // Orden de fases Go/NoGo
  const gngStatSuffixOrder = [
    "_PROMEDIO_RT", // Se ha cambiado de _PROMEDIO_RT_OUT
    "_NUM_CORRECTAS", // Para GO (se usará _NUM_CORRECTAS)
    "_NUM_ERRORES_OMISION",
    "_PORCENTAJE_ERRORES_OMISION",
    "_NUM_CORRECTAS_NOGO", // Para NOGO (se usará _NUM_CORRECTAS_NOGO)
    "_NUM_ERRORES_COMISION",
    "_PORCENTAJE_ERRORES_COMISION",
  ];

  // Filtra columnas dinámicas (excluye las estáticas)
  const dynamicColumns = Array.from(allPossibleStatColumns).filter(
    (col) => !staticColumns.includes(col)
  );

  // Helper para obtener el índice de orden de la fase
  const getFaseOrderIndex = (colName, faseOrderArray) => {
    for (let i = 0; i < faseOrderArray.length; i++) {
      if (colName.includes(`_${faseOrderArray[i]}`)) {
        return i;
      }
    }
    return faseOrderArray.length; // Si no se encuentra, ponerlo al final
  };

  // Helper para obtener el índice de orden de la condición
  const getConditionOrderIndex = (colName, conditionOrderArray) => {
    for (let i = 0; i < conditionOrderArray.length; i++) {
      if (colName.includes(`_${conditionOrderArray[i]}_`)) {
        return i;
      }
    }
    return conditionOrderArray.length; // Si no se encuentra, ponerlo al final
  };

  // Helper para obtener el índice de orden del sufijo de estadística
  const getStatSuffixOrderIndex = (colName, statSuffixOrderArray) => {
    for (let i = 0; i < statSuffixOrderArray.length; i++) {
      if (colName.endsWith(statSuffixOrderArray[i])) {
        return i;
      }
    }
    return statSuffixOrderArray.length; // Si no se encuentra, ponerlo al final
  };

  // Ordena columnas dinámicas
  dynamicColumns.sort((a, b) => {
    const isStroopA = a.startsWith("STROOP_");
    const isStroopB = b.startsWith("STROOP_");
    const isGngA = a.startsWith("GNG_");
    const isGngB = b.startsWith("GNG_");

    // 1. Ordenar por tipo de prueba (STROOP primero, luego GNG)
    if (isStroopA && !isStroopB) return -1;
    if (!isStroopA && isStroopB) return 1;

    // Si ambos son Stroop o ambos son Go/NoGo, proceder con el orden interno
    let orderArrays;
    if (isStroopA && isStroopB) {
      orderArrays = {
        fase: stroopFaseOrder,
        condition: stroopConditionOrder,
        suffix: stroopStatSuffixOrder,
      };
    } else if (isGngA && isGngB) {
      orderArrays = {
        fase: gngFaseOrder,
        condition: gngConditionOrder,
        suffix: gngStatSuffixOrder,
      };
    } else {
      // Esto debería ser raro si el primer chequeo funciona, pero es un fallback
      return 0;
    }

    // 2. Ordenar por fase (ej. PRUEBA antes que PRACTICA)
    const faseIndexA = getFaseOrderIndex(a, orderArrays.fase);
    const faseIndexB = getFaseOrderIndex(b, orderArrays.fase);
    if (faseIndexA !== faseIndexB) return faseIndexA - faseIndexB;

    // 3. Ordenar por condición (ej. CONGRUENTE, NEUTRA, INCONGRUENTE para Stroop; GO, NOGO para GNG)
    const condIndexA = getConditionOrderIndex(a, orderArrays.condition);
    const condIndexB = getConditionOrderIndex(b, orderArrays.condition);
    if (condIndexA !== condIndexB) return condIndexA - condIndexB;

    // 4. Ordenar por tipo de estadística (ej. PROMEDIO_RT_OUT antes de NUM_CORRECTAS)
    const suffixIndexA = getStatSuffixOrderIndex(a, orderArrays.suffix);
    const suffixIndexB = getStatSuffixOrderIndex(b, orderArrays.suffix);
    return suffixIndexA - suffixIndexB;
  });

  const fixedOrderColumns = staticColumns.concat(dynamicColumns);
  console.log("Columnas detectadas y ordenadas:", fixedOrderColumns);

  // Asegurar que todas las filas tengan todas las columnas, llenando con '' si falta alguna
  // Esto es crucial para la consistencia del CSV y la tabla
  const finalStats = participantsStats.map((row) => {
    const newRow = {};
    fixedOrderColumns.forEach((colName) => {
      newRow[colName] = row[colName] !== undefined ? row[colName] : "";
    });
    return newRow;
  });

  return {
    stats: finalStats, // Devolver las estadísticas con las filas normalizadas
    columns: fixedOrderColumns,
  };
}

/**
 * Displays detailed statistics in an HTML table.
 * @param {object} processedStats - Object containing 'stats' (array of participant rows) and 'columns' (array of column names).
 */
function displayDetailedStatistics(processedStats) {
  if (!dataDisplayDiv) return;

  dataDisplayDiv.innerHTML += "<h2>Estadísticas Detalladas</h2>";

  const statistics = processedStats.stats;
  const columns = processedStats.columns;

  if (statistics.length === 0) {
    dataDisplayDiv.innerHTML +=
      "<p>No se pudieron calcular estadísticas detalladas.</p>";
    return;
  }

  const table = document.createElement("table");
  table.classList.add(
    "table",
    "table-striped",
    "table-bordered",
    "mt-3",
    "table-sm"
  );
  table.style.fontSize = "0.75em"; // Hacer la fuente más pequeña para tablas anchas

  const thead = document.createElement("thead");
  const trHead = document.createElement("tr");
  columns.forEach((col) => {
    const th = document.createElement("th");
    th.textContent = col;
    trHead.appendChild(th);
  });
  thead.appendChild(trHead);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  statistics.forEach((statsEntry) => {
    const tr = document.createElement("tr");
    columns.forEach((col) => {
      const td = document.createElement("td");
      td.textContent = statsEntry[col] !== undefined ? statsEntry[col] : ""; // Usar '' si la columna no existe en la fila
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  dataDisplayDiv.appendChild(table);
}

/**
 * Creates and downloads a CSV file of detailed statistics (now uses allParticipantsDataCache).
 * @param {Array<object>} statistics - The array of calculated statistics.
 */
function createCSVFromDetailedStatistics(processedStats) {
  const statistics = processedStats.stats;
  const columns = processedStats.columns;

  if (statistics.length === 0) {
    alert("No hay estadísticas para descargar.");
    return;
  }

  let csvContent = columns.map((col) => `"${col}"`).join(";") + "\n";

  statistics.forEach((statsEntry) => {
    const rowValues = columns.map((col) => {
      let value = statsEntry[col] !== undefined ? statsEntry[col] : ""; // Usar '' si la columna no existe en la fila
      if (
        typeof value === "string" &&
        (value.includes(";") || value.includes(","))
      ) {
        value = `"${value.replace(/"/g, '""')}"`;
      } else if (value === null || value === undefined) {
        value = "";
      }
      return value;
    });
    csvContent += rowValues.join(";") + "\n";
  });
  const BOM = "\uFEFF"; // BOM para UTF-8
  const blob = new Blob([BOM + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.setAttribute("href", url);
  link.setAttribute("download", "estadisticas_detalladas.csv"); // Nuevo nombre de archivo
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// --- Event Listeners ---

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      if (user.uid !== ADMIN_UID) {
        await signOut(auth);
        errorMessageSpan.textContent =
          "Acceso denegado. Solo administradores pueden iniciar sesión.";
        errorMessageSpan.style.display = "block";
      } else {
        errorMessageSpan.style.display = "none";
        console.log("Welcome, administrator.");
      }
    } catch (error) {
      let message;
      switch (error.code) {
        case "auth/invalid-credential":
          message =
            "Credenciales inválidas. Por favor, verifica tu email y contraseña.";
          break;
        case "auth/user-not-found":
          message = "Usuario no encontrado.";
          break;
        case "auth/wrong-password":
          message = "Contraseña incorrecta.";
          break;
        case "auth/network-request-failed":
          message = "Error de red. Verifica tu conexión.";
          break;
        default:
          message = `Error desconocido: ${error.message}`;
          console.error("Unhandled error:", error.code, error);
          break;
      }
      errorMessageSpan.textContent = message;
      errorMessageSpan.style.display = "block";
    }
  });
}

if (downloadButton) {
  downloadButton.addEventListener("click", async () => {
    if (allParticipantsDataCache) {
      createCSVFromData(allParticipantsDataCache);
    } else {
      alert(
        "Los datos aún no se han cargado. Por favor, carga las estadísticas primero."
      );
    }
  });
}

if (loadStatisticsButton) {
  loadStatisticsButton.addEventListener("click", async () => {
    // Si ya están en caché en memoria, no es necesario recargar.
    // loadAndDisplayData ahora maneja la lógica de display, así que solo la llamamos.
    loadAndDisplayData(false); // No forzar recarga, usar caché en memoria si existe
  });
}

if (downloadStatsButton) {
  downloadStatsButton.addEventListener("click", async () => {
    if (allParticipantsDataCache) {
      const detailedStats = calculateDetailedStatistics(
        allParticipantsDataCache
      );
      createCSVFromDetailedStatistics(detailedStats);
    } else {
      alert(
        "Los datos aún no se han cargado. Por favor, carga las estadísticas primero."
      );
    }
  });
}

if (refreshDataButton) {
  refreshDataButton.addEventListener("click", async () => {
    console.log("Forzando recarga de datos...");
    if (dataDisplayDiv) {
      dataDisplayDiv.innerHTML =
        "<p>Recargando datos desde la fuente original (esto puede tardar)...</p>";
    }
    await loadAndDisplayData(true); // Forzar la recarga desde la fuente original
  });
}

if (logoutButton) {
  logoutButton.addEventListener("click", () => {
    signOut(auth)
      .then(() => {
        console.log("Session closed.");
        // Limpiar el caché en memoria
        allParticipantsDataCache = null;
        // Opcional: Limpiar localStorage para asegurar una carga fresca en la próxima sesión
      })
      .catch((error) => {
        console.error("Error signing out:", error);
      });
  });
}
